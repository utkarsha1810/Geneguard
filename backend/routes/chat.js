import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

const SYSTEM_PROMPT =
  "You are a helpful conversational AI assistant for GeneGuard, a genetic health platform. Answer whatever the user asks naturally and directly. If they say hi, say hi back casually. If they ask a general question, answer it normally. If they ask about genetics, DNA, or health, give a clear helpful answer. Only mention GeneGuard pages when the user asks about the website or needs navigation help. GeneGuard pages: Home(/), Learn Genetics(/learn-genetics), Genetic Disorders(/genetic-disorders), DNA Testing(/dna), DNA Agents(/dna/agents), Patient Intake(/dna/patient-intake), Genetic Assessment AI(/genetic-assessment), Counselling(/counselling), Login(/login), Signup(/register), About(/about). If the user writes or speaks in Hindi (Devanagari script), respond entirely in Hindi using proper Devanagari script. If they write or speak in English, respond in English. Always match the language the user is using. Keep responses concise and complete. Never cut off mid-sentence. If the answer is short, keep it short. If detail is needed, give it fully. Always finish your thought completely.";

/**
 * POST /api/chat
 * Streams AI assistant responses via Server-Sent Events (SSE)
 */
router.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Load available Gemini keys from backend environment
  const keysToTry = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_KEY_3,
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_4,
  ].filter((k) => k && k.trim() && !k.includes('your_'));

  if (keysToTry.length === 0) {
    logger('🔴 [Chat] No Gemini API keys configured in backend .env');
    return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
  }

  // Models to attempt (starting with requested 2.0-flash, falling back to 3.5-flash / 3.8-flash)
  const modelsToTry = [
    'gemini-2.0-flash',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  const contents = [
    ...(Array.isArray(history) ? history.slice(-6) : []),
    { role: 'user', parts: [{ text: message.trim() }] },
  ];

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      stopSequences: [],
    },
  });

  let activeStream = null;
  let activeReader = null;

  for (const apiKey of keysToTry) {
    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`;

        const headers = {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        };

        if (apiKey.startsWith('AQ.')) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: requestBody,
        });

        if (response.ok && response.body) {
          activeStream = response.body;
          activeReader = response.body.getReader();
          logger(`✓ [Chat] Streaming with model: ${modelName}`);
          break;
        } else {
          const errStatus = response.status;
          const errText = await response.text().catch(() => '');
          logger(`⚠️ [Chat] Model ${modelName} returned status ${errStatus}: ${errText.substring(0, 120)}`);
          if (errStatus === 404 || errStatus === 503) continue; // Try next model
          if (errStatus === 403 || errStatus === 429) break; // Try next key
        }
      } catch (err) {
        logger(`⚠️ [Chat] Fetch error for ${modelName}: ${err.message}`);
      }
    }

    if (activeReader) break;
  }

  if (!activeReader) {
    return res.status(502).json({ error: 'Failed to establish stream with AI provider.' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // If client disconnects, clean up upstream reader
  req.on('close', () => {
    try {
      activeReader.cancel();
    } catch (_) {}
  });

  try {
    while (true) {
      const { done, value } = await activeReader.read();
      if (done) {
        res.end();
        break;
      }
      res.write(value);
    }
  } catch (streamErr) {
    logger(`⚠️ [Chat] Stream relay error: ${streamErr.message}`);
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;
