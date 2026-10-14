import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Signup.css';
import '../Pages/Home.css';
import dnaBackground from '../images/image.png';
import OtpInput from './OtpInput';
import LogoutModal from './LogoutModal';
import { isAuthenticated, getUser, logout } from '../../utils/auth';

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
      geneticDisorders: 'జన్యు రుग्మతలు',
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

      {/* Logout Confirmation Dialog */}
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

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', cls: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) s++;
  if (s <= 2) return { score: 1, label: 'Weak', cls: 'weak' };
  if (s <= 3) return { score: 2, label: 'Medium', cls: 'medium' };
  return { score: 3, label: 'Strong', cls: 'strong' };
};

const Signup = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  const [role, setRole] = useState('admin');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    adminCode: '',
    consent: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // OTP Verification state
  const [step, setStep] = useState('signup'); // 'signup' | 'verify'
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState('');

  const formRef = useRef(null);

  // 1. Live Password strength calculation
  const pwStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  // 2. Live Password 5-rule checklist calculation
  const pwRules = useMemo(() => {
    const pw = formData.password || '';
    return {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /\d/.test(pw),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    };
  }, [formData.password]);

  const allRulesMet = Object.values(pwRules).every(Boolean);

  // 3. Confirm password matching logic (fresh, untrimmed comparison)
  const passwordsMatch = Boolean(
    formData.confirmPassword && formData.password === formData.confirmPassword
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === 'checkbox' ? checked : value;
    if (name === 'email') val = val.trim();

    const nextData = { ...formData, [name]: val };
    setFormData(nextData);

    // Clear field-specific error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    if (name === 'confirmPassword') {
      setConfirmPasswordTouched(true);
    }

    // Bidirectional compare between Password and Confirm Password on EVERY change
    if (confirmPasswordTouched || name === 'confirmPassword') {
      const freshPw = name === 'password' ? val : nextData.password;
      const freshConfirm = name === 'confirmPassword' ? val : nextData.confirmPassword;

      if (freshConfirm) {
        if (freshPw === freshConfirm) {
          setErrors((prev) => ({ ...prev, confirmPassword: '' }));
        } else {
          setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }));
        }
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: '' }));
      }
    }

    if (globalError) setGlobalError('');
  };

  const validateField = (name, value) => {
    let error = '';
    const trimmedVal = typeof value === 'string' ? value.trim() : value;

    if (role === 'guest') {
      setErrors((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    switch (name) {
      case 'firstName':
        if (!trimmedVal) error = 'First name is required';
        else if (trimmedVal.length < 2) error = 'First name must be at least 2 characters';
        else if (trimmedVal.length > 50) error = 'First name must be under 50 characters';
        else if (!/^[A-Za-z\s'\-]+$/.test(trimmedVal)) error = 'Name can only contain letters';
        break;
      case 'lastName':
        if (trimmedVal.length > 0) {
          if (trimmedVal.length < 2) error = 'Last name must be at least 2 characters';
          else if (trimmedVal.length > 50) error = 'Last name must be under 50 characters';
          else if (!/^[A-Za-z\s'\-]+$/.test(trimmedVal)) error = 'Name can only contain letters';
        }
        break;
      case 'email':
        if (!trimmedVal) error = 'Email is required';
        else if (/\s/.test(trimmedVal)) error = 'Email cannot contain spaces';
        else if (trimmedVal.length > 100) error = 'Email must be under 100 characters';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedVal)) error = 'Enter a valid email address';
        break;
      case 'phone':
        if (trimmedVal) {
          if (!/^[6-9]\d{9}$/.test(trimmedVal) || trimmedVal.length !== 10) {
            error = 'Enter a valid 10-digit mobile number';
          }
        }
        break;
      case 'dateOfBirth':
        if (trimmedVal) {
          const dob = new Date(trimmedVal);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (isNaN(dob.getTime())) {
            error = 'Please enter a valid date of birth';
          } else if (dob >= today) {
            error = 'Date of birth cannot be today or a future date';
          } else {
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
            if (age < 18) error = 'You must be at least 18 years old to create an account';
            else if (age > 120) error = 'Date of birth indicates age over 120 years';
          }
        }
        break;
      case 'password':
        if (!value) error = 'Password is required';
        else if (!allRulesMet) error = 'Password must meet all 5 requirements listed below';
        break;
      case 'confirmPassword':
        setConfirmPasswordTouched(true);
        if (!value) error = 'Please confirm your password';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
      case 'adminCode':
        if (role === 'admin') {
          if (!trimmedVal) error = 'Admin Secret Code is required';
          else if (trimmedVal.length < 6) error = 'Admin code must be at least 6 characters';
        }
        break;
      case 'consent':
        if (!value) error = 'You must agree to the Privacy Policy and HIPAA Compliance Terms';
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleBlur = (e) => {
    validateField(e.target.name, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  };

  const validate = (data = formData) => {
    const errs = {};
    if (role === 'guest') return errs;

    // First Name
    const fn = data.firstName.trim();
    if (!fn) errs.firstName = 'First name is required';
    else if (fn.length < 2) errs.firstName = 'First name must be at least 2 characters';
    else if (fn.length > 50) errs.firstName = 'First name must be under 50 characters';
    else if (!/^[A-Za-z\s'\-]+$/.test(fn)) errs.firstName = 'Name can only contain letters';

    // Last Name
    const ln = data.lastName.trim();
    if (ln.length > 0) {
      if (ln.length < 2) errs.lastName = 'Last name must be at least 2 characters';
      else if (ln.length > 50) errs.lastName = 'Last name must be under 50 characters';
      else if (!/^[A-Za-z\s'\-]+$/.test(ln)) errs.lastName = 'Name can only contain letters';
    }

    // Email
    const em = data.email.trim();
    if (!em) errs.email = 'Email is required';
    else if (/\s/.test(em)) errs.email = 'Email cannot contain spaces';
    else if (em.length > 100) errs.email = 'Email must be under 100 characters';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) errs.email = 'Enter a valid email address';

    // Phone
    const ph = data.phone.trim();
    if (ph) {
      if (!/^[6-9]\d{9}$/.test(ph) || ph.length !== 10) errs.phone = 'Enter a valid 10-digit mobile number';
    }

    // Date of Birth (18+)
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(dob.getTime())) {
        errs.dateOfBirth = 'Please enter a valid date of birth';
      } else if (dob >= today) {
        errs.dateOfBirth = 'Date of birth cannot be today or a future date';
      } else {
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (age < 18) errs.dateOfBirth = 'You must be at least 18 years old to create an account';
        else if (age > 120) errs.dateOfBirth = 'Date of birth indicates age over 120 years';
      }
    }

    // Password: block if not meeting all 5 live rules
    const pw = data.password;
    if (!pw) errs.password = 'Password is required';
    else if (!allRulesMet) {
      errs.password = 'Please satisfy all 5 password rules below';
    }

    // Confirm Password
    if (!data.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (data.confirmPassword !== pw) {
      errs.confirmPassword = 'Passwords do not match';
    }

    // Admin Code
    if (role === 'admin') {
      const ac = data.adminCode.trim();
      if (!ac) errs.adminCode = 'Admin Secret Code is required';
      else if (ac.length < 6) errs.adminCode = 'Admin code must be at least 6 characters';
    }

    // Consent Checkbox
    if (!data.consent) {
      errs.consent = 'You must agree to the Privacy Policy and HIPAA Compliance Terms';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedData = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
    };
    setFormData(trimmedData);
    setConfirmPasswordTouched(true);

    const validationErrors = validate(trimmedData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    setIsLoading(true);
    setGlobalError('');

    try {
      const payload =
        role === 'guest'
          ? { role }
          : {
              firstName: trimmedData.firstName,
              lastName: trimmedData.lastName,
              email: trimmedData.email,
              phone: trimmedData.phone,
              dateOfBirth: trimmedData.dateOfBirth,
              password: trimmedData.password,
              role,
              adminCode: trimmedData.adminCode,
              consentGiven: Boolean(trimmedData.consent),
            };

      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create account');
      }

      // If backend requires OTP email verification
      if (data.requiresVerification) {
        setVerificationEmail(trimmedData.email);
        setStep('verify');
        setGlobalError('');
        setOtpError('');
        return;
      }

      // Guest / Direct registration fallback
      if (data.token) localStorage.setItem('token', data.token);
      if (data.userId) localStorage.setItem('userId', data.userId);
      if (data.firstName) localStorage.setItem('firstName', data.firstName);
      if (data.role) localStorage.setItem('role', data.role);

      localStorage.setItem(
        'user',
        JSON.stringify({
          userId: data.userId,
          firstName: data.firstName,
          role: data.role,
        })
      );

      setSignupSuccess(true);
      setTimeout(() => {
        if (data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/login');
        }
      }, 1500);
    } catch (err) {
      setGlobalError(err.message || 'An error occurred during registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (codeOverride) => {
    const code = codeOverride || otpCode;
    if (!code || String(code).trim().length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    setOtpError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verificationEmail,
          otp: String(code).trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Verification failed. Please check the code.');
      }

      // Store auth session
      if (data.token) localStorage.setItem('token', data.token);
      if (data.userId) localStorage.setItem('userId', data.userId);
      if (data.firstName) localStorage.setItem('firstName', data.firstName);
      if (data.role) localStorage.setItem('role', data.role);

      localStorage.setItem(
        'user',
        JSON.stringify({
          userId: data.userId,
          firstName: data.firstName,
          role: data.role,
        })
      );

      setSignupSuccess(true);
      setTimeout(() => {
        if (data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/home');
        }
      }, 1500);
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendSignupOtp = async () => {
    setIsResending(true);
    setOtpError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend verification code');
      }

      setOtpSuccess(data.message || 'A fresh verification code has been sent!');
      setTimeout(() => setOtpSuccess(''), 5000);
      return true;
    } catch (err) {
      setOtpError(err.message || 'Unable to resend OTP at this time');
      return false;
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="signup-page">
      <Navbar language={language} setLanguage={setLanguage} />

      <div className="signup-split-container">
        {/* Left Visual Panel */}
        <div className="signup-visual-panel">
          <img src={dnaBackground} alt="DNA strand" className="signup-visual-image" />
          <div className="signup-visual-tint"></div>
          <div className="signup-visual-content"></div>
        </div>

        {/* Right Form Panel */}
        <div className="signup-form-panel">
          {step === 'verify' ? (
            <div className="signup-container">
              <h2>Verify Your Email</h2>
              <div className="underline"></div>
              <p className="welcome-text">Enter the 6-digit code sent to your email to complete registration.</p>

              {signupSuccess && (
                <div className="success-banner" style={{ marginBottom: '16px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Email verified successfully! Welcome to GeneGuard.
                </div>
              )}

              <OtpInput
                email={verificationEmail}
                onComplete={(code) => {
                  setOtpCode(code);
                  handleVerifyOtp(code);
                }}
                onResend={handleResendSignupOtp}
                isLoading={isVerifying}
                isResending={isResending}
                error={otpError}
                successMessage={otpSuccess}
              />

              <button
                type="button"
                className="continue-btn"
                onClick={() => handleVerifyOtp()}
                disabled={isVerifying || signupSuccess}
                style={{ marginTop: '16px' }}
              >
                {isVerifying ? (
                  <>
                    <span className="btn-spinner"></span>
                    Verifying…
                  </>
                ) : signupSuccess ? (
                  '✓ Verified!'
                ) : (
                  <>
                    <span className="btn-icon">✓</span>
                    VERIFY & CONTINUE
                  </>
                )}
              </button>

              <div className="bottom-links" style={{ marginTop: '24px', justifyContent: 'center' }}>
                <span
                  onClick={() => {
                    setStep('signup');
                    setOtpError('');
                  }}
                  style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                >
                  ← Edit registration details
                </span>
              </div>
            </div>
          ) : (
            <div className="signup-container">
              <h2>Create Account</h2>
              <div className="underline"></div>
              <p className="welcome-text">Join Gene Guard for advanced AI genomic analysis.</p>
              <p className="sub-text">
                Already have an account? <span onClick={() => navigate('/login')}>Login</span>
              </p>

              {/* Role selector */}
              <div className="role-select" role="tablist" aria-label="Sign up as">
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

              {/* Success Banner */}
              {signupSuccess && (
                <div className="success-banner" style={{ marginBottom: '16px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Account created! Redirecting to login…
                </div>
              )}

              {/* Global Error Banner */}
              {globalError && (
                <div className="error-banner" style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{globalError}</span>
                  </div>
                  {formData.email && (
                    <div style={{ fontSize: '0.82rem', paddingLeft: '24px' }}>
                      <span
                        onClick={() => {
                          setVerificationEmail(formData.email.trim().toLowerCase());
                          setStep('verify');
                          setGlobalError('');
                        }}
                        style={{ color: '#53c7e8', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Already have an OTP code? Enter verification code →
                      </span>
                    </div>
                  )}
                </div>
              )}

              <form ref={formRef} className="signup-form" onSubmit={handleSubmit} noValidate>
                {role === 'guest' ? (
                  <div className="guest-note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01" />
                    </svg>
                    No account needed — click below to explore Gene Guard with guest credentials.
                  </div>
                ) : (
                  <>
                    {/* First Name & Last Name */}
                    <div className="form-row">
                      <div className="input-group">
                        <label htmlFor="firstName">First Name</label>
                        <input
                          id="firstName"
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={errors.firstName ? 'input-error' : ''}
                          required
                        />
                        {errors.firstName && <div className="field-error">{errors.firstName}</div>}
                      </div>

                      <div className="input-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input
                          id="lastName"
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={errors.lastName ? 'input-error' : ''}
                        />
                        {errors.lastName && <div className="field-error">{errors.lastName}</div>}
                      </div>
                    </div>

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
                      {errors.email && <div className="field-error">{errors.email}</div>}
                    </div>

                    {/* Phone & Date of Birth (Uniform Grid Alignment) */}
                    <div className="form-row">
                      <div className="input-group">
                        <label htmlFor="phone">Phone Number (10 Digits)</label>
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={errors.phone ? 'input-error' : ''}
                          maxLength={10}
                          placeholder="10-digit mobile"
                        />
                        {errors.phone && <div className="field-error">{errors.phone}</div>}
                      </div>

                      <div className="input-group">
                        <label htmlFor="dateOfBirth">Date of Birth (18+)</label>
                        <input
                          id="dateOfBirth"
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={errors.dateOfBirth ? 'input-error' : ''}
                        />
                        {errors.dateOfBirth && <div className="field-error">{errors.dateOfBirth}</div>}
                      </div>
                    </div>

                    {/* Admin Code if Admin */}
                    {role === 'admin' && (
                      <div className="input-group">
                        <label htmlFor="adminCode">Admin Secret Code</label>
                        <input
                          id="adminCode"
                          type="password"
                          name="adminCode"
                          value={formData.adminCode}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={errors.adminCode ? 'input-error' : ''}
                        />
                        {errors.adminCode && <div className="field-error">{errors.adminCode}</div>}
                      </div>
                    )}

                    {/* Password Field */}
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
                          autoComplete="new-password"
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

                      {/* 3-Segment Strength Bar */}
                      {formData.password && (
                        <div className="password-strength-container">
                          <div className="strength-bars">
                            <div className={`strength-bar ${pwStrength.score >= 1 ? pwStrength.cls : ''}`} />
                            <div className={`strength-bar ${pwStrength.score >= 2 ? pwStrength.cls : ''}`} />
                            <div className={`strength-bar ${pwStrength.score >= 3 ? pwStrength.cls : ''}`} />
                          </div>
                          <span className={`strength-label ${pwStrength.cls}`}>{pwStrength.label}</span>
                        </div>
                      )}

                      {/* Live Password 5-rule checklist */}
                      {formData.password && (
                        <div className="password-checklist" aria-live="polite">
                          <div className={`checklist-item ${pwRules.length ? 'met' : ''}`}>
                            <span className="checklist-icon">{pwRules.length ? '✓' : '○'}</span>
                            <span>At least 8 characters</span>
                          </div>
                          <div className={`checklist-item ${pwRules.uppercase ? 'met' : ''}`}>
                            <span className="checklist-icon">{pwRules.uppercase ? '✓' : '○'}</span>
                            <span>One uppercase letter (A-Z)</span>
                          </div>
                          <div className={`checklist-item ${pwRules.lowercase ? 'met' : ''}`}>
                            <span className="checklist-icon">{pwRules.lowercase ? '✓' : '○'}</span>
                            <span>One lowercase letter (a-z)</span>
                          </div>
                          <div className={`checklist-item ${pwRules.number ? 'met' : ''}`}>
                            <span className="checklist-icon">{pwRules.number ? '✓' : '○'}</span>
                            <span>One number (0-9)</span>
                          </div>
                          <div className={`checklist-item ${pwRules.special ? 'met' : ''}`}>
                            <span className="checklist-icon">{pwRules.special ? '✓' : '○'}</span>
                            <span>One special character (!@#$%^&*)</span>
                          </div>
                        </div>
                      )}

                      {errors.password && <div className="field-error" style={{ marginTop: '8px' }}>{errors.password}</div>}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="input-group">
                      <label htmlFor="confirmPassword">Confirm Password</label>
                      <div className="password-input-wrapper">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={errors.confirmPassword ? 'input-error' : ''}
                          autoComplete="new-password"
                          required
                        />
                        {passwordsMatch && (
                          <span className="pw-match-badge" title="Passwords match">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        )}
                        <button
                          type="button"
                          className="pw-toggle-btn"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? (
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

                      {confirmPasswordTouched && errors.confirmPassword && (
                        <div className="field-error" style={{ marginTop: '8px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {errors.confirmPassword}
                        </div>
                      )}
                    </div>

                    {/* Required Consent Checkbox */}
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="consent"
                        name="consent"
                        checked={formData.consent}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                      />
                      <label htmlFor="consent">
                        I agree to the <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link> and{' '}
                        <Link to="/terms" target="_blank" rel="noopener noreferrer">HIPAA Compliance Terms</Link>
                      </label>
                    </div>
                    {errors.consent && (
                      <div className="field-error" style={{ marginTop: '4px' }}>
                        {errors.consent}
                      </div>
                    )}
                  </>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="continue-btn"
                  disabled={isLoading || signupSuccess}
                >
                  {isLoading ? (
                    <>
                      <span className="btn-spinner"></span>
                      Creating Account…
                    </>
                  ) : signupSuccess ? (
                    '✓ Account Created!'
                  ) : (
                    <>
                      <span className="btn-icon">⊙</span>
                      {role === 'guest' ? 'CONTINUE AS GUEST' : 'CREATE ACCOUNT'}
                    </>
                  )}
                </button>

                <div className="divider">or</div>

                {/* Google Button */}
                <button
                  type="button"
                  className="social-btn"
                  onClick={() => console.log('Continue with Google')}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.65z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09C3.26 21.3 7.31 24 12 24z" />
                    <path fill="#FBBC05" d="M5.31 14.31A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.58.38-2.31V6.6H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.4l4.01-3.09z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.6l4.01 3.09C6.25 6.86 8.89 4.75 12 4.75z" />
                  </svg>
                  Continue with Google
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
