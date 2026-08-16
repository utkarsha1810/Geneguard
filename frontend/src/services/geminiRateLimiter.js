/**
 * Gemini API Rate Limiter, Retry, Cache & Key Rotation
 * ─────────────────────────────────────────────────────
 * Shared singleton used by geminiDirectService.js and GeneticAssessmentAI.js
 *
 * Features:
 *  • Multi-key rotation pool (up to 4 API keys)
 *  • Auto-rotate to next key on 429 (RESOURCE_EXHAUSTED)
 *  • Max 25 requests per 60-second rolling window per key
 *  • 2-second minimum gap between consecutive API calls
 *  • Exponential backoff on 429 errors: 20 s → 40 s → rotate key
 *  • In-memory cache keyed by agentId + inputs (clears on page refresh)
 *  • Status callback so the UI can show "AI is thinking…" messages
 *  • Per-key exhaustion tracking with 1-hour auto-recovery
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/* ── Configuration ──────────────────────────────────────────────────────── */
const MAX_RPM = 25;                // stay safely under 30 RPM (gemini-2.0-flash-lite)
const MIN_DELAY_MS = 2_000;        // 2 s between consecutive calls
const WINDOW_MS = 60_000;          // 1-minute rolling window
const RETRY_DELAYS = [20_000, 40_000]; // backoff schedule for 429 errors
const MAX_RETRIES = 3;
const KEY_EXHAUSTION_TTL = 60 * 60 * 1000; // 1 hour before retrying exhausted key

/* ── API Key Pool ───────────────────────────────────────────────────────── */
const loadKeys = () => {
  const keys = [
    process.env.REACT_APP_GEMINI_KEY_1,
    process.env.REACT_APP_GEMINI_KEY_2,
    process.env.REACT_APP_GEMINI_KEY_3,
    process.env.REACT_APP_GEMINI_KEY_4,
  ].filter((k) => k && k.trim() && !k.includes('your_'));

  // Fallback to legacy single-key variable
  if (keys.length === 0) {
    const legacy = process.env.REACT_APP_GEMINI_API_KEY;
    if (legacy && legacy.trim()) keys.push(legacy.trim());
  }

  return keys;
};

const API_KEYS = loadKeys();
let currentKeyIndex = 0;

// Per-key exhaustion tracking: { index: { exhausted: bool, exhaustedAt: timestamp } }
const keyStatus = new Map();
API_KEYS.forEach((_, i) => keyStatus.set(i, { exhausted: false, exhaustedAt: 0 }));

console.log(`[RateLimiter] 🔑 Loaded ${API_KEYS.length} API key(s)`);
API_KEYS.forEach((k, i) => console.log(`  Key ${i + 1}: ${k.substring(0, 8)}...`));

/* ── Model Management ───────────────────────────────────────────────────── */
const MODEL_NAME = 'gemini-2.0-flash-lite';
const FALLBACK_MODEL = 'gemini-2.0-flash';
const generationConfig = { maxOutputTokens: 1200, temperature: 0.7 };

// Registered model reinitializers from consuming services
const reinitCallbacks = [];

/**
 * Register a callback to reinitialize a model when the key rotates.
 * Callback signature: (newApiKey: string) => void
 */
export const onKeyRotation = (cb) => {
  reinitCallbacks.push(cb);
};

const notifyKeyRotation = (newKey) => {
  reinitCallbacks.forEach((cb) => {
    try { cb(newKey); } catch (_) { /* never let a bad callback break rotation */ }
  });
};

/**
 * Create a fresh Gemini model instance for a given API key.
 */
const createModel = (apiKey) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const m = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig });
    console.log(`[RateLimiter] ✓ Model ${MODEL_NAME} created for key ...${apiKey.slice(-4)}`);
    return m;
  } catch (e) {
    console.warn(`[RateLimiter] ⚠ ${MODEL_NAME} failed, trying ${FALLBACK_MODEL}`);
    const m = genAI.getGenerativeModel({ model: FALLBACK_MODEL, generationConfig });
    console.log(`[RateLimiter] ✓ Fallback ${FALLBACK_MODEL} created for key ...${apiKey.slice(-4)}`);
    return m;
  }
};

/* ── Key Rotation Logic ─────────────────────────────────────────────────── */

/**
 * Check if an exhausted key's TTL has expired and reset it.
 */
const refreshKeyStatus = () => {
  const now = Date.now();
  keyStatus.forEach((status, idx) => {
    if (status.exhausted && (now - status.exhaustedAt) > KEY_EXHAUSTION_TTL) {
      console.log(`[RateLimiter] 🔄 Key ${idx + 1} recovered (TTL expired)`);
      keyStatus.set(idx, { exhausted: false, exhaustedAt: 0 });
    }
  });
};

/**
 * Mark the current key as exhausted and rotate to the next available key.
 * Returns the new API key, or null if all keys are exhausted.
 */
const rotateKey = () => {
  refreshKeyStatus();

  // Mark current key as exhausted
  keyStatus.set(currentKeyIndex, { exhausted: true, exhaustedAt: Date.now() });
  console.warn(`[RateLimiter] 🔴 Key ${currentKeyIndex + 1} exhausted (429)`);

  // Find next non-exhausted key
  for (let i = 1; i <= API_KEYS.length; i++) {
    const nextIdx = (currentKeyIndex + i) % API_KEYS.length;
    const status = keyStatus.get(nextIdx);
    if (!status.exhausted) {
      currentKeyIndex = nextIdx;
      const newKey = API_KEYS[currentKeyIndex];
      console.log(`[RateLimiter] 🔄 Rotated to Key ${currentKeyIndex + 1} (...${newKey.slice(-4)})`);
      notifyKeyRotation(newKey);
      notifyStatus({ keyRotated: true, activeKey: currentKeyIndex + 1, ...getKeyStatus() });
      return newKey;
    }
  }

  // All keys exhausted
  console.error('[RateLimiter] 🔴 ALL keys exhausted — no available keys');
  return null;
};

/**
 * Get the currently active API key.
 */
export const getCurrentKey = () => {
  refreshKeyStatus();
  if (API_KEYS.length === 0) return '';
  // If current key is exhausted, try to rotate
  const status = keyStatus.get(currentKeyIndex);
  if (status?.exhausted) {
    const newKey = rotateKey();
    return newKey || '';
  }
  return API_KEYS[currentKeyIndex];
};

/**
 * Get status of all keys: { total, active, exhausted, keys: [...] }
 */
export const getKeyStatus = () => {
  refreshKeyStatus();
  const keys = [];
  let active = 0;
  let exhausted = 0;
  keyStatus.forEach((status, idx) => {
    const isActive = !status.exhausted;
    keys.push({ index: idx + 1, active: isActive, exhaustedAt: status.exhaustedAt });
    if (isActive) active++;
    else exhausted++;
  });
  return { total: API_KEYS.length, active, exhausted, keys };
};

/* ── Internal State ─────────────────────────────────────────────────────── */
const requestTimestamps = [];      // rolling window of recent call timestamps
let lastRequestTime = 0;
const queue = [];                  // FIFO queue of pending requests
let processing = false;

/* ── Response Cache (in-memory, clears on refresh) ──────────────────────── */
const responseCache = new Map();

/**
 * Build a deterministic cache key from agentId + inputs.
 */
const buildCacheKey = (agentId, inputs) =>
  `${agentId}::${JSON.stringify(inputs ?? {})}`;

/**
 * Return a cached response if one exists for this agent + inputs combo.
 */
export const getCachedResponse = (agentId, inputs) =>
  responseCache.get(buildCacheKey(agentId, inputs)) ?? null;

/**
 * Store a response in the session cache.
 */
export const setCachedResponse = (agentId, inputs, response) =>
  responseCache.set(buildCacheKey(agentId, inputs), response);

/* ── Status Callback ────────────────────────────────────────────────────── */
let statusCallback = null;

/**
 * Register a callback that receives queue-status objects:
 *   { waiting, retrying, executing, waitMs, attempt, queueLength, keyRotated, activeKey }
 */
export const onQueueStatus = (cb) => {
  statusCallback = cb;
};

const notifyStatus = (status) => {
  try {
    if (statusCallback) statusCallback(status);
  } catch (_) {
    /* never let a bad callback break the queue */
  }
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate how long we must wait before the next call is allowed.
 */
const getWaitTime = () => {
  const now = Date.now();

  // Prune timestamps outside the rolling window
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > WINDOW_MS) {
    requestTimestamps.shift();
  }

  // RPM cap — if we already sent MAX_RPM calls in the last minute, wait
  if (requestTimestamps.length >= MAX_RPM) {
    const waitForWindow = requestTimestamps[0] + WINDOW_MS - now;
    if (waitForWindow > 0) return waitForWindow;
  }

  // Minimum delay between consecutive calls
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    return MIN_DELAY_MS - elapsed;
  }

  return 0;
};

/* ── 429-Aware Retry + Key Rotation Logic ───────────────────────────────── */
const is429 = (err) =>
  err?.status === 429 ||
  err?.statusCode === 429 ||
  /429|RESOURCE_EXHAUSTED|Too Many Requests/i.test(err?.message ?? '');

/**
 * Execute fn with retry logic. On 429:
 *  1. Try rotating to a new key and retry immediately (doesn't count as retry attempt)
 *  2. If same key, use exponential backoff
 *  3. If all keys exhausted, throw friendly error
 */
const executeWithRetry = async (fn, getUpdatedFn) => {
  let lastError;
  let keyRotationAttempted = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (is429(err)) {
        // Try key rotation first (free attempt, doesn't count)
        if (!keyRotationAttempted && API_KEYS.length > 1) {
          const newKey = rotateKey();
          if (newKey) {
            console.log(`[RateLimiter] 🔄 Retrying with rotated key (free attempt)`);
            keyRotationAttempted = true;
            // Get updated function with new model from caller
            if (getUpdatedFn) {
              fn = getUpdatedFn();
            }
            attempt--; // Don't count this as a retry
            await sleep(2_000); // Brief pause before retry with new key
            continue;
          } else {
            // All keys exhausted
            throw new Error('All AI capacity is currently exhausted. Please try again in a few hours.');
          }
        }

        // Standard backoff retry
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.warn(
            `⏳ Gemini 429 — retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          notifyStatus({ retrying: true, attempt: attempt + 1, waitMs: delay, queueLength: queue.length });
          await sleep(delay);
        }
      } else {
        // Non-rate-limit error — propagate immediately
        throw err;
      }
    }
  }

  // All retries exhausted — user-friendly message
  console.error('🔴 Gemini rate limit — all retries exhausted');
  throw new Error('Our AI is busy right now. Please wait a moment and try again.');
};

/* ── Queue Processor ────────────────────────────────────────────────────── */
const processQueue = async () => {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    const { fn, getUpdatedFn, resolve, reject } = queue[0];

    // Respect rate limits
    const waitTime = getWaitTime();
    if (waitTime > 0) {
      console.log(`⏳ Rate limiter — waiting ${(waitTime / 1000).toFixed(1)}s (${queue.length} in queue)`);
      notifyStatus({ waiting: true, waitMs: waitTime, queueLength: queue.length });
      await sleep(waitTime);
    }

    try {
      notifyStatus({ waiting: false, executing: true, queueLength: queue.length });
      const result = await executeWithRetry(fn, getUpdatedFn);

      // Record successful call timestamp
      requestTimestamps.push(Date.now());
      lastRequestTime = Date.now();

      queue.shift();
      resolve(result);
    } catch (err) {
      queue.shift();
      reject(err);
    }

    notifyStatus({ waiting: false, executing: false, queueLength: queue.length });
  }

  processing = false;
};

/* ── Main Export ─────────────────────────────────────────────────────────── */

/**
 * Enqueue a Gemini API call. The function `fn` should return a Promise
 * (typically `model.generateContent(prompt)`).
 *
 * `getUpdatedFn` is an optional function that returns a NEW fn using the
 * current (possibly rotated) key/model. Called after key rotation.
 *
 * Usage:
 *   const result = await enqueueGeminiRequest(
 *     () => model.generateContent(prompt),
 *     () => () => getLatestModel().generateContent(prompt)  // optional
 *   );
 */
export const enqueueGeminiRequest = (fn, getUpdatedFn) =>
  new Promise((resolve, reject) => {
    queue.push({ fn, getUpdatedFn, resolve, reject });
    processQueue();
  });
