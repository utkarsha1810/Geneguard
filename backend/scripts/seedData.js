import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gene-guard';

const seedDatabase = async () => {
  try {
    console.log('[SeedScript] Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('[SeedScript] ✓ Connected to MongoDB');

    // 1. Clear existing seed data
    console.log('[SeedScript] Clearing existing collections...');
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Appointment.deleteMany({});

    // Generate bcrypt password hash
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);
    const now = new Date();

    // Helper to subtract days
    const daysAgo = (d) => {
      const date = new Date();
      date.setDate(date.getDate() - d);
      return date;
    };

    // Helper to add days
    const daysAhead = (d) => {
      const date = new Date();
      date.setDate(date.getDate() + d);
      return date;
    };

    // ──────────────────────────────────────────────────────────────────────────
    // USERS (15 users)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[SeedScript] Seeding 15 Users...');
    const userRawData = [
      { firstName: 'Anil', lastName: 'Soni', email: 'akcrc2@gmail.com', phone: '9766341066', dob: '1977-08-02', role: 'admin', status: 'active', daysAgo: 30 },
      { firstName: 'Suchita', lastName: 'Soni', email: 'suchitasoni1981@gmail.com', phone: '8823435238', dob: '1981-10-14', role: 'user', status: 'active', daysAgo: 28 },
      { firstName: 'Aarav', lastName: 'Sharma', email: 'aarav.sharma@example.com', phone: '9820123456', dob: '1990-05-12', role: 'user', status: 'active', daysAgo: 25 },
      { firstName: 'Diya', lastName: 'Patel', email: 'diya.patel@example.com', phone: '9820234567', dob: '1995-11-20', role: 'user', status: 'active', daysAgo: 22 },
      { firstName: 'Rohan', lastName: 'Mehta', email: 'rohan.mehta@example.com', phone: '9820345678', dob: '1985-03-15', role: 'user', status: 'active', daysAgo: 20 },
      { firstName: 'Priya', lastName: 'Deshmukh', email: 'priya.deshmukh@example.com', phone: '9820456789', dob: '1992-07-08', role: 'user', status: 'active', daysAgo: 18 },
      { firstName: 'Vikram', lastName: 'Singh', email: 'vikram.singh@example.com', phone: '9820567890', dob: '1988-12-30', role: 'admin', status: 'active', daysAgo: 15 },
      { firstName: 'Ananya', lastName: 'Kulkarni', email: 'ananya.k@example.com', phone: '9820678901', dob: '1994-09-25', role: 'user', status: 'active', daysAgo: 14 },
      { firstName: 'Kabir', lastName: 'Verma', email: 'kabir.v@example.com', phone: '9820789012', dob: '1983-04-18', role: 'user', status: 'inactive', daysAgo: 12 },
      { firstName: 'Sneha', lastName: 'Rao', email: 'sneha.rao@example.com', phone: '9820890123', dob: '1997-01-05', role: 'user', status: 'active', daysAgo: 10 },
      { firstName: 'Aditya', lastName: 'Joshi', email: 'aditya.j@example.com', phone: '9820901234', dob: '1991-08-14', role: 'user', status: 'active', daysAgo: 8 },
      { firstName: 'Neha', lastName: 'Nair', email: 'neha.nair@example.com', phone: '9819012345', dob: '1989-06-22', role: 'user', status: 'active', daysAgo: 6 },
      { firstName: 'Siddharth', lastName: 'Gupta', email: 'siddharth.g@example.com', phone: '9819123456', dob: '1993-02-28', role: 'user', status: 'active', daysAgo: 4 },
      { firstName: 'Pooja', lastName: 'Bhat', email: 'pooja.bhat@example.com', phone: '9819234567', dob: '1996-10-10', role: 'user', status: 'inactive', daysAgo: 2 },
      { firstName: 'Karan', lastName: 'Kapoor', email: 'karan.k@example.com', phone: '9819345678', dob: '1998-12-15', role: 'user', status: 'active', daysAgo: 0 },
    ];

    const users = await User.insertMany(
      userRawData.map((u) => ({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        dateOfBirth: u.dob,
        passwordHash: defaultPasswordHash,
        role: u.role,
        status: u.status,
        consentGiven: true,
        createdAt: daysAgo(u.daysAgo),
        updatedAt: daysAgo(u.daysAgo),
      }))
    );
    console.log(`[SeedScript] ✓ ${users.length} Users inserted`);

    // ──────────────────────────────────────────────────────────────────────────
    // PATIENT INTAKES (15 intake records matching the users)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[SeedScript] Seeding 15 Patient Intakes...');
    const patientRawData = [
      { age: 46, sex: 'Male', blood: 'O+', loc: 'Mumbai, Maharashtra', history: 'Yes', disorder: 'Diabetes Type 2', symptoms: 'Mild symptoms', risk: 'low', daysAgo: 30 },
      { age: 42, sex: 'Female', blood: 'A+', loc: 'Mumbai, Maharashtra', history: 'Yes', disorder: 'Thalassemia Minor', symptoms: 'Recurring symptoms', risk: 'medium', daysAgo: 28 },
      { age: 34, sex: 'Male', blood: 'B+', loc: 'Delhi, NCR', history: 'No', disorder: 'None', symptoms: 'No symptoms', risk: 'low', daysAgo: 25 },
      { age: 29, sex: 'Female', blood: 'O+', loc: 'Bangalore, Karnataka', history: 'Yes', disorder: 'Sickle Cell Trait', symptoms: 'Recurring symptoms', risk: 'medium', daysAgo: 22 },
      { age: 39, sex: 'Male', blood: 'AB+', loc: 'Mumbai, Maharashtra', history: 'Yes', disorder: 'Cardiomyopathy', symptoms: 'Severe', risk: 'high', daysAgo: 20 },
      { age: 32, sex: 'Female', blood: 'A-', loc: 'Pune, Maharashtra', history: 'No', disorder: 'None', symptoms: 'No symptoms', risk: 'low', daysAgo: 18 },
      { age: 36, sex: 'Male', blood: 'B-', loc: 'Hyderabad, Telangana', history: 'Yes', disorder: 'Hereditary Cancer Risk', symptoms: 'Severe', risk: 'high', daysAgo: 15 },
      { age: 30, sex: 'Female', blood: 'O-', loc: 'Mumbai, Maharashtra', history: 'Yes', disorder: 'Cystic Fibrosis Carrier', symptoms: 'Mild symptoms', risk: 'medium', daysAgo: 14 },
      { age: 41, sex: 'Male', blood: 'AB-', loc: 'Delhi, NCR', history: 'No', disorder: 'Diabetes Type 2', symptoms: 'Mild symptoms', risk: 'low', daysAgo: 12 },
      { age: 27, sex: 'Female', blood: 'A+', loc: 'Mumbai, Maharashtra', history: 'No', disorder: 'None', symptoms: 'No symptoms', risk: 'low', daysAgo: 10 },
      { age: 33, sex: 'Male', blood: 'O+', loc: 'Pune, Maharashtra', history: 'Yes', disorder: 'Hemophilia A', symptoms: 'Severe', risk: 'high', daysAgo: 8 },
      { age: 35, sex: 'Female', blood: 'B+', loc: 'Bangalore, Karnataka', history: 'Yes', disorder: 'Lynch Syndrome', symptoms: 'Recurring symptoms', risk: 'medium', daysAgo: 6 },
      { age: 31, sex: 'Male', blood: 'A+', loc: 'Mumbai, Maharashtra', history: 'No', disorder: 'None', symptoms: 'No symptoms', risk: 'low', daysAgo: 4 },
      { age: 28, sex: 'Female', blood: 'O+', loc: 'Hyderabad, Telangana', history: 'Yes', disorder: 'BRCA1 Mutation', symptoms: 'Recurring symptoms', risk: 'medium', daysAgo: 2 },
      { age: 26, sex: 'Male', blood: 'B+', loc: 'Mumbai, Maharashtra', history: 'Yes', disorder: 'Thalassemia Trait', symptoms: 'Mild symptoms', risk: 'medium', daysAgo: 0 },
    ];

    const patientIntakes = await Patient.insertMany(
      patientRawData.map((p, index) => ({
        firstName: users[index].firstName,
        lastName: users[index].lastName,
        email: users[index].email,
        age: p.age,
        sex: p.sex,
        bloodGroup: p.blood,
        familyHistory: p.history,
        knownDisorder: p.disorder,
        currentSymptoms: p.symptoms,
        location: p.loc,
        isHighRisk: p.risk === 'high',
        riskLevel: p.risk,
        consultedDoctor: index % 2 === 0 ? 'Yes' : 'No',
        createdAt: daysAgo(p.daysAgo),
        updatedAt: daysAgo(p.daysAgo),
      }))
    );
    console.log(`[SeedScript] ✓ ${patientIntakes.length} Patient Intakes inserted`);

    // ──────────────────────────────────────────────────────────────────────────
    // DOCTORS (22 doctors - Across all major Indian cities & metros)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[SeedScript] Seeding 22 Doctors across India (Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad)...');
    const doctorRawData = [
      // ── MUMBAI, MAHARASHTRA ──
      {
        name: 'Dr. Rajesh Sharma',
        email: 'dr.rsharma@kemhospital.edu',
        phone: '9820011223',
        qualification: 'MD, DM (Medical Genetics)',
        specialty: 'Clinical Geneticist',
        location: 'Mumbai, Maharashtra',
        pincode: '400012',
        lat: 19.0022,
        lng: 72.8427,
        hospital: 'KEM Hospital, Parel',
        experience: '15+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹1,500',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10001',
        rating: 4.9,
      },
      {
        name: 'Dr. Priya Nair',
        email: 'dr.pnair@tmc.gov.in',
        phone: '9820022334',
        qualification: 'MBBS, MSc (Genetic Counseling)',
        specialty: 'Genetic Counselor',
        location: 'Mumbai, Maharashtra',
        pincode: '400012',
        lat: 19.0041,
        lng: 72.8432,
        hospital: 'Tata Memorial Hospital, Parel',
        experience: '10+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹1,200',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10002',
        rating: 4.8,
      },
      {
        name: 'Dr. Ananya Deshmukh',
        email: 'dr.adeshmukh@kokilabenhospital.com',
        phone: '9820033445',
        qualification: 'MD (Pediatrics), DM (Genetics)',
        specialty: 'Prenatal Genetics',
        location: 'Mumbai, Maharashtra',
        pincode: '400053',
        lat: 19.1311,
        lng: 72.8252,
        hospital: 'Kokilaben Dhirubhai Ambani Hospital, Andheri West',
        experience: '12+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹1,800',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10003',
        rating: 4.9,
      },
      {
        name: 'Dr. Vikram Joshi',
        email: 'dr.vjoshi@hindujahospital.com',
        phone: '9820044556',
        qualification: 'MD, PhD (Genomics)',
        specialty: 'Cancer Genetics',
        location: 'Mumbai, Maharashtra',
        pincode: '400016',
        lat: 19.0345,
        lng: 72.8398,
        hospital: 'P. D. Hinduja National Hospital, Mahim',
        experience: '18+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹2,000',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10004',
        rating: 5.0,
      },

      // ── DELHI / NCR ──
      {
        name: 'Dr. Harshvardhan Gupta',
        email: 'dr.hgupta@aiims.edu',
        phone: '9810123456',
        qualification: 'MD, DM (Pediatric Genetics)',
        specialty: 'Clinical Geneticist',
        location: 'New Delhi, Delhi',
        pincode: '110029',
        lat: 28.5672,
        lng: 77.2100,
        hospital: 'AIIMS New Delhi, Ansari Nagar',
        experience: '20+ years',
        languages: ['English', 'Hindi', 'Punjabi'],
        consultationFee: '₹1,600',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'DMC-20001',
        rating: 5.0,
      },
      {
        name: 'Dr. Sunita Kapoor',
        email: 'dr.skapoor@mamc.ac.in',
        phone: '9810234567',
        qualification: 'MD (Pathology), DM (Medical Genetics)',
        specialty: 'Prenatal & Carrier Screening',
        location: 'New Delhi, Delhi',
        pincode: '110002',
        lat: 28.6366,
        lng: 77.2407,
        hospital: 'Maulana Azad Medical College (LNJP Hospital)',
        experience: '14+ years',
        languages: ['English', 'Hindi'],
        consultationFee: '₹1,400',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'DMC-20002',
        rating: 4.8,
      },
      {
        name: 'Dr. Naresh Trehan',
        email: 'dr.ntrehan@medanta.org',
        phone: '9810345678',
        qualification: 'MD, DM (Cardio-Genetics)',
        specialty: 'Cardiovascular Genetics',
        location: 'Gurgaon, NCR',
        pincode: '122002',
        lat: 28.4389,
        lng: 77.0428,
        hospital: 'Medanta - The Medicity, Gurgaon',
        experience: '22+ years',
        languages: ['English', 'Hindi'],
        consultationFee: '₹2,500',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'HN-30001',
        rating: 4.9,
      },

      // ── BANGALORE, KARNATAKA ──
      {
        name: 'Dr. Vijayalakshmi Rao',
        email: 'dr.vrao@nimhans.ac.in',
        phone: '9845012345',
        qualification: 'MD, DM (Neuro-Genetics)',
        specialty: 'Neurogenetics',
        location: 'Bangalore, Karnataka',
        pincode: '560029',
        lat: 12.9343,
        lng: 77.6101,
        hospital: 'NIMHANS & St. John\'s Medical College',
        experience: '16+ years',
        languages: ['English', 'Kannada', 'Hindi', 'Tamil'],
        consultationFee: '₹1,700',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'KMC-40001',
        rating: 4.9,
      },
      {
        name: 'Dr. Arvind Narayanan',
        email: 'dr.anarayanan@narayanahealth.org',
        phone: '9845123456',
        qualification: 'MD, DM (Genetics)',
        specialty: 'Clinical Geneticist',
        location: 'Bangalore, Karnataka',
        pincode: '560099',
        lat: 12.8090,
        lng: 77.6970,
        hospital: 'Narayana Health City, Bommasandra',
        experience: '12+ years',
        languages: ['English', 'Kannada', 'Tamil'],
        consultationFee: '₹1,500',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'KMC-40002',
        rating: 4.8,
      },

      // ── HYDERABAD, TELANGANA ──
      {
        name: 'Dr. Venkat Reddy',
        email: 'dr.vreddy@nims.edu.in',
        phone: '9849012345',
        qualification: 'MD, DM (Medical Genetics)',
        specialty: 'Clinical Geneticist',
        location: 'Hyderabad, Telangana',
        pincode: '500034',
        lat: 17.4156,
        lng: 78.4487,
        hospital: 'Nizam\'s Institute of Medical Sciences (NIMS)',
        experience: '18+ years',
        languages: ['English', 'Telugu', 'Hindi'],
        consultationFee: '₹1,600',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'TSMC-50001',
        rating: 4.9,
      },
      {
        name: 'Dr. Radhika Rao',
        email: 'dr.rrao@apollohospitals.com',
        phone: '9849123456',
        qualification: 'MBBS, MSc (Genetic Counseling)',
        specialty: 'Genetic Counselor',
        location: 'Hyderabad, Telangana',
        pincode: '500032',
        lat: 17.4325,
        lng: 78.4071,
        hospital: 'Apollo Hospitals, Jubilee Hills',
        experience: '11+ years',
        languages: ['English', 'Telugu', 'Hindi'],
        consultationFee: '₹1,300',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'TSMC-50002',
        rating: 4.7,
      },

      // ── CHENNAI, TAMIL NADU ──
      {
        name: 'Dr. K. S. Subramanian',
        email: 'dr.kssubramanian@apollo.com',
        phone: '9840012345',
        qualification: 'MD, DM (Onco-Genetics)',
        specialty: 'Cancer Genetics',
        location: 'Chennai, Tamil Nadu',
        pincode: '600006',
        lat: 13.0607,
        lng: 80.2512,
        hospital: 'Apollo Main Hospital, Greams Road',
        experience: '19+ years',
        languages: ['English', 'Tamil', 'Malayalam'],
        consultationFee: '₹1,800',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'TNMC-60001',
        rating: 4.9,
      },
      {
        name: 'Dr. Meenakshi Sundaram',
        email: 'dr.msundaram@mmc.edu.in',
        phone: '9840123456',
        qualification: 'MD (OBGYN), DM (Prenatal Genetics)',
        specialty: 'Prenatal Genetics',
        location: 'Chennai, Tamil Nadu',
        pincode: '600003',
        lat: 13.0823,
        lng: 80.2785,
        hospital: 'Madras Medical College & Rajiv Gandhi Hospital',
        experience: '15+ years',
        languages: ['English', 'Tamil'],
        consultationFee: '₹1,400',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'TNMC-60002',
        rating: 4.8,
      },

      // ── KOLKATA, WEST BENGAL ──
      {
        name: 'Dr. Debasis Banerjee',
        email: 'dr.dbanerjee@sskm.gov.in',
        phone: '9830012345',
        qualification: 'MD, DM (Medical Genetics)',
        specialty: 'Clinical Geneticist',
        location: 'Kolkata, West Bengal',
        pincode: '700020',
        lat: 22.5392,
        lng: 88.3444,
        hospital: 'SSKM Hospital & IPGMER, Bhowanipore',
        experience: '17+ years',
        languages: ['English', 'Bengali', 'Hindi'],
        consultationFee: '₹1,400',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'WBMC-70001',
        rating: 4.8,
      },
      {
        name: 'Dr. Sharmistha Sen',
        email: 'dr.ssen@apollogleneagles.in',
        phone: '9830123456',
        qualification: 'MBBS, MSc (Human Genetics)',
        specialty: 'Genetic Counselor',
        location: 'Kolkata, West Bengal',
        pincode: '700098',
        lat: 22.5786,
        lng: 88.4089,
        hospital: 'Apollo Gleneagles Hospital, Salt Lake',
        experience: '10+ years',
        languages: ['English', 'Bengali', 'Hindi'],
        consultationFee: '₹1,200',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'WBMC-70002',
        rating: 4.7,
      },

      // ── PUNE, MAHARASHTRA ──
      {
        name: 'Dr. Sachin Kadam',
        email: 'dr.skadam@rubyhall.com',
        phone: '9822012345',
        qualification: 'MD (Pediatrics), DM (Genetics)',
        specialty: 'Pediatric Genetics',
        location: 'Pune, Maharashtra',
        pincode: '411001',
        lat: 18.5284,
        lng: 73.8739,
        hospital: 'Ruby Hall Clinic & Sassoon Hospital',
        experience: '13+ years',
        languages: ['English', 'Marathi', 'Hindi'],
        consultationFee: '₹1,500',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MMC-80001',
        rating: 4.8,
      },

      // ── AHMEDABAD, GUJARAT ──
      {
        name: 'Dr. Parag Shah',
        email: 'dr.pshah@civilhospital.gov.in',
        phone: '9825012345',
        qualification: 'MD, DM (Genetics)',
        specialty: 'Clinical Geneticist',
        location: 'Ahmedabad, Gujarat',
        pincode: '380016',
        lat: 23.0526,
        lng: 72.6022,
        hospital: 'Civil Hospital & B.J. Medical College',
        experience: '16+ years',
        languages: ['English', 'Gujarati', 'Hindi'],
        consultationFee: '₹1,300',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'GMC-90001',
        rating: 4.8,
      },
    ];

    const doctors = await Doctor.insertMany(doctorRawData);
    console.log(`[SeedScript] ✓ ${doctors.length} Doctors inserted`);

    // ──────────────────────────────────────────────────────────────────────────
    // APPOINTMENTS (20 dummy records)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[SeedScript] Seeding 20 Appointments...');
    const consultationTypes = ['video', 'audio', 'chat'];
    const statuses = ['completed', 'completed', 'scheduled', 'cancelled'];
    const timeSlots = ['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'];

    const appointmentDocs = [];
    for (let i = 0; i < 20; i++) {
      const user = users[i % users.length];
      const doctor = doctors[i % doctors.length];
      const type = consultationTypes[i % consultationTypes.length];
      const status = statuses[i % statuses.length];

      // Spread dates: 15 past appointments (-30 to -1 days), 5 upcoming (+1 to +7 days)
      const isUpcoming = status === 'scheduled';
      const appointDateObj = isUpcoming ? daysAhead((i % 7) + 1) : daysAgo((i % 25) + 1);
      const dateString = appointDateObj.toISOString().split('T')[0];

      appointmentDocs.push({
        patientId: user._id.toString(),
        patientName: `${user.firstName} ${user.lastName}`,
        patientEmail: user.email,
        patientPhone: user.phone,
        doctorId: doctor._id.toString(),
        doctorName: doctor.name,
        doctorSpecialty: doctor.specialty,
        consultationType: type,
        appointmentDate: dateString,
        timeSlot: timeSlots[i % timeSlots.length],
        channelName: `gene-guard-room-${i + 100}`,
        status: status,
        notes: isUpcoming ? 'Pre-consultation genetic risk evaluation scheduled' : 'Consultation finished successfully',
        createdAt: appointDateObj,
        updatedAt: appointDateObj,
      });
    }

    const appointments = await Appointment.insertMany(appointmentDocs);
    console.log(`[SeedScript] ✓ ${appointments.length} Appointments inserted`);

    console.log('[SeedScript] 🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    return true;
  } catch (error) {
    console.error('[SeedScript] ✗ Error seeding database:', error.message);
    return false;
  }
};

export default seedDatabase;

// Run directly if invoked from CLI
if (process.argv[1] && process.argv[1].includes('seedData.js')) {
  seedDatabase().then(() => mongoose.disconnect().then(() => process.exit(0)));
}
