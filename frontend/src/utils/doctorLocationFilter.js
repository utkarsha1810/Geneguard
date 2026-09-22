/**
 * GeneGuard Doctor Location-Based Filtering & Distance Ranking Engine
 * 
 * Implements:
 * 1. Haversine distance calculation between user coordinates and doctor coordinates.
 * 2. Instant dictionary lookup for major Indian cities, states, and pincode prefixes.
 * 3. Progressive radius expansion fallback:
 *    - Tier 1: Local area (within 50 km or matching city/pincode)
 *    - Tier 2: Regional / State expansion (within 300 km or matching state)
 *    - Tier 3: Nationwide nearest available doctors fallback
 * 4. Strict distance sorting with tie-breaking:
 *    - Ascending distance from user (nearest first)
 *    - Tie-breaker 1: Rating descending (higher rated first)
 *    - Tie-breaker 2: Availability (Available online first)
 *    - Tie-breaker 3: Clinical experience
 * 5. Safe handling of missing location data on doctor records (logged, no crashes, placed gracefully at end).
 */

// Haversine formula to compute distance between two geographical points in kilometers
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);

  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Comprehensive dictionary of major Indian cities, coordinates & central pincodes
export const INDIAN_CITY_COORDINATES = {
  mumbai: {
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    lat: 18.9388,
    lng: 72.8354,
    aliases: ['mumbai', 'bombay', 'navi mumbai', 'thane', 'bandra', 'andheri', 'parel', 'dadar'],
  },
  pune: {
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    lat: 18.5284,
    lng: 73.8739,
    aliases: ['pune', 'poona', 'pimprichinchwad', 'pimpri', 'chinchwad', 'wakad', 'baner'],
  },
  delhi: {
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    lat: 28.6139,
    lng: 77.2090,
    aliases: ['delhi', 'new delhi', 'ncr', 'central delhi', 'south delhi', 'rohini', 'dwarka'],
  },
  gurgaon: {
    city: 'Gurgaon',
    state: 'Haryana',
    pincode: '122001',
    lat: 28.4595,
    lng: 77.0266,
    aliases: ['gurgaon', 'gurugram', 'haryana ncr', 'sohna'],
  },
  noida: {
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    lat: 28.5355,
    lng: 77.3910,
    aliases: ['noida', 'greater noida', 'ghaziabad', 'up ncr'],
  },
  bangalore: {
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    lat: 12.9716,
    lng: 77.5946,
    aliases: ['bangalore', 'bengaluru', 'whitefield', 'indiranagar', 'koramangala', 'electronic city', 'jayanagar'],
  },
  hyderabad: {
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    lat: 17.3850,
    lng: 78.4867,
    aliases: ['hyderabad', 'secunderabad', 'hitec city', 'jubilee hills', 'banjara hills', 'cyberabad'],
  },
  chennai: {
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    lat: 13.0827,
    lng: 80.2707,
    aliases: ['chennai', 'madras', 't nagar', 'adyar', 'velachery', 'anna nagar'],
  },
  kolkata: {
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700001',
    lat: 22.5726,
    lng: 88.3639,
    aliases: ['kolkata', 'calcutta', 'salt lake', 'howrah', 'bhowanipore', 'new town'],
  },
  ahmedabad: {
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380001',
    lat: 23.0225,
    lng: 72.5714,
    aliases: ['ahmedabad', 'amdavad', 'gandhinagar', 'maninagar', 'sg highway'],
  },
  jaipur: {
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    lat: 26.9124,
    lng: 75.7873,
    aliases: ['jaipur', 'pink city', 'vaishali nagar', 'malviya nagar'],
  },
  chandigarh: {
    city: 'Chandigarh',
    state: 'Punjab',
    pincode: '160017',
    lat: 30.7333,
    lng: 76.7794,
    aliases: ['chandigarh', 'mohali', 'panchkula', 'tricity'],
  },
  lucknow: {
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    pincode: '226001',
    lat: 26.8467,
    lng: 80.9462,
    aliases: ['lucknow', 'hazratganj', 'gomti nagar', 'aliganj'],
  },
  nagpur: {
    city: 'Nagpur',
    state: 'Maharashtra',
    pincode: '440001',
    lat: 21.1458,
    lng: 79.0882,
    aliases: ['nagpur', 'dharampeth', 'sitabuldi'],
  },
  indore: {
    city: 'Indore',
    state: 'Madhya Pradesh',
    pincode: '452001',
    lat: 22.7196,
    lng: 75.8577,
    aliases: ['indore', 'vijay nagar', 'palasia'],
  },
  coimbatore: {
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641001',
    lat: 11.0168,
    lng: 76.9558,
    aliases: ['coimbatore', 'kovai', 'rs puram', 'peelamedu'],
  },
  kochi: {
    city: 'Kochi',
    state: 'Kerala',
    pincode: '682001',
    lat: 9.9312,
    lng: 76.2673,
    aliases: ['kochi', 'cochin', 'ernakulam', 'kakkanad', 'edappally'],
  },
  visakhapatnam: {
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '530001',
    lat: 17.6868,
    lng: 83.2185,
    aliases: ['visakhapatnam', 'vizag', 'waltair', 'gajuwaka'],
  },
  bhopal: {
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462001',
    lat: 23.2599,
    lng: 77.4126,
    aliases: ['bhopal', 'arera colony', 'mp nagar'],
  },
  patna: {
    city: 'Patna',
    state: 'Bihar',
    pincode: '800001',
    lat: 25.5941,
    lng: 85.1376,
    aliases: ['patna', 'kankarbagh', 'bailey road'],
  },
  bhubaneswar: {
    city: 'Bhubaneswar',
    state: 'Odisha',
    pincode: '751001',
    lat: 20.2961,
    lng: 85.8245,
    aliases: ['bhubaneswar', 'cuttack', 'saheed nagar'],
  },
  guwahati: {
    city: 'Guwahati',
    state: 'Assam',
    pincode: '781001',
    lat: 26.1445,
    lng: 91.7362,
    aliases: ['guwahati', 'dispur', 'paltan bazaar'],
  },
  shimla: {
    city: 'Shimla',
    state: 'Himachal Pradesh',
    pincode: '171001',
    lat: 31.1048,
    lng: 77.1734,
    aliases: ['shimla', 'solan', 'kullu', 'manali'],
  },
  srinagar: {
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190001',
    lat: 34.0837,
    lng: 74.7973,
    aliases: ['srinagar', 'jammu', 'anantnag', 'baramulla'],
  },
};

// Pincode 3-digit prefix mapping to Indian hubs
const PINCODE_PREFIX_LOOKUP = {
  '400': { city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  '411': { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  '110': { city: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090 },
  '122': { city: 'Gurgaon', state: 'Haryana', lat: 28.4595, lng: 77.0266 },
  '201': { city: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910 },
  '560': { city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  '500': { city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  '600': { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  '700': { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  '380': { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  '302': { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  '160': { city: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794 },
  '226': { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  '440': { city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  '452': { city: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  '641': { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  '682': { city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
  '530': { city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  '462': { city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
  '800': { city: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  '751': { city: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
  '781': { city: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
  '171': { city: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
};

/**
 * Resolves a location string or pincode into structured location details
 * @param {string} input - City name, state, or 6-digit pincode
 * @returns {object} { city, state, pincode, coords: { lat, lng }, isExact: boolean }
 */
export function resolveLocationInput(input) {
  if (!input || typeof input !== 'string') {
    return {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      coords: { lat: 18.9388, lng: 72.8354 },
      isExact: false,
    };
  }

  const raw = input.trim();

  // 1. Check for 6-digit pincode in input
  const pinMatch = raw.match(/\b\d{6}\b/);
  if (pinMatch) {
    const pin = pinMatch[0];
    const prefix3 = pin.substring(0, 3);
    const prefixMatch = PINCODE_PREFIX_LOOKUP[prefix3];

    if (prefixMatch) {
      return {
        city: prefixMatch.city,
        state: prefixMatch.state,
        pincode: pin,
        coords: { lat: prefixMatch.lat, lng: prefixMatch.lng },
        isExact: true,
      };
    }

    // Default coordinates based on general Indian geographic center if prefix unknown
    return {
      city: `Pincode ${pin}`,
      state: 'India',
      pincode: pin,
      coords: { lat: 20.5937, lng: 78.9629 },
      isExact: false,
    };
  }

  // 2. Check for city / alias matches
  const cleanText = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = cleanText.split(/\s+/).filter(Boolean);

  for (const [key, info] of Object.entries(INDIAN_CITY_COORDINATES)) {
    // Check aliases
    const matchedAlias = info.aliases.some((alias) =>
      cleanText.includes(alias) || tokens.includes(alias)
    );
    if (matchedAlias || cleanText.includes(key)) {
      return {
        city: info.city,
        state: info.state,
        pincode: info.pincode,
        coords: { lat: info.lat, lng: info.lng },
        isExact: true,
      };
    }
  }

  // 3. Fallback for state mentions (e.g. "Karnataka", "Maharashtra", "Tamil Nadu", "Gujarat")
  const stateMappings = {
    maharashtra: { city: 'Mumbai', state: 'Maharashtra', lat: 18.9388, lng: 72.8354, pincode: '400001' },
    delhi: { city: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090, pincode: '110001' },
    karnataka: { city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946, pincode: '560001' },
    telangana: { city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, pincode: '500001' },
    'tamil nadu': { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, pincode: '600001' },
    'west bengal': { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, pincode: '700001' },
    gujarat: { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, pincode: '380001' },
    rajasthan: { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, pincode: '302001' },
    punjab: { city: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794, pincode: '160017' },
    haryana: { city: 'Gurgaon', state: 'Haryana', lat: 28.4595, lng: 77.0266, pincode: '122001' },
    kerala: { city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, pincode: '682001' },
  };

  for (const [stName, stData] of Object.entries(stateMappings)) {
    if (cleanText.includes(stName)) {
      return {
        city: stData.city,
        state: stData.state,
        pincode: stData.pincode,
        coords: { lat: stData.lat, lng: stData.lng },
        isExact: true,
      };
    }
  }

  // 4. Default to Mumbai fallback
  return {
    city: raw,
    state: 'India',
    pincode: '400001',
    coords: { lat: 18.9388, lng: 72.8354 },
    isExact: false,
  };
}

// ── VERIFIED INDIAN GENETIC SPECIALISTS ──────────────────────────────────────
// Fully synced with seedData.js across 8 major Indian health hubs + test teleconsultation doctor
export const verifiedIndianDoctors = [
  // ── MUMBAI, MAHARASHTRA ──
  {
    id: 'doc_in_1',
    name: 'Dr. Rajesh Sharma',
    qualification: 'MD, DM (Medical Genetics)',
    specialty: 'Clinical Geneticist',
    location: 'Mumbai, Maharashtra',
    pincode: '400012',
    lat: 19.0022,
    lng: 72.8427,
    registrationNumber: 'MCI-10001',
    experience: '15+ years',
    hospital: 'KEM Hospital, Parel',
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.9,
    status: 'Available',
    fee: '₹1,500',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',
  },
  {
    id: 'doc_in_2',
    name: 'Dr. Priya Nair',
    qualification: 'MBBS, MSc (Genetic Counseling)',
    specialty: 'Genetic Counselor',
    location: 'Mumbai, Maharashtra',
    pincode: '400012',
    lat: 19.0041,
    lng: 72.8432,
    registrationNumber: 'MCI-10002',
    experience: '10+ years',
    hospital: 'Tata Memorial Hospital, Parel',
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.8,
    status: 'Available',
    fee: '₹1,200',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop',
  },
  {
    id: 'doc_in_3',
    name: 'Dr. Ananya Deshmukh',
    qualification: 'MD (Pediatrics), DM (Genetics)',
    specialty: 'Prenatal Genetics',
    location: 'Mumbai, Maharashtra',
    pincode: '400053',
    lat: 19.1311,
    lng: 72.8252,
    registrationNumber: 'MCI-10003',
    experience: '12+ years',
    hospital: 'Kokilaben Dhirubhai Ambani Hospital, Andheri West',
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 4.9,
    status: 'Available',
    fee: '₹1,800',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop',
  },
  {
    id: 'doc_in_4',
    name: 'Dr. Vikram Joshi',
    qualification: 'MD, PhD (Genomics)',
    specialty: 'Cancer Genetics',
    location: 'Mumbai, Maharashtra',
    pincode: '400016',
    lat: 19.0345,
    lng: 72.8398,
    registrationNumber: 'MCI-10004',
    experience: '18+ years',
    hospital: 'P. D. Hinduja National Hospital, Mahim',
    languages: ['English', 'Hindi', 'Marathi'],
    rating: 5.0,
    status: 'Available',
    fee: '₹2,000',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop',
  },

  // ── DELHI / NCR ──
  {
    id: 'doc_in_5',
    name: 'Dr. Harshvardhan Gupta',
    qualification: 'MD, DM (Pediatric Genetics)',
    specialty: 'Clinical Geneticist',
    location: 'New Delhi, Delhi',
    pincode: '110029',
    lat: 28.5672,
    lng: 77.2100,
    registrationNumber: 'DMC-20001',
    experience: '20+ years',
    hospital: 'AIIMS New Delhi, Ansari Nagar',
    languages: ['English', 'Hindi', 'Punjabi'],
    rating: 5.0,
    status: 'Available',
    fee: '₹1,600',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop',
  },
  {
    id: 'doc_in_6',
    name: 'Dr. Sunita Kapoor',
    qualification: 'MD (Pathology), DM (Medical Genetics)',
    specialty: 'Prenatal & Carrier Screening',
    location: 'New Delhi, Delhi',
    pincode: '110002',
    lat: 28.6366,
    lng: 77.2407,
    registrationNumber: 'DMC-20002',
    experience: '14+ years',
    hospital: 'Maulana Azad Medical College (LNJP Hospital)',
    languages: ['English', 'Hindi'],
    rating: 4.8,
    status: 'Available',
    fee: '₹1,400',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',
  },
  {
    id: 'doc_in_7',
    name: 'Dr. Naresh Trehan',
    qualification: 'MD, DM (Cardio-Genetics)',
    specialty: 'Cardiovascular Genetics',
    location: 'Gurgaon, NCR',
    pincode: '122002',
    lat: 28.4389,
    lng: 77.0428,
    registrationNumber: 'HN-30001',
    experience: '22+ years',
    hospital: 'Medanta - The Medicity, Gurgaon',
    languages: ['English', 'Hindi'],
    rating: 4.9,
    status: 'Available',
    fee: '₹2,500',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop',
  },

  // ── BANGALORE, KARNATAKA ──
  {
    id: 'doc_in_8',
    name: 'Dr. Vijayalakshmi Rao',
    qualification: 'MD, DM (Neuro-Genetics)',
    specialty: 'Neurogenetics',
    location: 'Bangalore, Karnataka',
    pincode: '560029',
    lat: 12.9343,
    lng: 77.6101,
    registrationNumber: 'KMC-40001',
    experience: '16+ years',
    hospital: 'NIMHANS & St. John\'s Medical College',
    languages: ['English', 'Kannada', 'Hindi', 'Tamil'],
    rating: 4.9,
    status: 'Available',
    fee: '₹1,700',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop',
  },
  {
    id: 'doc_in_9',
    name: 'Dr. Arvind Narayanan',
    qualification: 'MD, DM (Genetics)',
    specialty: 'Clinical Geneticist',
    location: 'Bangalore, Karnataka',
    pincode: '560099',
    lat: 12.8090,
    lng: 77.6970,
    registrationNumber: 'KMC-40002',
    experience: '12+ years',
    hospital: 'Narayana Health City, Bommasandra',
    languages: ['English', 'Kannada', 'Tamil'],
    rating: 4.8,
    status: 'Available',
    fee: '₹1,500',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop',
  },

  // ── HYDERABAD, TELANGANA ──
  {
    id: 'doc_in_10',
    name: 'Dr. Venkat Reddy',
    qualification: 'MD, DM (Medical Genetics)',
    specialty: 'Clinical Geneticist',
    location: 'Hyderabad, Telangana',
    pincode: '500034',
    lat: 17.4156,
    lng: 78.4487,
    registrationNumber: 'TSMC-50001',
    experience: '18+ years',
    hospital: 'Nizam\'s Institute of Medical Sciences (NIMS)',
    languages: ['English', 'Telugu', 'Hindi'],
    rating: 4.9,
    status: 'Available',
    fee: '₹1,600',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop',
  },
  {
    id: 'doc_in_11',
    name: 'Dr. Radhika Rao',
    qualification: 'MBBS, MSc (Genetic Counseling)',
    specialty: 'Genetic Counselor',
    location: 'Hyderabad, Telangana',
    pincode: '500032',
    lat: 17.4325,
    lng: 78.4071,
    registrationNumber: 'TSMC-50002',
    experience: '11+ years',
    hospital: 'Apollo Hospitals, Jubilee Hills',
    languages: ['English', 'Telugu', 'Hindi'],
    rating: 4.7,
    status: 'Available',
    fee: '₹1,300',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',
  },

  // ── CHENNAI, TAMIL NADU ──
  {
    id: 'doc_in_12',
    name: 'Dr. K. S. Subramanian',
    qualification: 'MD, DM (Onco-Genetics)',
    specialty: 'Cancer Genetics',
    location: 'Chennai, Tamil Nadu',
    pincode: '600006',
    lat: 13.0607,
    lng: 80.2512,
    registrationNumber: 'TNMC-60001',
    experience: '19+ years',
    hospital: 'Apollo Main Hospital, Greams Road',
    languages: ['English', 'Tamil', 'Malayalam'],
    rating: 4.9,
    status: 'Available',
    fee: '₹1,800',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop',
  },
  {
    id: 'doc_in_13',
    name: 'Dr. Meenakshi Sundaram',
    qualification: 'MD (OBGYN), DM (Prenatal Genetics)',
    specialty: 'Prenatal Genetics',
    location: 'Chennai, Tamil Nadu',
    pincode: '600003',
    lat: 13.0823,
    lng: 80.2785,
    registrationNumber: 'TNMC-60002',
    experience: '15+ years',
    hospital: 'Madras Medical College & Rajiv Gandhi Hospital',
    languages: ['English', 'Tamil'],
    rating: 4.8,
    status: 'Available',
    fee: '₹1,400',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop',
  },

  // ── KOLKATA, WEST BENGAL ──
  {
    id: 'doc_in_14',
    name: 'Dr. Debasis Banerjee',
    qualification: 'MD, DM (Medical Genetics)',
    specialty: 'Clinical Geneticist',
    location: 'Kolkata, West Bengal',
    pincode: '700020',
    lat: 22.5392,
    lng: 88.3444,
    registrationNumber: 'WBMC-70001',
    experience: '17+ years',
    hospital: 'SSKM Hospital & IPGMER, Bhowanipore',
    languages: ['English', 'Bengali', 'Hindi'],
    rating: 4.8,
    status: 'Available',
    fee: '₹1,400',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop',
  },
  {
    id: 'doc_in_15',
    name: 'Dr. Sharmistha Sen',
    qualification: 'MBBS, MSc (Human Genetics)',
    specialty: 'Genetic Counselor',
    location: 'Kolkata, West Bengal',
    pincode: '700098',
    lat: 22.5786,
    lng: 88.4089,
    registrationNumber: 'WBMC-70002',
    experience: '10+ years',
    hospital: 'Apollo Gleneagles Hospital, Salt Lake',
    languages: ['English', 'Bengali', 'Hindi'],
    rating: 4.7,
    status: 'Available',
    fee: '₹1,200',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop',
  },

  // ── PUNE, MAHARASHTRA ──
  {
    id: 'doc_in_16',
    name: 'Dr. Sachin Kadam',
    qualification: 'MD (Pediatrics), DM (Genetics)',
    specialty: 'Pediatric Genetics',
    location: 'Pune, Maharashtra',
    pincode: '411001',
    lat: 18.5284,
    lng: 73.8739,
    registrationNumber: 'MMC-80001',
    experience: '13+ years',
    hospital: 'Ruby Hall Clinic & Sassoon Hospital',
    languages: ['English', 'Marathi', 'Hindi'],
    rating: 4.8,
    status: 'Available',
    fee: '₹1,500',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop',
  },

  // ── AHMEDABAD, GUJARAT ──
  {
    id: 'doc_in_17',
    name: 'Dr. Parag Shah',
    qualification: 'MD, DM (Genetics)',
    specialty: 'Clinical Geneticist',
    location: 'Ahmedabad, Gujarat',
    pincode: '380016',
    lat: 23.0526,
    lng: 72.6022,
    registrationNumber: 'GMC-90001',
    experience: '16+ years',
    hospital: 'Civil Hospital & B.J. Medical College',
    languages: ['English', 'Gujarati', 'Hindi'],
    rating: 4.8,
    status: 'Available',
    fee: '₹1,300',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop',
  },

  // ── EDGE CASE TEST DOCTOR: Teleconsultation with missing coordinates ──
  {
    id: 'doc_in_18',
    name: 'Dr. Aakash Verma',
    qualification: 'MD, DM (Genomics)',
    specialty: 'Cardiovascular & Metabolic Genetics',
    location: 'Pan-India Telehealth Service',
    pincode: '',
    lat: null, // Test edge case: missing lat
    lng: null, // Test edge case: missing lng
    registrationNumber: 'NMC-99999',
    experience: '14+ years',
    hospital: 'National Tele-Genomics Network',
    languages: ['English', 'Hindi'],
    rating: 4.7,
    status: 'Available',
    fee: '₹1,000',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop',
  },
];

/**
 * Filter and Rank Doctors based on location, radius expansion, and tie-breakers.
 *
 * @param {Object} params
 * @param {Array} params.doctors - List of doctor records
 * @param {Object} params.userCoords - { lat, lng }
 * @param {string} params.userCity - User city name
 * @param {string} params.userState - User state name
 * @param {string} params.userPincode - User pincode
 * @param {string} params.searchTerm - Text search query
 * @param {string} params.selectedSpecialty - Specialty filter
 * @param {string} params.statusFilter - Availability status filter
 * @param {number} [params.localRadiusKm=50] - Local threshold (km)
 * @param {number} [params.regionalRadiusKm=300] - Regional threshold (km)
 * @param {boolean} [params.hasLocation=true] - Whether user location was resolved
 *
 * @returns {Object} {
 *   doctors: Array,
 *   matchMode: 'local' | 'regional_fallback' | 'nationwide_fallback' | 'no_location',
 *   totalMatches: number,
 *   fallbackNotice: string,
 *   radiusLabel: string
 * }
 */
export function filterAndRankDoctors({
  doctors = [],
  userCoords,
  userCity = '',
  userState = '',
  userPincode = '',
  searchTerm = '',
  selectedSpecialty = 'All',
  statusFilter = 'All',
  localRadiusKm = 50,
  regionalRadiusKm = 300,
  hasLocation = true,
}) {
  const normSearch = (searchTerm || '').trim().toLowerCase();
  const normSpecialty = (selectedSpecialty || 'All').trim();
  const normStatus = (statusFilter || 'All').trim();

  const userCityLower = (userCity || '').trim().toLowerCase();
  const userStateLower = (userState || '').trim().toLowerCase();
  const userPinTrimmed = (userPincode || '').trim();

  const hasCoords =
    userCoords &&
    typeof userCoords.lat === 'number' &&
    typeof userCoords.lng === 'number' &&
    !isNaN(userCoords.lat) &&
    !isNaN(userCoords.lng);

  // Step 1: Base eligibility filter (status, specialty, text search) + Distance calculation
  const eligibleDoctors = [];

  for (const doc of doctors) {
    if (doc.rawStatus === 'rejected') continue;

    // Specialty filter match
    let matchSpecialty = true;
    if (normSpecialty !== 'All') {
      const docSpec = (doc.specialty || '').toLowerCase();
      const targetSpec = normSpecialty.toLowerCase();
      if (targetSpec.includes('cancer') || targetSpec.includes('onco')) {
        matchSpecialty = docSpec.includes('cancer') || docSpec.includes('onco');
      } else if (targetSpec.includes('prenatal') || targetSpec.includes('pediatric')) {
        matchSpecialty = docSpec.includes('prenatal') || docSpec.includes('pediatric');
      } else if (targetSpec.includes('cardio') || targetSpec.includes('metabolic')) {
        matchSpecialty = docSpec.includes('cardio') || docSpec.includes('metabolic');
      } else if (targetSpec.includes('neuro')) {
        matchSpecialty = docSpec.includes('neuro');
      } else {
        matchSpecialty = docSpec.includes(targetSpec.split(' ')[0]);
      }
    }
    if (!matchSpecialty) continue;

    // Status filter match
    let matchStatus = true;
    if (normStatus !== 'All') {
      matchStatus = (doc.status || '').toLowerCase() === normStatus.toLowerCase();
    }
    if (!matchStatus) continue;

    // Search term match
    if (normSearch) {
      const docName = (doc.name || '').toLowerCase();
      const docLoc = (doc.location || '').toLowerCase();
      const docSpec = (doc.specialty || '').toLowerCase();
      const docHosp = (doc.hospital || '').toLowerCase();
      const docPin = (doc.pincode || '').toLowerCase();

      const searchHit =
        docName.includes(normSearch) ||
        docLoc.includes(normSearch) ||
        docSpec.includes(normSearch) ||
        docHosp.includes(normSearch) ||
        docPin.includes(normSearch);

      if (!searchHit) continue;
    }

    // Distance calculation
    let dist = null;
    if (hasCoords) {
      if (doc.lat != null && doc.lng != null && !isNaN(doc.lat) && !isNaN(doc.lng)) {
        dist = calculateHaversineDistance(userCoords.lat, userCoords.lng, doc.lat, doc.lng);
      } else {
        // Edge case: Doctor record missing valid location data
        console.warn(
          `[DoctorDirectory] Doctor "${doc.name}" is missing coordinate data (lat: ${doc.lat}, lng: ${doc.lng}). Marking distance as null.`
        );
      }
    }

    eligibleDoctors.push({
      ...doc,
      distanceKm: dist,
    });
  }

  // If user has no valid location or location was denied
  if (!hasLocation || !hasCoords) {
    // Sort by rating descending, available status first
    eligibleDoctors.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'Available' ? -1 : 1;
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    return {
      doctors: eligibleDoctors,
      matchMode: 'no_location',
      totalMatches: eligibleDoctors.length,
      fallbackNotice:
        'Location access is not available. Showing all certified genetic specialists sorted by rating and availability.',
      radiusLabel: 'All India',
    };
  }

  // Step 2: Progressive Location Filtering (3 Tiers)

  function matchLocationKeyword(locationStr, keyword) {
  if (!locationStr || !keyword) return false;
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword || cleanKeyword.length < 2) return false;
  const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(locationStr);
}

// ── Tier 1: Local Area (<= 50 km or matching city/pincode) ──
  const localDoctors = eligibleDoctors.filter((doc) => {
    // Distance match
    if (doc.distanceKm != null && doc.distanceKm <= localRadiusKm) {
      return true;
    }
    // Pincode match
    if (userPinTrimmed && doc.pincode && doc.pincode === userPinTrimmed) {
      return true;
    }
    // Exact city match with word boundary
    if (userCityLower && doc.location && matchLocationKeyword(doc.location, userCityLower)) {
      return true;
    }
    return false;
  });

  let selectedDoctors = [];
  let matchMode = 'local';
  let fallbackNotice = '';
  let radiusLabel = `Within ${localRadiusKm} km`;

  if (localDoctors.length > 0) {
    selectedDoctors = localDoctors;
    matchMode = 'local';
    const locDisplay = userCity || userPincode || 'your location';
    fallbackNotice = `Showing ${localDoctors.length} verified genetic specialist${
      localDoctors.length > 1 ? 's' : ''
    } serving ${locDisplay} (within ${localRadiusKm} km).`;
    radiusLabel = `Local Area (≤ ${localRadiusKm} km)`;
  } else {
    // ── Tier 2: Regional / State Expansion (<= 300 km or matching state) ──
    const regionalDoctors = eligibleDoctors.filter((doc) => {
      if (doc.distanceKm != null && doc.distanceKm <= regionalRadiusKm) {
        return true;
      }
      if (userStateLower && doc.location && matchLocationKeyword(doc.location, userStateLower)) {
        return true;
      }
      return false;
    });

    if (regionalDoctors.length > 0) {
      selectedDoctors = regionalDoctors;
      matchMode = 'regional_fallback';
      const locDisplay = userCity || userPincode || 'your area';
      const stateDisplay = userState || 'your region';
      fallbackNotice = `No specialists found directly in ${locDisplay}. Expanded search to ${regionalDoctors.length} nearest specialist${
        regionalDoctors.length > 1 ? 's' : ''
      } in ${stateDisplay} (within ${regionalRadiusKm} km).`;
      radiusLabel = `Regional Expansion (≤ ${regionalRadiusKm} km)`;
    } else {
      // ── Tier 3: Nationwide Nearest Available Fallback ──
      selectedDoctors = eligibleDoctors;
      matchMode = 'nationwide_fallback';
      const locDisplay = userCity || userPincode || 'your area';
      fallbackNotice = `No genetic specialists found near ${locDisplay}. Showing nearest available verified specialists across India (sorted by distance).`;
      radiusLabel = 'Nationwide Nearest Fallback';
    }
  }

  // Step 3: Strict Sorting & Tie-Breaking
  // Nearest distance first. Tie-breakers: rating, available status, experience.
  // Missing distance doctors placed at the end sorted by rating.
  selectedDoctors.sort((a, b) => {
    // Both have valid distance
    if (a.distanceKm != null && b.distanceKm != null) {
      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      // Tie-breaker 1: Rating descending
      if ((b.rating || 0) !== (a.rating || 0)) {
        return (b.rating || 0) - (a.rating || 0);
      }
      // Tie-breaker 2: Status ('Available' first)
      if (a.status !== b.status) {
        return a.status === 'Available' ? -1 : 1;
      }
      // Tie-breaker 3: Experience (numeric years)
      const expA = parseInt(a.experience || 0, 10);
      const expB = parseInt(b.experience || 0, 10);
      return expB - expA;
    }

    // One has distance, one does not
    if (a.distanceKm != null && b.distanceKm == null) return -1;
    if (a.distanceKm == null && b.distanceKm != null) return 1;

    // Both missing distance: sort by rating descending
    return (b.rating || 0) - (a.rating || 0);
  });

  return {
    doctors: selectedDoctors,
    matchMode,
    totalMatches: selectedDoctors.length,
    fallbackNotice,
    radiusLabel,
  };
}
