/**
 * Frontend Gemini AI Service
 * Direct Gemini API calls when the backend is offline.
 * Uses the same system prompts and output format as the backend geminiService.
 *
 * Key rotation via geminiRateLimiter.js:
 *  • Up to 4 API keys with auto-rotation on 429
 *  • 25 RPM cap with 2 s minimum between calls
 *  • Exponential backoff retry on 429 errors
 *  • In-memory cache for identical agent + input combos
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  enqueueGeminiRequest,
  getCachedResponse,
  setCachedResponse,
  getCurrentKey,
  onKeyRotation,
} from './geminiRateLimiter';

/* ── Initialise client ───────────────────────────────────────────────────── */
let model = null;
const MODEL_NAME = 'gemini-2.0-flash-lite';
const FALLBACK_MODEL = 'gemini-2.0-flash';
const GEN_CONFIG = { maxOutputTokens: 800, temperature: 0.7 };

/**
 * (Re-)initialise the Gemini model with a given API key.
 * Called at startup and whenever the rate limiter rotates keys.
 */
const initModel = (apiKey) => {
  if (!apiKey) {
    console.warn('[DirectService] No API key — model unavailable');
    model = null;
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig: GEN_CONFIG });
    console.log(`[DirectService] ✓ ${MODEL_NAME} ready (key ...${apiKey.slice(-4)})`);
  } catch (primaryErr) {
    console.warn(`[DirectService] ${MODEL_NAME} unavailable, trying ${FALLBACK_MODEL}`);
    try {
      model = genAI.getGenerativeModel({ model: FALLBACK_MODEL, generationConfig: GEN_CONFIG });
      console.log(`[DirectService] ✓ ${FALLBACK_MODEL} ready (key ...${apiKey.slice(-4)})`);
    } catch (fallbackErr) {
      console.error('[DirectService] All models failed:', fallbackErr.message);
      model = null;
    }
  }
};

// Initialise with current key on load
try {
  initModel(getCurrentKey());
} catch (err) {
  console.warn('[DirectService] Init failed:', err.message);
}

// Re-initialise when rate limiter rotates to a new key
onKeyRotation((newKey) => {
  console.log(`[DirectService] 🔄 Key rotation — reinitialising model`);
  initModel(newKey);
});

/* ── System prompts (one per agent) ─────────────────────────────────────── */
const SYSTEM_PROMPTS = {
  'guidance-agent': `You are a DNA testing guidance specialist. Recommend a testing pathway.
Respond ONLY in valid JSON matching this exact structure:
{
  "title": "Initial Guidance Summary",
  "status": "Low/Moderate/High attention",
  "summary": "2-3 sentences explaining the recommended pathway.",
  "highlights": [
    {"label": "Recommended lane", "value": "..."},
    {"label": "Family history", "value": "..."},
    {"label": "Known disorder", "value": "..."},
    {"label": "Concern level", "value": "..."}
  ],
  "nextSteps": ["Action step 1", "Action step 2"]
}`,

  'test-suggestion-agent': `You are a test recommendation specialist. Suggest a DNA test category.
Respond ONLY in valid JSON matching this exact structure:
{
  "title": "Suggested DNA Test Path",
  "status": "Recommended test name",
  "summary": "2-3 sentences explaining why this test fits.",
  "highlights": [
    {"label": "Primary goal", "value": "..."},
    {"label": "Urgency", "value": "..."},
    {"label": "Blood group", "value": "..."},
    {"label": "Report available", "value": "..."}
  ],
  "nextSteps": ["Action step 1", "Action step 2"]
}`,

  'sample-process-agent': `You are a sample collection guidance specialist.
Respond ONLY in valid JSON matching this exact structure:
{
  "title": "Sample Collection Guide",
  "status": "Recommended sample type",
  "summary": "2-3 sentences explaining the collection method.",
  "highlights": [
    {"label": "Collection mode", "value": "..."},
    {"label": "Restriction followed", "value": "..."},
    {"label": "Family comparison", "value": "..."},
    {"label": "Recommended sample", "value": "..."}
  ],
  "nextSteps": ["Prep step", "Collection step", "Shipping step"]
}`,

  'report-simplifier-agent': `You are a genetic report translator. Simplify findings to patient-friendly language. Avoid jargon.
Respond ONLY in valid JSON matching this exact structure:
{
  "title": "Simplified Report Output",
  "status": "Low/Moderate/High risk",
  "summary": "2-3 sentences explaining the finding simply.",
  "highlights": [
    {"label": "Detected level", "value": "... risk"},
    {"label": "Finding type", "value": "..."},
    {"label": "Gene / marker", "value": "..."},
    {"label": "Short report note", "value": "..."}
  ],
  "nextSteps": ["Action step 1", "Education only, not diagnosis"]
}`,

  'recommendation-agent': `You advise on practical next steps after DNA results.
Respond ONLY in valid JSON matching this exact structure:
{
  "title": "Recommended Next Steps",
  "status": "Clinical follow-up advised / Awareness follow-up advised",
  "summary": "2-3 sentences on follow-up urgency.",
  "highlights": [
    {"label": "Risk level", "value": "..."},
    {"label": "Doctor consulted", "value": "..."},
    {"label": "Support goal", "value": "..."},
    {"label": "Medications", "value": "..."}
  ],
  "nextSteps": ["Action step 1", "Action step 2"]
}`,

  'escalation-agent': `You assess follow-up urgency and escalation level.
Respond ONLY in valid JSON matching this exact structure:
{
  "title": "Escalation and Alert Plan",
  "status": "Emergency escalation active / Monitoring support ready",
  "summary": "2-3 sentences assessing urgency level.",
  "highlights": [
    {"label": "Location tracked", "value": "..."},
    {"label": "Emergency contact", "value": "..."},
    {"label": "Symptoms state", "value": "..."},
    {"label": "Escalation status", "value": "..."}
  ],
  "nextSteps": ["Action step 1", "Action step 2"]
}`
};

/* ── Build user prompt from form data ───────────────────────────────────── */
const buildUserPrompt = (agentId, formData, patient) => {
  const merged = { ...patient, ...formData };
  const lines = Object.entries(formData)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}: ${v}`)
    .join('\n');

  const patientCtx = [
    merged.fullName && `Patient: ${merged.fullName}`,
    merged.age && `Age: ${merged.age}`,
    merged.sex && `Sex: ${merged.sex}`,
    merged.bloodGroup && `Blood Group: ${merged.bloodGroup}`,
  ].filter(Boolean).join(', ');

  return `${patientCtx ? `Patient context: ${patientCtx}\n\n` : ''}User inputs:\n${lines}`;
};

/* ── Parse Gemini response into structured output ───────────────────────── */
const parseGeminiResponse = (text) => {
  // Strip markdown code fences if Gemini wraps the JSON
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(cleaned);
    // Validate required fields
    if (parsed.title && parsed.summary && Array.isArray(parsed.highlights) && Array.isArray(parsed.nextSteps)) {
      return parsed;
    }
  } catch (e) {
    console.warn('Gemini JSON parse failed, using raw text fallback:', e.message);
  }

  // Fallback: wrap raw text as summary
  return {
    title: 'AI Analysis',
    status: 'Completed',
    summary: cleaned,
    highlights: [],
    nextSteps: [],
  };
};

/* ── Main export: call Gemini for any agent ──────────────────────────────── */
export const callGeminiDirect = async (agentId, formData, patient) => {
  if (!model) {
    throw new Error('Gemini not initialised — API key missing');
  }

  // ── Check cache first ──
  const cacheInputs = { agentId, formData, patient };
  const cached = getCachedResponse(agentId, cacheInputs);
  if (cached) {
    console.log('🟢 Cache hit for', agentId);
    return cached;
  }

  const systemPrompt = SYSTEM_PROMPTS[agentId];
  if (!systemPrompt) {
    throw new Error(`No system prompt for agent: ${agentId}`);
  }

  const userMessage = buildUserPrompt(agentId, formData, patient);
  const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

  console.log('🟣 Gemini direct call for', agentId, '(queued via rate limiter)');

  // ── Enqueue through rate limiter (handles retry + 429 backoff + key rotation) ──
  const result = await enqueueGeminiRequest(
    () => model.generateContent(fullPrompt),
    () => () => model.generateContent(fullPrompt)  // getUpdatedFn: re-reads model after rotation
  );
  const responseText = result.response.text();
  console.log('🟢 Gemini raw response:', responseText);

  const parsed = parseGeminiResponse(responseText);

  // ── Store in cache ──
  setCachedResponse(agentId, cacheInputs, parsed);

  return parsed;
};

export const isGeminiAvailable = () => !!model;
