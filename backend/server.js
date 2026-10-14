/**
 * Gene-Guard Backend Server
 * Express app with Gemini AI integration and MongoDB persistence
 *
 * Architecture:
 * - Routes located in /routes/ (dnaAgents.js, patients.js, health.js)
 * - Services in /services/ (geminiService.js, databaseService.js)
 * - Middleware in /middleware/ (inputValidation.js)
 * - Utils in /utils/ (logger.js, rateLimiter.js)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { validateEnvironment } from './config/envCheck.js';

// Route imports
import dnaAgentsRouter from './routes/dnaAgents.js';
import healthRouter from './routes/health.js';
import patientsRouter from './routes/patients.js';
import consultationsRouter from './routes/consultations.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/adminRoutes.js';
import doctorsRouter from './routes/doctors.js';
import chatRouter from './routes/chat.js';

// Service imports
import {
  initGeminiClient,
  callGeminiForReportSimplification,
  checkGeminiConnection,
} from './services/geminiService.js';
import { connectDatabase } from './config/database.js';
import User from './models/User.js';
import seedDatabase from './scripts/seedData.js';

// Agent & evaluation functions
import { evaluatePatient } from '../frontend/src/data/dnaAgents.js';

// Middleware imports
import {
  validateReportInput,
  validatePatientData,
  filterClaudeResponse,
  requestValidationMiddleware,
} from './middleware/inputValidation.js';

// Utils imports
import { logger } from './utils/logger.js';
import {
  verifyEmailTransporter,
  getActiveEmailProvider,
  isSmtpConfigured,
  isResendConfigured,
} from './utils/sendEmail.js';



// Initialize Express app
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by origin'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(requestValidationMiddleware);

// ============================================================================
// ROUTE MOUNTING
// ============================================================================

// Health & Config endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gene-guard-backend' });
});

app.use('/', healthRouter);

// DNA Agent endpoints (all 6 agents)
app.use('/api/dna', dnaAgentsRouter);

// Patient endpoints (prepared for Phase 4 auth)
app.use('/api/patients', patientsRouter);

// Auth endpoints (Signup, Login, Token generation)
app.use('/api/auth', authRouter);

// Doctor endpoints (Directory and API Sync)
app.use('/api/doctors', doctorsRouter);

// Admin endpoints (Protected overview, user/doctor/patient management, analytics & system settings)
app.use('/api/admin', adminRouter);

// Consultation & Appointment endpoints (Agora & Doctor sessions)
app.use('/api', consultationsRouter);

// AI Chatbot streaming endpoint (POST /api/chat)
app.use('/api', chatRouter);

// Patient evaluation endpoint
app.post('/api/dna/patient/evaluate', (req, res) => {
  try {
    const patient = req.body?.patient || {};
    const validated = validatePatientData(patient);
    const evaluation = evaluatePatient(validated);

    logger(`Patient evaluation: ${evaluation.level} profile`);

    res.json({
      success: true,
      evaluation,
      patientSummary: Object.entries(validated)
        .filter(([_, v]) => v)
        .map(([key, value]) => ({
          label: key.replace(/([A-Z])/g, ' $1').trim(),
          value: value || 'Not provided',
        })),
    });
  } catch (error) {
    logger(`Patient evaluation error: ${error.message}`, 'error');
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// OPTIONAL: DIRECT REPORT SIMPLIFICATION ENDPOINT
// ============================================================================

app.post('/api/dna/simplify-report-ai', async (req, res) => {
  try {
    const { clinicalNote, geneName } = req.body;

    const validated = validateReportInput(clinicalNote);
    logger(`Direct simplify-report call for ${geneName}`);

    const explanation = await callGeminiForReportSimplification({
      geneName,
      clinicalNote: validated,
      riskLevel: 'Unknown',
      findingType: 'Unknown',
    });

    if (!explanation) {
      return res.status(503).json({ success: false, error: 'Gemini service unavailable' });
    }

    const filtered = filterClaudeResponse(explanation);

    res.json({
      success: true,
      explanation: filtered,
      aiEnhanced: true,
    });
  } catch (error) {
    logger(`Simplify report error: ${error.message}`, 'error');
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  logger(`Unhandled error: ${err.message}`, 'error');
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use((req, res) => {
  logger(`404: ${req.method} ${req.path}`, 'warn');
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async () => {
  validateEnvironment();
  const PORT = process.env.PORT || 5050;
  logger(`Starting Gene-Guard backend on port ${PORT}...`);

  // Check API key
  if (!process.env.GEMINI_API_KEY) {
    logger('WARNING: GEMINI_API_KEY not set. Gemini features will be disabled.', 'warn');
  }

  // Initialize MongoDB connection
  logger('Starting Gene-Guard backend with MongoDB integration...');

  const dbConnection = await connectDatabase();
  if (dbConnection) {
    logger('✓ MongoDB connection established');
    try {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        logger('Database is empty. Automatically seeding initial admin, users, doctors & appointments...', 'info');
        await seedDatabase();
        logger('✓ Database seeding completed');
      }
    } catch (seedErr) {
      logger(`Auto-seed check notice: ${seedErr.message}`, 'warn');
    }
  } else {
    logger('⚠️ MongoDB offline - using rule-based agent fallback', 'warn');
  }

  // Initialize Gemini client
  if (process.env.GEMINI_API_KEY) {
    const initialized = initGeminiClient(process.env.GEMINI_API_KEY);
    if (initialized) {
      logger('✓ Gemini client initialized');

      // Test Gemini connection (non-blocking)
      const connected = await checkGeminiConnection();
      if (connected.connected) {
        logger('✓ Gemini API connection successful');
      } else {
        logger('✗ Gemini API connection failed (will use rule-based fallback)', 'warn');
      }
    }
  }

  // Email Service Configuration & Verification
  const activeProvider = getActiveEmailProvider();
  logger(`Email service provider active: ${activeProvider.toUpperCase()}`);

  if (activeProvider === 'smtp') {
    logger('Verifying Gmail SMTP connection...');
    const verifyResult = await verifyEmailTransporter();
    if (verifyResult.ready) {
      logger('✓ SMTP ready');
    } else {
      logger(`✗ SMTP verification error: ${verifyResult.error}`, 'error');
      logger('⚠️ Check SMTP_USER and 16-character Google App Password (SMTP_PASS) in backend/.env', 'warn');
    }
  } else if (activeProvider === 'resend') {
    logger('ℹ️ Active provider: Resend fallback (SMTP credentials missing/incomplete)');
    logger('ℹ️ Resend free domain: OTPs only deliver to the account owner\'s email.');
  } else {
    logger('⚠️ Neither Gmail SMTP nor Resend configured. Dev console OTP fallback active.', 'warn');
  }

  app.listen(PORT, () => {
    logger(`✓ Server listening on http://localhost:${PORT}`);
    logger('');
    logger('API Endpoints:');
    logger('  GET  /health - Service health check');
    logger('  GET  /api/dna/configs - Agent configurations');
    logger('  POST /api/dna/patient/evaluate - Evaluate patient profile');
    logger('  POST /api/dna/run/:agentId - Run specific DNA agent');
    logger('  POST /api/dna/simplify-report-ai - Direct report simplification');
    logger('');
    logger('Routes structure:');
    logger('  ├── /routes/dnaAgents.js - All 6 DNA agents');
    logger('  ├── /routes/health.js - Health & config endpoints');
    logger('  └── /routes/patients.js - Patient endpoints (Phase 4)');
    logger('');
  });
};

startServer().catch((error) => {
  logger(`Server startup failed: ${error.message}`, 'error');
  process.exit(1);
});

export default app;
