import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Health Information
    age: {
      type: Number,
      min: 1,
      max: 150,
      required: true,
    },
    sex: {
      type: String,
      enum: ['Female', 'Male', 'Other'],
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    familyHistory: {
      type: String,
      enum: ['No', 'Yes'],
      default: 'No',
    },
    knownDisorder: {
      type: String,
      trim: true,
    },
    currentSymptoms: {
      type: String,
      enum: ['No symptoms', 'Mild symptoms', 'Recurring symptoms', 'Severe'],
      default: 'No symptoms',
    },
    medications: {
      type: String,
      trim: true,
    },

    // Emergency Contact
    emergencyContactName: String,
    emergencyContact: String,
    location: {
      type: String,
      trim: true,
    },

    // Medical History Files & Extracted Text
    medicalHistoryFiles: [
      {
        fileName: { type: String, required: true },
        fileType: { type: String },
        extractedText: { type: String },
        extractedSummary: { type: String },
        isAiVision: { type: Boolean, default: false },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Account Status
    consultedDoctor: {
      type: String,
      enum: ['No', 'Yes'],
      default: 'No',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isHighRisk: {
      type: Boolean,
      default: false,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    isSeeded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Patient', PatientSchema);
