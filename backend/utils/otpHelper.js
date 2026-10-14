import crypto from 'crypto';

const SALT = process.env.JWT_SECRET || 'gene_guard_jwt_salt_2026';

/**
 * Generate a cryptographically secure 6-digit OTP string
 */
export const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Hash an OTP using SHA-256 with salt
 */
export const hashOtp = (otp) => {
  return crypto
    .createHash('sha256')
    .update(`${otp}:${SALT}`)
    .digest('hex');
};

/**
 * Verify an OTP against a stored hash
 */
export const verifyOtp = (otp, storedHash) => {
  if (!otp || !storedHash) return false;
  const computed = hashOtp(otp);
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
  } catch {
    return computed === storedHash;
  }
};

/**
 * Generate a secure random reset token
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a reset token for secure storage
 */
export const hashResetToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(`reset:${token}:${SALT}`)
    .digest('hex');
};

/**
 * Verify a reset token
 */
export const verifyResetToken = (token, storedHash) => {
  if (!token || !storedHash) return false;
  const computed = hashResetToken(token);
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
  } catch {
    return computed === storedHash;
  }
};

/**
 * Enforce 60s cooldown and 5 resends/hour rate limiting on a user document
 * Returns { allowed: true } or { allowed: false, error: string }
 */
export const checkOtpRateLimit = (user) => {
  const now = Date.now();

  // 1. Check 60-second cooldown
  if (user.lastOtpSentAt) {
    const elapsedSeconds = Math.floor((now - new Date(user.lastOtpSentAt).getTime()) / 1000);
    if (elapsedSeconds < 60) {
      const remaining = 60 - elapsedSeconds;
      return {
        allowed: false,
        error: `Please wait ${remaining} second${remaining === 1 ? '' : 's'} before requesting another OTP.`,
        cooldownRemaining: remaining,
      };
    }
  }

  // 2. Check 5 resends per hour limit
  const oneHour = 60 * 60 * 1000;
  if (!user.otpResendWindowStart || now - new Date(user.otpResendWindowStart).getTime() > oneHour) {
    user.otpResendWindowStart = new Date(now);
    user.otpResendCount = 0;
  } else if (user.otpResendCount >= 5) {
    const minutesLeft = Math.ceil((oneHour - (now - new Date(user.otpResendWindowStart).getTime())) / 60000);
    return {
      allowed: false,
      error: `Too many OTP requests. Maximum 5 resends per hour reached. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
    };
  }

  return { allowed: true };
};

export default {
  generateOtp,
  hashOtp,
  verifyOtp,
  generateResetToken,
  hashResetToken,
  verifyResetToken,
  checkOtpRateLimit,
};
