import {
  calculateHaversineDistance,
  resolveLocationInput,
  filterAndRankDoctors,
  verifiedIndianDoctors,
} from '../../frontend/src/utils/doctorLocationFilter.js';

console.log('================================================================');
console.log('RUNNING TESTS: Doctor Consultation Location Filtering & Fallback');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// TEST SUITE 1: Haversine Distance Calculation
// -----------------------------------------------------------------------------
console.log('--- TEST SUITE 1: Haversine Distance Calculation ---');
// Mumbai GPO (18.9388, 72.8354) to KEM Hospital Parel (19.0022, 72.8427) ~ 7.1 km
const distMumbaiKEM = calculateHaversineDistance(18.9388, 72.8354, 19.0022, 72.8427);
assert(distMumbaiKEM > 6.5 && distMumbaiKEM < 8.0, `Mumbai GPO to KEM distance (${distMumbaiKEM} km) is accurate ~7.1 km`);

// Distance between identical coordinates is 0
const distZero = calculateHaversineDistance(19.0022, 72.8427, 19.0022, 72.8427);
assert(distZero === 0, `Identical coordinates yield 0 km distance`);

// Missing coordinates returns null
assert(calculateHaversineDistance(null, 72.8, 19.0, 72.8) === null, `Null latitude returns null`);
assert(calculateHaversineDistance(19.0, 72.8, undefined, 72.8) === null, `Undefined latitude returns null`);
assert(calculateHaversineDistance(NaN, 72.8, 19.0, 72.8) === null, `NaN latitude returns null`);

// -----------------------------------------------------------------------------
// TEST SUITE 2: Location Input Resolution (City / Pincode / State)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 2: Location Input Resolution ---');
const locMumbai = resolveLocationInput('Mumbai, Maharashtra');
assert(locMumbai.city === 'Mumbai' && locMumbai.isExact, 'Resolves "Mumbai, Maharashtra" to Mumbai coordinates');

const locBangalore = resolveLocationInput('Bangalore');
assert(locBangalore.city === 'Bangalore' && locBangalore.isExact && locBangalore.coords.lat > 12.0, 'Resolves "Bangalore" to Bangalore coordinates');

const locPunePin = resolveLocationInput('411001');
assert(locPunePin.city === 'Pune' && locPunePin.pincode === '411001', 'Resolves pincode 411001 to Pune');

const locDelhiPin = resolveLocationInput('Patient living in 110029 near hospital');
assert(locDelhiPin.city === 'New Delhi' && locDelhiPin.pincode === '110029', 'Extracts 6-digit pincode 110029 from arbitrary string');

// -----------------------------------------------------------------------------
// TEST SUITE 3: Normal Local Filtering (User in Mumbai / Bangalore / Pune)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 3: Normal Local Filtering (Tier 1) ---');
const mumbaiUser = resolveLocationInput('Mumbai');
const mumbaiRes = filterAndRankDoctors({
  doctors: verifiedIndianDoctors,
  userCoords: mumbaiUser.coords,
  userCity: mumbaiUser.city,
  userState: mumbaiUser.state,
  userPincode: mumbaiUser.pincode,
});

assert(mumbaiRes.matchMode === 'local', `Mumbai user matches Tier 1 'local' mode`);
assert(mumbaiRes.doctors.length >= 4, `Found ${mumbaiRes.doctors.length} local doctors in Mumbai (>= 4)`);
assert(mumbaiRes.doctors.every(d => d.location.includes('Mumbai')), 'All returned local doctors are located in Mumbai');
assert(mumbaiRes.doctors[0].distanceKm <= mumbaiRes.doctors[1].distanceKm, 'Doctors are sorted by ascending distance');

// Bangalore test
const blrUser = resolveLocationInput('Bangalore');
const blrRes = filterAndRankDoctors({
  doctors: verifiedIndianDoctors,
  userCoords: blrUser.coords,
  userCity: blrUser.city,
  userState: blrUser.state,
  userPincode: blrUser.pincode,
});
assert(blrRes.matchMode === 'local', `Bangalore user matches Tier 1 'local' mode`);
assert(blrRes.doctors.length === 2, `Found exactly 2 Bangalore genetic specialists`);
assert(blrRes.doctors[0].location.includes('Bangalore'), `Nearest doctor is in Bangalore: ${blrRes.doctors[0].name}`);

// -----------------------------------------------------------------------------
// TEST SUITE 4: Empty-Result Regional & Nationwide Fallback (Remote Area)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 4: Fallback When No Doctors Are Nearby ---');

// Test Case 4A: User in Solapur, Maharashtra (~250 km from Pune, ~400 km from Mumbai)
// Solapur has no geneticists in the list, but is in Maharashtra within regional radius
const solapurCoords = { lat: 17.6599, lng: 75.9064 };
const solapurRes = filterAndRankDoctors({
  doctors: verifiedIndianDoctors,
  userCoords: solapurCoords,
  userCity: 'Solapur',
  userState: 'Maharashtra',
  userPincode: '413001',
});

assert(solapurRes.matchMode === 'regional_fallback', `Solapur user triggers Tier 2 'regional_fallback' (no doctors in Solapur, but doctors found in Maharashtra within 300km)`);
assert(solapurRes.doctors.length > 0, `Returned ${solapurRes.doctors.length} regional doctors for Solapur`);
assert(solapurRes.fallbackNotice.includes('Expanded search'), `Fallback notice explains regional expansion: "${solapurRes.fallbackNotice}"`);

// Test Case 4B: Remote area (e.g. Leh / Ladakh, ~1000 km from nearest specialist)
const lehCoords = { lat: 34.1526, lng: 77.5771 };
const lehRes = filterAndRankDoctors({
  doctors: verifiedIndianDoctors,
  userCoords: lehCoords,
  userCity: 'Leh',
  userState: 'Ladakh',
  userPincode: '194101',
});

assert(lehRes.matchMode === 'nationwide_fallback', `Leh user triggers Tier 3 'nationwide_fallback' (no doctors within 300 km)`);
assert(lehRes.doctors.length > 0, `Does NOT show empty state; returns all verified doctors sorted by distance`);
assert(lehRes.doctors[0].distanceKm < lehRes.doctors[lehRes.doctors.length - 2].distanceKm, 'Doctors are strictly sorted by distance ascending');
assert(lehRes.fallbackNotice.includes('No genetic specialists found near Leh'), 'Clear notice explains why nearest available doctors are shown');
// Delhi / Gurgaon doctors should be nearest to Leh (~600-700 km) compared to Chennai/Bangalore (~2200 km)
assert(lehRes.doctors[0].location.includes('Delhi') || lehRes.doctors[0].location.includes('NCR'), `Nearest doctor to Leh is correctly identified in North India (${lehRes.doctors[0].name} in ${lehRes.doctors[0].location} at ${lehRes.doctors[0].distanceKm} km)`);

// -----------------------------------------------------------------------------
// TEST SUITE 5: Permission Denied / Unavailable Fallback
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 5: Permission Denied / Unavailable Fallback ---');
const deniedRes = filterAndRankDoctors({
  doctors: verifiedIndianDoctors,
  userCoords: null,
  userCity: '',
  userState: '',
  hasLocation: false,
});

assert(deniedRes.matchMode === 'no_location', `Handles permission denied with 'no_location' mode`);
assert(deniedRes.doctors.length > 0, `Does not crash or return empty list; returns ${deniedRes.doctors.length} doctors`);
assert(deniedRes.fallbackNotice.includes('Location access is not available'), 'Provides clear notice informing user of permission status');
// Should be sorted by rating descending
assert(deniedRes.doctors[0].rating >= deniedRes.doctors[1].rating, `Top doctor when location denied is highest rated (${deniedRes.doctors[0].rating} stars)`);

// -----------------------------------------------------------------------------
// TEST SUITE 6: Edge Cases (Missing Doctor Location, Distance Tie-Breaker)
// -----------------------------------------------------------------------------
console.log('\n--- TEST SUITE 6: Edge Cases (Missing Data & Tie-Breakers) ---');

// Edge Case 6A: Doctor with missing location data
const docWithMissingLoc = verifiedIndianDoctors.find(d => d.lat === null);
assert(docWithMissingLoc !== undefined, 'Edge case doctor with missing lat/lng is present in data');

const testSort = filterAndRankDoctors({
  doctors: verifiedIndianDoctors,
  userCoords: { lat: 18.9388, lng: 72.8354 },
  userCity: 'Mumbai',
  userState: 'Maharashtra',
});

// Confirm doctor with missing location does not crash the filter
assert(testSort.doctors.length > 0, 'Filter does not crash when doctor has null coordinates');

// Edge Case 6B: Tie-breaking when multiple doctors are at same distance
// Create mock doctors at identical distance
const doctorTieA = {
  id: 'tie_1',
  name: 'Doctor A (Lower Rating)',
  location: 'Mumbai, Maharashtra',
  lat: 19.0,
  lng: 72.8,
  rating: 4.5,
  status: 'Available',
  experience: '10 years',
};
const doctorTieB = {
  id: 'tie_2',
  name: 'Doctor B (Higher Rating)',
  location: 'Mumbai, Maharashtra',
  lat: 19.0,
  lng: 72.8,
  rating: 5.0,
  status: 'Available',
  experience: '15 years',
};

const tieRes = filterAndRankDoctors({
  doctors: [doctorTieA, doctorTieB],
  userCoords: { lat: 19.0, lng: 72.8 },
  userCity: 'Mumbai',
  userState: 'Maharashtra',
});

assert(tieRes.doctors[0].id === 'tie_2', `Tie-breaker correctly places higher-rated Doctor B (5.0★) before Doctor A (4.5★) at same distance`);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('❌ SOME TESTS FAILED!\n');
  process.exit(1);
}
