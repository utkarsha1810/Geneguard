import AuditLog from '../models/AuditLog.js';
import { logger } from './logger.js';

/**
 * Log authentication and security events to console and MongoDB
 *
 * @param {Object} params
 * @param {string} params.event
 * @param {string} params.email
 * @param {import('express').Request} [params.req]
 * @param {Object} [params.details]
 */
export const logAuthEvent = async ({ event, email, req, details = {} }) => {
  const ip = req
    ? req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || 'unknown'
    : 'unknown';
  const userAgent = req?.headers['user-agent'] || '';

  const timestamp = new Date();
  logger(`[AUDIT] ${event} | Email: ${email} | IP: ${ip} | Time: ${timestamp.toISOString()}`);

  try {
    // Non-blocking write to database
    AuditLog.create({
      event,
      email: email ? String(email).trim().toLowerCase() : 'unknown',
      ip,
      userAgent,
      details,
      timestamp,
    }).catch((err) => {
      console.warn('[AuditLogger] Notice: Could not persist audit entry:', err.message);
    });
  } catch (err) {
    console.warn('[AuditLogger] Notice:', err.message);
  }
};

export default logAuthEvent;
