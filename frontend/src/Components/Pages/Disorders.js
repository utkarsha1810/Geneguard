import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LogoutModal from '../Auth/LogoutModal';
import { isAuthenticated, getUser, logout } from '../../utils/auth';
import './Disorders.css';
import './Home.css';

// ─── Translations ─────────────────────────────────────────────────────────────
const translations = {
  en: {
    nav_learn: 'Learn Genetics',
    nav_disorders: 'Genetic Disorders',
    nav_counseling: 'Genetic Counseling',
    nav_ai: 'Learning Hub',
    nav_dna: 'DNA Testing',
    nav_about: 'About Us',
    nav_login: 'Login',
    nav_signup: 'Sign Up',
    footer_tagline: 'Empowering genetic awareness through accessible education, advanced AI assessment, and personalized insights.',
    footer_platform: 'Platform',
    footer_services: 'Services',
    footer_company: 'Company',
    footer_legal: 'Legal',
    footer_learn: 'Learn Genetics',
    footer_disorders: 'Genetic Disorders',
    footer_counseling: 'Genetic Counseling',
    footer_ai: 'AI Assessment',
    footer_dna: 'DNA Testing',
    footer_reports: 'Reports & Insights',
    footer_consultations: 'Consultations',
    footer_research: 'Research',
    footer_about: 'About Us',
    footer_team: 'Our Team',
    footer_careers: 'Careers',
    footer_contact: 'Contact',
    footer_privacy: 'Privacy Policy',
    footer_terms: 'Terms of Service',
    footer_hipaa: 'HIPAA Compliance',
    footer_cookies: 'Cookie Policy',
  },
  hi: {
    nav_learn: 'आनुवंशिकी सीखें',
    nav_disorders: 'आनुवंशिक विकार',
    nav_counseling: 'आनुवंशिक परामर्श',
    nav_ai: 'AI आनुवंशिक मूल्यांकन',
    nav_dna: 'डीएनए परीक्षण',
    nav_about: 'हमारे बारे में',
    nav_login: 'लॉगिन',
    nav_signup: 'साइन अप',
    footer_tagline: 'सुलभ शिक्षा, उन्नत AI मूल्यांकन और व्यक्तिगत अंतर्दृष्टि के माध्यम से आनुवंशिक जागरूकता को सशक्त बनाना।',
    footer_platform: 'प्लेटफ़ॉर्म', footer_services: 'सेवाएं', footer_company: 'कंपनी', footer_legal: 'कानूनी',
    footer_learn: 'आनुवंशिकी सीखें', footer_disorders: 'आनुवंशिक विकार', footer_counseling: 'आनुवंशिक परामर्श',
    footer_ai: 'AI मूल्यांकन', footer_dna: 'डीएनए परीक्षण', footer_reports: 'रिपोर्ट और अंतर्दृष्टि',
    footer_consultations: 'परामर्श', footer_research: 'अनुसंधान', footer_about: 'हमारे बारे में',
    footer_team: 'हमारी टीम', footer_careers: 'करियर', footer_contact: 'संपर्क',
    footer_privacy: 'गोपनीयता नीति', footer_terms: 'सेवा की शर्तें', footer_hipaa: 'HIPAA अनुपालन', footer_cookies: 'कुकी नीति',
  },
  mr: {
    nav_learn: 'अनुवंशशास्त्र शिका',
    nav_disorders: 'अनुवांशिक विकार',
    nav_counseling: 'अनुवांशिक समुपदेशन',
    nav_ai: 'AI अनुवांशिक मूल्यमापन',
    nav_dna: 'DNA चाचणी',
    nav_about: 'आमच्याबद्दल',
    nav_login: 'लॉगिन',
    nav_signup: 'साइन अप',
    footer_tagline: 'सुलभ शिक्षण, प्रगत AI मूल्यमापन आणि वैयक्तिक अंतर्दृष्टीद्वारे अनुवांशिक जागरूकता सशक्त करणे.',
    footer_platform: 'प्लॅटफॉर्म', footer_services: 'सेवा', footer_company: 'कंपनी', footer_legal: 'कायदेशीर',
    footer_learn: 'अनुवंशशास्त्र शिका', footer_disorders: 'अनुवांशिक विकार', footer_counseling: 'अनुवांशिक समुपदेशन',
    footer_ai: 'AI मूल्यमापन', footer_dna: 'DNA चाचणी', footer_reports: 'अहवाल आणि अंतर्दृष्टी',
    footer_consultations: 'सल्लामसलत', footer_research: 'संशोधन', footer_about: 'आमच्याबद्दल',
    footer_team: 'आमची टीम', footer_careers: 'करिअर', footer_contact: 'संपर्क',
    footer_privacy: 'गोपनीयता धोरण', footer_terms: 'सेवेच्या अटी', footer_hipaa: 'HIPAA अनुपालन', footer_cookies: 'कुकी धोरण',
  },
  te: {
    nav_learn: 'జెనెటిక్స్ నేర్చుకోండి',
    nav_disorders: 'జన్యు వ్యాధులు',
    nav_counseling: 'జన్యు కౌన్సెలింగ్',
    nav_ai: 'AI జన్యు మూల్యాంకనం',
    nav_dna: 'DNA పరీక్ష',
    nav_about: 'మా గురించి',
    nav_login: 'లాగిన్',
    nav_signup: 'సైన్ అప్',
    footer_tagline: 'అందుబాటులో ఉన్న విద్య, అధునాతన AI మూల్యాంకనం మరియు వ్యక్తిగత అంతర్దృష్టుల ద్వారా జన్యు అవగాహనను శక్తివంతం చేయడం.',
    footer_platform: 'ప్లాట్‌ఫారమ్', footer_services: 'సేవలు', footer_company: 'కంపెనీ', footer_legal: 'చట్టపరమైన',
    footer_learn: 'జెనెటిక్స్ నేర్చుకోండి', footer_disorders: 'జన్యు వ్యాధులు', footer_counseling: 'జన్యు కౌన్సెలింగ్',
    footer_ai: 'AI మూల్యాంకనం', footer_dna: 'DNA పరీక్ష', footer_reports: 'నివేదికలు & అంతర్దృష్టి',
    footer_consultations: 'సంప్రదింపులు', footer_research: 'పరిశోధన', footer_about: 'మా గురించి',
    footer_team: 'మా బృందం', footer_careers: 'కెరీర్లు', footer_contact: 'సంప్రదించండి',
    footer_privacy: 'గోప్యతా విధానం', footer_terms: 'సేవా నిబంధనలు', footer_hipaa: 'HIPAA అనుసరణ', footer_cookies: 'కుకీ విధానం',
  }
};

// ─── Navbar Component ────────────────────────────────────────────────────────
const Navbar = ({ language, setLanguage }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  const t = (key) => translations[language][key] || key;
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

  // Lock body scroll when mobile menu is open (matches Home page behavior)
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
              <Link to="/learn-genetics" className="home-nav-link">{t('nav_learn')}</Link>
              <Link to="/genetic-disorders" className="home-nav-link active">{t('nav_disorders')}</Link>
              <Link to="/counselling" className="home-nav-link">{t('nav_counseling')}</Link>
              <Link to="/learning-hub" className="home-nav-link">Learning Hub</Link>
              <Link to="/dna" className="home-nav-link">{t('nav_dna')}</Link>
              <Link to="/about" className="home-nav-link">{t('nav_about')}</Link>
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
                        ⚙️ Settings
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
                        🚪 Log Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="home-dropdown-item home-signup-special">{t('nav_login')}</Link>
                      <Link to="/signup" className="home-dropdown-item home-signup-special">{t('nav_signup')}</Link>
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
          <Link to="/learn-genetics" className="home-nav-link" onClick={handleLinkClick}>{t('nav_learn')}</Link>
          <Link to="/genetic-disorders" className="home-nav-link active" onClick={handleLinkClick}>{t('nav_disorders')}</Link>
          <Link to="/counselling" className="home-nav-link" onClick={handleLinkClick}>{t('nav_counseling')}</Link>
          <Link to="/learning-hub" className="home-nav-link" onClick={handleLinkClick}>Learning Hub</Link>
          <Link to="/dna" className="home-nav-link" onClick={handleLinkClick}>{t('nav_dna')}</Link>
          <Link to="/about" className="home-nav-link" onClick={handleLinkClick}>{t('nav_about')}</Link>

          <div className="home-language-buttons">
            <button className={`home-lang-btn ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>EN</button>
            <button className={`home-lang-btn ${language === 'hi' ? 'active' : ''}`} onClick={() => setLanguage('hi')}>हिं</button>
            <button className={`home-lang-btn ${language === 'mr' ? 'active' : ''}`} onClick={() => setLanguage('mr')}>मर</button>
            <button className={`home-lang-btn ${language === 'te' ? 'active' : ''}`} onClick={() => setLanguage('te')}>తె</button>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Footer Component ─────────────────────────────────────────────────────────
// Reuses Home's exact footer markup + "home-footer-*" classes (from Home.css)
// so the colors are pulled from the same rules as the Home page — guaranteed
// identical, not just visually similar.
const Footer = ({ language }) => {
  const currentYear = new Date().getFullYear();
  const t = (key) => translations[language][key] || key;

  return (
    <footer className="home-footer">
      <div className="home-footer-container">

        <div className="home-footer-top">

          <div className="home-footer-brand">
            <Link to="/" className="home-footer-logo" style={{ textDecoration: 'none' }}>
              <div className="home-footer-logo-circle"></div>
              <span className="home-footer-logo-text">GeneGuard</span>
            </Link>
            <p className="home-footer-tagline">{t('footer_tagline')}</p>
            <div className="home-footer-social">
              <a href="https://twitter.com" className="home-social-link" aria-label="Twitter" target="_blank" rel="noreferrer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://linkedin.com" className="home-social-link" aria-label="LinkedIn" target="_blank" rel="noreferrer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a href="https://github.com" className="home-social-link" aria-label="GitHub" target="_blank" rel="noreferrer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="home-footer-links-grid">
            <div className="home-footer-col">
              <h4 className="home-footer-col-title">{t('footer_platform')}</h4>
              <ul className="home-footer-ul">
                <li><Link to="/learn-genetics">{t('footer_learn')}</Link></li>
                <li><Link to="/genetic-disorders">{t('footer_disorders')}</Link></li>
                <li><Link to="/counselling">{t('footer_counseling')}</Link></li>
                <li><Link to="/learning-hub">Learning Hub</Link></li>
              </ul>
            </div>
            <div className="home-footer-col">
              <h4 className="home-footer-col-title">{t('footer_services')}</h4>
              <ul className="home-footer-ul">
                <li><Link to="/dna">{t('footer_dna')}</Link></li>
                <li><a href="#reports">{t('footer_reports')}</a></li>
                <li><a href="#consultations">{t('footer_consultations')}</a></li>
                <li><a href="#research">{t('footer_research')}</a></li>
              </ul>
            </div>
            <div className="home-footer-col">
              <h4 className="home-footer-col-title">{t('footer_company')}</h4>
              <ul className="home-footer-ul">
                <li><Link to="/about">{t('footer_about')}</Link></li>
                <li><a href="#team">{t('footer_team')}</a></li>
                <li><a href="#careers">{t('footer_careers')}</a></li>
                <li><a href="#contact">{t('footer_contact')}</a></li>
              </ul>
            </div>
            <div className="home-footer-col">
              <h4 className="home-footer-col-title">{t('footer_legal')}</h4>
              <ul className="home-footer-ul">
                <li><a href="#privacy">{t('footer_privacy')}</a></li>
                <li><a href="#terms">{t('footer_terms')}</a></li>
                <li><a href="#hipaa">{t('footer_hipaa')}</a></li>
                <li><a href="#cookies">{t('footer_cookies')}</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="home-footer-divider" />

        <div className="home-footer-bottom">
          <p className="home-footer-copyright">© {currentYear} GeneGuard. All rights reserved.</p>
        </div>

      </div>
    </footer>
  );
};

// ─── Main Disorders Component ────────────────────────────────────────────────
const Disorders = () => {
  const [language, setLanguage] = useState('en');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showSymptomChecker, setShowSymptomChecker] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [showGlossary, setShowGlossary] = useState(false);

  // Disorder Categories Data
  const disorderCategories = [
    {
      id: 1,
      title: 'SINGLE-GENE DISORDERS',
      image: 'https://cdn5.slideserve.com/9344131/single-gene-disorders-n.jpg',
      overlay: 'rgba(138, 43, 226, 0.65)',
      description: 'Single-gene disorders, also known as Mendelian disorders, are caused by mutations in a single gene. These conditions follow predictable inheritance patterns and can be passed from parents to children through autosomal dominant, autosomal recessive, or X-linked inheritance.',
      basicCharacteristics: 'Caused by changes in one specific gene; follows clear hereditary patterns; can often be detected through genetic testing.',
      examples: [
        {
          name: 'Cystic Fibrosis',
          info: 'Autosomal recessive disorder affecting the lungs and digestive system, causing thick mucus buildup that can lead to respiratory and digestive complications'
        },
        {
          name: 'Sickle Cell Disease',
          info: 'Red blood cells become crescent-shaped, leading to pain crises, organ damage, and increased infection risk'
        },
        {
          name: 'Huntington\'s Disease',
          info: 'Progressive autosomal dominant brain disorder affecting movement, cognition, and behavior, typically appearing in mid-adulthood'
        },
        {
          name: 'Hemophilia',
          info: 'X-linked blood clotting disorder that can cause excessive bleeding even from minor injuries'
        },
        {
          name: 'Marfan Syndrome',
          info: 'Connective tissue disorder affecting the heart, blood vessels, bones, and eyes'
        }
      ]
    },
    {
      id: 2,
      title: 'CHROMOSOMAL DISORDERS',
      image: 'https://image.slidesharecdn.com/geneticspresenatation-151026053323-lva1-app6892/95/chromosomal-disorders-1-638.jpg?cb=1445837805',
      overlay: 'rgba(46, 125, 50, 0.65)',
      description: 'Chromosomal disorders occur when there are abnormalities in chromosome number or structure. These can result from errors during cell division and often affect multiple body systems. They can be numerical (too many or too few chromosomes) or structural (missing, extra, or rearranged chromosome parts).',
      basicCharacteristics: 'Involves entire chromosomes or large chromosome segments; often occurs spontaneously; typically affects multiple organ systems.',
      examples: [
        {
          name: 'Down Syndrome (Trisomy 21)',
          info: 'Extra copy of chromosome 21, causing characteristic facial features, developmental delays, and increased risk of certain medical conditions'
        },
        {
          name: 'Turner Syndrome',
          info: 'Missing or incomplete X chromosome in females, affecting growth, heart development, and fertility'
        },
        {
          name: 'Klinefelter Syndrome',
          info: 'Extra X chromosome in males (XXY), affecting testosterone production, physical development, and fertility'
        },
        {
          name: 'Edwards Syndrome (Trisomy 18)',
          info: 'Extra copy of chromosome 18, causing severe developmental issues and multiple organ abnormalities'
        },
        {
          name: 'Cri-du-chat Syndrome',
          info: 'Deletion of part of chromosome 5, characterized by a distinctive cat-like cry in infancy and intellectual disability'
        }
      ]
    },
    {
      id: 3,
      title: 'MULTIFACTORIAL DISORDERS',
      image: 'https://tse2.mm.bing.net/th/id/OIP.3nQRDa3pryQ9oA0S5mEEfwAAAA?rs=1&pid=ImgDetMain&o=7&rm=3',
      overlay: 'rgba(211, 47, 47, 0.65)',
      description: 'Multifactorial disorders, also called complex disorders, result from a combination of genetic predisposition and environmental factors. Multiple genes interact with lifestyle, diet, environmental exposures, and other external factors to influence disease development. These are among the most common genetic conditions.',
      basicCharacteristics: 'Result from multiple genes plus environmental factors; risk can be modified by lifestyle; tend to run in families but without clear inheritance patterns.',
      examples: [
        {
          name: 'Type 2 Diabetes',
          info: 'Metabolic disorder affecting blood sugar regulation, influenced by genetics, diet, exercise, and body weight'
        },
        {
          name: 'Heart Disease',
          info: 'Various cardiovascular conditions influenced by genetic factors, diet, exercise, smoking, and stress'
        },
        {
          name: 'Alzheimer\'s Disease',
          info: 'Progressive neurodegenerative disorder affecting memory and cognition, with both genetic and environmental risk factors'
        },
        {
          name: 'Certain Cancers',
          info: 'Some cancers have both genetic predisposition and environmental triggers such as radiation, chemicals, or lifestyle factors'
        },
        {
          name: 'Asthma',
          info: 'Respiratory condition influenced by genetic susceptibility and environmental allergens, pollution, and infections'
        }
      ]
    }
  ];

  // Enhanced Symptoms Checker Data
  const symptomSteps = [
    {
      step: 1,
      question: 'What primary area of concern are you experiencing?',
      instruction: 'Select the category that best matches your main symptoms',
      options: [
        { id: 's1', label: 'Respiratory Issues', icon: '🫁', description: 'Breathing difficulties, chronic cough' },
        { id: 's2', label: 'Developmental Concerns', icon: '👶', description: 'Growth delays, learning difficulties' },
        { id: 's3', label: 'Blood/Circulation Problems', icon: '❤️', description: 'Anemia, clotting issues' },
        { id: 's4', label: 'Neurological Symptoms', icon: '🧠', description: 'Memory, movement, coordination issues' }
      ]
    },
    {
      step: 2,
      question: 'How long have you been experiencing these symptoms?',
      instruction: 'Duration can help identify the nature of the condition',
      options: [
        { id: 'd1', label: 'Less than 1 week', icon: '📅', description: 'Recent onset' },
        { id: 'd2', label: '1-4 weeks', icon: '📅', description: 'Short-term duration' },
        { id: 'd3', label: '1-6 months', icon: '📅', description: 'Medium-term duration' },
        { id: 'd4', label: 'More than 6 months', icon: '📅', description: 'Long-term or chronic' }
      ]
    },
    {
      step: 3,
      question: 'Is there a family history of genetic disorders?',
      instruction: 'Family history is an important factor in genetic conditions',
      options: [
        { id: 'f1', label: 'Yes, confirmed', icon: '👨‍👩‍👧‍👦', description: 'Documented family cases' },
        { id: 'f2', label: 'Possibly/Uncertain', icon: '❓', description: 'Some family health issues' },
        { id: 'f3', label: 'No known history', icon: '✓', description: 'No apparent family cases' },
        { id: 'f4', label: 'Adopted/Unknown', icon: '🤷', description: 'Family history unavailable' }
      ]
    },
    {
      step: 4,
      question: 'Have symptoms worsened or changed recently?',
      instruction: 'Changes in symptoms can provide important diagnostic clues',
      options: [
        { id: 'w1', label: 'Yes, getting worse', icon: '📈', description: 'Progressive worsening' },
        { id: 'w2', label: 'Stable/unchanged', icon: '📊', description: 'Consistent symptoms' },
        { id: 'w3', label: 'Improving', icon: '📉', description: 'Getting better' },
        { id: 'w4', label: 'Fluctuating', icon: '〰️', description: 'Varies over time' }
      ]
    }
  ];

  // Glossary Data
  const glossaryTerms = [
    {
      term: 'Autosomal',
      definition: 'Refers to any chromosome that is not a sex chromosome (X or Y). Humans have 22 pairs of autosomes.'
    },
    {
      term: 'Dominant',
      definition: 'A genetic trait that appears when only one copy of the gene is present.'
    },
    {
      term: 'Recessive',
      definition: 'A genetic trait that requires two copies of the gene to be expressed.'
    },
    {
      term: 'Mutation',
      definition: 'A change in the DNA sequence that can lead to altered gene function.'
    },
    {
      term: 'Carrier',
      definition: 'Someone who has one copy of a recessive gene mutation but shows no symptoms.'
    },
    {
      term: 'Genetic Counselor',
      definition: 'Healthcare professional trained to help people understand genetic conditions and testing.'
    }
  ];

  // Prevention Tips Data
  const preventionTips = [
    {
      id: 1,
      title: 'Genetic Counseling',
      description: 'Consult with genetic counselors before family planning to understand potential hereditary risks and available testing options',
      icon: '🧬'
    },
    {
      id: 2,
      title: 'Prenatal Testing',
      description: 'Screen for genetic disorders during pregnancy through amniocentesis, CVS, or non-invasive prenatal testing (NIPT)',
      icon: '🤰'
    },
    {
      id: 3,
      title: 'Carrier Screening',
      description: 'Test prospective parents to identify if they carry genes for certain genetic disorders, especially for recessive conditions',
      icon: '🔬'
    },
    {
      id: 4,
      title: 'Healthy Lifestyle',
      description: 'Maintain balanced diet, regular exercise, and avoid harmful substances to reduce risk of multifactorial disorders',
      icon: '🥗'
    },
    {
      id: 5,
      title: 'Regular Checkups',
      description: 'Schedule routine medical examinations and genetic health assessments, especially if you have a family history',
      icon: '⚕️'
    },
    {
      id: 6,
      title: 'Family History',
      description: 'Document and share complete family medical history with healthcare providers to identify potential genetic risks',
      icon: '📋'
    }
  ];

  // Modal Handlers
  const openModal = (category) => {
    setSelectedCategory(category);
  };

  const closeModal = () => {
    setSelectedCategory(null);
  };

  // Symptom Checker Handlers
  const openSymptomChecker = () => {
    setShowSymptomChecker(true);
    setCurrentStep(1);
    setSelectedSymptoms([]);
  };

  const closeSymptomChecker = () => {
    setShowSymptomChecker(false);
    setCurrentStep(1);
    setSelectedSymptoms([]);
    setShowGlossary(false);
  };

  const handleSymptomSelection = (option) => {
    setSelectedSymptoms([...selectedSymptoms, option]);
    if (currentStep < 4) {
      setTimeout(() => setCurrentStep(currentStep + 1), 400);
    } else {
      setCurrentStep(5);
    }
  };

  const resetSymptomChecker = () => {
    setCurrentStep(1);
    setSelectedSymptoms([]);
    setShowGlossary(false);
  };

  const toggleGlossary = () => {
    setShowGlossary(!showGlossary);
  };

  return (
    <div className="disorders-page-wrapper">
      <Navbar language={language} setLanguage={setLanguage} />

      <div className="disorders-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-left">
              <h1 className="hero-title">Genetic Disorders</h1>
              <p className="hero-subtitle">
                Understanding genetic conditions to empower informed health decisions
                and provide compassionate support for affected individuals and families
              </p>
            </div>
            <div className="hero-right">
              <div className="image-frame">
                <img 
                  src="https://th.bing.com/th/id/R.d20277cd43f537dfe56ce9a49f2732cc?rik=oTitnvg9vD%2fc7w&riu=http%3a%2f%2fcameronhgenetics.weebly.com%2fuploads%2f5%2f1%2f6%2f5%2f51654883%2f1432079956.png&ehk=NzSUjhbSWlQZOII1AIjTZ5JHBY8LeuBNxzLAdnX6fRA%3d&risl=&pid=ImgRaw&r=0" 
                  alt="DNA Structure Illustration"
                  className="hero-image"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Disorder Classification Section */}
        <section className="classification-section">
          <div className="section-header">
            <h2 className="section-title">Types of Genetic Disorders</h2>
            <p className="section-description bold-description">
              Explore the three main categories of genetic disorders and learn about their basic characteristics
            </p>
          </div>
          
          <div className="category-grid">
            {disorderCategories.map((category) => (
              <div 
                key={category.id}
                className="category-tile"
                onClick={() => openModal(category)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === 'Enter' && openModal(category)}
                aria-label={`Learn more about ${category.title}`}
              >
                <div 
                  className="category-image"
                  style={{ backgroundImage: `url(${category.image})` }}
                >
                  <div 
                    className="category-overlay"
                    style={{ background: category.overlay }}
                  >
                    <h3 className="category-title">{category.title}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Symptoms Checker Section */}
        <section className="symptoms-section">
          <div className="section-header">
            <h2 className="section-title">Interactive Symptoms Checker</h2>
            <p className="section-description">
              An educational tool to help you understand various symptoms and imply basic medical insights
            </p>
          </div>
          
          <div className="symptoms-cta">
            <button 
              className="symptoms-button"
              onClick={openSymptomChecker}
              aria-label="Start symptom assessment"
            >
              <span className="button-icon">🩺</span>
              Start Symptom Assessment
            </button>
            <p className="symptoms-disclaimer">
              <strong>Important:</strong> This tool is for educational purposes only and provides basic insights.
              It does not replace professional medical diagnosis. Please consult a healthcare professional for accurate medical advice.
            </p>
          </div>
        </section>

        {/* Prevention Tips Section */}
        <section className="prevention-section">
          <div className="section-header">
            <h2 className="section-title">Prevention & Awareness</h2>
            <p className="section-description">
              Proactive steps you can take to understand and manage genetic health risks
            </p>
          </div>
          
          <div className="tips-grid">
            {preventionTips.map((tip) => (
              <div key={tip.id} className="tip-diamond">
                <div className="tip-content">
                  <span className="tip-icon">{tip.icon}</span>
                  <h3 className="tip-title">{tip.title}</h3>
                  <p className="tip-description">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Category Modal */}
        {selectedCategory && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeModal} aria-label="Close modal">
                ✕
              </button>
              <h2 className="modal-title">{selectedCategory.title}</h2>
              
              <div className="modal-section">
                <h3 className="modal-section-title">Overview</h3>
                <p className="modal-description">{selectedCategory.description}</p>
              </div>

              <div className="modal-section">
                <h3 className="modal-section-title">Basic Characteristics</h3>
                <p className="modal-characteristics">{selectedCategory.basicCharacteristics}</p>
              </div>
              
              <div className="examples-section">
                <h3 className="examples-title">Common Examples & Subtypes:</h3>
                <div className="examples-grid">
                  {selectedCategory.examples.map((example, index) => (
                    <div key={index} className="example-card">
                      <h4 className="example-name">{example.name}</h4>
                      <p className="example-info">{example.info}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Symptom Checker Modal */}
        {showSymptomChecker && (
          <div className="modal-overlay" onClick={closeSymptomChecker}>
            <div className="symptom-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeSymptomChecker} aria-label="Close symptom checker">
                ✕
              </button>
              
              <div className="symptom-header">
                <h2 className="symptom-title">Symptom Assessment Tool</h2>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(Math.min(currentStep, 4) / 4) * 100}%` }}
                    ></div>
                  </div>
                  <p className="step-indicator">
                    {currentStep <= 4 ? `Step ${currentStep} of 4` : 'Assessment Complete'}
                  </p>
                </div>
              </div>

              {currentStep <= 4 ? (
                <div className="symptom-step">
                  <h3 className="step-question">
                    {symptomSteps[currentStep - 1].question}
                  </h3>
                  <p className="step-instruction">
                    {symptomSteps[currentStep - 1].instruction}
                  </p>
                  <div className="options-grid">
                    {symptomSteps[currentStep - 1].options.map((option) => (
                      <button
                        key={option.id}
                        className="option-button"
                        onClick={() => handleSymptomSelection(option)}
                        aria-label={`Select ${option.label}`}
                      >
                        <span className="option-icon">{option.icon}</span>
                        <span className="option-label">{option.label}</span>
                        <span className="option-description">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="symptom-result">
                  <div className="result-icon">✓</div>
                  <h3 className="result-title">Assessment Complete</h3>
                  <p className="result-message">
                    Thank you for completing the symptom assessment. Based on your responses,
                    we recommend consulting with a healthcare professional or genetic counselor
                    for personalized advice, proper medical evaluation, and accurate diagnosis.
                  </p>
                  <div className="result-summary">
                    <h4 className="summary-title">Your Selected Responses:</h4>
                    <ul className="summary-list">
                      {selectedSymptoms.map((symptom, index) => (
                        <li key={index} className="summary-item">
                          <span className="summary-icon">{symptom.icon}</span>
                          <span className="summary-text">{symptom.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Glossary Section */}
                  <div className="glossary-section">
                    <button className="glossary-toggle" onClick={toggleGlossary}>
                      {showGlossary ? 'Hide Genetic Glossary' : 'View Key Genetic Glossary Terms'}
                    </button>
                    {showGlossary && (
                      <div className="glossary-grid">
                        {glossaryTerms.map((term, index) => (
                          <div key={index} className="glossary-item">
                            <h5 className="glossary-term">{term.term}</h5>
                            <p className="glossary-def">{term.definition}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="result-actions" style={{ marginTop: '24px' }}>
                    <button className="primary-button" onClick={closeSymptomChecker}>
                      Close Assessment
                    </button>
                    <button className="secondary-button" onClick={resetSymptomChecker}>
                      Restart Assessment
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer language={language} />
    </div>
  );
};

export default Disorders;