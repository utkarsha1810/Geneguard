import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import '../Pages/Home.css';
import dnaBackground from '../images/image.png';
import OtpInput from './OtpInput';
import LogoutModal from './LogoutModal';
import { isAuthenticated, getUser, setAuthSession, logout } from '../../utils/auth';

// Translation data
const translations = {
  en: {
    navLinks: {
      learnGenetics: 'Learn Genetics',
      geneticDisorders: 'Genetic Disorders',
      counselling: 'Counselling',
      geneticAssessment: 'Learning Hub',
      dnaTesting: 'DNA Testing',
      aboutUs: 'About Us',
      login: 'Login',
      signup: 'Sign Up',
      settings: 'Settings',
      logout: 'Log Out',
    },
  },
  hi: {
    navLinks: {
      learnGenetics: 'आनुवंशिकी सीखें',
      geneticDisorders: 'आनुवंशिक विकार',
      counselling: 'परामर्श',
      geneticAssessment: 'आनुवंशिक मूल्यांकन AI',
      dnaTesting: 'DNA परीक्षण',
      aboutUs: 'हमारे बारे में',
      login: 'लॉगिन',
      signup: 'साइन अप',
      settings: 'सेटिंग्स',
      logout: 'लॉग आउट',
    },
  },
  mr: {
    navLinks: {
      learnGenetics: 'अनुवांशिकी शिका',
      geneticDisorders: 'अनुवांशिक विकार',
      counselling: 'समुपदेशन',
      geneticAssessment: 'अनुवांशिक मूल्यांकन AI',
      dnaTesting: 'DNA चाचणी',
      aboutUs: 'आमच्याबद्दल',
      login: 'लॉगिन',
      signup: 'साइन अप',
      settings: 'सेटिंग्ज',
      logout: 'लॉग आउट',
    },
  },
  te: {
    navLinks: {
      learnGenetics: 'జన్యుశాస్త్రం నేర్చుకోండి',
      geneticDisorders: 'జన్యు రుగ్మతలు',
      counselling: 'కౌన్సెలింగ్',
      geneticAssessment: 'జన్యు అంచనా AI',
      dnaTesting: 'DNA పరీక్ష',
      aboutUs: 'మా గురించి',
      login: 'లాగిన్',
      signup: 'సైన్ అప్',
      settings: 'సెట్టింగ్‌లు',
      logout: 'లాగ్ అవుట్',
    },
  },
};

const Navbar = ({ language, setLanguage }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  const t = translations[language];
  const authed = isAuthenticated();
  const user = getUser();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLinkClick = () => setIsMobileMenuOpen(false);

  return (
    <>
      <nav className={`home-main-navbar ${isScrolled ? 'home-navbar-scrolled' : ''}`}>
        <div className="home-nav-content">
          <div className="home-nav-logo" onClick={() => navigate('/home')}>
            <div className="home-logo-circle"></div>
            <span className="home-logo-brand">Gene Guard</span>
          </div>

          <div className="home-nav-right-section">
            <div className="home-nav-links">
              <Link to="/learn-genetics" className="home-nav-link">{t.navLinks.learnGenetics}</Link>
              <Link to="/genetic-disorders" className="home-nav-link">{t.navLinks.geneticDisorders}</Link>
              <Link to="/counselling" className="home-nav-link">{t.navLinks.counselling}</Link>
              <Link to="/learning-hub" className="home-nav-link">Learning Hub</Link>
              <Link to="/dna" className="home-nav-link">{t.navLinks.dnaTesting}</Link>
              <Link to="/about" className="home-nav-link">{t.navLinks.aboutUs}</Link>
            </div>

            <div className="home-language-buttons">
              <button className={`home-lang-btn ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>EN</button>
              <button className={`home-lang-btn ${language === 'hi' ? 'active' : ''}`} onClick={() => setLanguage('hi')}>हिं</button>
              <button className={`home-lang-btn ${language === 'mr' ? 'active' : ''}`} onClick={() => setLanguage('mr')}>मर</button>
              <button className={`home-lang-btn ${language === 'te' ? 'active' : ''}`} onClick={() => setLanguage('te')}>తె</button>
            </div>

            <button
              className={`home-hamburger-menu ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              <span className="home-hamburger-line"></span>
              <span className="home-hamburger-line"></span>
              <span className="home-hamburger-line"></span>
            </button>

            <div className="home-profile-container" ref={dropdownRef}>
              <button
                className={`home-profile-trigger ${isProfileOpen ? 'active' : ''}`}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="User Profile"
              >
                <svg className="home-profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {isProfileOpen && (
                <div className="home-profile-dropdown">
                  <div className="home-dropdown-glow"></div>
                  {authed ? (
                    <>
                      <div className="profile-dropdown-user-info">
                        <div className="user-name">{user?.firstName || 'User'}</div>
                        <div className="user-role-label">{user?.role?.toUpperCase()}</div>
                      </div>
                      <Link to="/settings" className="home-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                        ⚙️ {t.navLinks.settings}
                      </Link>
                      {user?.role === 'admin' && (
                        <Link to="/admin" className="home-dropdown-item" onClick={() => setIsProfileOpen(false)}>
                          🛡️ Admin Dashboard
                        </Link>
                      )}
                      <button
                        type="button"
                        className="home-dropdown-item dropdown-logout-btn"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsLogoutModalOpen(true);
                        }}
                      >
                        🚪 {t.navLinks.logout}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="home-dropdown-item home-signup-special">{t.navLinks.login}</Link>
                      <Link to="/signup" className="home-dropdown-item home-signup-special">{t.navLinks.signup}</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={async () => {
          setIsLogoutModalOpen(false);
          await logout(navigate, 'Logged out successfully');
        }}
      />

      {isMobileMenuOpen && (
        <div className="home-mobile-menu-overlay">
          <Link to="/learn-genetics" className="home-nav-link" onClick={handleLinkClick}>{t.navLinks.learnGenetics}</Link>
          <Link to="/genetic-disorders" className="home-nav-link" onClick={handleLinkClick}>{t.navLinks.geneticDisorders}</Link>
          <Link to="/counselling" className="home-nav-link" onClick={handleLinkClick}>{t.navLinks.counselling}</Link>
          <Link to="/learning-hub" className="home-nav-link" onClick={handleLinkClick}>Learning Hub</Link>
          <Link to="/dna" className="home-nav-link" onClick={handleLinkClick}>{t.navLinks.dnaTesting}</Link>
          <Link to="/about" className="home-nav-link" onClick={handleLinkClick}>{t.navLinks.aboutUs}</Link>
        </div>
      )}
    </>
  );
};

const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'user', label: 'User' },
  { key: 'guest', label: 'Guest' },
];

const GUEST_DEMO_CREDENTIALS = {
  id: 'guest-demo-001',
  email: 'guest@geneguard.demo',
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, text: '', class: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;

  if (score <= 1) return { score: 1, text: 'Weak', class: 'active-weak' };
  if (score <= 3) return { score: 2, text: 'Medium', class: 'active-medium' };
  return { score: 3, text: 'Strong', class: 'active-strong' };
};

const Login = () => {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [language, setLanguage] = useState('en');
  const [role, setRole] = useState('admin');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [sessionToast, setSessionToast] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // ─── View Modes: 'login' | 'login_otp' | 'verify_signup' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'
  const [viewMode, setViewMode] = useState('login');

  // ─── Two-Step Login OTP State (Part 2)
  const [loginChallengeId, setLoginChallengeId] = useState('');
  const [maskedLoginEmail, setMaskedLoginEmail] = useState('');
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginOtpError, setLoginOtpError] = useState('');
  const [loginOtpSuccess, setLoginOtpSuccess] = useState('');
  const [isVerifyingLoginOtp, setIsVerifyingLoginOtp] = useState(false);
  const [isResendingLoginOtp, setIsResendingLoginOtp] = useState(false);

  // ─── Unverified User State
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [unverifiedOtp, setUnverifiedOtp] = useState('');
  const [unverifiedError, setUnverifiedError] = useState('');
  const [unverifiedSuccess, setUnverifiedSuccess] = useState('');
  const [isVerifyingUnverified, setIsVerifyingUnverified] = useState(false);
  const [isResendingUnverified, setIsResendingUnverified] = useState(false);

  // ─── Forgot Password Flow State (3 Steps)
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [isForgotResending, setIsForgotResending] = useState(false);

  // Check for auto-logout / session expiration toast on mount
  useEffect(() => {
    const msg = sessionStorage.getItem('authToastMessage');
    if (msg) {
      setSessionToast(msg);
      sessionStorage.removeItem('authToastMessage');
      setTimeout(() => setSessionToast(''), 6000);
    }
  }, []);

  const validateField = (name, value) => {
    if (role === 'guest') return '';

    if (name === 'email') {
      if (!value) return 'Email is required';
      if (value.includes(' ')) return 'Email cannot contain spaces';
      if (value.length > 100) return 'Email must be under 100 characters';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
    }

    if (name === 'password') {
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Password must be at least 6 characters';
    }

    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === 'email' ? value.trim() : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (globalError) setGlobalError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    if (role === 'guest') return {};
    const errs = {};
    const emailErr = validateField('email', formData.email);
    if (emailErr) errs.email = emailErr;

    const pwdErr = validateField('password', formData.password);
    if (pwdErr) errs.password = pwdErr;

    return errs;
  };

  // ─── LOGIN SUBMIT (Step 1: Check Credentials & Require OTP) ────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormData((prev) => ({ ...prev, email: prev.email.trim() }));
    setUnverifiedEmail('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTimeout(() => {
        if (formRef.current) {
          const firstError = formRef.current.querySelector('.input-error');
          if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstError.focus();
          }
        }
      }, 0);
      return;
    }

    setIsLoading(true);
    setGlobalError('');

    try {
      const payload =
        role === 'guest'
          ? { role, ...GUEST_DEMO_CREDENTIALS }
          : { role, email: formData.email, password: formData.password };

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Block unverified user and offer OTP verification flow
        if (data.isUnverified) {
          setUnverifiedEmail(data.email || formData.email);
          setGlobalError(data.error || 'Please verify your email address before logging in.');
          return;
        }
        throw new Error(data.error || 'Invalid email or password');
      }

      // Guest login: issue token immediately
      if (role === 'guest' && data.token) {
        setAuthSession({
          token: data.token,
          user: { userId: data.userId, firstName: data.firstName, role: data.role },
          userId: data.userId,
          firstName: data.firstName,
          role: data.role,
        });
        setLoginSuccess(true);
        setTimeout(() => navigate('/home'), 1000);
        return;
      }

      // Standard user: TWO-STEP OTP IS REQUIRED
      if (data.otpRequired) {
        setLoginChallengeId(data.loginChallengeId);
        setMaskedLoginEmail(data.email);
        setViewMode('login_otp');
        setLoginOtpError('');
        setLoginOtpSuccess('');
        return;
      }

      // Fallback if token directly returned
      if (data.token) {
        setAuthSession({
          token: data.token,
          user: { userId: data.userId, firstName: data.firstName, role: data.role },
          userId: data.userId,
          firstName: data.firstName,
          role: data.role,
        });
        setLoginSuccess(true);
        setTimeout(() => {
          if (data.role === 'admin') navigate('/admin');
          else navigate('/home');
        }, 1200);
      }
    } catch (err) {
      setGlobalError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── LOGIN OTP VERIFICATION (Step 2) ───────────────────────────────────────
  const handleVerifyLoginOtp = async (codeOverride) => {
    const code = codeOverride || loginOtpCode;
    if (!code || String(code).trim().length !== 6) {
      setLoginOtpError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifyingLoginOtp(true);
    setLoginOtpError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginChallengeId,
          email: formData.email.trim(),
          otp: String(code).trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login verification failed');
      }

      // Store authenticated session
      setAuthSession({
        token: data.token,
        user: {
          userId: data.userId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          role: data.role,
        },
        userId: data.userId,
        firstName: data.firstName,
        role: data.role,
      });

      setLoginSuccess(true);
      setLoginOtpSuccess('✓ Verification successful! Redirecting to portal…');

      setTimeout(() => {
        if (data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/home');
        }
      }, 1200);
    } catch (err) {
      setLoginOtpError(err.message || 'Invalid verification code');
    } finally {
      setIsVerifyingLoginOtp(false);
    }
  };

  const handleResendLoginOtp = async () => {
    setIsResendingLoginOtp(true);
    setLoginOtpError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginChallengeId,
          email: formData.email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend login code');
      }

      if (data.loginChallengeId) {
        setLoginChallengeId(data.loginChallengeId);
      }

      setLoginOtpSuccess(data.message || 'A fresh login code has been sent!');
      setTimeout(() => setLoginOtpSuccess(''), 5000);
      return true;
    } catch (err) {
      setLoginOtpError(err.message || 'Failed to resend code');
      return false;
    } finally {
      setIsResendingLoginOtp(false);
    }
  };

  // ─── UNVERIFIED USER VERIFICATION HANDLER ───────────────────────────────────
  const handleVerifyUnverified = async (codeOverride) => {
    const code = codeOverride || unverifiedOtp;
    if (!code || String(code).trim().length !== 6) {
      setUnverifiedError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifyingUnverified(true);
    setUnverifiedError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail, otp: String(code).trim() }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setAuthSession({
        token: data.token,
        user: { userId: data.userId, firstName: data.firstName, role: data.role },
        userId: data.userId,
        firstName: data.firstName,
        role: data.role,
      });

      setUnverifiedSuccess('✓ Account verified successfully! Logging you in…');
      setTimeout(() => {
        if (data.role === 'admin') navigate('/admin');
        else navigate('/home');
      }, 1400);
    } catch (err) {
      setUnverifiedError(err.message || 'Verification failed');
    } finally {
      setIsVerifyingUnverified(false);
    }
  };

  const handleResendUnverifiedOtp = async () => {
    setIsResendingUnverified(true);
    setUnverifiedError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to resend code');

      setUnverifiedSuccess(data.message || 'New verification code dispatched!');
      setTimeout(() => setUnverifiedSuccess(''), 5000);
      return true;
    } catch (err) {
      setUnverifiedError(err.message || 'Failed to resend code');
      return false;
    } finally {
      setIsResendingUnverified(false);
    }
  };

  // ─── FORGOT PASSWORD STEP 1: SEND RESET OTP ─────────────────────────────────
  const handleForgotStep1Submit = async (e) => {
    e.preventDefault();
    const email = (forgotEmail || '').trim();
    if (!email) {
      setForgotError('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setForgotError('Please enter a valid email format');
      return;
    }

    setIsForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process password reset request');
      }

      setForgotSuccess(data.message || 'If an account exists, a reset code was sent.');
      setViewMode('forgot_otp');
    } catch (err) {
      setForgotError(err.message || 'Error requesting reset code');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // ─── FORGOT PASSWORD STEP 2: VERIFY RESET OTP ───────────────────────────────
  const handleForgotStep2Verify = async (codeOverride) => {
    const code = codeOverride || forgotOtp;
    if (!code || String(code).trim().length !== 6) {
      setForgotError('Please enter the complete 6-digit reset code');
      return;
    }

    setIsForgotLoading(true);
    setForgotError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: String(code).trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired reset code');
      }

      setResetToken(data.resetToken);
      setForgotSuccess('');
      setViewMode('forgot_reset');
    } catch (err) {
      setForgotError(err.message || 'Invalid reset code');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleForgotResendOtp = async () => {
    setIsForgotResending(true);
    setForgotError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to resend code');

      setForgotSuccess('A fresh reset code has been sent!');
      setTimeout(() => setForgotSuccess(''), 5000);
      return true;
    } catch (err) {
      setForgotError(err.message || 'Failed to resend code');
      return false;
    } finally {
      setIsForgotResending(false);
    }
  };

  // ─── FORGOT PASSWORD STEP 3: RESET PASSWORD ─────────────────────────────────
  const handleForgotStep3Submit = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!newPassword) {
      setForgotError('New password is required');
      return;
    }
    if (newPassword.length < 8) {
      setForgotError('Password must be at least 8 characters long');
      return;
    }
    if (!/\d/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setForgotError('Password must contain at least one number and one special character');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    setIsForgotLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          resetToken,
          newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setForgotSuccess('✓ Password has been reset successfully! Redirecting to login…');
      setFormData((prev) => ({ ...prev, email: forgotEmail.trim(), password: '' }));

      setTimeout(() => {
        setViewMode('login');
        setForgotSuccess('');
        setGlobalError('');
      }, 1600);
    } catch (err) {
      setForgotError(err.message || 'Error updating password');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const pwStrength = getPasswordStrength(newPassword);

  return (
    <div className="login-page">
      <Navbar language={language} setLanguage={setLanguage} />

      <div className="login-split-container">
        {/* ── Left visual panel ── */}
        <div className="login-visual-panel">
          <img src={dnaBackground} alt="DNA strand" className="login-visual-image" />
          <div className="login-visual-tint"></div>
          <div className="login-visual-content">
            <div className="login-visual-logo"></div>
            <div className="login-visual-heading-wrap"></div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="login-form-panel">

          {/* Session Expiration / Inactivity Toast */}
          {sessionToast && (
            <div className="session-toast-banner" role="alert">
              <span>⚠️ {sessionToast}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW: TWO-STEP LOGIN OTP SCREEN (Part 2)
             ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'login_otp' && (
            <div className="login-container">
              <h2>Two-Step Verification</h2>
              <div className="underline"></div>
              <p className="welcome-text">
                Enter the 6-digit verification code sent to <strong>{maskedLoginEmail}</strong>.
              </p>

              {loginOtpSuccess && (
                <div className="success-banner" style={{ marginBottom: '16px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {loginOtpSuccess}
                </div>
              )}

              <OtpInput
                email={maskedLoginEmail}
                onComplete={(code) => {
                  setLoginOtpCode(code);
                  handleVerifyLoginOtp(code);
                }}
                onResend={handleResendLoginOtp}
                isLoading={isVerifyingLoginOtp}
                isResending={isResendingLoginOtp}
                error={loginOtpError}
                successMessage={loginOtpSuccess}
              />

              <button
                type="button"
                className="continue-btn"
                onClick={() => handleVerifyLoginOtp()}
                disabled={isVerifyingLoginOtp || loginSuccess}
                style={{ marginTop: '16px' }}
              >
                {isVerifyingLoginOtp ? (
                  <>
                    <span className="btn-spinner"></span>
                    Authenticating…
                  </>
                ) : loginSuccess ? (
                  '✓ Verified & Logged In!'
                ) : (
                  <>
                    <span className="btn-icon">✓</span>
                    VERIFY & ACCESS PORTAL
                  </>
                )}
              </button>

              <div className="bottom-links" style={{ marginTop: '22px', justifyContent: 'center' }}>
                <span
                  onClick={() => {
                    setViewMode('login');
                    setLoginOtpError('');
                  }}
                  style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                >
                  ← Back to Login Credentials
                </span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW: VERIFY SIGNUP OTP (For unverified login attempts)
             ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'verify_signup' && (
            <div className="login-container">
              <h2>Verify Your Email</h2>
              <div className="underline"></div>
              <p className="welcome-text">Enter the 6-digit code sent to your email to activate your account.</p>

              {unverifiedSuccess && (
                <div className="success-banner" style={{ marginBottom: '16px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {unverifiedSuccess}
                </div>
              )}

              <OtpInput
                email={unverifiedEmail}
                onComplete={(code) => {
                  setUnverifiedOtp(code);
                  handleVerifyUnverified(code);
                }}
                onResend={handleResendUnverifiedOtp}
                isLoading={isVerifyingUnverified}
                isResending={isResendingUnverified}
                error={unverifiedError}
                successMessage={unverifiedSuccess}
              />

              <button
                type="button"
                className="continue-btn"
                onClick={() => handleVerifyUnverified()}
                disabled={isVerifyingUnverified || Boolean(unverifiedSuccess)}
                style={{ marginTop: '16px' }}
              >
                {isVerifyingUnverified ? (
                  <>
                    <span className="btn-spinner"></span>
                    Verifying…
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✓</span>
                    VERIFY & CONTINUE
                  </>
                )}
              </button>

              <div className="bottom-links" style={{ marginTop: '20px', justifyContent: 'center' }}>
                <span
                  onClick={() => {
                    setViewMode('login');
                    setUnverifiedError('');
                  }}
                  style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                >
                  ← Back to Login
                </span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW: FORGOT PASSWORD STEP 1 — ENTER EMAIL
             ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'forgot_email' && (
            <div className="login-container">
              <div className="forgot-step-badge">Step 1 of 3: Verification</div>
              <h2>Forgot Password</h2>
              <div className="underline"></div>
              <p className="welcome-text">Enter your registered email address to receive a secure password reset code.</p>

              {forgotError && (
                <div className="error-banner" style={{ marginBottom: '20px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {forgotError}
                </div>
              )}

              <form onSubmit={handleForgotStep1Submit} className="login-form">
                <div className="input-group">
                  <label htmlFor="forgot-email">Account Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotError) setForgotError('');
                    }}
                    placeholder="name@example.com"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="continue-btn"
                  disabled={isForgotLoading}
                  style={{ marginTop: '12px' }}
                >
                  {isForgotLoading ? (
                    <>
                      <span className="btn-spinner"></span>
                      Sending Code…
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">✉</span>
                      SEND RESET CODE
                    </>
                  )}
                </button>

                <div className="bottom-links" style={{ marginTop: '22px', justifyContent: 'center' }}>
                  <span
                    onClick={() => {
                      setViewMode('login');
                      setForgotError('');
                    }}
                    style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                  >
                    ← Back to Login
                  </span>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW: FORGOT PASSWORD STEP 2 — ENTER RESET OTP
             ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'forgot_otp' && (
            <div className="login-container">
              <div className="forgot-step-badge">Step 2 of 3: Enter Code</div>
              <h2>Enter Reset Code</h2>
              <div className="underline"></div>
              <p className="welcome-text">We sent a 6-digit password reset code to your email.</p>

              <OtpInput
                email={forgotEmail}
                onComplete={(code) => {
                  setForgotOtp(code);
                  handleForgotStep2Verify(code);
                }}
                onResend={handleForgotResendOtp}
                isLoading={isForgotLoading}
                isResending={isForgotResending}
                error={forgotError}
                successMessage={forgotSuccess}
              />

              <button
                type="button"
                className="continue-btn"
                onClick={() => handleForgotStep2Verify()}
                disabled={isForgotLoading}
                style={{ marginTop: '16px' }}
              >
                {isForgotLoading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Validating…
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✓</span>
                    VERIFY CODE
                  </>
                )}
              </button>

              <div className="bottom-links" style={{ marginTop: '22px', justifyContent: 'center' }}>
                <span
                  onClick={() => {
                    setViewMode('forgot_email');
                    setForgotError('');
                  }}
                  style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                >
                  ← Change email address
                </span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW: FORGOT PASSWORD STEP 3 — SET NEW PASSWORD
             ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'forgot_reset' && (
            <div className="login-container">
              <div className="forgot-step-badge">Step 3 of 3: New Password</div>
              <h2>Create New Password</h2>
              <div className="underline"></div>
              <p className="welcome-text">Choose a strong, secure password for your GeneGuard account.</p>

              {forgotSuccess && (
                <div className="success-banner" style={{ marginBottom: '18px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {forgotSuccess}
                </div>
              )}

              {forgotError && (
                <div className="error-banner" style={{ marginBottom: '18px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {forgotError}
                </div>
              )}

              <form onSubmit={handleForgotStep3Submit} className="login-form">
                {/* New Password */}
                <div className="input-group">
                  <label htmlFor="new-password">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                    />
                    <button
                      type="button"
                      className="pw-toggle-btn"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Password strength indicator */}
                {newPassword && (
                  <div style={{ marginTop: '-4px', marginBottom: '14px' }}>
                    <div className="pw-strength-bar">
                      <div className={`pw-strength-segment ${pwStrength.score >= 1 ? pwStrength.class : ''}`}></div>
                      <div className={`pw-strength-segment ${pwStrength.score >= 2 ? pwStrength.class : ''}`}></div>
                      <div className={`pw-strength-segment ${pwStrength.score >= 3 ? pwStrength.class : ''}`}></div>
                    </div>
                    <div className="pw-hint-text">
                      Strength: <strong style={{ color: pwStrength.score === 3 ? '#10b981' : pwStrength.score === 2 ? '#f59e0b' : '#ef4444' }}>{pwStrength.text}</strong>
                      {' • '}Must include numbers & special characters
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                <div className="input-group">
                  <label htmlFor="confirm-new-password">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirm-new-password"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                    />
                    <button
                      type="button"
                      className="pw-toggle-btn"
                      onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                      aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmNewPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="continue-btn"
                  disabled={isForgotLoading || Boolean(forgotSuccess)}
                  style={{ marginTop: '14px' }}
                >
                  {isForgotLoading ? (
                    <>
                      <span className="btn-spinner"></span>
                      Updating Password…
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🔒</span>
                      RESET PASSWORD
                    </>
                  )}
                </button>

                <div className="bottom-links" style={{ marginTop: '22px', justifyContent: 'center' }}>
                  <span
                    onClick={() => setViewMode('login')}
                    style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                  >
                    ← Cancel / Back to Login
                  </span>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VIEW: STANDARD LOGIN (Default)
             ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'login' && (
            <div className="login-container">
              <h2>Welcome Back</h2>
              <div className="underline"></div>
              <p className="welcome-text">Login to access the Gene Guard platform.</p>
              <p className="sub-text">
                New here? <span onClick={() => navigate('/signup')}>Create an account</span>
              </p>

              {/* Role selector */}
              <div className="role-select" role="tablist" aria-label="Login as">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    role="tab"
                    aria-selected={role === r.key}
                    className={`role-btn ${role === r.key ? 'active' : ''}`}
                    onClick={() => setRole(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Banners */}
              {loginSuccess && (
                <div className="success-banner" style={{ marginBottom: '20px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Login successful! Redirecting…
                </div>
              )}

              {globalError && (
                <div className="error-banner" style={{ marginBottom: '20px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>
                    <div>{globalError}</div>
                    {/* If user is unverified, offer action to verify immediately */}
                    {unverifiedEmail && (
                      <div className="unverified-alert-action">
                        <button
                          type="button"
                          className="unverified-verify-btn"
                          onClick={() => {
                            setViewMode('verify_signup');
                            setGlobalError('');
                          }}
                        >
                          Verify Email Now →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form className="login-form" onSubmit={handleSubmit} noValidate ref={formRef}>
                {role === 'guest' && (
                  <div className="guest-note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01" />
                    </svg>
                    No account needed — hit continue to explore Gene Guard with a demo login.
                  </div>
                )}

                {role !== 'guest' && (
                  <>
                    {/* Email */}
                    <div className="input-group">
                      <label htmlFor="email">Email</label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={errors.email ? 'input-error' : ''}
                        autoComplete="email"
                        required
                      />
                      {errors.email && (
                        <div className="field-error">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {errors.email}
                        </div>
                      )}
                    </div>

                    {/* Password */}
                    <div className="input-group">
                      <label htmlFor="password">Password</label>
                      <div className="password-input-wrapper">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={errors.password ? 'input-error' : ''}
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          className="pw-toggle-btn"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <div className="field-error" style={{ marginTop: '8px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {errors.password}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Continue Button */}
                <button
                  type="submit"
                  className="continue-btn"
                  disabled={isLoading || loginSuccess}
                >
                  {isLoading ? (
                    <>
                      <span className="btn-spinner"></span>
                      Verifying Credentials…
                    </>
                  ) : loginSuccess ? (
                    '✓ Logged In!'
                  ) : (
                    <>
                      <span className="btn-icon">⊙</span>
                      {role === 'guest' ? 'CONTINUE AS GUEST' : 'CONTINUE'}
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="divider">or</div>

                {/* Google Button */}
                <button
                  type="button"
                  className="social-btn"
                  onClick={() => console.log('Continue with Google')}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.65z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09C3.26 21.3 7.31 24 12 24z" />
                    <path fill="#FBBC05" d="M5.31 14.31A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.58.38-2.31V6.6H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.4l4.01-3.09z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.6l4.01 3.09C6.25 6.86 8.89 4.75 12 4.75z" />
                  </svg>
                  Continue with Google
                </button>

                {/* Bottom links */}
                <div className="bottom-links">
                  <Link to="/signup">Create an account</Link>
                  <span
                    style={{ cursor: 'pointer', color: '#53c7e8', textDecoration: 'underline' }}
                    onClick={() => {
                      setForgotEmail(formData.email || '');
                      setForgotError('');
                      setForgotSuccess('');
                      setViewMode('forgot_email');
                    }}
                  >
                    Forgot password?
                  </span>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
