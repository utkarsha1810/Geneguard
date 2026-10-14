import React, { useState, useEffect, useRef } from 'react';
import './OtpInput.css';

/**
 * Reusable 6-Box OTP Input Component
 * Features:
 * - 6 individual digit inputs with auto-focus and auto-advance
 * - Backspace jumps to previous box
 * - Paste support (extracts 6 digits, populates all boxes, focuses last)
 * - 60s resend cooldown countdown
 * - 10-minute expiration countdown
 * - Disabled states & loading spinners
 */
const OtpInput = ({
  email,
  length = 6,
  onComplete,
  onResend,
  isLoading = false,
  isResending = false,
  error = '',
  successMessage = '',
  cooldownSeconds = 60,
  expirationMinutes = 10,
}) => {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const [resendCooldown, setResendCooldown] = useState(cooldownSeconds);
  const [expirySeconds, setExpirySeconds] = useState(expirationMinutes * 60);
  const inputRefs = useRef([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Expiration countdown
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  const handleChange = (index, value) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    const char = cleaned.slice(-1); // Take last entered digit

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-advance if digit entered
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all digits filled, fire onComplete
    const fullCode = newDigits.join('');
    if (fullCode.length === length) {
      onComplete?.(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current box is empty, jump to previous box and clear it
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const numbersOnly = pastedData.replace(/\D/g, '').slice(0, length);
    if (!numbersOnly) return;

    const newDigits = [...digits];
    for (let i = 0; i < length; i++) {
      newDigits[i] = numbersOnly[i] || '';
    }
    setDigits(newDigits);

    // Focus last filled index or the end
    const lastIndex = Math.min(numbersOnly.length, length - 1);
    inputRefs.current[lastIndex]?.focus();

    if (numbersOnly.length === length) {
      onComplete?.(numbersOnly);
    }
  };

  const handleResendClick = async () => {
    if (resendCooldown > 0 || isResending) return;
    setDigits(Array(length).fill(''));
    if (onResend) {
      const result = await onResend();
      if (result !== false) {
        setResendCooldown(cooldownSeconds);
        setExpirySeconds(expirationMinutes * 60);
        inputRefs.current[0]?.focus();
      }
    }
  };

  const formatExpiryTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="otp-container">
      {email && (
        <p className="otp-email-notice">
          We sent a 6-digit code to <strong className="otp-highlight-email">{email}</strong>
        </p>
      )}

      {/* 6-box input grid */}
      <div className="otp-boxes-wrapper" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`otp-digit-box ${digit ? 'filled' : ''} ${error ? 'has-error' : ''}`}
            disabled={isLoading || expirySeconds === 0}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {/* Expiry Countdown */}
      <div className="otp-expiry-info">
        {expirySeconds > 0 ? (
          <span className="otp-timer-active">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Code expires in <strong>{formatExpiryTime(expirySeconds)}</strong>
          </span>
        ) : (
          <span className="otp-timer-expired">
            ⚠️ Code has expired. Please request a new one below.
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="otp-error-banner">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="otp-success-banner">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          {successMessage}
        </div>
      )}

      {/* Resend Action */}
      <div className="otp-actions-footer">
        <span className="otp-resend-label">Didn't receive the code?</span>
        <button
          type="button"
          className="otp-resend-btn"
          onClick={handleResendClick}
          disabled={resendCooldown > 0 || isResending || isLoading}
        >
          {isResending ? (
            <span className="otp-loading-text">Sending new code...</span>
          ) : resendCooldown > 0 ? (
            `Resend OTP in ${resendCooldown}s`
          ) : (
            'Resend OTP'
          )}
        </button>
      </div>
    </div>
  );
};

export default OtpInput;
