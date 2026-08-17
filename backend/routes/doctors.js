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

// GET /api/doctors - Fetch all active/approved doctors from MongoDB with distance sorting
router.get('/', async (req, res) => {
  try {
    const { search, location, pincode, userLat, userLng, lat, lng, status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'rejected' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialty: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { hospital: { $regex: search, $options: 'i' } },
        { pincode: { $regex: search, $options: 'i' } },
      ];
    }

    const doctors = await Doctor.find(query).lean();

    const targetLat = parseFloat(userLat || lat);
    const targetLng = parseFloat(userLng || lng);

    const doctorsWithDistance = doctors.map((doc) => {
      const docLat = doc.lat || 18.9388;
      const docLng = doc.lng || 72.8354;
      let dist = 0;

      if (!isNaN(targetLat) && !isNaN(targetLng)) {
        dist = calculateHaversineDistance(targetLat, targetLng, docLat, docLng);
      }
      return {
        ...doc,
        distanceKm: dist,
      };
    });

    if (!isNaN(targetLat) && !isNaN(targetLng)) {
      doctorsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (pincode && pincode.trim()) {
      const targetPin = pincode.trim();
      doctorsWithDistance.sort((a, b) => {
        if (a.pincode === targetPin && b.pincode !== targetPin) return -1;
        if (b.pincode === targetPin && a.pincode !== targetPin) return 1;
        return 0;
      });
    }

    res.json({ success: true, count: doctorsWithDistance.length, doctors: doctorsWithDistance });
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
