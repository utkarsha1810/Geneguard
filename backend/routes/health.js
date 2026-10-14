import express from 'express';
import { dnaAgentConfigs } from '../../frontend/src/data/dnaAgents.js';
import { logger } from '../utils/logger.js';
import { sendEmail, getActiveEmailProvider } from '../utils/sendEmail.js';

const router = express.Router();

/**
 * GET /health
 * Service health check
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gene-guard-backend' });
});

/**
 * GET /api/dna/configs
 * Fetch all DNA agent configurations
 */
router.get('/api/dna/configs', (req, res) => {
  logger('Fetching agent configs');
  res.json({ success: true, agents: dnaAgentConfigs });
});

/**
 * GET /api/test-email?to=<email>
 * Independent test route for verifying email delivery (Gmail SMTP or Resend).
 * Protected behind NODE_ENV=development.
 * Returns the active transport's full response as JSON.
 */
router.get('/api/test-email', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Test email route is only accessible in development mode.',
    });
  }

  const { to } = req.query;
  if (!to || !to.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "to" is required. Example: /api/test-email?to=your_email@example.com',
    });
  }

  const recipient = to.trim().toLowerCase();
  const activeProvider = getActiveEmailProvider();
  logger(`[Test Email] Initiating test email delivery via ${activeProvider.toUpperCase()} to: ${recipient}`);

  const testOtp = '123456';
  const result = await sendEmail({
    to: recipient,
    subject: 'GeneGuard Verification Test Email',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; background: #060b18; color: #e2e8f0; border-radius: 8px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(83, 199, 232, 0.3);">
        <h2 style="color: #53c7e8; margin-top: 0;">🧬 GeneGuard Delivery Test</h2>
        <p style="font-size: 15px; color: #cbd5e1;">This is a test email verifying that GeneGuard email delivery is operating properly.</p>
        <p style="font-size: 13px; color: #94a3b8;">Active Transport: <strong>${activeProvider === 'smtp' ? 'Gmail SMTP (Nodemailer)' : activeProvider === 'resend' ? 'Resend API' : 'None / Console'}</strong></p>
        <div style="margin: 20px 0; padding: 16px; background: #0f1c3f; border: 2px dashed #53c7e8; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #53c7e8; text-align: center;">
          ${testOtp}
        </div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">If you received this message, OTP emails are reaching this inbox. Remember to also check Spam / Junk folders if not found in primary inbox.</p>
      </div>
    `,
    otp: testOtp,
    purpose: 'verification-test',
  });

  return res.status(result.success ? 200 : 502).json({
    success: result.success,
    provider: result.provider || activeProvider,
    data: result.data || null,
    error: result.error || null,
    details: result.details || null,
    rawError: result.rawError || null,
    recipient,
    sender: process.env.EMAIL_FROM || (process.env.SMTP_USER ? `GeneGuard <${process.env.SMTP_USER}>` : 'GeneGuard <onboarding@resend.dev>'),
    providerNote: activeProvider === 'smtp'
      ? 'Delivered via Gmail SMTP. Emails can reach any user inbox.'
      : 'Delivered via Resend fallback (free domain restricted to Resend account owner).',
  });
});

export default router;
