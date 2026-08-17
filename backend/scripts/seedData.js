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
    // DOCTORS (12 doctors - All Mumbai strictly with real Mumbai pincodes)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('[SeedScript] Seeding 12 Doctors (Mumbai Pincodes)...');
    const doctorRawData = [
      {
        name: 'Dr. Rajesh Sharma',
        email: 'dr.rsharma@kemhospital.edu',
        phone: '9820011223',
        qualification: 'MD, DM (Medical Genetics)',
        specialty: 'Clinical Geneticist',
        location: 'Mumbai, Maharashtra',
        pincode: '400012',
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
        hospital: 'P. D. Hinduja National Hospital, Mahim',
        experience: '18+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹2,000',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10004',
        rating: 5.0,
      },
      {
        name: 'Dr. Sneha Mehta',
        email: 'dr.smehta@lilavatihospital.com',
        phone: '9820055667',
        qualification: 'MBBS, MSc (Clinical Genetics)',
        specialty: 'Genetic Counselor',
        location: 'Mumbai, Maharashtra',
        pincode: '400050',
        hospital: 'Lilavati Hospital & Research Centre, Bandra West',
        experience: '8+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹1,000',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10005',
        rating: 4.7,
      },
      {
        name: 'Dr. Amit Kulkarni',
        email: 'dr.akulkarni@breachcandy.org',
        phone: '9820066778',
        qualification: 'MD (Internal Medicine), DM (Genetics)',
        specialty: 'Clinical Geneticist',
        location: 'Mumbai, Maharashtra',
        pincode: '400026',
        hospital: 'Breach Candy Hospital, Cumballa Hill',
        experience: '20+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹2,000',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10006',
        rating: 4.9,
      },
      {
        name: 'Dr. Meera Shah',
        email: 'dr.mshah@cooperhospital.org',
        phone: '9820077889',
        qualification: 'MD (OBGYN), Fellowship Fetal Medicine',
        specialty: 'Prenatal Genetics',
        location: 'Mumbai, Maharashtra',
        pincode: '400056',
        hospital: 'RN Cooper Hospital, Vile Parle West',
        experience: '14+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹1,400',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10007',
        rating: 4.8,
      },
      {
        name: 'Dr. Suresh Verma',
        email: 'dr.sverma@jaslokhospital.net',
        phone: '9820088990',
        qualification: 'MD, DM (Medical Genetics)',
        specialty: 'Cancer Genetics',
        location: 'Mumbai, Maharashtra',
        pincode: '400026',
        hospital: 'Jaslok Hospital & Research Centre, Pedder Road',
        experience: '16+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹1,800',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10008',
        rating: 4.9,
      },
      {
        name: 'Dr. Kavita Rao',
        email: 'dr.krao@sevenhillshospital.com',
        phone: '9820099001',
        qualification: 'MBBS, MSc (Genetics)',
        specialty: 'Genetic Counselor',
        location: 'Mumbai, Maharashtra',
        pincode: '400059',
        hospital: 'SevenHills Hospital, Andheri East',
        experience: '9+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹900',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10009',
        rating: 4.6,
      },
      {
        name: 'Dr. Rohan Patel',
        email: 'dr.rpatel@nanavatihospital.org',
        phone: '9820100112',
        qualification: 'MD (Pediatrics), Fellowship Clinical Genetics',
        specialty: 'Clinical Geneticist',
        location: 'Mumbai, Maharashtra',
        pincode: '400056',
        hospital: 'Dr. Balabhai Nanavati Hospital, Vile Parle West',
        experience: '11+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹1,300',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10010',
        rating: 4.8,
      },
      {
        name: 'Dr. Neha Agarwal',
        email: 'dr.nagarwal@fortishospitals.in',
        phone: '9820111223',
        qualification: 'DM (Medical Genetics)',
        specialty: 'Prenatal Genetics',
        location: 'Mumbai, Maharashtra',
        pincode: '400080',
        hospital: 'Fortis Hospital, Mulund West',
        experience: '13+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹1,600',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10011',
        rating: 4.8,
      },
      {
        name: 'Dr. Alok Gupta',
        email: 'dr.agupta@rfhospital.org',
        phone: '9820122334',
        qualification: 'MD, PhD (Onco-Genomics)',
        specialty: 'Cancer Genetics',
        location: 'Mumbai, Maharashtra',
        pincode: '400004',
        hospital: 'Sir H. N. Reliance Foundation Hospital, Girgaon',
        experience: '17+ years',
        languages: ['English', 'Hindi', 'Marathi'],
        consultationFee: '₹1,900',
        status: 'approved',
        source: 'manual',
        registrationNumber: 'MCI-10012',
        rating: 4.9,
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
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[SeedScript] ✗ Error seeding database:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDatabase();
