import express from 'express';
import Doctor from '../models/Doctor.js';

const router = express.Router();

// Haversine formula to compute distance between two geographical points in kilometers
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 9999;
  }
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// GET /api/doctors - Fetch all active/approved doctors from MongoDB with location filtering & distance fallback
router.get('/', async (req, res) => {
  try {
    const { search, location, pincode, userLat, userLng, lat, lng, status } = req.query;
    const baseQuery = {};

    if (status) {
      baseQuery.status = status;
    } else {
      baseQuery.status = { $ne: 'rejected' };
    }

    if (search) {
      baseQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialty: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { hospital: { $regex: search, $options: 'i' } },
        { pincode: { $regex: search, $options: 'i' } },
      ];
    }

    const targetLat = parseFloat(userLat || lat);
    const targetLng = parseFloat(userLng || lng);
    const hasTargetCoords = !isNaN(targetLat) && !isNaN(targetLng);

    // 1. Try location-specific query first if location or pincode is supplied
    let query = { ...baseQuery };
    let isFallback = false;
    let matchMode = 'local';

    if (location || pincode) {
      const locConditions = [];
      if (pincode && pincode.trim()) {
        locConditions.push({ pincode: pincode.trim() });
      }
      if (location && location.trim()) {
        const cleanLoc = location.trim();
        locConditions.push({ location: { $regex: cleanLoc, $options: 'i' } });
      }
      if (locConditions.length > 0) {
        query.$or = query.$or ? [...query.$or, ...locConditions] : locConditions;
      }
    }

    let doctors = await Doctor.find(query).lean();

    // 2. Fallback when no doctors are nearby: If specific location query returned 0 doctors, don't show empty state
    // Expand to all active doctors and sort by distance
    if (doctors.length === 0 && (location || pincode)) {
      isFallback = true;
      matchMode = 'nationwide_fallback';
      doctors = await Doctor.find(baseQuery).lean();
    }

    // 3. Map distance with Haversine formula
    const doctorsWithDistance = doctors.map((doc) => {
      let dist = null;

      if (hasTargetCoords) {
        if (doc.lat != null && doc.lng != null && !isNaN(doc.lat) && !isNaN(doc.lng)) {
          dist = calculateHaversineDistance(targetLat, targetLng, doc.lat, doc.lng);
        } else {
          console.warn(`[API /doctors] Doctor "${doc.name}" missing valid lat/lng coordinates`);
        }
      }

      return {
        ...doc,
        distanceKm: dist,
      };
    });

    // 4. Strict distance sorting with tie-breaking
    doctorsWithDistance.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        if (a.distanceKm !== b.distanceKm) {
          return a.distanceKm - b.distanceKm;
        }
        // Tie-breaker 1: Rating descending
        if ((b.rating || 0) !== (a.rating || 0)) {
          return (b.rating || 0) - (a.rating || 0);
        }
        // Tie-breaker 2: Available status first
        if (a.status !== b.status) {
          return a.status === 'approved' ? -1 : 1;
        }
        return 0;
      }

      if (a.distanceKm != null && b.distanceKm == null) return -1;
      if (a.distanceKm == null && b.distanceKm != null) return 1;

      // Both missing distance: sort by rating descending
      return (b.rating || 0) - (a.rating || 0);
    });

    res.json({
      success: true,
      count: doctorsWithDistance.length,
      doctors: doctorsWithDistance,
      isFallback,
      matchMode,
      fallbackMessage: isFallback
        ? 'No doctors found near specified location — returning nearest available doctors sorted by distance'
        : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/doctors/sync - Sync/Upsert doctors from API (Open Healthcare / NPI) into MongoDB
router.post('/sync', async (req, res) => {
  try {
    const { doctors } = req.body;
    if (!Array.isArray(doctors) || doctors.length === 0) {
      return res.status(400).json({ success: false, error: 'Expected non-empty array of doctors' });
    }

    const syncedDoctors = [];

    for (const doc of doctors) {
      const regNo = (doc.registrationNumber || '').trim();
      const filter = regNo
        ? { registrationNumber: regNo }
        : { name: doc.name.trim(), location: (doc.location || '').trim() };

      const updateFields = {
        name: doc.name.trim(),
        email: (doc.email || '').trim(),
        phone: (doc.phone || '').trim(),
        qualification: doc.qualification || doc.qualifications || 'MD, DM (Medical Genetics)',
        specialty: doc.specialty || 'Medical Geneticist',
        location: doc.location || 'Mumbai, Maharashtra',
        hospital: doc.hospital || 'Specialty Genomics Hospital',
        experience: doc.experience || '5+ years',
        languages: Array.isArray(doc.languages) ? doc.languages : [doc.languages || 'English'],
        consultationFee: doc.consultationFee || doc.fee || '₹1,500',
        registrationNumber: regNo || `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        source: 'api',
        avatar: doc.avatar || '',
        rating: doc.rating || 4.8,
      };

      // $setOnInsert preserves existing admin edits (like status change to rejected/pending, custom fee, etc)
      const result = await Doctor.findOneAndUpdate(
        filter,
        {
          $setOnInsert: {
            ...updateFields,
            status: doc.status || 'approved',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      syncedDoctors.push(result);
    }

    res.json({ success: true, count: syncedDoctors.length, doctors: syncedDoctors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
