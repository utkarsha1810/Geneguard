import { GoogleGenerativeAI } from '@google/generative-ai';
import { REPORT_SIMPLIFIER_SYSTEM_PROMPT, RECOMMENDATION_SYSTEM_PROMPT, GUIDANCE_SYSTEM_PROMPT, TEST_SUGGESTION_SYSTEM_PROMPT, SAMPLE_PROCESS_SYSTEM_PROMPT, ESCALATION_SYSTEM_PROMPT } from '../config/systemPrompts.js';
import {
  enqueueGeminiRequest,
  getCachedResponse,
  setCachedResponse,
  getCurrentKey,
  onKeyRotation,
  getKeyStatus,
} from './geminiRateLimiter.js';

let genAI = null;
let model = null;

const MODEL_NAME = 'gemini-2.0-flash-lite';
const FALLBACK_MODEL = 'gemini-2.0-flash';

/**
 * (Re-)initialise the Gemini model with a given API key.
 */
const initModelWithKey = (apiKey) => {
  if (!apiKey) {
    console.warn('⚠️ No API key — Gemini model unavailable.');
    model = null;
    return false;
  }
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    try {
      model = genAI.getGenerativeModel({ model: MODEL_NAME });
      console.log(`✓ Gemini client initialized with ${MODEL_NAME} (key ...${apiKey.slice(-4)})`);
    } catch (primaryErr) {
      console.warn(`${MODEL_NAME} unavailable, trying ${FALLBACK_MODEL}:`, primaryErr.message);
      model = genAI.getGenerativeModel({ model: FALLBACK_MODEL });
      console.log(`✓ Gemini client initialized with ${FALLBACK_MODEL} (key ...${apiKey.slice(-4)})`);
    }
    return true;
  } catch (error) {
    console.error('✗ Failed to initialize Gemini:', error.message);
    model = null;
    return false;
  }
};

/**
 * Public init — called from server.js with the legacy API key.
 * Now also initialises from the key pool if available.
 */
export const initGeminiClient = (apiKey) => {
  // Prefer key pool from rate limiter; fall back to passed-in key
  const poolKey = getCurrentKey();
  return initModelWithKey(poolKey || apiKey);
};

// Re-initialise when rate limiter rotates keys
onKeyRotation((newKey) => {
  console.log('🔄 Key rotation — reinitialising Gemini model');
  initModelWithKey(newKey);
});

export const checkGeminiConnection = async () => {
  if (!model) {
    console.warn('Gemini model not initialized');
    return { connected: false, error: 'Gemini not initialized' };
  }
  try {
    const result = await enqueueGeminiRequest(() => model.generateContent('Say "OK"'));
    const status = getKeyStatus();
    return { connected: true, model: `${MODEL_NAME} (${status.active}/${status.total} keys)` };
  } catch (error) {
    console.error('Gemini connection check failed:', error.message);
    return { connected: false, error: error.message };
  }
};

const cleanResponse = (text) => {
  const cleaned = text.replace(/```[\s\S]*?```/g, '').trim();
  return cleaned;
};

/* ── Helper: enqueue a Gemini call with caching ─────────────────────────── */
const callWithQueueAndCache = async (cacheId, cacheInputs, prompt) => {
  // Check cache first
  const cached = getCachedResponse(cacheId, cacheInputs);
  if (cached) {
    console.log(`🟢 Cache hit for ${cacheId}`);
    return cached;
  }

  // Enqueue through rate limiter (handles retry + 429 backoff + key rotation)
  const result = await enqueueGeminiRequest(
    () => model.generateContent(prompt),
    () => () => model.generateContent(prompt)  // getUpdatedFn: re-reads model after rotation
  );
  const responseText = result.response.text();
  const cleaned = cleanResponse(responseText);

  // Store in cache
  setCachedResponse(cacheId, cacheInputs, cleaned);

  return cleaned;
};

export const callGeminiForReportSimplification = async (geneData) => {
  if (!model) throw new Error('Gemini not initialized');

  const prompt = `${REPORT_SIMPLIFIER_SYSTEM_PROMPT}

Gene/Marker: ${geneData.geneName || 'Unknown'}
Finding Type: ${geneData.findingType || 'Unknown'}
Risk Level: ${geneData.riskLevel || 'Unknown'}
Clinical Note: ${geneData.clinicalNote || 'No note provided'}

Provide a patient-friendly explanation of these findings.`;

  try {
    return await callWithQueueAndCache('report-simplifier', geneData, prompt);
  } catch (error) {
    console.error('Gemini report simplification error:', error.message);
    throw error;
  }
};

export const callGeminiForRecommendations = async (patientData) => {
  if (!model) throw new Error('Gemini not initialized');

  const prompt = `${RECOMMENDATION_SYSTEM_PROMPT}

Patient Profile:
- Risk Level: ${patientData.riskLevel || 'Unknown'}
- Age: ${patientData.age || 'Unknown'}
- Family History: ${patientData.familyHistory || 'Unknown'}
- Consulted Doctor: ${patientData.consultedDoctor || 'Unknown'}
- Goal: ${patientData.goal || 'Unknown'}
- Current Medications: ${patientData.medications || 'None'}

Based on this profile, provide personalized next-step recommendations.`;

  try {
    return await callWithQueueAndCache('recommendation', patientData, prompt);
  } catch (error) {
    console.error('Gemini recommendations error:', error.message);
    throw error;
  }
};

export const callGeminiForGuidance = async (patientData) => {
  if (!model) throw new Error('Gemini not initialized');

  const prompt = `${GUIDANCE_SYSTEM_PROMPT}

Patient Information:
- Age: ${patientData.age || 'Unknown'}
- Sex: ${patientData.sex || 'Unknown'}
- Family History: ${patientData.familyHistory || 'No'}
- Known Disorder: ${patientData.knownDisorder || 'None'}
- Current Symptoms: ${patientData.symptoms || 'None'}
- Purpose of Test: ${patientData.purpose || 'Unknown'}

Ask clarifying questions if needed, or provide the most suitable DNA testing pathway recommendation.`;

  try {
    return await callWithQueueAndCache('guidance', patientData, prompt);
  } catch (error) {
    console.error('Gemini guidance error:', error.message);
    throw error;
  }
};

export const callGeminiForTestSuggestion = async (patientData) => {
  if (!model) throw new Error('Gemini not initialized');

  const prompt = `${TEST_SUGGESTION_SYSTEM_PROMPT}

Patient Context:
- Goal: ${patientData.goal || 'Unknown'}
- Urgency: ${patientData.urgency || 'Routine'}
- Family History: ${patientData.familyHistory || 'No'}
- Blood Group: ${patientData.bloodGroup || 'Unknown'}
- Has Report: ${patientData.reportAvailable || 'No'}
- Age: ${patientData.age || 'Unknown'}

Recommend the most suitable DNA test category with explanation.`;

  try {
    return await callWithQueueAndCache('test-suggestion', patientData, prompt);
  } catch (error) {
    console.error('Gemini test suggestion error:', error.message);
    throw error;
  }
};

export const callGeminiForSampleProcess = async (testData) => {
  if (!model) throw new Error('Gemini not initialized');

  const prompt = `${SAMPLE_PROCESS_SYSTEM_PROMPT}

Test Information:
- Test Type: ${testData.testType || 'Unknown'}
- Sample Preference: ${testData.samplePreference || 'Not sure'}
- Fasting Status: ${testData.fastingStatus || 'Unknown'}
- Shipping Mode: ${testData.shippingMode || 'Unknown'}
- Family Member Relation: ${testData.familyMemberRelation || 'N/A'}

Provide personalized sample collection guidance and precautions.`;

  try {
    return await callWithQueueAndCache('sample-process', testData, prompt);
  } catch (error) {
    console.error('Gemini sample process error:', error.message);
    throw error;
  }
};

export const callGeminiForEscalation = async (riskData) => {
  if (!model) throw new Error('Gemini not initialized');

  const prompt = `${ESCALATION_SYSTEM_PROMPT}

Risk Assessment:
- Risk Level: ${riskData.riskLevel || 'Unknown'}
- Location: ${riskData.location || 'Unknown'}
- Symptoms: ${riskData.symptoms || 'Unknown'}
- Emergency Contact: ${riskData.emergencyContact || 'Not provided'}
- Emergency Contact Name: ${riskData.emergencyContactName || 'Not provided'}

Assess appropriate escalation level and recommended actions.`;

  try {
    return await callWithQueueAndCache('escalation', riskData, prompt);
  } catch (error) {
    console.error('Gemini escalation error:', error.message);
    throw error;
  }
};
