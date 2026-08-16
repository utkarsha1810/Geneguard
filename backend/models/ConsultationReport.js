import mongoose from 'mongoose';

const ConsultationReportSchema = new mongoose.Schema(
  {
    channelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: String,
      default: 'guest_patient',
    },
    patientName: {
      type: String,
      default: 'Guest Patient',
    },
    reportData: {
      patient: mongoose.Schema.Types.Mixed,
      evaluation: mongoose.Schema.Types.Mixed,
      agentResults: mongoose.Schema.Types.Mixed,
      uploadedRecords: [mongoose.Schema.Types.Mixed],
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('ConsultationReport', ConsultationReportSchema);
