import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './GeneGuardAssistant.css';

/* ═══════════════════════════════════════════════════════════════════════════
   GeneGuard AI Assistant — Complete Rebuild
   Gemini 1.5 Flash, Voice I/O, Hindi + English, Conversation History
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Constants ────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_KEY_1;
const MODEL = 'gemini-2.0-flash';

// ── Diagnostics ─────────────────────────────────────────────────────────────
console.log('[GeneGuard] Gemini Key loaded:', GEMINI_API_KEY ? `YES (${GEMINI_API_KEY.startsWith('AQ.') ? 'Bearer Auth Key' : 'Standard Key'} starts with ${GEMINI_API_KEY.substring(0, 8)}...)` : 'NO - KEY MISSING');
console.log('[GeneGuard] Primary Model:', MODEL);

const SYSTEM_PROMPT =
  "You are a helpful conversational AI assistant for GeneGuard, a genetic health platform. Answer whatever the user asks naturally and directly. If they say hi, say hi back casually. If they ask a general question, answer it normally. If they ask about genetics, DNA, or health, give a clear helpful answer. Only mention GeneGuard pages when the user asks about the website or needs navigation help. GeneGuard pages: Home(/), Learn Genetics(/learn-genetics), Genetic Disorders(/genetic-disorders), DNA Testing(/dna), DNA Agents(/dna/agents), Patient Intake(/dna/patient-intake), Genetic Assessment AI(/genetic-assessment), Counselling(/counselling), Login(/login), Signup(/register), About(/about). Support both English and Hindi — if user writes in Hindi, respond in Hindi. Keep responses concise and natural.";

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
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // ── Setup Speech Recognition ─────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      // Do NOT auto-send — user presses send manually
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }
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

  // ── Cleanup speech synthesis on unmount ──────────────────────────────────
  useEffect(() => {
    return () => synthRef.current?.cancel();
  }, []);

  // ── Send message to Gemini ───────────────────────────────────────────────
  const sendMessage = useCallback(
    async (userText) => {
      // Build new history with user message
      const newHistory = [
        ...conversationHistory,
        { role: 'user', parts: [{ text: userText }] },
      ];

      const keysToTry = [
        process.env.REACT_APP_GEMINI_API_KEY,
        process.env.REACT_APP_GEMINI_KEY_1,
        process.env.REACT_APP_GEMINI_KEY_2,
        process.env.REACT_APP_GEMINI_KEY_3,
        process.env.REACT_APP_GEMINI_KEY_4,
      ].filter(Boolean);

      const uniqueKeys = Array.from(new Set(keysToTry));
      const modelsToTry = [MODEL, 'gemini-3.8-flash', 'gemini-flash-latest'];

      let lastError = null;
      let aiText = null;

      for (const key of uniqueKeys) {
        const isAuthKey = key.startsWith('AQ.');
        const headers = {
          'Content-Type': 'application/json',
          ...(isAuthKey
            ? { Authorization: `Bearer ${key}` }
            : { 'x-goog-api-key': key }),
        };

        for (const modelName of modelsToTry) {
          const url = isAuthKey
            ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`
            : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;

          try {
            console.log(`[GeneGuard] Calling ${modelName} with ${isAuthKey ? 'Bearer Auth Key' : 'API Key'} (${key.substring(0, 8)}...)`);
            const response = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: newHistory,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (aiText) break;
            } else {
              const errData = await response.json().catch(() => ({}));
              lastError = errData?.error?.message || `HTTP ${response.status}`;
              console.warn(`[GeneGuard] ${modelName} response status ${response.status}:`, lastError);
              // If model is discontinued or not found (404), try next model immediately
              if (response.status === 404) continue;
              // If key is unauthenticated (401) or forbidden/leaked (403), switch key
              if (response.status === 401 || response.status === 403) break;
            }
          } catch (fetchErr) {
            lastError = fetchErr.message;
            console.warn(`[GeneGuard] Fetch error for ${modelName}:`, fetchErr.message);
          }
        }

        if (aiText) break;
      }

      if (!aiText) {
        throw new Error(lastError || 'All Gemini API endpoints failed');
      }

      // Persist conversation history
      setConversationHistory([
        ...newHistory,
        { role: 'model', parts: [{ text: aiText }] },
      ]);

      return aiText;
    },
    [conversationHistory]
  );

  // ── Speak text aloud ─────────────────────────────────────────────────────
  const speakText = useCallback(
    (text, msgId) => {
      if (!synthRef.current || isMuted) return;

      synthRef.current.cancel();

      // Clean markdown/route tokens for cleaner speech
      const clean = text
        .replace(/\([^)]*\)/g, '')
        .replace(/[*_#`~[\]]/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Pick voice based on language
      const voices = synthRef.current.getVoices();
      if (isHindi(text)) {
        utterance.lang = 'hi-IN';
        const hindiVoice = voices.find((v) => v.lang === 'hi-IN');
        if (hindiVoice) utterance.voice = hindiVoice;
      } else {
        utterance.lang = 'en-IN';
        const indianVoice =
          voices.find((v) => v.lang === 'en-IN') ||
          voices.find((v) => v.lang.includes('en'));
        if (indianVoice) utterance.voice = indianVoice;
      }

      utterance.onstart = () => setSpeakingMsgId(msgId);
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);

      synthRef.current.speak(utterance);
    },
    [isMuted]
  );

  // ── Handle send ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (overrideText) => {
      const text = (overrideText || input).trim();
      if (!text || isLoading) return;

      // Stop any ongoing speech
      synthRef.current?.cancel();
      setSpeakingMsgId(null);

      const userMsg = {
        id: Date.now(),
        role: 'user',
        text,
        timestamp: new Date(),
      };

      setInput('');
      setShowChips(false);
      setIsLoading(true);
      setMessages((prev) => [...prev, userMsg]);

      try {
        const aiText = await sendMessage(text);
        const aiMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          text: aiText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Auto-speak unless muted
        if (!isMuted) {
          setTimeout(() => speakText(aiText, aiMsg.id), 200);
        }
      } catch (err) {
        console.error('[GeneGuardAssistant] Error:', err);
        const errMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          text: "Sorry, I couldn't process that right now. Please try again!",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, sendMessage, speakText, isMuted]
  );

  // ── Toggle microphone ───────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      synthRef.current?.cancel();
      setSpeakingMsgId(null);
      setInput('');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch {
        setIsListening(false);
      }
    }
  }, [isListening]);

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
      {/* ── FAB ── */}
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
                <span className="gg-header-subtitle">Powered by Gemini</span>
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
            {isListening && <span className="gg-listening-label">🎙 Listening…</span>}
            <div className="gg-input-row">
              <input
                ref={inputRef}
                type="text"
                className="gg-text-input"
                placeholder="Type a message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                id="gg-chat-input"
              />
              {speechSupported && (
                <button
                  className={`gg-mic-btn ${isListening ? 'recording' : ''}`}
                  onClick={toggleListening}
                  aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                  title={isListening ? 'Stop listening' : 'Speak your message'}
                  disabled={isLoading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
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
          </div>
        </div>
      )}
    </>
  );
};

export default GeneGuardAssistant;
