import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Patient from '../models/Patient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gene-guard';
const DEMO_PASSWORD = 'Demo@1234';

// ─── Realistic Indian Names ──────────────────────────────────────────────────
const maleFirstNames = [
  'Aarav', 'Rohan', 'Vikram', 'Kabir', 'Aditya', 'Siddharth', 'Karan', 'Arjun',
  'Rahul', 'Varun', 'Nikhil', 'Ayush', 'Dev', 'Kunal', 'Pranav', 'Yash',
  'Ritvik', 'Alok', 'Harsh', 'Manan', 'Dhruv', 'Tushar', 'Saurabh', 'Gaurav',
  'Abhishek', 'Aniket', 'Vivek', 'Rajesh', 'Suresh', 'Deepak', 'Sameer', 'Rakesh',
  'Manish', 'Amit', 'Sanjay', 'Vijay', 'Ashish', 'Mohit', 'Tarun', 'Chetan',
  'Rishi', 'Mayank', 'Harish', 'Naveen', 'Gautam', 'Karthik', 'Nirav', 'Sachin'
];

const femaleFirstNames = [
  'Diya', 'Priya', 'Ananya', 'Sneha', 'Neha', 'Pooja', 'Tanvi', 'Riya',
  'Ishita', 'Shreya', 'Aditi', 'Meera', 'Anjali', 'Simran', 'Divya', 'Natasha',
  'Rhea', 'Krisha', 'Avani', 'Sakshi', 'Pallavi', 'Swati', 'Radhika', 'Bhavna',
  'Sonali', 'Sunita', 'Kavita', 'Rekha', 'Preeti', 'Payal', 'Komal', 'Nidhi',
  'Suman', 'Shilpa', 'Rashmi', 'Deepa', 'Jyoti', 'Vandana', 'Geeta', 'Anita',
  'Aparna', 'Shruti', 'Madhuri', 'Nandini', 'Bhumika', 'Richa', 'Ira', 'Charu'
];

const lastNames = [
  'Sharma', 'Patel', 'Mehta', 'Deshmukh', 'Singh', 'Kulkarni', 'Verma', 'Rao',
  'Joshi', 'Nair', 'Gupta', 'Bhat', 'Kapoor', 'Reddy', 'Iyer', 'Chatterjee',
  'Banerjee', 'Mukherjee', 'Sen', 'Ghosh', 'Das', 'Choudhury', 'Agarwal', 'Tiwari',
  'Pandey', 'Mishra', 'Dubey', 'Shukla', 'Yadav', 'Chauhan', 'Rathore', 'Thakur',
  'Pillai', 'Menon', 'Nambiar', 'Hegde', 'Shetty', 'Pai', 'Kamat', 'Nayak',
  'Saxena', 'Bhatia', 'Malhotra', 'Khanna', 'Chawla', 'Sood', 'Bhardwaj', 'Dutta'
];

// ─── Indian Cities with Geo Coordinates, Pincodes & Metro Weights ─────────────
const cities = [
  { city: 'Mumbai', state: 'Maharashtra', pinPrefix: '400', lat: 19.0760, lng: 72.8777, weight: 26 },
  { city: 'Delhi', state: 'Delhi NCR', pinPrefix: '110', lat: 28.6139, lng: 77.2090, weight: 24 },
  { city: 'Bangalore', state: 'Karnataka', pinPrefix: '560', lat: 12.9716, lng: 77.5946, weight: 22 },
  { city: 'Pune', state: 'Maharashtra', pinPrefix: '411', lat: 18.5204, lng: 73.8567, weight: 16 },
  { city: 'Hyderabad', state: 'Telangana', pinPrefix: '500', lat: 17.3850, lng: 78.4867, weight: 16 },
  { city: 'Chennai', state: 'Tamil Nadu', pinPrefix: '600', lat: 13.0827, lng: 80.2707, weight: 14 },
  { city: 'Kolkata', state: 'West Bengal', pinPrefix: '700', lat: 22.5726, lng: 88.3639, weight: 14 },
  { city: 'Ahmedabad', state: 'Gujarat', pinPrefix: '380', lat: 23.0225, lng: 72.5714, weight: 12 },
  { city: 'Jaipur', state: 'Rajasthan', pinPrefix: '302', lat: 26.9124, lng: 75.7873, weight: 8 },
  { city: 'Lucknow', state: 'Uttar Pradesh', pinPrefix: '226', lat: 26.8467, lng: 80.9462, weight: 8 },
  { city: 'Chandigarh', state: 'Punjab', pinPrefix: '160', lat: 30.7333, lng: 76.7794, weight: 7 },
  { city: 'Kochi', state: 'Kerala', pinPrefix: '682', lat: 9.9312, lng: 76.2673, weight: 7 },
  { city: 'Indore', state: 'Madhya Pradesh', pinPrefix: '452', lat: 22.7196, lng: 75.8577, weight: 7 },
  { city: 'Nagpur', state: 'Maharashtra', pinPrefix: '440', lat: 21.1458, lng: 79.0882, weight: 6 },
  { city: 'Bhopal', state: 'Madhya Pradesh', pinPrefix: '462', lat: 23.2599, lng: 77.4126, weight: 5 },
  { city: 'Surat', state: 'Gujarat', pinPrefix: '395', lat: 21.1702, lng: 72.8311, weight: 5 },
  { city: 'Patna', state: 'Bihar', pinPrefix: '800', lat: 25.5941, lng: 85.1376, weight: 4 },
  { city: 'Coimbatore', state: 'Tamil Nadu', pinPrefix: '641', lat: 11.0168, lng: 76.9558, weight: 3 },
];

const emailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];

// ─── Indian Genetic Disorders for Family History ─────────────────────────────
const geneticDisorders = [
  { disorder: 'Thalassemia Minor', symptoms: 'Mild symptoms', risk: 'low' },
  { disorder: 'Thalassemia Major', symptoms: 'Severe', risk: 'high' },
  { disorder: 'Sickle Cell Trait', symptoms: 'Mild symptoms', risk: 'medium' },
  { disorder: 'Sickle Cell Anemia', symptoms: 'Severe', risk: 'high' },
  { disorder: 'Cystic Fibrosis Carrier', symptoms: 'Mild symptoms', risk: 'low' },
  { disorder: 'Huntington’s Disease', symptoms: 'Severe', risk: 'high' },
  { disorder: 'Hemophilia A', symptoms: 'Severe', risk: 'high' },
  { disorder: 'Down Syndrome', symptoms: 'Severe', risk: 'high' },
  { disorder: 'Duchenne Muscular Dystrophy', symptoms: 'Severe', risk: 'high' },
  { disorder: 'BRCA1 Mutation (Breast Cancer Risk)', symptoms: 'Recurring symptoms', risk: 'high' },
  { disorder: 'BRCA2 Hereditary Risk', symptoms: 'Recurring symptoms', risk: 'medium' },
  { disorder: 'Lynch Syndrome', symptoms: 'Recurring symptoms', risk: 'high' },
  { disorder: 'Familial Hypercholesterolemia', symptoms: 'Recurring symptoms', risk: 'medium' },
  { disorder: 'G6PD Deficiency', symptoms: 'Mild symptoms', risk: 'low' },
  { disorder: 'Cardiomyopathy (HCM)', symptoms: 'Severe', risk: 'high' },
];

// Helper: Pick weighted item from array
function pickWeightedCity() {
  const totalWeight = cities.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;
  for (const c of cities) {
    if (random < c.weight) return c;
    random -= c.weight;
  }
  return cities[0];
}

// Helper: Realistic Indian blood group distribution
function pickBloodGroup() {
  const r = Math.random();
  if (r < 0.37) return 'O+';
  if (r < 0.69) return 'B+';
  if (r < 0.90) return 'A+';
  if (r < 0.97) return 'AB+';
  if (r < 0.985) return 'O-';
  if (r < 0.995) return 'B-';
  if (r < 0.998) return 'A-';
  return 'AB-';
}

// Helper: Age 18–70 weighted towards 22–45
function pickAge() {
  const r = Math.random();
  if (r < 0.70) {
    // 22 to 45
    return Math.floor(22 + Math.random() * 24);
  } else if (r < 0.85) {
    // 18 to 21
    return Math.floor(18 + Math.random() * 4);
  } else {
    // 46 to 70
    return Math.floor(46 + Math.random() * 25);
  }
}

// Helper: Date in last 6 months (180 days) with exponential growth
function generateSignupDate(index, total) {
  const now = new Date();
  // Upward growth trend: more signups towards recent days
  // Use quadratic weight for recent months
  const progress = index / total; // 0 to 1
  const weightedDayOffset = Math.floor(180 * Math.pow(1 - progress, 1.6));
  
  // Add some day-to-day noise (-2 to +2 days)
  const noise = Math.floor(Math.random() * 5) - 2;
  const daysAgo = Math.max(0, Math.min(180, weightedDayOffset + noise));
  
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  // Random time during the day
  date.setHours(Math.floor(8 + Math.random() * 14));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  return date;
}

// ─── CLEAR ONLY SEEDED USERS ─────────────────────────────────────────────────
export const clearSeededUsers = async () => {
  console.log('[SeedScript] Connecting to MongoDB to clear seeded records...');
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  
  const userResult = await User.deleteMany({ isSeeded: true });
  const patientResult = await Patient.deleteMany({ isSeeded: true });
  
  console.log(`[SeedScript] ✓ Removed ${userResult.deletedCount} seeded User records`);
  console.log(`[SeedScript] ✓ Removed ${patientResult.deletedCount} seeded Patient records`);
  await mongoose.disconnect();
};

// ─── MAIN SEED FUNCTION ──────────────────────────────────────────────────────
export const seedDummyUsers = async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🌱 GeneGuard — Seeding 200 Realistic Dummy Indian Users');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('[SeedScript] Connecting to MongoDB at:', MONGODB_URI);

  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('[SeedScript] ✓ Connected to MongoDB');

  // 1. Idempotency: Remove previous seeded users first
  const deletedUsers = await User.deleteMany({ isSeeded: true });
  const deletedPatients = await Patient.deleteMany({ isSeeded: true });
  console.log(
    `[SeedScript] Cleaned up previous seed data (${deletedUsers.deletedCount} users, ${deletedPatients.deletedCount} patients)`
  );

  // 2. Hash demo password once
  console.log(`[SeedScript] Hashing known demo password "${DEMO_PASSWORD}" with bcrypt...`);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 3. Generate 200 users
  const TOTAL_USERS = 200;
  const usedEmails = new Set();
  const existingUsers = await User.find({}, 'email').lean();
  existingUsers.forEach((u) => usedEmails.add(u.email.toLowerCase()));

  const usersToInsert = [];
  const patientsToInsert = [];

  const summary = {
    total: TOTAL_USERS,
    byCity: {},
    byBloodGroup: {},
    familyHistoryYes: 0,
    familyHistoryNo: 0,
    byMonth: {},
  };

  for (let i = 0; i < TOTAL_USERS; i++) {
    const isMale = Math.random() < 0.52;
    const firstName = isMale
      ? maleFirstNames[Math.floor(Math.random() * maleFirstNames.length)]
      : femaleFirstNames[Math.floor(Math.random() * femaleFirstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = isMale ? 'Male' : 'Female';

    // Unique email generation
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
    const pattern = Math.floor(Math.random() * 4);
    let emailBase = '';
    if (pattern === 0) emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    else if (pattern === 1) emailBase = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
    else if (pattern === 2) emailBase = `${firstName.toLowerCase()}${Math.floor(10 + Math.random() * 899)}`;
    else emailBase = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(1 + Math.random() * 99)}`;

    let email = `${emailBase}@${domain}`;
    let counter = 1;
    while (usedEmails.has(email)) {
      email = `${emailBase}${counter}@${domain}`;
      counter++;
    }
    usedEmails.add(email);

    // City & Location
    const cityObj = pickWeightedCity();
    const cityStr = `${cityObj.city}, ${cityObj.state}`;
    const pincode = `${cityObj.pinPrefix}${String(Math.floor(100 + Math.random() * 899))}`;
    // Small offset for lat/long (~1–4km)
    const lat = Number((cityObj.lat + (Math.random() - 0.5) * 0.04).toFixed(4));
    const lng = Number((cityObj.lng + (Math.random() - 0.5) * 0.04).toFixed(4));

    // Age & Date of Birth
    const age = pickAge();
    const birthYear = new Date().getFullYear() - age;
    const birthMonth = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
    const birthDay = String(Math.floor(1 + Math.random() * 28)).padStart(2, '0');
    const dobStr = `${birthYear}-${birthMonth}-${birthDay}`;

    // Phone (10 digits starting with Indian mobile prefixes)
    const phonePrefix = ['98', '97', '96', '99', '91', '88', '87', '70', '79'][Math.floor(Math.random() * 9)];
    const phone = `${phonePrefix}${Math.floor(10000000 + Math.random() * 89999999)}`;

    // Blood Group
    const bloodGroup = pickBloodGroup();

    // Family History of Genetic Disorders (~35% Yes, 65% No)
    const hasFamilyHistory = Math.random() < 0.35;
    let disorder = 'None';
    let symptoms = 'No symptoms';
    let riskLevel = 'low';

    if (hasFamilyHistory) {
      summary.familyHistoryYes++;
      const selectedDisorder = geneticDisorders[Math.floor(Math.random() * geneticDisorders.length)];
      disorder = selectedDisorder.disorder;
      symptoms = selectedDisorder.symptoms;
      riskLevel = selectedDisorder.risk;
    } else {
      summary.familyHistoryNo++;
      // Even without strong family history, a small fraction has mild symptoms
      if (Math.random() < 0.15) {
        symptoms = 'Mild symptoms';
        riskLevel = 'low';
      }
    }

    // Created At with growth curve across last 6 months
    const createdAt = generateSignupDate(i, TOTAL_USERS);
    const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 3600000));

    // Aggregate metrics for summary
    summary.byCity[cityObj.city] = (summary.byCity[cityObj.city] || 0) + 1;
    summary.byBloodGroup[bloodGroup] = (summary.byBloodGroup[bloodGroup] || 0) + 1;
    const monthKey = createdAt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    summary.byMonth[monthKey] = (summary.byMonth[monthKey] || 0) + 1;

    // 1. User document
    usersToInsert.push({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dobStr,
      passwordHash,
      role: 'user',
      status: 'active',
      consentGiven: true,
      isVerified: true,
      isSeeded: true,
      createdAt,
      updatedAt,
      lastLogin: createdAt,
    });

    // 2. Matching Patient document for analytics and patient directory
    patientsToInsert.push({
      firstName,
      lastName,
      email,
      age,
      sex: gender,
      bloodGroup,
      familyHistory: hasFamilyHistory ? 'Yes' : 'No',
      knownDisorder: disorder,
      currentSymptoms: symptoms,
      location: cityStr,
      isHighRisk: riskLevel === 'high',
      riskLevel,
      isSeeded: true,
      consultedDoctor: Math.random() < 0.3 ? 'Yes' : 'No',
      createdAt,
      updatedAt,
    });
  }

  // Insert documents in bulk
  console.log(`[SeedScript] Inserting ${usersToInsert.length} User records...`);
  const insertedUsers = await User.insertMany(usersToInsert);
  console.log(`[SeedScript] ✓ Successfully inserted ${insertedUsers.length} Users!`);

  console.log(`[SeedScript] Inserting ${patientsToInsert.length} Patient Intake records...`);
  const insertedPatients = await Patient.insertMany(patientsToInsert);
  console.log(`[SeedScript] ✓ Successfully inserted ${insertedPatients.length} Patient records!`);

  // Print Summary
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log('📊 SEED SUMMARY REPORT');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`• Total Users Seeded:        ${summary.total}`);
  console.log(`• Known Demo Password:       "${DEMO_PASSWORD}" (for all 200 users)`);
  console.log(`• All isVerified:            true`);
  console.log(`• All isSeeded:              true`);
  console.log(`• Family History:            Yes: ${summary.familyHistoryYes} (${((summary.familyHistoryYes/200)*100).toFixed(1)}%) | No: ${summary.familyHistoryNo} (${((summary.familyHistoryNo/200)*100).toFixed(1)}%)`);

  console.log('\n📍 Distribution Across Top Indian Cities:');
  Object.entries(summary.byCity)
    .sort((a, b) => b[1] - a[1])
    .forEach(([city, count]) => {
      console.log(`   - ${city.padEnd(16)}: ${count} users (${((count/200)*100).toFixed(1)}%)`);
    });

  console.log('\n🩸 Blood Group Breakdown:');
  Object.entries(summary.byBloodGroup)
    .sort((a, b) => b[1] - a[1])
    .forEach(([bg, count]) => {
      console.log(`   - ${bg.padEnd(6)}: ${count} users (${((count/200)*100).toFixed(1)}%)`);
    });

  console.log('\n📅 Signups by Month (Upward Trend):');
  Object.entries(summary.byMonth).forEach(([month, count]) => {
    console.log(`   - ${month.padEnd(12)}: ${count} signups`);
  });
  console.log('───────────────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('[SeedScript] Database connection closed. Done!');
};

// Check CLI arguments for clear mode
const isClearMode = process.argv.includes('--clear') || process.argv.includes('clear');

if (isClearMode) {
  clearSeededUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SeedScript] Error clearing seeded data:', err);
      process.exit(1);
    });
} else {
  seedDummyUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SeedScript] Error seeding dummy users:', err);
      process.exit(1);
    });
}
