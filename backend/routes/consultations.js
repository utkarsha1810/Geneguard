import express from 'express';
import Appointment from '../models/Appointment.js';
import ConsultationReport from '../models/ConsultationReport.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// In-memory fallback stores in case MongoDB is offline
const inMemoryAppointments = [];
const inMemoryReports = {};

// POST /api/appointments - save appointment
router.post('/appointments', async (req, res) => {
  try {
    const {
      patientId = 'guest_patient',
      patientName,
      patientEmail,
      patientPhone,
      doctorId,
      doctorName,
      doctorSpecialty,
      consultationType = 'video',
      appointmentDate,
      timeSlot,
      channelName,
      notes = '',
      preConsultationReport = null,
    } = req.body;

    if (!doctorName || !appointmentDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        error: 'Missing required appointment fields (doctorName, appointmentDate, timeSlot)',
      });
    }

    const generatedChannel =
      channelName ||
      `geneguard_${consultationType}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const appointmentData = {
      patientId,
      patientName: patientName || 'Guest Patient',
      patientEmail: patientEmail || '',
      patientPhone: patientPhone || '',
      doctorId: doctorId || `doc_${Date.now()}`,
      doctorName,
      doctorSpecialty: doctorSpecialty || 'Genetic Counselor',
      consultationType,
      appointmentDate,
      timeSlot,
      channelName: generatedChannel,
      status: 'scheduled',
      notes,
      preConsultationReport,
      createdAt: new Date().toISOString(),
    };

    try {
      const newAppointment = new Appointment(appointmentData);
      const saved = await newAppointment.save();
      logger(`✓ Appointment saved to MongoDB for ${patientName} with ${doctorName}`);
      return res.status(201).json({
        success: true,
        appointment: saved,
        source: 'database',
      });
    } catch (dbErr) {
      logger(`MongoDB unavailable (${dbErr.message}), saving appointment to memory store`, 'warn');
      const fallbackAppointment = { _id: `app_${Date.now()}`, ...appointmentData };
      inMemoryAppointments.unshift(fallbackAppointment);
      return res.status(201).json({
        success: true,
        appointment: fallbackAppointment,
        source: 'memory_fallback',
      });
    }
  } catch (error) {
    logger(`Error creating appointment: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/appointments/:patientId or GET /api/appointments
router.get('/appointments/:patientId?', async (req, res) => {
  try {
    const { patientId } = req.params;
    const filter = patientId && patientId !== 'all' ? { patientId } : {};

    try {
      const appointments = await Appointment.find(filter).sort({ createdAt: -1 });
      return res.json({
        success: true,
        appointments: appointments.length > 0 ? appointments : inMemoryAppointments,
        source: 'database',
      });
    } catch (dbErr) {
      logger(`MongoDB unavailable, returning memory appointments: ${dbErr.message}`, 'warn');
      const filtered = patientId && patientId !== 'all'
        ? inMemoryAppointments.filter((a) => a.patientId === patientId)
        : inMemoryAppointments;
      return res.json({
        success: true,
        appointments: filtered,
        source: 'memory_fallback',
      });
    }
  } catch (error) {
    logger(`Error fetching appointments: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/consultation/report - store pre-consultation patient report for doctor
router.post('/consultation/report', async (req, res) => {
  try {
    const { channelId, patientId = 'guest_patient', patientName = 'Guest Patient', reportData } = req.body;

    if (!channelId || !reportData) {
      return res.status(400).json({
        success: false,
        error: 'channelId and reportData are required',
      });
    }

    try {
      const doc = await ConsultationReport.findOneAndUpdate(
        { channelId },
        { channelId, patientId, patientName, reportData },
        { upsert: true, new: true }
      );
      logger(`✓ Pre-consultation report saved for channel ${channelId}`);
      return res.json({ success: true, report: doc, source: 'database' });
    } catch (dbErr) {
      logger(`MongoDB unavailable, saving report to memory for channel ${channelId}`, 'warn');
      inMemoryReports[channelId] = { channelId, patientId, patientName, reportData, updatedAt: new Date() };
      return res.json({ success: true, report: inMemoryReports[channelId], source: 'memory_fallback' });
    }
  } catch (error) {
    logger(`Error storing pre-consultation report: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/consultation/report/:channelId - fetch patient report for doctor
router.get('/consultation/report/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;

    try {
      const report = await ConsultationReport.findOne({ channelId });
      if (report) {
        return res.json({ success: true, report: report.reportData, source: 'database' });
      }
    } catch (dbErr) {
      logger(`MongoDB query failed for report (${dbErr.message}), checking memory`, 'warn');
    }

    if (inMemoryReports[channelId]) {
      return res.json({
        success: true,
        report: inMemoryReports[channelId].reportData,
        source: 'memory_fallback',
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Pre-consultation report not found for this channel',
    });
  } catch (error) {
    logger(`Error fetching pre-consultation report: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
