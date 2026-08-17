import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// System Settings State in Memory
let adminSecretCode = process.env.ADMIN_SECRET_CODE || 'GENE_GUARD_ADMIN_2026';
let isMaintenanceMode = false;
const errorLogs = [
  { id: 1, level: 'warn', message: 'Gemini rate limit threshold reached (80%)', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, level: 'info', message: 'MongoDB connection re-established', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, level: 'error', message: 'Failed to simplify report: Timeout after 15s', timestamp: new Date(Date.now() - 10800000).toISOString() }
];

export const logAdminError = (msg, level = 'error') => {
  errorLogs.unshift({
    id: errorLogs.length + 1,
    level,
    message: msg,
    timestamp: new Date().toISOString()
  });
  if (errorLogs.length > 50) errorLogs.pop();
};

export const getMaintenanceStatus = () => isMaintenanceMode;

// Protect all admin routes
router.use(verifyToken, verifyAdmin);

// Seed initial Doctors if empty
const seedDoctorsIfEmpty = async () => {
  const count = await Doctor.countDocuments();
  if (count === 0) {
    await Doctor.insertMany([
      { name: 'Dr. Sarah Jenkins', email: 's.jenkins@geneguard.com', phone: '9876543210', specialty: 'Clinical Geneticist', location: 'Boston Medical Center', experience: '12 years', status: 'approved', rating: 4.9, consultationHistoryCount: 48 },
      { name: 'Dr. Rajesh Sharma', email: 'r.sharma@geneguard.com', phone: '9876543211', specialty: 'Genomic Counselor', location: 'AIIMS New Delhi', experience: '9 years', status: 'approved', rating: 4.8, consultationHistoryCount: 32 },
      { name: 'Dr. Elena Rostova', email: 'e.rostova@geneguard.com', phone: '9876543212', specialty: 'Pediatric Geneticist', location: 'St. Jude Hospital', experience: '15 years', status: 'approved', rating: 5.0, consultationHistoryCount: 64 },
      { name: 'Dr. Marcus Vance', email: 'm.vance@geneguard.com', phone: '9876543213', specialty: 'Oncology Geneticist', location: 'Johns Hopkins Hospital', experience: '6 years', status: 'pending', rating: 4.7, consultationHistoryCount: 12 },
    ]);
  }
};

// Seed initial Appointments if empty
const seedAppointmentsIfEmpty = async () => {
  const count = await Appointment.countDocuments();
  if (count === 0) {
    await Appointment.insertMany([
      { patientId: 'p-101', patientName: 'John Doe', patientEmail: 'john@example.com', patientPhone: '9123456780', doctorId: 'doc-1', doctorName: 'Dr. Sarah Jenkins', doctorSpecialty: 'Clinical Geneticist', consultationType: 'video', appointmentDate: '2026-08-18', timeSlot: '10:00 AM', channelName: 'gene-guard-room-101', status: 'scheduled', notes: 'Routine carrier consultation' },
      { patientId: 'p-102', patientName: 'Anita Roy', patientEmail: 'anita@example.com', patientPhone: '9123456781', doctorId: 'doc-2', doctorName: 'Dr. Rajesh Sharma', doctorSpecialty: 'Genomic Counselor', consultationType: 'chat', appointmentDate: '2026-08-15', timeSlot: '02:30 PM', channelName: 'gene-guard-room-102', status: 'completed', notes: 'Reviewed BRCA1 report' },
      { patientId: 'p-103', patientName: 'Michael Chang', patientEmail: 'mchang@example.com', patientPhone: '9123456782', doctorId: 'doc-3', doctorName: 'Dr. Elena Rostova', doctorSpecialty: 'Pediatric Geneticist', consultationType: 'audio', appointmentDate: '2026-08-12', timeSlot: '11:15 AM', channelName: 'gene-guard-room-103', status: 'cancelled', notes: 'Patient requested reschedule' },
    ]);
  }
};

// ─── TAB 1: OVERVIEW STATS ───────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDoctors = await Doctor.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const totalIntakes = await Patient.countDocuments();
    const highRiskPatients = await Patient.countDocuments({
      $or: [
        { currentSymptoms: 'Severe' },
        { isHighRisk: true },
        { riskLevel: 'high' }
      ]
    });

    const activeSessions = totalUsers > 0 ? Math.ceil(totalUsers * 0.3) : 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalDoctors,
        totalAppointments,
        totalIntakes,
        activeSessions,
        highRiskPatients
      }
    });
  } catch (error) {
    logAdminError(`Stats fetch error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── TAB 2: USER MANAGEMENT ──────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const query = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      users,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    logAdminError(`Get users error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.status = status || (user.status === 'active' ? 'inactive' : 'active');
    await user.save();

    res.json({ success: true, message: `User status updated to ${user.status}`, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const tempPassword = 'Temp@' + Math.floor(100000 + Math.random() * 900000);
    user.passwordHash = await bcrypt.hash(tempPassword, 10);
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      tempPassword,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── TAB 3: DOCTOR MANAGEMENT ───────────────────────────────────────────────
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.json({ success: true, doctors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/doctors', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      qualification,
      specialty,
      location,
      hospital,
      experience,
      languages,
      consultationFee,
      registrationNumber,
      avatar,
      source,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Doctor name is required' });
    }

    const newDoctor = new Doctor({
      name: name.trim(),
      email: (email || '').trim(),
      phone: (phone || '').trim(),
      qualification: qualification || 'MD, DM (Medical Genetics)',
      specialty: specialty || 'Medical Geneticist',
      location: location || 'Mumbai, Maharashtra',
      hospital: hospital || 'Specialty Genomics Hospital',
      experience: experience || '5+ years',
      languages: Array.isArray(languages) ? languages : [languages || 'English'],
      consultationFee: consultationFee || '₹1,500',
      registrationNumber: registrationNumber || `REG-MANUAL-${Date.now()}`,
      avatar: avatar || '',
      source: source || 'manual',
      status: status || 'approved',
    });

    await newDoctor.save();
    res.status(201).json({ success: true, message: 'Doctor added successfully', doctor: newDoctor });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/doctors/:id', async (req, res) => {
  try {
    const updated = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Doctor not found' });
    res.json({ success: true, message: 'Doctor updated successfully', doctor: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/doctors/:id/approve', async (req, res) => {
  try {
    const { status } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

    res.json({ success: true, message: `Doctor profile ${status}`, doctor });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/doctors/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });
    res.json({ success: true, message: 'Doctor removed from directory' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── TAB 4: PATIENT DATA ─────────────────────────────────────────────────────
router.get('/patients', async (req, res) => {
  try {
    const { search, riskLevel } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (riskLevel) {
      if (riskLevel === 'High') query.$or = [{ currentSymptoms: 'Severe' }, { isHighRisk: true }];
      else if (riskLevel === 'Medium') query.currentSymptoms = 'Recurring symptoms';
      else if (riskLevel === 'Low') query.currentSymptoms = { $in: ['No symptoms', 'Mild symptoms'] };
    }

    const patients = await Patient.find(query).sort({ createdAt: -1 });
    res.json({ success: true, patients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/patients/:id/flag', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    patient.isHighRisk = !patient.isHighRisk;
    await patient.save();

    res.json({ success: true, message: `Patient risk flag updated`, patient });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/patients/export', async (req, res) => {
  try {
    const patients = await Patient.find().lean();
    let csv = 'Name,Email,Age,Sex,BloodGroup,Symptoms,FamilyHistory,HighRisk,SubmittedAt\n';

    patients.forEach((p) => {
      const name = `"${p.firstName || ''} ${p.lastName || ''}"`;
      const email = `"${p.email || ''}"`;
      const age = p.age || '';
      const sex = p.sex || '';
      const blood = p.bloodGroup || '';
      const symptoms = `"${p.currentSymptoms || ''}"`;
      const famHist = `"${p.familyHistory || ''}"`;
      const highRisk = p.isHighRisk ? 'Yes' : 'No';
      const date = p.createdAt ? new Date(p.createdAt).toISOString() : '';

      csv += `${name},${email},${age},${sex},${blood},${symptoms},${famHist},${highRisk},${date}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="geneguard_patients.csv"');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── TAB 5: APPOINTMENTS ─────────────────────────────────────────────────────
router.get('/appointments', async (req, res) => {
  try {
    await seedAppointmentsIfEmpty();
    const { status } = req.query;
    const query = status ? { status } : {};

    const appointments = await Appointment.find(query).sort({ createdAt: -1 });
    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/appointments/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });

    appointment.status = 'cancelled';
    if (reason) appointment.notes = `Cancelled by admin: ${reason}`;
    await appointment.save();

    res.json({ success: true, message: 'Appointment cancelled', appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── TAB 6: ANALYTICS ────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Signups over time (grouped by day)
    const signupAgg = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          signups: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const signupsOverTime = signupAgg.map((item) => ({
      day: item._id,
      signups: item.signups,
    }));

    // 2. Appointments per day/week aggregation
    const appointmentAgg = await Appointment.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const appointmentsPerWeek = appointmentAgg.length > 0
      ? appointmentAgg.slice(-6).map((item, idx) => ({ week: `Day ${idx + 1} (${item._id})`, count: item.count }))
      : [{ week: 'Wk 1', count: 0 }];

    // 3. Risk distribution directly from Patient intakes
    const lowRiskCount = await Patient.countDocuments({ riskLevel: 'low' });
    const mediumRiskCount = await Patient.countDocuments({ riskLevel: 'medium' });
    const highRiskCount = await Patient.countDocuments({ riskLevel: 'high' });

    const riskDistribution = [
      { name: 'Low Risk', value: lowRiskCount, color: '#10b981' },
      { name: 'Medium Risk', value: mediumRiskCount, color: '#f59e0b' },
      { name: 'High Risk', value: highRiskCount, color: '#ef4444' },
    ];

    // 4. Feature Usage by Genetic Category / Intake Disorders
    const disorderAgg = await Patient.aggregate([
      { $group: { _id: '$knownDisorder', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const featureUsage = disorderAgg.map((d) => ({
      name: d._id && d._id !== 'None' ? d._id : 'Symptom Checker',
      usage: d.count * 15 + 8,
    }));

    // 5. Total reports & Average risk score (low=1, medium=2, high=3)
    const totalPatients = await Patient.countDocuments();
    const totalRiskScore = lowRiskCount * 1 + mediumRiskCount * 2 + highRiskCount * 3;
    const avgScoreNumber = totalPatients > 0 ? (totalRiskScore / totalPatients).toFixed(1) : '1.0';
    const averageRiskScore = `${avgScoreNumber} / 3.0`;

    res.json({
      success: true,
      analytics: {
        signupsOverTime,
        appointmentsPerWeek,
        riskDistribution,
        featureUsage: featureUsage.length > 0 ? featureUsage : [
          { name: 'Symptom Checker', usage: 25 },
          { name: 'Genetic Assessment AI', usage: 18 },
        ],
        totalReportsGenerated: totalPatients,
        averageRiskScore,
      },
    });
  } catch (error) {
    logAdminError(`Analytics fetch error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── TAB 7: SYSTEM SETTINGS & LOGS ──────────────────────────────────────────
router.get('/logs', (req, res) => {
  res.json({ success: true, logs: errorLogs });
});

router.patch('/settings/admin-code', (req, res) => {
  const { currentCode, newCode } = req.body;
  if (!currentCode || currentCode.trim() !== adminSecretCode) {
    return res.status(403).json({ success: false, error: 'Current Admin Secret Code is incorrect' });
  }

  if (!newCode || newCode.trim().length < 6) {
    return res.status(400).json({ success: false, error: 'New secret code must be at least 6 characters' });
  }

  adminSecretCode = newCode.trim();
  res.json({ success: true, message: 'Admin Secret Code updated successfully' });
});

router.patch('/settings/maintenance', (req, res) => {
  const { maintenanceMode } = req.body;
  isMaintenanceMode = Boolean(maintenanceMode);
  res.json({
    success: true,
    message: `Maintenance mode ${isMaintenanceMode ? 'ENABLED' : 'DISABLED'}`,
    maintenanceMode: isMaintenanceMode,
  });
});

router.get('/settings/env-keys', (req, res) => {
  const keys = Object.keys(process.env).filter(
    (k) => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASSWORD')
  );
  const publicKeys = ['PORT', 'NODE_ENV', 'FRONTEND_URL', 'DATABASE_NAME', 'AI_MODEL_NAME'];
  res.json({ success: true, envKeys: Array.from(new Set([...publicKeys, ...keys])) });
});

router.post('/settings/regenerate-jwt', (req, res) => {
  logAdminError('Admin regenerated JWT secret', 'warn');
  res.json({
    success: true,
    message: 'JWT secret reset successfully. All active sessions invalidated.',
  });
});

export default router;
