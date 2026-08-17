import express from 'express';
import Doctor from '../models/Doctor.js';

const router = express.Router();

// GET /api/doctors - Fetch all active/approved doctors from MongoDB with pincode & location support
router.get('/', async (req, res) => {
  try {
    const { search, location, pincode, status } = req.query;
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

    if (pincode && pincode.trim()) {
      const pinStr = pincode.trim();
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: [{ pincode: pinStr }, { location: { $regex: pinStr, $options: 'i' } }] }
        ];
        delete query.$or;
      } else {
        query.$or = [{ pincode: pinStr }, { location: { $regex: pinStr, $options: 'i' } }];
      }
    } else if (location && location !== 'All') {
      const locRegex = new RegExp(location, 'i');
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { location: locRegex }];
        delete query.$or;
      } else {
        query.location = locRegex;
      }
    }

    const doctors = await Doctor.find(query).sort({ createdAt: -1 });

    // Custom sort: exact pincode match first
    if (pincode && pincode.trim()) {
      const targetPin = pincode.trim();
      doctors.sort((a, b) => {
        if (a.pincode === targetPin && b.pincode !== targetPin) return -1;
        if (b.pincode === targetPin && a.pincode !== targetPin) return 1;
        return 0;
      });
    }

    res.json({ success: true, count: doctors.length, doctors });
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
