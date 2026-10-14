import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:5050/api/auth';
const TEST_EMAIL = `test_verification_${Date.now()}@example.com`;
const TEST_PW = 'Secure@Pass123';
const NEW_PW = 'NewSecure@Pass456';

async function runTests() {
  console.log('🧪 Starting GeneGuard Auth & OTP Endpoints Automated Test...');
  console.log('Test Email:', TEST_EMAIL);

  await mongoose.connect('mongodb://localhost:27017/gene-guard');

  // 1. TEST SIGNUP
  console.log('\n[TEST 1] Signup request...');
  const signupRes = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Rohan',
      lastName: 'Tester',
      email: TEST_EMAIL,
      phone: '9820123456',
      dateOfBirth: '1995-04-12',
      password: TEST_PW,
      role: 'user',
      consentGiven: true
    })
  });
  const signupData = await signupRes.json();
  console.log('Signup status:', signupRes.status, signupData);
  if (signupRes.status !== 201 || !signupData.requiresVerification) {
    throw new Error('TEST 1 Failed: Signup did not return 201 with requiresVerification: true');
  }
  console.log('✓ TEST 1 PASSED: Signup created unverified user and dispatched OTP.');

  // Check in DB
  const dbUser = await User.findOne({ email: TEST_EMAIL });
  console.log('DB User isVerified:', dbUser.isVerified, 'has otpHash:', Boolean(dbUser.otpHash));
  if (dbUser.isVerified !== false || !dbUser.otpHash) {
    throw new Error('TEST 1.1 Failed: DB User isVerified is not false or otpHash is missing');
  }

  // 2. TEST LOGIN BLOCKED FOR UNVERIFIED USER
  console.log('\n[TEST 2] Login with unverified credentials...');
  const loginBlockedRes = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PW,
      role: 'user'
    })
  });
  const loginBlockedData = await loginBlockedRes.json();
  console.log('Login blocked status:', loginBlockedRes.status, loginBlockedData);
  if (loginBlockedRes.status !== 403 || !loginBlockedData.isUnverified) {
    throw new Error('TEST 2 Failed: Unverified login was not blocked with 403 and isUnverified');
  }
  console.log('✓ TEST 2 PASSED: Unverified login was correctly blocked with 403.');

  // 3. TEST WRONG OTP ATTEMPT
  console.log('\n[TEST 3] Verify with wrong OTP (000000)...');
  const wrongOtpRes = await fetch(`${API_BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      otp: '000000'
    })
  });
  const wrongOtpData = await wrongOtpRes.json();
  console.log('Wrong OTP status:', wrongOtpRes.status, wrongOtpData);
  if (wrongOtpRes.status !== 400 || !wrongOtpData.error.includes('attempt')) {
    throw new Error('TEST 3 Failed: Wrong OTP did not return 400 with remaining attempts');
  }
  console.log('✓ TEST 3 PASSED: Wrong OTP rejected and attempts decremented.');

  // 4. TEST RESEND OTP COOLDOWN
  console.log('\n[TEST 4] Immediate resend OTP cooldown check...');
  const resendCooldownRes = await fetch(`${API_BASE}/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL })
  });
  const resendCooldownData = await resendCooldownRes.json();
  console.log('Resend cooldown status:', resendCooldownRes.status, resendCooldownData);
  if (resendCooldownRes.status !== 429) {
    throw new Error('TEST 4 Failed: Resend OTP within 60s cooldown was not rejected with 429');
  }
  console.log('✓ TEST 4 PASSED: Resend cooldown active (429 rejected).');

  // 5. TEST VERIFY WITH CORRECT OTP
  console.log('\n[TEST 5] Verifying with correct OTP...');
  const userForOtp = await User.findOne({ email: TEST_EMAIL });
  const otpHelper = await import('../utils/otpHelper.js');
  let actualOtp = null;
  for (let c = 100000; c <= 999999; c++) {
    if (otpHelper.verifyOtp(String(c), userForOtp.otpHash)) {
      actualOtp = String(c);
      break;
    }
  }
  console.log('Found actual OTP:', actualOtp);

  const verifySuccessRes = await fetch(`${API_BASE}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      otp: actualOtp
    })
  });
  const verifySuccessData = await verifySuccessRes.json();
  console.log('Verify status:', verifySuccessRes.status, verifySuccessData);
  if (verifySuccessRes.status !== 200 || !verifySuccessData.token) {
    throw new Error('TEST 5 Failed: Verification did not return 200 with JWT token');
  }
  console.log('✓ TEST 5 PASSED: OTP verified, user marked isVerified=true, JWT returned.');

    // 6. TEST LOGIN SUCCEEDS AFTER VERIFICATION
    console.log('\n[TEST 6] Login with verified user...');
    const loginSuccessRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PW,
        role: 'user'
      })
    });
    const loginSuccessData = await loginSuccessRes.json();
    console.log('Login status:', loginSuccessRes.status, loginSuccessData);
    if (loginSuccessRes.status !== 200 || !loginSuccessData.token) {
      throw new Error('TEST 6 Failed: Login failed after verification');
    }
    console.log('✓ TEST 6 PASSED: Verified user logged in successfully.');

    // 7. TEST FORGOT PASSWORD
    console.log('\n[TEST 7] Forgot password request...');
    // Clear cooldown for test
    await User.updateOne({ email: TEST_EMAIL }, { $set: { lastOtpSentAt: new Date(Date.now() - 65 * 1000) } });

    const forgotRes = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    const forgotData = await forgotRes.json();
    console.log('Forgot password status:', forgotRes.status, forgotData);
    // Non-existent email check (must return same 200 generic message)
    const nonExistentRes = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'non_existent_user_99999@example.com' })
    });
    const nonExistentData = await nonExistentRes.json();
    console.log('Non-existent email forgot password response:', nonExistentData);
    if (nonExistentRes.status !== 200 || !nonExistentData.message.includes('If an account exists')) {
      throw new Error('TEST 7 Failed: Non-existent email did not return generic 200 message');
    }
    console.log('✓ TEST 7.1 PASSED: Non-existent email returned identical generic message (enumeration prevention).');

    // Find reset OTP
    const updatedUser = await User.findOne({ email: TEST_EMAIL });
    let resetOtp = null;
    for (let c = 100000; c <= 999999; c++) {
      if (otpHelper.verifyOtp(String(c), updatedUser.otpHash)) {
        resetOtp = String(c);
        break;
      }
    }
    console.log('Found reset OTP:', resetOtp);

    // 8. TEST VERIFY RESET OTP
    console.log('\n[TEST 8] Verify reset OTP...');
    const verifyResetRes = await fetch(`${API_BASE}/verify-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        otp: resetOtp
      })
    });
    const verifyResetData = await verifyResetRes.json();
    console.log('Verify reset OTP status:', verifyResetRes.status, verifyResetData);
    if (verifyResetRes.status !== 200 || !verifyResetData.resetToken) {
      throw new Error('TEST 8 Failed: Verify reset OTP did not return resetToken');
    }
    console.log('✓ TEST 8 PASSED: Reset OTP verified, resetToken issued.');

    // 9. TEST RESET PASSWORD
    console.log('\n[TEST 9] Reset password with resetToken...');
    const resetPwRes = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        resetToken: verifyResetData.resetToken,
        newPassword: NEW_PW
      })
    });
    const resetPwData = await resetPwRes.json();
    console.log('Reset password status:', resetPwRes.status, resetPwData);
    if (resetPwRes.status !== 200) {
      throw new Error('TEST 9 Failed: Reset password failed');
    }
    console.log('✓ TEST 9 PASSED: Password reset successfully.');

    // 10. TEST LOGIN WITH NEW PASSWORD
    console.log('\n[TEST 10] Login with NEW password...');
    const newLoginRes = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: NEW_PW,
        role: 'user'
      })
    });
    const newLoginData = await newLoginRes.json();
    console.log('New login status:', newLoginRes.status, newLoginData);
    if (newLoginRes.status !== 200 || !newLoginData.token) {
      throw new Error('TEST 10 Failed: Login with new password failed');
    }
    console.log('✓ TEST 10 PASSED: Logged in with new password.');

    // Clean up test user
    await User.deleteOne({ email: TEST_EMAIL });
    console.log('\n🎉 ALL 10 AUTH & OTP TESTS PASSED PERFECTLY!\n');
    await mongoose.disconnect();
    process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ TEST RUNNER ERROR:', err);
  process.exit(1);
});
