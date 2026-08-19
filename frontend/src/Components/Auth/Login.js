import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import '../Pages/Home.css';
import dnaBackground from '../images/image.png';

// Translation data
const translations = {
  en: {
    navLinks: {
      learnGenetics: 'Learn Genetics',
      geneticDisorders: 'Genetic Disorders',
      counselling: 'Counselling',
      geneticAssessment: 'Genetic Assessment AI',
      dnaTesting: 'DNA Testing',
      aboutUs: 'About Us',
      login: 'Login',
      signup: 'Sign Up'
    }
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
      signup: 'साइन अप'
    }
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
      signup: 'साइन अप'
    }
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
      signup: 'సైన్ అప్'
    }
  }
};

const Navbar = ({ language, setLanguage }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const t = translations[language];

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
    return () => { document.body.style.overflow = ''; };
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
              <Link to="/genetic-assessment" className="home-nav-link">{t.navLinks.geneticAssessment}</Link>
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
                  {/* Keep Sign Up link only when on Login page */}
                  <Link to="/signup" className="home-dropdown-item home-signup-special">{t.navLinks.signup}</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="home-mobile-menu-overlay">
          <Link to="/learn-genetics" className="home-nav-link" onClick={handleLinkClick}>{t.navLinks.learnGenetics}</Link>
          <Link to="/genetic-disorders" className="home-nav-link" onClick={handleLinkClick}>{t.navLinks.geneticDisorders}</Link>
          <Link to="/counselling" className="home-nav-link" onClick={handleLinkClick}>{t.navLinks.counselling}</Link>
          <Link to="/genetic-assessment" className="home-nav-link" onClick={handleLinkClick}>{t.navLinks.geneticAssessment}</Link>
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
  { key: 'guest', label: 'Guest' }
];

// Demo identity sent for guest sessions so visitors can browse without a real account.
// Point this at whatever demo/guest user your backend recognizes.
const GUEST_DEMO_CREDENTIALS = {
  id: 'guest-demo-001',
  email: 'guest@geneguard.demo'
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const Login = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  const [role, setRole] = useState('admin');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (globalError) setGlobalError('');
  };

  const validate = () => {
    const errs = {};
    // Guests can continue without credentials
    if (role !== 'guest') {
      if (!formData.email.trim()) {
        errs.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errs.email = 'Enter a valid email address';
      }
      if (!formData.password) {
        errs.password = 'Password is required';
      } else if (formData.password.length < 6) {
        errs.password = 'Password must be at least 6 characters';
      }
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsLoading(true);
    setGlobalError('');
    try {
      const payload = role === 'guest'
        ? { role, ...GUEST_DEMO_CREDENTIALS }
        : { role, email: formData.email, password: formData.password };
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid email or password');
      }

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

      setLoginSuccess(true);
      setTimeout(() => {
        if (data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 1200);
    } catch (err) {
      setGlobalError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Replace with your actual Google OAuth flow
    setGlobalError('');
    console.log('Continue with Google clicked, role:', role);
  };

  return (
    <div className="login-page">
      <Navbar language={language} setLanguage={setLanguage} />

      <div className="login-split-container">

        {/* ── Left visual panel ── */}
        <div className="login-visual-panel">
          <img src={dnaBackground} alt="DNA strand" className="login-visual-image" />
          <div className="login-visual-tint"></div>
          <div className="login-visual-content">
            <div className="login-visual-logo">
             
             
            </div>
            <div className="login-visual-heading-wrap">
             
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="login-form-panel">
          <div className="login-container">
            <h2>Welcome Back</h2>
            <div className="underline"></div>
            <p className="welcome-text">Login to access the Gene Guard platform.</p>
            <p className="sub-text">
              New here? <span onClick={() => navigate('/signup')}>Create an account</span>
            </p>

            {/* Role selector */}
            <div className="role-select" role="tablist" aria-label="Login as">
              {ROLES.map(r => (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                </svg>
                Login successful! Redirecting…
              </div>
            )}

            {globalError && (
              <div className="error-banner" style={{ marginBottom: '20px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {globalError}
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>

              {role === 'guest' && (
                <div className="guest-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
                    <circle cx="12" cy="12" r="10"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4M12 8h.01"/>
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
                      className={errors.email ? 'input-error' : ''}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <div className="field-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {errors.email}
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={errors.password ? 'input-error' : ''}
                      autoComplete="current-password"
                    />
                    {/* Eye toggle button */}
                    <button
                      type="button"
                      className="pw-toggle"
                      onClick={() => setShowPassword(prev => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        /* Eye-off icon */
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        /* Eye icon */
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                    {errors.password && (
                      <div className="field-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="13" height="13">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
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
                    Loading…
                  </>
                ) : loginSuccess ? (
                  '✓  Logged In!'
                ) : (
                  <>
                    <span className="btn-icon">⊙</span>
                    {role === 'guest' ? 'CONTINUE AS GUEST' : 'CONTINUE'}
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="divider">or</div>

              {/* Google */}
              <button type="button" className="social-btn" onClick={handleGoogleLogin}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.65z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09C3.26 21.3 7.31 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.31 14.31A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.58.38-2.31V6.6H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.4l4.01-3.09z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.6l4.01 3.09C6.25 6.86 8.89 4.75 12 4.75z"/>
                </svg>
                Continue with Google
              </button>

              {/* Bottom links */}
              <div className="bottom-links">
                <Link to="/signup">Create an account</Link>
                <a href="#forgot">Forgot password?</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
