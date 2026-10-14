import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAuthenticated, logout } from '../../utils/auth';
import './InactivityTimer.css';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 60 * 1000;          // 60-second warning modal
const WARNING_TRIGGER_MS = INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS; // 14 minutes

const InactivityTimer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const lastActivityRef = useRef(Date.now());
  const countdownIntervalRef = useRef(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setSecondsRemaining(60);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  }, [showWarning]);

  // Listen to user interactions
  useEffect(() => {
    // Only monitor if user is logged in
    if (!isAuthenticated()) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    const handleEvent = () => {
      // Only auto-reset if warning modal is not active
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleEvent, { passive: true }));

    // Poll inactivity every 5 seconds
    const interval = setInterval(() => {
      if (!isAuthenticated()) {
        setShowWarning(false);
        return;
      }

      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        clearInterval(interval);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setShowWarning(false);
        logout(navigate, 'Your session expired due to inactivity for HIPAA health data security.');
      } else if (elapsed >= WARNING_TRIGGER_MS && !showWarning) {
        setShowWarning(true);
        const remainingSec = Math.max(1, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setSecondsRemaining(remainingSec);
      }
    }, 3000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleEvent));
      clearInterval(interval);
    };
  }, [showWarning, navigate, location.pathname]);

  // Countdown timer inside the warning modal
  useEffect(() => {
    if (showWarning) {
      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            setShowWarning(false);
            logout(navigate, 'Your session expired due to inactivity for HIPAA health data security.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showWarning, navigate]);

  if (!showWarning || !isAuthenticated()) return null;

  return (
    <div className="inactivity-overlay" role="alertdialog" aria-modal="true" aria-labelledby="inactivity-title">
      <div className="inactivity-card">
        <div className="inactivity-badge">HIPAA Session Timeout</div>
        <div className="inactivity-countdown-circle">
          <span className="inactivity-seconds">{secondsRemaining}</span>
          <span className="inactivity-seconds-label">sec</span>
        </div>

        <h3 id="inactivity-title" className="inactivity-title">
          Are you still working?
        </h3>

        <p className="inactivity-text">
          For genomic privacy and patient data compliance, inactive sessions automatically lock. Your session will close in <strong>{secondsRemaining} seconds</strong>.
        </p>

        <div className="inactivity-actions">
          <button
            type="button"
            className="inactivity-stay-btn"
            onClick={resetActivity}
          >
            Stay Signed In
          </button>
          <button
            type="button"
            className="inactivity-logout-btn"
            onClick={() => {
              setShowWarning(false);
              logout(navigate, 'You logged out.');
            }}
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default InactivityTimer;
