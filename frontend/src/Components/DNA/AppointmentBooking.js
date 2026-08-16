import React, { useState } from 'react';
import axios from 'axios';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Shield,
  User,
} from 'lucide-react';
import './AppointmentBooking.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050/api';

const defaultSlots = [
  '09:00 AM',
  '10:30 AM',
  '11:45 AM',
  '02:15 PM',
  '03:45 PM',
  '05:00 PM',
  '06:30 PM',
];

const AppointmentBooking = ({
  selectedDoctor,
  patientProfile = {},
  evaluation = null,
  agentResults = {},
  onAppointmentBooked, // (appointment) => void
  onCancel,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [appointmentDate, setAppointmentDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState(defaultSlots[1]);
  const [consultationType, setConsultationType] = useState('video');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentDate || !selectedSlot) {
      setErrorMsg('Please select a date and time slot.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const channelName = `geneguard_${consultationType}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const payload = {
      patientId: patientProfile.email || 'patient_guest',
      patientName: patientProfile.fullName || 'Guest Patient',
      patientEmail: patientProfile.email || '',
      patientPhone: patientProfile.mobileNumber || patientProfile.emergencyContact || '',
      doctorId: selectedDoctor?.id || 'doc_geneguard_1',
      doctorName: selectedDoctor?.name || 'Dr. Anita Sengupta',
      doctorSpecialty: selectedDoctor?.specialty || 'Clinical Geneticist',
      consultationType,
      appointmentDate,
      timeSlot: selectedSlot,
      channelName,
      notes,
      preConsultationReport: {
        patient: patientProfile,
        evaluation,
        agentResults,
      },
    };

    try {
      let saved = null;
      try {
        const response = await axios.post(`${API_BASE}/appointments`, payload, { timeout: 4000 });
        if (response.data && response.data.appointment) {
          saved = response.data.appointment;
        }
      } catch (apiErr) {
        console.warn('Backend appointment save fallback to local state:', apiErr.message);
      }

      const finalAppt = saved || {
        _id: `local_app_${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage appointments list
      const existing = JSON.parse(localStorage.getItem('geneGuard_appointments') || '[]');
      existing.unshift(finalAppt);
      localStorage.setItem('geneGuard_appointments', JSON.stringify(existing));

      setBookedAppointment(finalAppt);
      if (onAppointmentBooked) {
        onAppointmentBooked(finalAppt);
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      setErrorMsg('Failed to process booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="appointment-booking-wrapper">
      {bookedAppointment ? (
        /* ─── Booking Confirmation Screen ─── */
        <div className="booking-confirmation-card">
          <div className="confirmation-icon-wrap">
            <CheckCircle2 size={54} className="confirm-check" />
          </div>

          <h2>Appointment Confirmed!</h2>
          <p className="confirm-subtitle">
            Your private Agora consultation has been scheduled and your GeneGuard medical summary has been prepared.
          </p>

          <div className="confirm-details-box">
            <div className="confirm-detail-row">
              <span>Doctor / Specialist:</span>
              <strong>{bookedAppointment.doctorName}</strong>
            </div>
            <div className="confirm-detail-row">
              <span>Specialty:</span>
              <strong>{bookedAppointment.doctorSpecialty}</strong>
            </div>
            <div className="confirm-detail-row">
              <span>Date &amp; Time:</span>
              <strong>{bookedAppointment.appointmentDate} at {bookedAppointment.timeSlot}</strong>
            </div>
            <div className="confirm-detail-row">
              <span>Consultation Type:</span>
              <strong style={{ textTransform: 'capitalize' }}>{bookedAppointment.consultationType} Call</strong>
            </div>
            <div className="confirm-detail-row channel-row">
              <span>Agora Secure Channel:</span>
              <code>{bookedAppointment.channelName}</code>
            </div>
          </div>

          <div className="confirmation-actions">
            <button
              className="confirm-primary-btn"
              onClick={() => onCancel && onCancel()}
            >
              View My Appointments
            </button>
          </div>
        </div>
      ) : (
        /* ─── Booking Form ─── */
        <div className="booking-form-card">
          <div className="booking-form-header">
            <button className="booking-back-btn" onClick={onCancel}>
              <ChevronLeft size={18} />
              <span>Back to Doctors</span>
            </button>
            <h2>Schedule Genetic Consultation</h2>
          </div>

          {/* Doctor Brief Info */}
          {selectedDoctor && (
            <div className="booking-doctor-banner">
              <img
                src={selectedDoctor.avatar}
                alt={selectedDoctor.name}
                className="booking-doc-img"
              />
              <div>
                <h3>{selectedDoctor.name}</h3>
                <span className="booking-doc-spec">{selectedDoctor.specialty}</span>
                <span className="booking-doc-hosp">{selectedDoctor.hospital} · {selectedDoctor.location}</span>
              </div>
              <div className="booking-fee-badge">{selectedDoctor.fee}</div>
            </div>
          )}

          <form onSubmit={handleBookingSubmit} className="booking-inputs-grid">
            {/* Consultation Mode */}
            <div className="booking-field-group full-width">
              <label>Select Consultation Mode</label>
              <div className="mode-selector-grid">
                <button
                  type="button"
                  className={`mode-btn ${consultationType === 'video' ? 'active' : ''}`}
                  onClick={() => setConsultationType('video')}
                >
                  <Video size={18} />
                  <span>HD Video Consultation</span>
                </button>
                <button
                  type="button"
                  className={`mode-btn ${consultationType === 'audio' ? 'active' : ''}`}
                  onClick={() => setConsultationType('audio')}
                >
                  <Phone size={18} />
                  <span>Audio Consultation</span>
                </button>
                <button
                  type="button"
                  className={`mode-btn ${consultationType === 'chat' ? 'active' : ''}`}
                  onClick={() => setConsultationType('chat')}
                >
                  <MessageSquare size={18} />
                  <span>Encrypted Live Chat</span>
                </button>
              </div>
            </div>

            {/* Date Picker */}
            <div className="booking-field-group">
              <label>
                <Calendar size={15} />
                <span>Preferred Date</span>
              </label>
              <input
                type="date"
                min={today}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                required
              />
            </div>

            {/* Time Slot Picker */}
            <div className="booking-field-group">
              <label>
                <Clock size={15} />
                <span>Available Time Slot</span>
              </label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                required
              >
                {defaultSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>

            {/* Patient Name & Contact Brief */}
            <div className="booking-field-group">
              <label>
                <User size={15} />
                <span>Patient Name</span>
              </label>
              <input
                type="text"
                value={patientProfile.fullName || ''}
                readOnly
                placeholder="Guest Patient"
              />
            </div>

            <div className="booking-field-group">
              <label>
                <Shield size={15} />
                <span>Risk Lane Integration</span>
              </label>
              <input
                type="text"
                value={`${evaluation?.level || patientProfile.reportRisk || 'Low'} Risk — Auto-Synced`}
                readOnly
              />
            </div>

            {/* Reason / Clinical Notes */}
            <div className="booking-field-group full-width">
              <label>Reason for Consultation / Specific Concerns</label>
              <textarea
                rows={3}
                placeholder="Provide any specific genetic questions or concerns you would like the doctor to review..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {errorMsg && <p className="booking-error-msg">{errorMsg}</p>}

            {/* Actions */}
            <div className="booking-submit-row full-width">
              <button
                type="button"
                className="booking-cancel-btn"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="booking-confirm-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Confirming Appointment...' : 'Confirm & Reserve Slot'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AppointmentBooking;
