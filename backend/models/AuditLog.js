import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      enum: [
        'LOGIN_ATTEMPT',
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
        'LOGIN_LOCKOUT',
        'LOGIN_OTP_SENT',
        'LOGIN_OTP_SUCCESS',
        'LOGIN_OTP_FAILED',
        'LOGOUT',
        'LOGOUT_ALL',
        'PASSWORD_CHANGE',
        'PASSWORD_RESET',
      ],
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    ip: {
      type: String,
      default: 'unknown',
    },
    userAgent: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for performance and fast log querying
auditLogSchema.index({ email: 1, timestamp: -1 });
auditLogSchema.index({ event: 1, timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
