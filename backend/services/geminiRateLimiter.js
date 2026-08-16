/**
 * Gemini API Rate Limiter, Retry, Cache & Key Rotation — Node.js / Backend
 * ────────────────────────────────────────────────────────────────────────────
 * Same logic as the frontend version, exported as ESM for the Express backend.
 *
 * Features:
 *  • Multi-key rotation pool (up to 4 API keys)
 *  • Auto-rotate to next key on 429 (RESOURCE_EXHAUSTED)
 *  • Max 25 requests per 60-second rolling window per key
 *  • 2-second minimum gap between consecutive API calls
 *  • Per-key exhaustion tracking with 1-hour auto-recovery
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/* ── Configuration ──────────────────────────────────────────────────────── */
const MAX_RPM = 25;                // stay safely under 30 RPM (gemini-2.0-flash-lite)
const MIN_DELAY_MS = 2_000;        // 2 s between consecutive calls
const WINDOW_MS = 60_000;
const RETRY_DELAYS = [20_000, 40_000];
const MAX_RETRIES = 3;
const KEY_EXHAUSTION_TTL = 60 * 60 * 1000; // 1 hour

/* ── API Key Pool ───────────────────────────────────────────────────────── */
const loadKeys = () => {
  const keys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_4,
  ].filter((k) => k && k.trim() && !k.includes('your_'));

  // Fallback to legacy single-key variable
  if (keys.length === 0) {
    const legacy = process.env.GEMINI_API_KEY;
    if (legacy && legacy.trim()) keys.push(legacy.trim());
  }

  return keys;
};

const API_KEYS = loadKeys();
let currentKeyIndex = 0;

// Per-key exhaustion tracking
const keyStatus = new Map();
API_KEYS.forEach((_, i) => keyStatus.set(i, { exhausted: false, exhaustedAt: 0 }));

console.log(`[BackendRateLimiter] 🔑 Loaded ${API_KEYS.length} API key(s)`);

/* ── Model Management ───────────────────────────────────────────────────── */
const reinitCallbacks = [];

export const onKeyRotation = (cb) => {
  reinitCallbacks.push(cb);
};

const notifyKeyRotation = (newKey) => {
  reinitCallbacks.forEach((cb) => {
    try { cb(newKey); } catch (_) { /* safe */ }
  });
};

/* ── Key Rotation Logic ─────────────────────────────────────────────────── */
const refreshKeyStatus = () => {
  const now = Date.now();
  keyStatus.forEach((status, idx) => {
    if (status.exhausted && (now - status.exhaustedAt) > KEY_EXHAUSTION_TTL) {
      console.log(`[BackendRateLimiter] 🔄 Key ${idx + 1} recovered (TTL expired)`);
      keyStatus.set(idx, { exhausted: false, exhaustedAt: 0 });
    }
  });
};

const rotateKey = () => {
  refreshKeyStatus();
  keyStatus.set(currentKeyIndex, { exhausted: true, exhaustedAt: Date.now() });
  console.warn(`[BackendRateLimiter] 🔴 Key ${currentKeyIndex + 1} exhausted (429)`);

  for (let i = 1; i <= API_KEYS.length; i++) {
    const nextIdx = (currentKeyIndex + i) % API_KEYS.length;
    const status = keyStatus.get(nextIdx);
    if (!status.exhausted) {
      currentKeyIndex = nextIdx;
      const newKey = API_KEYS[currentKeyIndex];
      console.log(`[BackendRateLimiter] 🔄 Rotated to Key ${currentKeyIndex + 1}`);
      notifyKeyRotation(newKey);
      return newKey;
    }
  }

  console.error('[BackendRateLimiter] 🔴 ALL keys exhausted');
  return null;
};

export const getCurrentKey = () => {
  refreshKeyStatus();
  if (API_KEYS.length === 0) return '';
  const status = keyStatus.get(currentKeyIndex);
  if (status?.exhausted) {
    const newKey = rotateKey();
    return newKey || '';
  }
  return API_KEYS[currentKeyIndex];
};

export const getKeyStatus = () => {
  refreshKeyStatus();
  let active = 0;
  let exhausted = 0;
  keyStatus.forEach((status) => {
    if (!status.exhausted) active++;
    else exhausted++;
  });
  return { total: API_KEYS.length, active, exhausted };
};

/* ── Internal State ─────────────────────────────────────────────────────── */
const requestTimestamps = [];
let lastRequestTime = 0;
const queue = [];
let processing = false;

/* ── Response Cache ─────────────────────────────────────────────────────── */
const responseCache = new Map();

const buildCacheKey = (agentId, inputs) =>
  `${agentId}::${JSON.stringify(inputs ?? {})}`;

export const getCachedResponse = (agentId, inputs) =>
  responseCache.get(buildCacheKey(agentId, inputs)) ?? null;

export const setCachedResponse = (agentId, inputs, response) =>
  responseCache.set(buildCacheKey(agentId, inputs), response);

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getWaitTime = () => {
  const now = Date.now();
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_RPM) {
    const wait = requestTimestamps[0] + WINDOW_MS - now;
    if (wait > 0) return wait;
  }
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) return MIN_DELAY_MS - elapsed;
  return 0;
};

/* ── Retry + Key Rotation Logic ─────────────────────────────────────────── */
const is429 = (err) =>
  err?.status === 429 ||
  err?.statusCode === 429 ||
  /429|RESOURCE_EXHAUSTED|Too Many Requests/i.test(err?.message ?? '');

const executeWithRetry = async (fn, getUpdatedFn) => {
  let lastError;
  let keyRotationAttempted = false;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (is429(err)) {
        if (!keyRotationAttempted && API_KEYS.length > 1) {
          const newKey = rotateKey();
          if (newKey) {
            console.log(`[BackendRateLimiter] 🔄 Retrying with rotated key`);
            keyRotationAttempted = true;
            if (getUpdatedFn) fn = getUpdatedFn();
            attempt--;
            await sleep(2_000);
            continue;
          } else {
            throw new Error('All AI capacity is currently exhausted. Please try again in a few hours.');
          }
        }

        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
          console.warn(`⏳ Gemini 429 — retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
        }
      } else {
        throw err;
      }
    }
  }
  throw new Error('Our AI is busy right now. Please wait a moment and try again.');
};

/* ── Queue Processor ────────────────────────────────────────────────────── */
const processQueue = async () => {
  if (processing || queue.length === 0) return;
  processing = true;
  while (queue.length > 0) {
    const { fn, getUpdatedFn, resolve, reject } = queue[0];
    const waitTime = getWaitTime();
    if (waitTime > 0) {
      console.log(`⏳ Rate limiter — waiting ${(waitTime / 1000).toFixed(1)}s (${queue.length} in queue)`);
      await sleep(waitTime);
    }
    try {
      const result = await executeWithRetry(fn, getUpdatedFn);
      requestTimestamps.push(Date.now());
      lastRequestTime = Date.now();
      queue.shift();
      resolve(result);
    } catch (err) {
      queue.shift();
      reject(err);
    }
  }
  processing = false;
};

/* ── Main Export ─────────────────────────────────────────────────────────── */
export const enqueueGeminiRequest = (fn, getUpdatedFn) =>
  new Promise((resolve, reject) => {
    queue.push({ fn, getUpdatedFn, resolve, reject });
    processQueue();
  });
