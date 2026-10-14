import nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * Clean and normalize the Resend API key from process.env
 */
export const getCleanResendApiKey = () => {
  const rawKey = process.env.RESEND_API_KEY;
  if (!rawKey) return null;
  return rawKey.trim().replace(/^["']|["']$/g, '');
};

/**
 * Extract and sanitize SMTP configuration from process.env
 */
export const getSmtpConfig = () => {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim().replace(/^["']|["']$/g, '');
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = (process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '');
  const pass = (process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  return { host, port, secure, user, pass };
};

/**
 * Check whether Gmail SMTP credentials are configured and valid
 */
export const isSmtpConfigured = () => {
  const { user, pass } = getSmtpConfig();
  return Boolean(
    user &&
    pass &&
    !user.includes('your_email') &&
    !pass.includes('your_16_char') &&
    user.includes('@') &&
    pass.length >= 8
  );
};

/**
 * Check whether a valid Resend key is present in environment as fallback
 */
export const isResendConfigured = () => {
  const key = getCleanResendApiKey();
  return Boolean(key && key.startsWith('re_') && key !== 're_test_key_placeholder' && key.length > 10);
};

/**
 * Returns which email provider is actively selected: 'smtp' | 'resend' | 'none'
 */
export const getActiveEmailProvider = () => {
  if (isSmtpConfigured()) return 'smtp';
  if (isResendConfigured()) return 'resend';
  return 'none';
};

/**
 * Clean and format the sender address.
 * Defaults to GeneGuard <SMTP_USER> or GeneGuard <onboarding@resend.dev>
 */
export const getSenderAddress = () => {
  const rawFrom = process.env.EMAIL_FROM;
  if (rawFrom) {
    const cleanFrom = rawFrom.trim().replace(/^["']|["']$/g, '');
    if (cleanFrom) return cleanFrom;
  }
  const { user } = getSmtpConfig();
  if (user && user.includes('@')) {
    return `GeneGuard <${user}>`;
  }
  return 'GeneGuard <onboarding@resend.dev>';
};

/**
 * Lazily instantiate nodemailer transporter at runtime after dotenv has loaded.
 */
let _cachedTransporter = null;
let _cachedSmtpFingerprint = null;

export const getSmtpTransporter = () => {
  const config = getSmtpConfig();
  if (!isSmtpConfigured()) return null;

  const fingerprint = `${config.host}:${config.port}:${config.secure}:${config.user}:${config.pass}`;
  if (_cachedTransporter && _cachedSmtpFingerprint === fingerprint) {
    return _cachedTransporter;
  }

  try {
    _cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    _cachedSmtpFingerprint = fingerprint;
    return _cachedTransporter;
  } catch (err) {
    console.error('[sendEmail] ❌ Failed to instantiate SMTP transporter:', err.message);
    return null;
  }
};

/**
 * Lazily instantiate Resend client at runtime.
 */
let _cachedResendClient = null;
let _cachedResendKey = null;

export const getResendClient = () => {
  const cleanKey = getCleanResendApiKey();
  if (!cleanKey) return null;

  if (_cachedResendClient && _cachedResendKey === cleanKey) {
    return _cachedResendClient;
  }

  try {
    _cachedResendClient = new Resend(cleanKey);
    _cachedResendKey = cleanKey;
    return _cachedResendClient;
  } catch (err) {
    console.error('[sendEmail] ❌ Failed to instantiate Resend client:', err.message);
    return null;
  }
};

/**
 * Normalize recipient email(s) into an array of lowercase, trimmed strings.
 */
export const normalizeRecipient = (to) => {
  if (Array.isArray(to)) {
    return to.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof to === 'string') {
    const clean = to.trim().toLowerCase();
    return clean ? [clean] : [];
  }
  return [];
};

/**
 * Call transporter.verify() at server startup.
 * Logs "SMTP ready" or the exact error.
 */
export const verifyEmailTransporter = async () => {
  const provider = getActiveEmailProvider();

  if (provider === 'smtp') {
    const transporter = getSmtpTransporter();
    if (!transporter) {
      const err = 'Failed to create nodemailer SMTP transporter';
      console.error(`[EmailService] ❌ ${err}`);
      return { ready: false, provider: 'smtp', error: err };
    }
    try {
      await transporter.verify();
      console.log('[EmailService] ✓ SMTP ready (Gmail transporter verified successfully)');
      return { ready: true, provider: 'smtp' };
    } catch (err) {
      console.error('[EmailService] ❌ SMTP verification error:', err.message || err);
      return { ready: false, provider: 'smtp', error: err.message || String(err) };
    }
  }

  if (provider === 'resend') {
    console.log('[EmailService] ℹ️ SMTP credentials missing. Resend fallback active.');
    console.log('[EmailService] ℹ️ Resend free domain: OTPs only deliver to the account owner\'s email.');
    return { ready: true, provider: 'resend' };
  }

  console.warn('[EmailService] ⚠️ Neither SMTP nor Resend is fully configured. Dev console fallback active.');
  return { ready: false, provider: 'none', error: 'No active email provider' };
};

/**
 * Reusable email sender utility supporting Gmail SMTP (Nodemailer) with Resend fallback.
 *
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email(s)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML email content
 * @param {string} [params.otp] - 6-digit OTP for dev console fallback
 * @param {string} [params.purpose] - 'signup' | 'reset' | 'test'
 * @param {boolean} [params.isSeeded] - If true, skips real sending (Step 10 protection)
 */
export const sendEmail = async ({
  to,
  subject,
  html,
  otp = null,
  purpose = 'verification',
  isSeeded = false,
}) => {
  const isDev = (process.env.NODE_ENV || 'development') === 'development';
  const recipients = normalizeRecipient(to);
  const fromAddress = getSenderAddress();
  const provider = getActiveEmailProvider();

  // Step 7: In NODE_ENV=development, ALWAYS log the OTP to the server console
  // as a fallback so testing and demos work even if email delivery fails.
  if (isDev && otp) {
    console.log('\n┌──────────────────────────────────────────────────────────────┐');
    console.log(`│ 🧬 [DEV OTP FALLBACK] GeneGuard Security Dispatch`);
    console.log(`│ Recipient: ${recipients.join(', ') || to}`);
    console.log(`│ Purpose:   ${purpose.toUpperCase()}`);
    console.log(`│ Provider:  ${provider.toUpperCase()}`);
    console.log(`│ 🔑 OTP:    >>> ${otp} <<< (Valid for 10 minutes)`);
    console.log('└──────────────────────────────────────────────────────────────┘\n');
  }

  // Step 10: Seeded users (isSeeded: true) must NEVER receive emails
  if (isSeeded) {
    console.log(`[sendEmail] 🛡️ [SEEDED USER PROTECTION] Email delivery suppressed for seeded user: ${recipients.join(', ')}`);
    return {
      success: true,
      skipped: true,
      provider: 'none',
      reason: 'Seeded test user — email delivery suppressed',
      message: 'Email delivery suppressed for seeded demo user',
    };
  }

  // Validate recipient
  if (recipients.length === 0) {
    const errorMsg = 'Recipient email address is invalid or empty';
    console.error('[sendEmail] ❌ Validation error:', errorMsg);
    return {
      success: false,
      error: errorMsg,
      isConfigError: false,
    };
  }

  // Provider 1: Gmail SMTP (Primary)
  if (provider === 'smtp') {
    const transporter = getSmtpTransporter();
    if (!transporter) {
      const errorMsg = 'Failed to initialize Gmail SMTP transporter.';
      console.error(`[sendEmail] ❌ ${errorMsg}`);
      return {
        success: false,
        provider: 'smtp',
        error: 'Could not send verification email, please try again',
        details: errorMsg,
      };
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipients.join(', '),
        subject,
        html,
      });

      console.log(`[sendEmail] ✓ Email delivered via Gmail SMTP to ${recipients.join(', ')} (Message ID: ${info.messageId})`);
      return {
        success: true,
        provider: 'smtp',
        data: {
          id: info.messageId,
          response: info.response,
          accepted: info.accepted,
        },
      };
    } catch (err) {
      console.error('[sendEmail] ❌ Gmail SMTP error for recipient(s):', {
        name: err.name,
        message: err.message,
        code: err.code,
        response: err.response,
        to: recipients,
      });

      return {
        success: false,
        provider: 'smtp',
        error: 'Could not send verification email, please try again',
        details: err.message,
        rawError: {
          name: err.name,
          message: err.message,
          code: err.code,
        },
      };
    }
  }

  // Provider 2: Resend (Fallback)
  if (provider === 'resend') {
    console.log(`[sendEmail] ℹ️ Using Resend fallback for ${recipients.join(', ')}`);
    const resend = getResendClient();
    if (!resend) {
      return {
        success: false,
        provider: 'resend',
        error: 'Could not send verification email, please try again',
        details: 'Unable to instantiate Resend client',
      };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: recipients,
        subject,
        html,
      });

      if (error) {
        const statusCode = error.statusCode || error.status || 400;
        const errorName = error.name || 'ResendApiError';
        const errorMessage = error.message || 'Unknown error returned from Resend API';

        console.error('[sendEmail] ❌ Full Resend error:', {
          name: errorName,
          message: errorMessage,
          statusCode,
          from: fromAddress,
          to: recipients,
        });

        const isFreeTierRestriction =
          statusCode === 403 ||
          errorMessage.toLowerCase().includes('only send testing emails') ||
          errorMessage.toLowerCase().includes('verify a domain') ||
          errorMessage.toLowerCase().includes('own email address');

        let userFriendlyMessage = 'Could not send verification email, please try again';
        if (isFreeTierRestriction) {
          userFriendlyMessage =
            'Resend free-tier restriction: With onboarding@resend.dev, emails can only be delivered to your registered Resend account email address. Configure Gmail SMTP credentials in .env to deliver to any user.';
        }

        return {
          success: false,
          provider: 'resend',
          error: userFriendlyMessage,
          rawError: {
            name: errorName,
            message: errorMessage,
            statusCode,
          },
          isFreeTierRestriction,
        };
      }

      console.log(`[sendEmail] ✓ Email successfully delivered via Resend to ${recipients.join(', ')} (ID: ${data?.id})`);
      return {
        success: true,
        provider: 'resend',
        data,
      };
    } catch (exception) {
      console.error('[sendEmail] ❌ Unexpected exception sending via Resend:', exception);
      return {
        success: false,
        provider: 'resend',
        error: 'Could not send verification email, please try again',
        details: exception.message,
      };
    }
  }

  // Neither SMTP nor Resend configured
  const errorMsg = 'No email delivery service configured. Please set SMTP_USER and SMTP_PASS in backend/.env.';
  console.error(`[sendEmail] ❌ Configuration error: ${errorMsg}`);
  return {
    success: false,
    provider: 'none',
    error: 'Could not send verification email, please try again (email credentials not configured)',
    isConfigError: true,
  };
};

/**
 * Generate GeneGuard themed HTML email template for Signup verification OTP
 */
export const getSignupOtpEmailTemplate = ({ otp, firstName = 'Valued User' }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your GeneGuard Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060b18; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #060b18; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background: linear-gradient(145deg, #0f1c3f 0%, #0a1329 100%); border-radius: 16px; border: 1px solid rgba(83, 199, 232, 0.25); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); overflow: hidden;">
          
          <!-- Header / Brand -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="display: inline-block; width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #53c7e8 0%, #10b981 100%); line-height: 44px; font-size: 22px; margin-bottom: 12px; box-shadow: 0 0 20px rgba(83, 199, 232, 0.5);">
                🧬
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">
                Gene<span style="color: #53c7e8;">Guard</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">
                Advanced AI Genomic Protection
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 600; color: #f8fafc;">
                Verify Your Email Address
              </h2>
              <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Hello <strong>${firstName}</strong>, thank you for signing up with GeneGuard. Please use the 6-digit verification code below to complete your registration:
              </p>

              <!-- OTP Box -->
              <div style="background: rgba(15, 23, 42, 0.8); border: 2px dashed #53c7e8; border-radius: 12px; padding: 24px 16px; text-align: center; margin: 28px 0;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 8px;">
                  Your Verification Code
                </div>
                <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #53c7e8; padding-left: 12px; text-shadow: 0 0 15px rgba(83, 199, 232, 0.4);">
                  ${otp}
                </div>
                <div style="font-size: 13px; color: #10b981; margin-top: 10px; font-weight: 500;">
                  ⏱ Valid for 10 minutes
                </div>
              </div>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #94a3b8; border-left: 3px solid #64748b; padding-left: 12px;">
                For your security, do not share this OTP with anyone. GeneGuard employees will never ask you for your code.<br><br>
                <em>If you didn't request this, ignore this email.</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: rgba(6, 11, 24, 0.7); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 6px;">&copy; ${new Date().getFullYear()} GeneGuard AI Technologies. All rights reserved.</p>
              <p style="margin: 0;">Securing genomic data with end-to-end HIPAA compliance and encryption.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/**
 * Generate GeneGuard themed HTML email template for Password Reset OTP
 */
export const getResetPasswordOtpEmailTemplate = ({ otp, firstName = 'User' }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your GeneGuard Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060b18; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #060b18; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background: linear-gradient(145deg, #0f1c3f 0%, #0a1329 100%); border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.25); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); overflow: hidden;">
          
          <!-- Header / Brand -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="display: inline-block; width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); line-height: 44px; font-size: 22px; margin-bottom: 12px; box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);">
                🛡️
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">
                Gene<span style="color: #53c7e8;">Guard</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">
                Password Reset Request
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 600; color: #f8fafc;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Hello <strong>${firstName}</strong>, we received a request to reset your password for your GeneGuard account. Enter the 6-digit code below to set a new password:
              </p>

              <!-- OTP Box -->
              <div style="background: rgba(15, 23, 42, 0.8); border: 2px dashed #f59e0b; border-radius: 12px; padding: 24px 16px; text-align: center; margin: 28px 0;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 8px;">
                  Password Reset Code
                </div>
                <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #f59e0b; padding-left: 12px; text-shadow: 0 0 15px rgba(245, 158, 11, 0.4);">
                  ${otp}
                </div>
                <div style="font-size: 13px; color: #ef4444; margin-top: 10px; font-weight: 500;">
                  ⏱ Valid for 10 minutes
                </div>
              </div>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #94a3b8; border-left: 3px solid #ef4444; padding-left: 12px;">
                If you did not initiate this request, someone may have entered your email by mistake. Your account remains secure and no changes have been made.<br><br>
                <em>If you didn't request this, ignore this email.</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: rgba(6, 11, 24, 0.7); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 6px;">&copy; ${new Date().getFullYear()} GeneGuard AI Technologies. All rights reserved.</p>
              <p style="margin: 0;">Securing genomic data with end-to-end HIPAA compliance and encryption.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/**
 * Generate GeneGuard themed HTML email template for Login Two-Step OTP
 */
export const getLoginOtpEmailTemplate = ({ otp, firstName = 'User' }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your GeneGuard Login Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060b18; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #060b18; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background: linear-gradient(145deg, #0f1c3f 0%, #0a1329 100%); border-radius: 16px; border: 1px solid rgba(83, 199, 232, 0.3); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); overflow: hidden;">
          
          <!-- Header / Brand -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <div style="display: inline-block; width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #53c7e8 0%, #3b82f6 100%); line-height: 44px; font-size: 22px; margin-bottom: 12px; box-shadow: 0 0 20px rgba(83, 199, 232, 0.5);">
                🔐
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;">
                Gene<span style="color: #53c7e8;">Guard</span>
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">
                Two-Step Login Verification
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 600; color: #f8fafc;">
                Security Verification Code
              </h2>
              <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Hello <strong>${firstName}</strong>, a login attempt was made for your GeneGuard account. Enter the 6-digit authentication code below to access your secure portal:
              </p>

              <!-- OTP Box -->
              <div style="background: rgba(15, 23, 42, 0.8); border: 2px dashed #53c7e8; border-radius: 12px; padding: 24px 16px; text-align: center; margin: 28px 0;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 8px;">
                  Your Login Code
                </div>
                <div style="font-family: 'Consolas', 'Monaco', monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #53c7e8; padding-left: 12px; text-shadow: 0 0 15px rgba(83, 199, 232, 0.4);">
                  ${otp}
                </div>
                <div style="font-size: 13px; color: #10b981; margin-top: 10px; font-weight: 500;">
                  ⏱ Valid for 10 minutes (single-use)
                </div>
              </div>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #94a3b8; border-left: 3px solid #53c7e8; padding-left: 12px;">
                If you did not attempt to log in to GeneGuard, someone else may know your password. We strongly recommend changing your password immediately.<br><br>
                <em>Never share this code with anyone. GeneGuard staff will never ask for it.</em>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: rgba(6, 11, 24, 0.7); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 6px;">&copy; ${new Date().getFullYear()} GeneGuard AI Technologies. All rights reserved.</p>
              <p style="margin: 0;">Securing genomic data with end-to-end HIPAA compliance and encryption.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

export default {
  sendEmail,
  getSignupOtpEmailTemplate,
  getResetPasswordOtpEmailTemplate,
  getLoginOtpEmailTemplate,
  verifyEmailTransporter,
  getActiveEmailProvider,
  isSmtpConfigured,
  isResendConfigured,
  getSmtpConfig,
};
