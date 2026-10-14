import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './GeneGuardAssistant.css';

/* ═══════════════════════════════════════════════════════════════════════════
   GeneGuard AI Assistant — Direct Frontend Gemini Integration
   Direct generateContent, MediaRecorder + Audio Transcription, Voice Output
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Gemini API Keys & Request Helper ───────────────────────────────────────
const getAvailableKeys = () => {
  const keys = [
    process.env.REACT_APP_GEMINI_API_KEY,
    'AIzaSyBqzIN6BWhXzZFELlW38MsXHJHjU46cHmw',
    process.env.REACT_APP_GEMINI_KEY_1,
    process.env.REACT_APP_GEMINI_KEY_2,
    process.env.REACT_APP_GEMINI_KEY_3,
    process.env.REACT_APP_GEMINI_KEY_4,
  ].filter(Boolean);
  return Array.from(new Set(keys));
};

const SYSTEM_PROMPT =
  "You are a helpful conversational AI assistant for GeneGuard, a genetic health platform. Answer whatever the user asks naturally and directly. If they say hi, say hi back casually. If they ask a general question, answer it normally. If they ask about genetics, DNA, or health, give a clear helpful answer. Only mention GeneGuard pages when the user asks about the website or needs navigation help. GeneGuard pages: Home(/), Learn Genetics(/learn-genetics), Genetic Disorders(/genetic-disorders), DNA Testing(/dna), DNA Agents(/dna/agents), Patient Intake(/dna/patient-intake), Learning Hub (/learning-hub) — personalized genetic learning recommendations based on genetic conditions, Counselling(/counselling), Login(/login), Signup(/register), About(/about). If the user writes or speaks in Hindi (Devanagari script), respond entirely in Hindi using proper Devanagari script. If they write or speak in English, respond in English. Always match the language the user is using. Keep responses concise and complete. Never cut off mid-sentence. If the answer is short, keep it short. If detail is needed, give it fully. Always finish your thought completely.";

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hi! How can I help you today?',
  timestamp: new Date(),
};

const SUGGESTED_CHIPS = [
  'What is this platform about?',
  'How do I book a doctor?',
  'What is DNA testing?',
  'मुझे इस वेबसाइट के बारे में बताएं',
];

const HIDDEN_ROUTES = ['/login', '/register', '/signup', '/admin'];

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

/** Simple Hindi detector — checks for Devanagari characters */
const isHindi = (text) => /[\u0900-\u097F]/.test(text);

/** Clean markdown tokens so chat display and speech stay natural and never show ** or * */
const cleanMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\*+/g, '')
    .trim();
};

/**
 * Robust Direct Gemini API caller:
 * Tries requested gemini-2.0-flash first, and if unavailable/quota/overloaded,
 * falls back seamlessly to available flash models.
 */
const makeGeminiRequest = async (endpoint, body) => {
  const keys = getAvailableKeys();
  const models = [
    'gemini-2.0-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  let lastError = null;

  for (const apiKey of keys) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey.startsWith('ya29.')) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else {
      headers['x-goog-api-key'] = apiKey;
    }

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${encodeURIComponent(
          apiKey
        )}`;

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const data = await response.json();
        if (!response.ok) {
          lastError = new Error(data?.error?.message || `HTTP ${response.status}`);
          // 404: model not found, try next model with same key
          if (response.status === 404) {
            continue;
          }
          // 429 or 503: quota or overloaded, try next model or key
          if (response.status === 429 || response.status === 503) {
            continue;
          }
          // 401 or 403: auth error with this key, break to next key
          if (response.status === 401 || response.status === 403) {
            break;
          }
          continue;
        }

        return data;
      } catch (err) {
        lastError = err;
        continue;
      }
    }
  }

  throw lastError || new Error('No response from Gemini API');
};

/**
 * FIX 1: Direct Frontend Gemini Chat Call
 */
const callGeminiChat = async (message, history = []) => {
  const recentHistory = (history || []).slice(-6).map((h) => ({
    role: h.role === 'assistant' ? 'model' : h.role,
    parts: Array.isArray(h.parts) ? h.parts : [{ text: h.text || '' }],
  }));

  const requestBody = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [...recentHistory, { role: 'user', parts: [{ text: message }] }],
    generationConfig: { temperature: 0.7 },
  };

  const data = await makeGeminiRequest('generateContent', requestBody);
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error('Empty response from Gemini');
  }
  return reply;
};

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */
const GeneGuardAssistant = () => {
  const location = useLocation();
  const shouldHide = HIDDEN_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith('/admin')
  );

  // ── State ────────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [conversationHistory, setConversationHistory] = useState([]); // Gemini-format history
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // 'idle' | 'recording' | 'transcribing'
  const [voiceError, setVoiceError] = useState(null);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [language, setLanguage] = useState('en'); // 'en' or 'hi'

  // ── Refs ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const silenceTimerRef = useRef(null);

  // ── Cleanup MediaRecorder on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      try {
        clearTimeout(silenceTimerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
      } catch (_) {}
    };
  }, []);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Focus input when panel opens ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // ── Setup Speech Synthesis Voices ─────────────────────────────────────────
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (!window.speechSynthesis) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setVoices(v);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      synthRef.current?.cancel();
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // ── Speak text aloud with Female Voice Selection (Voice Output intact) ───
  const speakText = useCallback(
    (text, msgId) => {
      if (!synthRef.current || isMuted) return;

      synthRef.current.cancel();

      const clean = cleanMarkdown(text)
        .replace(/\([^)]*\)/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 0.95;
      utterance.pitch = 1.05; // Natural female tone
      utterance.volume = 1.0;

      const currentVoices = synthRef.current.getVoices() || voices;
      const hindiMode = isHindi(clean);

      // English female voices:
      const englishVoice =
        currentVoices.find((v) => v.lang === 'en-IN' && v.name.toLowerCase().includes('female')) ||
        currentVoices.find((v) => v.lang === 'en-IN' && (v.name.includes('Raveena') || v.name.includes('Veena') || v.name.includes('Priya'))) ||
        currentVoices.find((v) => v.lang === 'en-IN') ||
        currentVoices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
        currentVoices.find((v) => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen')));

      // Hindi female voices:
      const hindiVoice =
        currentVoices.find((v) => v.lang === 'hi-IN' && v.name.toLowerCase().includes('female')) ||
        currentVoices.find((v) => v.lang === 'hi-IN' && (v.name.includes('Lekha') || v.name.includes('Kalpana') || v.name.includes('Heera'))) ||
        currentVoices.find((v) => v.lang === 'hi-IN');

      utterance.voice = hindiMode ? hindiVoice : englishVoice;
      utterance.lang = hindiMode ? 'hi-IN' : 'en-IN';

      utterance.onstart = () => setSpeakingMsgId(msgId);
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);

      synthRef.current.speak(utterance);
    },
    [isMuted, voices]
  );

  // ── FIX 2: Send audio to Gemini for transcription ─────────────────────────
  const transcribeAudio = useCallback(
    async (base64AudioData, audioMime = 'audio/webm') => {
      const promptText =
        language === 'hi'
          ? 'Transcribe this Hindi audio to Devanagari text exactly. Return only the transcribed text, nothing else.'
          : 'Transcribe this English audio to text exactly. Return only the transcribed text, nothing else.';

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: audioMime,
                  data: base64AudioData,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
      };

      try {
        const data = await makeGeminiRequest('generateContent', requestBody);
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (rawText) {
          setInput(rawText);
          setVoiceError(null);
        } else {
          setVoiceError('Could not understand audio, please try again');
        }
      } catch (err) {
        console.error('[GeneGuardAssistant] Audio transcription error:', err);
        setVoiceError('Could not understand audio, please try again');
      } finally {
        setRecordingStatus('idle');
      }
    },
    [language]
  );

  // ── Stop recording and process audio ─────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
  }, []);

  // ── Start recording using MediaRecorder ──────────────────────────────────
  const startRecording = useCallback(async () => {
    synthRef.current?.cancel();
    setSpeakingMsgId(null);
    setVoiceError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceError('Please allow microphone access in browser settings');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm';
      if (window.MediaRecorder && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const cleanMime = mimeType.split(';')[0] || 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: cleanMime });

        if (audioBlob.size < 100) {
          setRecordingStatus('idle');
          setVoiceError('Could not understand audio, please try again');
          return;
        }

        setRecordingStatus('transcribing');

        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const resultStr = reader.result;
            if (typeof resultStr === 'string') {
              const base64 = resultStr.split(',')[1];
              if (base64) {
                transcribeAudio(base64, cleanMime);
                return;
              }
            }
            setRecordingStatus('idle');
            setVoiceError('Could not understand audio, please try again');
          } catch (_) {
            setRecordingStatus('idle');
            setVoiceError('Could not understand audio, please try again');
          }
        };
        reader.onerror = () => {
          setRecordingStatus('idle');
          setVoiceError('Could not understand audio, please try again');
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start(250);
      setRecordingStatus('recording');

      // Stop recording after user clicks mic again OR after 10 seconds of silence/timeout
      silenceTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 10000);
    } catch (err) {
      console.warn('[GeneGuardAssistant] getUserMedia error:', err);
      setRecordingStatus('idle');
      setVoiceError('Please allow microphone access in browser settings');
    }
  }, [stopRecording, transcribeAudio]);

  // ── Toggle recording button handler ──────────────────────────────────────
  const toggleRecording = useCallback(() => {
    if (recordingStatus === 'recording') {
      stopRecording();
    } else if (recordingStatus === 'idle') {
      startRecording();
    }
  }, [recordingStatus, startRecording, stopRecording]);

  // ── Handle send with Direct Gemini Call (FIX 1) ───────────────────────────
  const handleSend = useCallback(
    async (overrideText) => {
      const text = (overrideText || input).trim();
      if (!text || isLoading) return;

      synthRef.current?.cancel();
      setSpeakingMsgId(null);
      if (recordingStatus === 'recording') {
        stopRecording();
      }

      const userMsg = {
        id: Date.now(),
        role: 'user',
        text,
        timestamp: new Date(),
      };

      const aiMsgId = Date.now() + 1;

      setInput('');
      setShowChips(false);
      setIsLoading(true);
      setMessages((prev) => [...prev, userMsg]);

      try {
        const rawAiText = await callGeminiChat(text, conversationHistory);
        const cleanText = cleanMarkdown(rawAiText);

        setIsLoading(false);

        setMessages((prev) => [
          ...prev,
          {
            id: aiMsgId,
            role: 'assistant',
            text: cleanText,
            timestamp: new Date(),
          },
        ]);

        setConversationHistory((prev) => [
          ...prev.slice(-10),
          { role: 'user', parts: [{ text }] },
          { role: 'model', parts: [{ text: cleanText }] },
        ]);

        // Auto-speak in female voice unless muted
        if (!isMuted && cleanText) {
          setTimeout(() => speakText(cleanText, aiMsgId), 100);
        }
      } catch (err) {
        console.error('[GeneGuardAssistant] Chat error:', err);
        setIsLoading(false);
        const errMsg = {
          id: aiMsgId,
          role: 'assistant',
          text: "Sorry, I couldn't process that right now. Please try again!",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    },
    [input, isLoading, recordingStatus, stopRecording, conversationHistory, isMuted, speakText]
  );

  // ── Toggle language (EN ↔ Hindi) ────────────────────────────────────────
  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  }, []);

  // ── Toggle mute ─────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) {
        synthRef.current?.cancel();
        setSpeakingMsgId(null);
      }
      return !prev;
    });
  }, []);

  // ── Enter key to send ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ── Don't render on hidden routes ────────────────────────────────────────
  if (shouldHide) return null;

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Floating Action Button (FAB) ── */}
      {!isOpen && (
        <button
          className="gg-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Chat"
          id="gg-fab"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div className="gg-panel" id="gg-panel">
          {/* Header */}
          <div className="gg-header">
            <div className="gg-header-left">
              <div className="gg-header-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div>
                <h3 className="gg-header-title">GeneGuard AI</h3>
                <span className="gg-header-subtitle">Direct Gemini 2.0 Integration</span>
              </div>
            </div>
            <div className="gg-header-right">
              <button
                className={`gg-header-btn ${isMuted ? 'muted' : ''}`}
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                title={isMuted ? 'Unmute voice' : 'Mute voice'}
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <button
                className="gg-header-btn"
                onClick={() => {
                  setIsOpen(false);
                  synthRef.current?.cancel();
                  setSpeakingMsgId(null);
                }}
                aria-label="Close chat"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="gg-messages" ref={messagesContainerRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`gg-msg ${msg.role === 'user' ? 'gg-msg-user' : 'gg-msg-ai'}`}>
                <div className="gg-bubble">{msg.text}</div>
                <div className="gg-msg-meta">
                  <span className="gg-msg-time">{formatTime(msg.timestamp)}</span>
                  {msg.role === 'assistant' && msg.id !== 'welcome' && (
                    <button
                      className={`gg-replay-btn ${speakingMsgId === msg.id ? 'speaking' : ''}`}
                      onClick={() => speakText(msg.text, msg.id)}
                      aria-label="Replay"
                      title="Listen to this message"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Suggested chips — only before first user message */}
            {showChips && messages.filter((m) => m.role === 'user').length === 0 && (
              <div className="gg-chips">
                {SUGGESTED_CHIPS.map((chip, i) => (
                  <button key={i} className="gg-chip" onClick={() => handleSend(chip)}>
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div className="gg-typing">
                <span className="gg-dot" />
                <span className="gg-dot" />
                <span className="gg-dot" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="gg-input-area">
            {voiceError && (
              <div className="gg-mic-error-label">
                ⚠️ {voiceError}
              </div>
            )}
            <div className="gg-input-row">
              {/* Language Toggle */}
              <button
                className={`gg-lang-btn ${language === 'hi' ? 'hindi-active' : ''}`}
                onClick={toggleLanguage}
                aria-label={language === 'hi' ? 'Switch to English' : 'Switch to Hindi'}
                title={language === 'hi' ? 'हिंदी mode — click for English' : 'English mode — click for हिंदी'}
                disabled={isLoading}
                id="gg-lang-toggle"
              >
                {language === 'hi' ? 'हिं' : 'EN'}
              </button>

              <input
                ref={inputRef}
                type="text"
                className="gg-text-input"
                placeholder={language === 'hi' ? 'हिंदी में टाइप करें...' : 'Type a message…'}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (voiceError) setVoiceError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                id="gg-chat-input"
              />

              {/* Mic Button — never hidden, reflects recording/transcribing states */}
              <button
                className={`gg-mic-btn ${recordingStatus === 'recording' ? 'recording' : ''} ${recordingStatus === 'transcribing' ? 'transcribing' : ''}`}
                onClick={toggleRecording}
                aria-label={
                  recordingStatus === 'recording'
                    ? 'Stop recording'
                    : recordingStatus === 'transcribing'
                    ? 'Transcribing audio'
                    : 'Start voice input'
                }
                title={
                  recordingStatus === 'recording'
                    ? 'Stop recording'
                    : recordingStatus === 'transcribing'
                    ? 'Transcribing...'
                    : language === 'hi'
                    ? 'हिंदी में बोलें'
                    : 'Speak your message'
                }
                disabled={isLoading || recordingStatus === 'transcribing'}
                id="gg-mic-btn"
              >
                {recordingStatus === 'transcribing' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                    <path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              <button
                className="gg-send-btn"
                onClick={() => handleSend()}
                aria-label="Send message"
                disabled={!input.trim() || isLoading}
                id="gg-send-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>

            {/* State indicators below mic */}
            {recordingStatus === 'recording' && (
              <div className="gg-recording-label" id="gg-recording-indicator">
                <span>●</span> Recording...
              </div>
            )}
            {recordingStatus === 'transcribing' && (
              <div className="gg-transcribing-label" id="gg-transcribing-indicator">
                <span>⏳</span> Transcribing...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GeneGuardAssistant;
