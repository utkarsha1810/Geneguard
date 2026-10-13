import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './GeneGuardAssistant.css';

/* ═══════════════════════════════════════════════════════════════════════════
   GeneGuard AI Assistant — Complete Rebuild
   Gemini 1.5 Flash, Voice I/O, Hindi + English, Conversation History
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Backend API Route Configuration ─────────────────────────────────────────
const getChatApiUrl = () => {
  const rawApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5050';
  const backendBase = rawApiUrl.replace(/\/api\/?$/, '');
  return `${backendBase}/api/chat`;
};

const SYSTEM_PROMPT =
  "You are a helpful conversational AI assistant for GeneGuard, a genetic health platform. Answer whatever the user asks naturally and directly. If they say hi, say hi back casually. If they ask a general question, answer it normally. If they ask about genetics, DNA, or health, give a clear helpful answer. Only mention GeneGuard pages when the user asks about the website or needs navigation help. GeneGuard pages: Home(/), Learn Genetics(/learn-genetics), Genetic Disorders(/genetic-disorders), DNA Testing(/dna), DNA Agents(/dna/agents), Patient Intake(/dna/patient-intake), Genetic Assessment AI(/genetic-assessment), Counselling(/counselling), Login(/login), Signup(/register), About(/about). If the user writes or speaks in Hindi (Devanagari script), respond entirely in Hindi using proper Devanagari script. If they write or speak in English, respond in English. Always match the language the user is using. Keep responses concise and complete. Never cut off mid-sentence. If the answer is short, keep it short. If detail is needed, give it fully. Always finish your thought completely.";

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
  const [micError, setMicError] = useState(null);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [language, setLanguage] = useState('en'); // 'en' or 'hi'

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
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true; // show partial results while speaking
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      console.log('Transcript received:', transcript);
      console.log('Current transcript:', transcript);
      setInput(transcript); // update input field in real time as user speaks
      setMicError(null);
    };

    recognition.onerror = (event) => {
      console.log('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setMicError('Microphone access denied. Please allow microphone in browser settings.');
      } else if (event.error === 'network') {
        setMicError('Network error - try again');
      } else if (event.error !== 'no-speech') {
        setMicError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false); // stop pulsing animation
      // do NOT clear the input value here
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognitionRef.current?.abort(); } catch { /* ignore */ }
    };
  }, [language]); // Re-create recognition when language changes

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

  // ── Send message to backend Gemini Streaming Endpoint ────────────────────
  const sendMessageStream = useCallback(
    async (userText, onChunk) => {
      const chatUrl = getChatApiUrl();
      const recentHistory = conversationHistory.slice(-6);

      console.log('[GeneGuard] Calling backend chat endpoint:', chatUrl);

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userText,
          history: recentHistory,
        }),
      });

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `Server error (HTTP ${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let chunkData = '';
          if (trimmed.startsWith('data:')) {
            chunkData = trimmed.slice(5).trim();
          } else if (!trimmed.startsWith(':')) {
            chunkData = trimmed.replace(/^\[|,|\]$/g, '').trim();
          }

          if (!chunkData || chunkData === '[DONE]') continue;

          try {
            const parsed = JSON.parse(chunkData);
            const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              fullText += textChunk;
              onChunk(textChunk, fullText);
            }
          } catch (_) {
            // skip unparseable or partial chunk
          }
        }
      }

      // Process any trailing line in buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        let chunkData = '';
        if (trimmed.startsWith('data:')) {
          chunkData = trimmed.slice(5).trim();
        } else if (!trimmed.startsWith(':')) {
          chunkData = trimmed.replace(/^\[|,|\]$/g, '').trim();
        }

        if (chunkData && chunkData !== '[DONE]') {
          try {
            const parsed = JSON.parse(chunkData);
            const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              fullText += textChunk;
              onChunk(textChunk, fullText);
            }
          } catch (_) {
            // skip
          }
        }
      }

      if (!fullText.trim()) {
        throw new Error('No response generated by server');
      }

      // Persist to conversation history
      const cleanFinal = cleanMarkdown(fullText);
      setConversationHistory((prev) => [
        ...prev.slice(-10),
        { role: 'user', parts: [{ text: userText }] },
        { role: 'model', parts: [{ text: cleanFinal }] },
      ]);

      return cleanFinal;
    },
    [conversationHistory]
  );

  // ── Speak text aloud with Female Voice Selection ──────────────────────────
  const speakText = useCallback(
    (text, msgId) => {
      if (!synthRef.current || isMuted) return;

      synthRef.current.cancel();

      // Clean markdown/route tokens for cleaner speech
      const clean = cleanMarkdown(text)
        .replace(/\([^)]*\)/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 0.95;
      utterance.pitch = 1.05; // Slightly higher pitch for natural female tone
      utterance.volume = 1.0;

      // FIX 5: Female voice for both English and Hindi
      const currentVoices = synthRef.current.getVoices() || voices;
      const hindiMode = isHindi(clean);

      // For English (en-IN):
      const englishVoice =
        currentVoices.find((v) => v.lang === 'en-IN' && v.name.toLowerCase().includes('female')) ||
        currentVoices.find((v) => v.lang === 'en-IN' && (v.name.includes('Raveena') || v.name.includes('Veena') || v.name.includes('Priya'))) ||
        currentVoices.find((v) => v.lang === 'en-IN') ||
        currentVoices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
        currentVoices.find((v) => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen')));

      // For Hindi (hi-IN):
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

  // ── Handle send with Instant Typing Indicator & Streamed Display ──────────
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

      const aiMsgId = Date.now() + 1;
      let hasReceivedFirstChunk = false;

      setInput('');
      setShowChips(false);

      // FIX 4: Show typing dots as soon as user hits send, before API call even starts
      setIsLoading(true);
      setMessages((prev) => [...prev, userMsg]);

      try {
        const fullAiText = await sendMessageStream(text, (chunk, fullTextSoFar) => {
          // FIX 3: Strip markdown from streamed chunks on every stream update
          const cleanText = cleanMarkdown(fullTextSoFar);

          // FIX 4: Remove dots as soon as first chunk arrives
          if (!hasReceivedFirstChunk) {
            hasReceivedFirstChunk = true;
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
          } else {
            // Update message state on each chunk so text appears word by word
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, text: cleanText } : m))
            );
          }
        });

        const finalClean = cleanMarkdown(fullAiText);

        // Ensure loading is false
        setIsLoading(false);

        // Fallback if entire response arrived without interim chunk
        if (!hasReceivedFirstChunk && finalClean) {
          setMessages((prev) => [
            ...prev,
            {
              id: aiMsgId,
              role: 'assistant',
              text: finalClean,
              timestamp: new Date(),
            },
          ]);
        } else if (finalClean) {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, text: finalClean } : m))
          );
        }

        // Auto-speak in female voice unless muted (pass cleanText, never raw text)
        if (!isMuted && finalClean) {
          setTimeout(() => speakText(finalClean, aiMsgId), 100);
        }
      } catch (err) {
        console.error('[GeneGuardAssistant] Error:', err);
        setIsLoading(false);
        const errMsg = {
          id: aiMsgId,
          role: 'assistant',
          text: "Sorry, I couldn't process that right now. Please try again!",
          timestamp: new Date(),
        };
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === aiMsgId);
          if (exists) {
            return prev.map((m) => (m.id === aiMsgId ? errMsg : m));
          }
          return [...prev, errMsg];
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, sendMessageStream, speakText, isMuted]
  );

  // ── Toggle microphone ───────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    } else {
      synthRef.current?.cancel();
      setSpeakingMsgId(null);
      setMicError(null);
      setInput(''); // clear input field so spoken words appear cleanly

      // Explicit microphone permission request before starting recognition
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            // Stop tracks immediately so hardware mic is released for SpeechRecognition
            stream.getTracks().forEach((track) => track.stop());

            if (!recognitionRef.current) return;
            recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true; // show partial results while speaking
            setIsListening(true);
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.log('Speech recognition start error:', err);
              if (err.name !== 'InvalidStateError') {
                setIsListening(false);
              }
            }
          })
          .catch((err) => {
            console.log('Microphone access denied:', err);
            setIsListening(false);
            setMicError('Microphone access denied. Please allow microphone in browser settings.');
          });
      } else {
        // Fallback for browsers without navigator.mediaDevices
        try {
          recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = true;
          setIsListening(true);
          recognitionRef.current.start();
        } catch (err) {
          console.log('Speech recognition fallback start error:', err);
          if (err.name !== 'InvalidStateError') {
            setIsListening(false);
            setMicError('Microphone access not available');
          }
        }
      }
    }
  }, [isListening, language]);

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
            {micError && (
              <span className="gg-mic-error-label">
                ⚠️ {micError}
              </span>
            )}
            {isListening && (
              <span className="gg-listening-label">
                🎙 {language === 'hi' ? 'सुन रहा है…' : 'Listening…'}
              </span>
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
                  if (micError) setMicError(null);
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                id="gg-chat-input"
              />
              {speechSupported && (
                <button
                  className={`gg-mic-btn ${isListening ? 'recording' : ''}`}
                  onClick={toggleListening}
                  aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                  title={isListening ? (language === 'hi' ? 'बंद करें' : 'Stop listening') : (language === 'hi' ? 'हिंदी में बोलें' : 'Speak your message')}
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
