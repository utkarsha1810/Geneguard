import mongoose from 'mongoose';

const DoctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    qualification: {
      type: String,
      default: 'MD, DM (Medical Genetics)',
    },
    specialty: {
      type: String,
      required: true,
      default: 'Medical Geneticist',
    },
    location: {
      type: String,
      required: true,
      default: 'Mumbai, Maharashtra',
    },
    pincode: {
      type: String,
      default: '400001',
      trim: true,
    },
    lat: {
      type: Number,
      default: 18.9388,
    },
    lng: {
      type: Number,
      default: 72.8354,
    },
    hospital: {
      type: String,
      default: 'Genomics Specialty Clinic',
    },
    experience: {
      type: String,
      default: '5+ years',
    },
    languages: {
      type: [String],
      default: ['English', 'Hindi'],
    },
    consultationFee: {
      type: String,
      default: '₹1,500',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    source: {
      type: String,
      enum: ['api', 'manual'],
      default: 'manual',
    },
    registrationNumber: {
      type: String,
      default: '',
      trim: true,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    avatar: {
      type: String,
      default: '',
    },
    consultationHistoryCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Doctor', DoctorSchema);
