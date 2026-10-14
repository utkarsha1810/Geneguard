import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import {
  sendEmail,
  getSignupOtpEmailTemplate,
  getResetPasswordOtpEmailTemplate,
  getLoginOtpEmailTemplate,
} from '../utils/sendEmail.js';
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  generateResetToken,
  hashResetToken,
  verifyResetToken,
  checkOtpRateLimit,
} from '../utils/otpHelper.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { logAuthEvent } from '../utils/auditLogger.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'gene_guard_jwt_secret_key_2026_super_secure';
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || 'GENE_GUARD_ADMIN_2026';

const isTestSkip = (req) => Boolean(req.headers['x-test-suite'] && process.env.NODE_ENV !== 'production');

// Global Auth Limiter: 100 requests per 15 minutes
export const authGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: isTestSkip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication requests. Please try again after a few minutes.' },
});

// Login Limiter: 10 attempts per 15 minutes per IP + email
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : '';
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || 'ip';
    return `${ip}_${email}`;
  },
  validate: { keyGeneratorIpFallback: false },
  skip: isTestSkip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
});

// OTP Verification Limiter: 15 attempts per 15 minutes
export const otpVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skip: isTestSkip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many verification attempts. Please wait 15 minutes before trying again.' },
});

router.use(authGlobalLimiter);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mask an email address: e.g. u***@gmail.com or j***e@domain.com
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

/**
 * Validate password requirements: min 8, uppercase, lowercase, number, special char
 */
const validatePasswordRules = (pw) => {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(pw)) return 'Password must contain at least one uppercase letter (A-Z)';
  if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter (a-z)';
  if (!/\d/.test(pw)) return 'Password must contain at least one number (0-9)';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return 'Password must contain at least one special character (!@#$%^&* etc.)';
  return null;
};

/**
 * Validate Date of Birth (Age must be 18 to 120)
 */
const validateAge18Plus = (dobString) => {
  if (!dobString) return null; // If optional, return null; if required, caller checks
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return 'Please enter a valid date of birth';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dob >= today) return 'Date of birth cannot be today or in the future';

  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 18) return 'You must be at least 18 years old to create an account';
  if (age > 120) return 'Date of birth indicates age over 120 years';
  return null;
};

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      password,
      role = 'user',
      adminCode,
      consentGiven = true,
    } = req.body;

    // Handle Guest sign up / session
    if (role === 'guest') {
      const guestId = 'guest-' + Date.now();
      const token = jwt.sign(
        { userId: guestId, role: 'guest', firstName: 'Guest', tokenVersion: 0 },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.status(200).json({
        success: true,
        message: 'Guest session created',
        token,
        userId: guestId,
        firstName: 'Guest',
        role: 'guest',
      });
    }

    // 1. Server-side Validations
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ success: false, error: 'First Name is required' });
    }
    if (firstName.trim().length < 2 || firstName.trim().length > 50) {
      return res.status(400).json({ success: false, error: 'First Name must be between 2 and 50 characters' });
    }

    if (lastName && lastName.trim() && (lastName.trim().length < 2 || lastName.trim().length > 50)) {
      return res.status(400).json({ success: false, error: 'Last Name must be between 2 and 50 characters' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Invalid email address format' });
    }

    if (phone && phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
    }

    if (dateOfBirth) {
      const ageError = validateAge18Plus(dateOfBirth);
      if (ageError) {
        return res.status(400).json({ success: false, error: ageError });
      }
    }

    const pwError = validatePasswordRules(password);
    if (pwError) {
      return res.status(400).json({ success: false, error: pwError });
    }

    if (consentGiven !== true && consentGiven !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the Privacy Policy and HIPAA Compliance Terms.',
      });
    }

    // 2. Admin Code verification
    if (role === 'admin') {
      if (!adminCode || adminCode.trim() !== ADMIN_SECRET_CODE) {
        return res.status(403).json({ success: false, error: 'Invalid Admin Secret Code' });
      }
    }

    // 3. Check for existing email in MongoDB
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // Protect seeded users
      if (existingUser.isSeeded) {
        return res.status(403).json({
          success: false,
          error: 'This email is reserved for demo/seeded profiles and cannot be re-registered.',
        });
      }

      // If already verified
      if (existingUser.isVerified !== false) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists' });
      }

      // If user exists but is unverified, update details and issue fresh OTP
      const passwordHash = await bcrypt.hash(password, 10);
      const otp = generateOtp();
      const otpHash = hashOtp(otp);
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      existingUser.firstName = firstName.trim();
      existingUser.lastName = (lastName || '').trim();
      existingUser.phone = (phone || '').trim();
      existingUser.dateOfBirth = dateOfBirth || '';
      existingUser.passwordHash = passwordHash;
      existingUser.role = role;
      existingUser.consentGiven = true;
      existingUser.otpHash = otpHash;
      existingUser.otpExpiresAt = otpExpiresAt;
      existingUser.otpAttempts = 0;
      existingUser.lastOtpSentAt = new Date();
      existingUser.otpPurpose = 'signup';
      existingUser.otpResendCount = (existingUser.otpResendCount || 0) + 1;

      await existingUser.save();

      const emailResult = await sendEmail({
        to: normalizedEmail,
        subject: 'Your GeneGuard Verification Code',
        html: getSignupOtpEmailTemplate({ otp, firstName: existingUser.firstName }),
        otp,
        purpose: 'signup',
      });

      if (!emailResult.success) {
        return res.status(400).json({
          success: false,
          error: `Could not send verification email: ${emailResult.error}`,
          requiresVerification: true,
          email: normalizedEmail,
          allowResend: true,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'A verification code has been sent to your email.',
        requiresVerification: true,
        email: normalizedEmail,
      });
    }

    // 4. Create new unverified user
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = new User({
      firstName: firstName.trim(),
      lastName: (lastName || '').trim(),
      email: normalizedEmail,
      phone: (phone || '').trim(),
      dateOfBirth: dateOfBirth || '',
      passwordHash,
      role,
      consentGiven: true,
      isVerified: false,
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      lastOtpSentAt: new Date(),
      otpPurpose: 'signup',
      otpResendCount: 1,
      otpResendWindowStart: new Date(),
      tokenVersion: 0,
    });

    await newUser.save();

    // 5. Send Verification OTP via Email
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Verify your GeneGuard account',
      html: getSignupOtpEmailTemplate({ otp, firstName: newUser.firstName }),
      otp,
      purpose: 'signup',
    });

    if (!emailResult.success) {
      return res.status(400).json({
        success: false,
        error: `Could not send verification email: ${emailResult.error}`,
        requiresVerification: true,
        email: normalizedEmail,
        allowResend: true,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email for the 6-digit verification code.',
      requiresVerification: true,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('[Signup API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during registration' });
  }
});

// ─── POST /api/auth/verify-otp (Signup Verification) ──────────────────────────
router.post('/verify-otp', otpVerificationLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required' });
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, error: 'Verification code must be exactly 6 digits' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User account not found' });
    }

    if (user.isVerified && !user.otpHash) {
      return res.status(200).json({
        success: true,
        message: 'Account is already verified. You may log in.',
      });
    }

    if (!user.otpHash || !user.otpExpiresAt || user.otpPurpose !== 'signup') {
      return res.status(400).json({
        success: false,
        error: 'No active signup verification code found. Please request a new OTP.',
      });
    }

    // Check expiration
    if (new Date() > new Date(user.otpExpiresAt)) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      user.otpPurpose = null;
      await user.save();
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired (valid for 10 minutes). Please request a new OTP.',
      });
    }

    // Check maximum attempts
    if (user.otpAttempts >= 5) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      user.otpPurpose = null;
      await user.save();
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. This code has been invalidated. Please request a new OTP.',
      });
    }

    // Validate OTP hash
    const isValid = verifyOtp(cleanOtp, user.otpHash);
    if (!isValid) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      const remainingAttempts = 5 - user.otpAttempts;

      if (user.otpAttempts >= 5) {
        user.otpHash = null;
        user.otpExpiresAt = null;
        user.otpPurpose = null;
        await user.save();
        return res.status(400).json({
          success: false,
          error: 'Too many failed attempts. Code invalidated. Please request a new OTP.',
        });
      }

      await user.save();
      return res.status(400).json({
        success: false,
        error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      });
    }

    // Successful Verification
    user.isVerified = true;
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpPurpose = null;
    user.tokenVersion = user.tokenVersion || 0;
    await user.save();

    // Generate JWT token with tokenVersion
    const token = jwt.sign(
      { userId: user._id, role: user.role, firstName: user.firstName, tokenVersion: user.tokenVersion },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAuthEvent({ event: 'LOGIN_SUCCESS', email: normalizedEmail, req, details: { method: 'signup_verification' } });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome to GeneGuard.',
      token,
      userId: user._id,
      firstName: user.firstName,
      role: user.role,
    });
  } catch (error) {
    console.error('[Verify OTP API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during verification' });
  }
});

// ─── POST /api/auth/resend-otp (Signup Verification Resend) ───────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email' });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Your account is already verified. Please proceed to login.',
      });
    }

    if (user.isSeeded) {
      return res.status(200).json({
        success: true,
        message: 'A fresh verification code has been simulated for this demo account.',
        cooldownSeconds: 60,
      });
    }

    const rateCheck = checkOtpRateLimit(user);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: rateCheck.error,
        cooldownRemaining: rateCheck.cooldownRemaining,
      });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    user.otpAttempts = 0;
    user.lastOtpSentAt = new Date();
    user.otpPurpose = 'signup';
    user.otpResendCount = (user.otpResendCount || 0) + 1;

    await user.save();

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Your New GeneGuard Verification Code',
      html: getSignupOtpEmailTemplate({ otp, firstName: user.firstName }),
      otp,
      purpose: 'signup',
    });

    if (!emailResult.success) {
      return res.status(400).json({
        success: false,
        error: `Could not send verification email: ${emailResult.error}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A fresh verification code has been sent to your email.',
      cooldownSeconds: 60,
    });
  } catch (error) {
    console.error('[Resend OTP API] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to resend verification code' });
  }
});

// ─── POST /api/auth/login (Step 1: Credential Check & Login OTP Dispatch) ──────
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;

    // Handle Guest login
    if (role === 'guest') {
      const guestId = 'guest-' + Date.now();
      const token = jwt.sign(
        { userId: guestId, role: 'guest', firstName: 'Guest', tokenVersion: 0 },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      await logAuthEvent({ event: 'LOGIN_SUCCESS', email: 'guest@geneguard.demo', req, details: { role: 'guest' } });
      return res.status(200).json({
        success: true,
        token,
        userId: guestId,
        firstName: 'Guest',
        role: 'guest',
      });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // No account enumeration: return same generic error if user not found
    if (!user) {
      await logAuthEvent({ event: 'LOGIN_FAILURE', email: normalizedEmail, req, details: { reason: 'User not found' } });
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Check account lockout
    if (user.lockUntil && new Date() < new Date(user.lockUntil)) {
      const minutesRemaining = Math.max(1, Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / (60 * 1000)));
      await logAuthEvent({ event: 'LOGIN_LOCKOUT', email: normalizedEmail, req, details: { lockUntil: user.lockUntil } });
      return res.status(423).json({
        success: false,
        isLocked: true,
        error: `Account is temporarily locked due to 5 consecutive failed login attempts. Please try again after ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}.`,
      });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        await logAuthEvent({ event: 'LOGIN_LOCKOUT', email: normalizedEmail, req, details: { attempts: user.failedLoginAttempts } });
        return res.status(423).json({
          success: false,
          isLocked: true,
          error: 'Account is temporarily locked due to 5 consecutive failed login attempts. Please try again after 15 minutes.',
        });
      }

      await user.save();
      await logAuthEvent({ event: 'LOGIN_FAILURE', email: normalizedEmail, req, details: { attempts: user.failedLoginAttempts } });
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Successful password match -> Reset lockout counter
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    // Check if user never completed signup verification
    if (user.isVerified === false) {
      return res.status(403).json({
        success: false,
        isUnverified: true,
        email: user.email,
        error: 'Please verify your email address before logging in.',
      });
    }

    // Seeded demo users never receive emails and cannot log in via OTP
    if (user.isSeeded) {
      return res.status(403).json({
        success: false,
        error: 'Demo/seeded user accounts are restricted and cannot receive OTP emails.',
      });
    }

    // Two-Step Login: DO NOT issue session token here. Generate 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const loginChallengeId = crypto.randomUUID();
    const otpHash = hashOtp(rawOtp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.loginOtpHash = otpHash;
    user.loginOtpExpiresAt = otpExpiresAt;
    user.loginOtpAttempts = 0;
    user.loginChallengeId = loginChallengeId;
    user.lastLoginOtpSentAt = new Date();
    user.loginOtpResendCount = 1;
    user.loginOtpResendWindowStart = new Date();

    await user.save();

    // Send Login OTP Email
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'Your GeneGuard Login Verification Code',
      html: getLoginOtpEmailTemplate({ otp: rawOtp, firstName: user.firstName }),
      otp: rawOtp,
      purpose: 'login',
    });

    if (!emailResult.success) {
      return res.status(400).json({
        success: false,
        error: `Could not dispatch login OTP: ${emailResult.error}`,
      });
    }

    await logAuthEvent({ event: 'LOGIN_OTP_SENT', email: normalizedEmail, req, details: { loginChallengeId } });

    return res.status(200).json({
      success: true,
      otpRequired: true,
      email: maskEmail(user.email),
      loginChallengeId,
      message: 'A 6-digit verification code has been sent to your email.',
    });
  } catch (error) {
    console.error('[Login API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
});

// ─── POST /api/auth/verify-login-otp (Step 2: Validate Login OTP & Issue JWT) ──
router.post('/verify-login-otp', otpVerificationLimiter, async (req, res) => {
  try {
    const { loginChallengeId, email, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, error: 'Verification code is required' });
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, error: 'Verification code must be exactly 6 digits' });
    }

    // Lookup user by loginChallengeId or email
    let user = null;
    if (loginChallengeId) {
      user = await User.findOne({ loginChallengeId });
    }
    if (!user && email) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user || !user.loginOtpHash || !user.loginOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        error: 'No active login verification found. Please enter your credentials again.',
      });
    }

    // Check expiration (10 min)
    if (new Date() > new Date(user.loginOtpExpiresAt)) {
      user.loginOtpHash = null;
      user.loginOtpExpiresAt = null;
      user.loginChallengeId = null;
      await user.save();
      return res.status(400).json({
        success: false,
        error: 'Login verification code has expired (10 minute limit). Please log in again.',
      });
    }

    // Check attempts limit
    if (user.loginOtpAttempts >= 5) {
      user.loginOtpHash = null;
      user.loginOtpExpiresAt = null;
      user.loginChallengeId = null;
      await user.save();
      await logAuthEvent({ event: 'LOGIN_OTP_FAILED', email: user.email, req, details: { reason: 'Exceeded max OTP attempts' } });
      return res.status(400).json({
        success: false,
        error: 'Too many failed OTP attempts. This code has been invalidated. Please log in again.',
      });
    }

    // Validate OTP hash
    const isValid = verifyOtp(cleanOtp, user.loginOtpHash);
    if (!isValid) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
      const remainingAttempts = 5 - user.loginOtpAttempts;

      if (user.loginOtpAttempts >= 5) {
        user.loginOtpHash = null;
        user.loginOtpExpiresAt = null;
        user.loginChallengeId = null;
        await user.save();
        await logAuthEvent({ event: 'LOGIN_OTP_FAILED', email: user.email, req, details: { attempts: user.loginOtpAttempts } });
        return res.status(400).json({
          success: false,
          error: 'Too many failed OTP attempts. Please log in again from the beginning.',
        });
      }

      await user.save();
      await logAuthEvent({ event: 'LOGIN_OTP_FAILED', email: user.email, req, details: { remainingAttempts } });
      return res.status(400).json({
        success: false,
        error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      });
    }

    // OTP Verified Successfully!
    user.loginOtpHash = null;
    user.loginOtpExpiresAt = null;
    user.loginOtpAttempts = 0;
    user.loginChallengeId = null;
    user.lastLogin = new Date();
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.tokenVersion = user.tokenVersion || 0;

    await user.save();

    // Issue JWT token with tokenVersion
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        firstName: user.firstName,
        tokenVersion: user.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAuthEvent({ event: 'LOGIN_SUCCESS', email: user.email, req, details: { twoStep: true } });

    return res.status(200).json({
      success: true,
      token,
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      message: 'Login verification successful',
    });
  } catch (error) {
    console.error('[Verify Login OTP API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error verifying login code' });
  }
});

// ─── POST /api/auth/resend-login-otp ──────────────────────────────────────────
router.post('/resend-login-otp', async (req, res) => {
  try {
    const { loginChallengeId, email } = req.body;

    let user = null;
    if (loginChallengeId) {
      user = await User.findOne({ loginChallengeId });
    }
    if (!user && email) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'No active login session found. Please log in again.' });
    }

    // 60-second cooldown check
    if (user.lastLoginOtpSentAt) {
      const secondsSince = (Date.now() - new Date(user.lastLoginOtpSentAt).getTime()) / 1000;
      if (secondsSince < 60) {
        const remaining = Math.ceil(60 - secondsSince);
        return res.status(429).json({
          success: false,
          error: `Please wait ${remaining}s before requesting a new login code.`,
          cooldownRemaining: remaining,
        });
      }
    }

    // Hourly cap: max 5 per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!user.loginOtpResendWindowStart || new Date(user.loginOtpResendWindowStart) < oneHourAgo) {
      user.loginOtpResendWindowStart = new Date();
      user.loginOtpResendCount = 0;
    }

    if ((user.loginOtpResendCount || 0) >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Maximum login code requests exceeded (5 per hour). Please try again later.',
      });
    }

    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const newChallengeId = crypto.randomUUID();
    user.loginOtpHash = hashOtp(rawOtp);
    user.loginOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.loginOtpAttempts = 0;
    user.loginChallengeId = newChallengeId;
    user.lastLoginOtpSentAt = new Date();
    user.loginOtpResendCount = (user.loginOtpResendCount || 0) + 1;

    await user.save();

    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Your GeneGuard Login Verification Code',
      html: getLoginOtpEmailTemplate({ otp: rawOtp, firstName: user.firstName }),
      otp: rawOtp,
      purpose: 'login',
    });

    if (!emailResult.success) {
      return res.status(400).json({
        success: false,
        error: `Could not send verification email: ${emailResult.error}`,
      });
    }

    await logAuthEvent({ event: 'LOGIN_OTP_SENT', email: user.email, req, details: { resend: true } });

    return res.status(200).json({
      success: true,
      message: 'A fresh verification code has been sent to your email.',
      loginChallengeId: newChallengeId,
      cooldownSeconds: 60,
    });
  } catch (error) {
    console.error('[Resend Login OTP API] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to resend login code' });
  }
});

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const genericSuccessMessage = 'If an account exists with this email address, a password reset code has been sent.';

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(200).json({ success: true, message: genericSuccessMessage });
    }

    if (user.isSeeded) {
      return res.status(200).json({ success: true, message: genericSuccessMessage });
    }

    const rateCheck = checkOtpRateLimit(user);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: rateCheck.error,
        cooldownRemaining: rateCheck.cooldownRemaining,
      });
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.otpHash = otpHash;
    user.otpExpiresAt = otpExpiresAt;
    user.otpAttempts = 0;
    user.lastOtpSentAt = new Date();
    user.otpPurpose = 'reset';
    user.otpResendCount = (user.otpResendCount || 0) + 1;

    await user.save();

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: 'GeneGuard Password Reset Code',
      html: getResetPasswordOtpEmailTemplate({ otp, firstName: user.firstName }),
      otp,
      purpose: 'reset',
    });

    if (!emailResult.success) {
      return res.status(400).json({
        success: false,
        error: `Could not send password reset email: ${emailResult.error}`,
      });
    }

    return res.status(200).json({ success: true, message: genericSuccessMessage });
  } catch (error) {
    console.error('[Forgot Password API] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process password reset request' });
  }
});

// ─── POST /api/auth/verify-reset-otp ──────────────────────────────────────────
router.post('/verify-reset-otp', otpVerificationLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and reset code are required' });
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ success: false, error: 'Code must be exactly 6 digits' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.otpHash || !user.otpExpiresAt || user.otpPurpose !== 'reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired password reset request. Please request a new code.',
      });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      user.otpPurpose = null;
      await user.save();
      return res.status(400).json({
        success: false,
        error: 'Reset code has expired. Please request a new password reset.',
      });
    }

    if (user.otpAttempts >= 5) {
      user.otpHash = null;
      user.otpExpiresAt = null;
      user.otpPurpose = null;
      await user.save();
      return res.status(400).json({
        success: false,
        error: 'Too many incorrect attempts. Code invalidated. Please request a new reset code.',
      });
    }

    const isValid = verifyOtp(cleanOtp, user.otpHash);
    if (!isValid) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      const remainingAttempts = 5 - user.otpAttempts;

      if (user.otpAttempts >= 5) {
        user.otpHash = null;
        user.otpExpiresAt = null;
        user.otpPurpose = null;
        await user.save();
        return res.status(400).json({
          success: false,
          error: 'Too many incorrect attempts. Code invalidated. Please request a new reset code.',
        });
      }

      await user.save();
      return res.status(400).json({
        success: false,
        error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      });
    }

    const rawResetToken = generateResetToken();
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpPurpose = null;
    user.resetTokenHash = hashResetToken(rawResetToken);
    user.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Reset code verified successfully.',
      resetToken: rawResetToken,
    });
  } catch (error) {
    console.error('[Verify Reset OTP API] Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error verifying reset code' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, reset token, and new password are required' });
    }

    const pwError = validatePasswordRules(newPassword);
    if (pwError) {
      return res.status(400).json({ success: false, error: pwError });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired password reset session. Please request a new reset code.',
      });
    }

    if (new Date() > new Date(user.resetTokenExpiresAt)) {
      user.resetTokenHash = null;
      user.resetTokenExpiresAt = null;
      await user.save();
      return res.status(400).json({
        success: false,
        error: 'Password reset session has expired (valid for 10 minutes). Please restart.',
      });
    }

    const isTokenValid = verifyResetToken(resetToken, user.resetTokenHash);
    if (!isTokenValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password reset token. Please request a new reset code.',
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    user.passwordHash = newPasswordHash;
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    user.otpHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpPurpose = null;
    // Invalidate all existing sessions
    user.tokenVersion = (user.tokenVersion || 0) + 1;

    await user.save();
    await logAuthEvent({ event: 'PASSWORD_RESET', email: normalizedEmail, req });

    return res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('[Reset Password API] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const email = req.body?.email || req.user?.email || 'authenticated_user';
  await logAuthEvent({ event: 'LOGOUT', email, req });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// ─── POST /api/auth/logout-all (Invalidate all user sessions server-side) ──────
router.post('/logout-all', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await logAuthEvent({ event: 'LOGOUT_ALL', email: user.email, req });

    return res.status(200).json({
      success: true,
      message: 'Successfully logged out of all active devices. Please log in again.',
    });
  } catch (error) {
    console.error('[Logout All API] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to log out of all devices' });
  }
});

// ─── POST /api/auth/change-password ───────────────────────────────────────────
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    const pwError = validatePasswordRules(newPassword);
    if (pwError) {
      return res.status(400).json({ success: false, error: pwError });
    }

    // Invalidate all other existing sessions by incrementing tokenVersion
    const nextVersion = (user.tokenVersion || 0) + 1;
    user.tokenVersion = nextVersion;
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Issue a fresh token for current device
    const newToken = jwt.sign(
      { userId: user._id, role: user.role, firstName: user.firstName, tokenVersion: nextVersion },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAuthEvent({ event: 'PASSWORD_CHANGE', email: user.email, req });

    return res.status(200).json({
      success: true,
      token: newToken,
      message: 'Password changed successfully! All other sessions have been logged out.',
    });
  } catch (error) {
    console.error('[Change Password API] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

// ─── GET /api/auth/me (Current User Profile) ──────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'guest') {
      return res.json({
        success: true,
        user: { userId: req.user.userId, firstName: 'Guest', role: 'guest', email: 'guest@geneguard.demo' },
      });
    }

    const user = await User.findById(req.user.userId).select('-passwordHash -otpHash -resetTokenHash -loginOtpHash');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error('[Get Profile API] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve profile' });
  }
});

// ─── PUT /api/auth/profile (Update Profile) ───────────────────────────────────
router.put('/profile', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'guest') {
      return res.status(403).json({ success: false, error: 'Guest accounts cannot edit profile details' });
    }

    const { firstName, lastName, phone, dateOfBirth } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (firstName && firstName.trim()) {
      if (firstName.trim().length < 2 || firstName.trim().length > 50) {
        return res.status(400).json({ success: false, error: 'First name must be between 2 and 50 characters' });
      }
      user.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      user.lastName = (lastName || '').trim();
    }

    if (phone !== undefined) {
      if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
        return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
      }
      user.phone = phone.trim();
    }

    if (dateOfBirth) {
      const ageError = validateAge18Plus(dateOfBirth);
      if (ageError) {
        return res.status(400).json({ success: false, error: ageError });
      }
      user.dateOfBirth = dateOfBirth;
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[Update Profile API] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ─── POST /api/auth/google (Google OAuth Authentication & Auto-Signup) ────────
router.post('/google', async (req, res) => {
  try {
    const { email, firstName, lastName, googleId } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required from Google account' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Auto-signup for new Google users (no password required)
      user = new User({
        firstName: (firstName && firstName.trim()) || 'User',
        lastName: (lastName && lastName.trim()) || '',
        email: normalizedEmail,
        googleId: googleId || null,
        authProvider: 'google',
        role: 'user',
        isVerified: true,
        consentGiven: true,
        status: 'active',
        lastLogin: new Date(),
      });
      await user.save();

      await logAuthEvent({
        eventType: 'USER_REGISTER',
        status: 'SUCCESS',
        email: normalizedEmail,
        userId: user._id.toString(),
        role: user.role,
        req,
        details: { method: 'google_oauth' },
      });
    } else {
      // Existing user: Link googleId if not present and update last login
      if (googleId && !user.googleId) {
        user.googleId = googleId;
      }
      user.isVerified = true;
      user.lastLogin = new Date();
      await user.save();

      await logAuthEvent({
        eventType: 'LOGIN_SUCCESS',
        status: 'SUCCESS',
        email: normalizedEmail,
        userId: user._id.toString(),
        role: user.role,
        req,
        details: { method: 'google_oauth' },
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        firstName: user.firstName,
        tokenVersion: user.tokenVersion || 0,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      token,
      userId: user._id.toString(),
      firstName: user.firstName,
      role: user.role,
      email: user.email,
    });
  } catch (error) {
    console.error('[Google Auth API] Error:', error);
    return res.status(500).json({ success: false, error: 'Google login failed. Please try again.' });
  }
});

export default router;
