import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './GeneticAssessmentAI.css';

/* ─── Translations ───────────────────────────────────────────────────────────── */
const translations = {
  en: {
    nav: { learn: 'Learn Genetics', disorders: 'Genetic Disorders', counselling: 'Counselling', assessment: 'Genetic Assessment AI', dna: 'DNA Testing', about: 'About Us', login: 'Login', signup: 'Sign Up' },
    hero: { badge: 'AI-Powered Genetic Analysis', title: 'Your Personal AI Genetic Advisor', subtitle: 'Ask questions about your genetic profile, DNA test results, health risks, and family history. Our AI advisor combines your intake data with agent analysis to deliver personalized insights.', startChat: '💬 Start AI Chat', viewDash: '📊 View Dashboard', editIntake: '← Edit Intake Form', openAgents: 'Open Agent Dashboard' },
    tabs: { profile: 'Patient Profile', results: 'Agent Results', history: 'Chat History' },
    profile: { noData: 'Complete your health intake form first to unlock personalized AI advice.', goIntake: 'Go to Intake Form' },
    agents: { noData: 'Run your DNA agents first to see results here.', goAgents: 'Open Agent Dashboard' },
    history: { messages: 'Messages', duration: 'Duration', clear: 'Clear History', noHistory: 'Chat history is managed by the AI assistant. Click the chat bubble below to start a conversation!' },
    chat: { title: 'Gene Guard AI', subtitle: 'Personal Genetic Advisor', placeholder: 'Ask about your genetic profile…', welcome: 'Hi! I\'m your Gene Guard AI advisor.' },
    chips: ['What are my genetic risks?', 'Explain my agent results', 'What should I discuss with my doctor?'],
    disclaimer: '⚕️ Gene Guard AI provides educational information only and is not a substitute for professional medical advice. Always consult a qualified healthcare provider.',
    footer: { tagline: 'Empowering genetic awareness through accessible education, advanced AI assessment, and personalized insights.', platform: 'PLATFORM', services: 'SERVICES', company: 'COMPANY', legal: 'LEGAL' },
  },
  hi: {
    nav: { learn: 'आनुवंशिकी सीखें', disorders: 'आनुवंशिक विकार', counselling: 'परामर्श', assessment: 'AI आनुवंशिक मूल्यांकन', dna: 'डीएनए परीक्षण', about: 'हमारे बारे में', login: 'लॉगिन', signup: 'साइन अप' },
    hero: { badge: 'AI-संचालित आनुवंशिक विश्लेषण', title: 'आपका व्यक्तिगत AI आनुवंशिक सलाहकार', subtitle: 'अपने आनुवंशिक प्रोफ़ाइल, डीएनए परीक्षण परिणामों, स्वास्थ्य जोखिमों और पारिवारिक इतिहास के बारे में प्रश्न पूछें।', startChat: '💬 AI चैट शुरू करें', viewDash: '📊 डैशबोर्ड देखें', editIntake: '← इनटेक फॉर्म', openAgents: 'एजेंट डैशबोर्ड' },
    tabs: { profile: 'रोगी प्रोफ़ाइल', results: 'एजेंट परिणाम', history: 'चैट इतिहास' },
    profile: { noData: 'व्यक्तिगत AI सलाह के लिए पहले अपना स्वास्थ्य इनटेक फॉर्म भरें।', goIntake: 'इनटेक फॉर्म पर जाएं' },
    agents: { noData: 'परिणाम देखने के लिए पहले अपने DNA एजेंट चलाएं।', goAgents: 'एजेंट डैशबोर्ड खोलें' },
    history: { messages: 'संदेश', duration: 'अवधि', clear: 'इतिहास साफ़ करें', noHistory: 'चैट इतिहास AI सहायक द्वारा प्रबंधित किया जाता है। बातचीत शुरू करने के लिए चैट बबल पर क्लिक करें!' },
    chat: { title: 'Gene Guard AI', subtitle: 'व्यक्तिगत आनुवंशिक सलाहकार', placeholder: 'अपने आनुवंशिक प्रोफ़ाइल के बारे में पूछें…', welcome: 'नमस्ते! मैं आपका Gene Guard AI सलाहकार हूं।' },
    chips: ['मेरे आनुवंशिक जोखिम क्या हैं?', 'मेरे एजेंट परिणाम समझाएं', 'मुझे डॉक्टर से क्या चर्चा करनी चाहिए?'],
    disclaimer: '⚕️ Gene Guard AI केवल शैक्षिक जानकारी प्रदान करता है। हमेशा योग्य चिकित्सक से परामर्श लें।',
    footer: { tagline: 'सुलभ शिक्षा और उन्नत AI मूल्यांकन के माध्यम से आनुवंशिक जागरूकता।', platform: 'प्लेटफ़ॉर्म', services: 'सेवाएं', company: 'कंपनी', legal: 'कानूनी' },
  },
  mr: {
    nav: { learn: 'अनुवंशशास्त्र शिका', disorders: 'अनुवांशिक विकार', counselling: 'समुपदेशन', assessment: 'AI अनुवांशिक मूल्यमापन', dna: 'DNA चाचणी', about: 'आमच्याबद्दल', login: 'लॉगिन', signup: 'साइन अप' },
    hero: { badge: 'AI-चालित अनुवांशिक विश्लेषण', title: 'तुमचा वैयक्तिक AI अनुवांशिक सल्लागार', subtitle: 'तुमच्या अनुवांशिक प्रोफाइल, DNA चाचणी निकाल, आरोग्य धोके आणि कौटुंबिक इतिहासाबद्दल प्रश्न विचारा.', startChat: '💬 AI चॅट सुरू करा', viewDash: '📊 डॅशबोर्ड पहा', editIntake: '← इनटेक फॉर्म', openAgents: 'एजंट डॅशबोर्ड' },
    tabs: { profile: 'रुग्ण प्रोफाइल', results: 'एजंट निकाल', history: 'चॅट इतिहास' },
    profile: { noData: 'वैयक्तिक AI सल्ल्यासाठी प्रथम तुमचा आरोग्य इनटेक फॉर्म भरा.', goIntake: 'इनटेक फॉर्मवर जा' },
    agents: { noData: 'निकाल पाहण्यासाठी प्रथम DNA एजंट चालवा.', goAgents: 'एजंट डॅशबोर्ड उघडा' },
    history: { messages: 'संदेश', duration: 'कालावधी', clear: 'इतिहास साफ करा', noHistory: 'चॅट इतिहास AI सहाय्यकाद्वारे व्यवस्थापित केला जातो. संभाषण सुरू करण्यासाठी चॅट बबलवर क्लिक करा!' },
    chat: { title: 'Gene Guard AI', subtitle: 'वैयक्तिक अनुवांशिक सल्लागार', placeholder: 'तुमच्या अनुवांशिक प्रोफाइलबद्दल विचारा…', welcome: 'नमस्कार! मी तुमचा Gene Guard AI सल्लागार आहे.' },
    chips: ['माझे अनुवांशिक धोके काय आहेत?', 'माझे एजंट निकाल समजावा', 'मी डॉक्टरांशी काय चर्चा करावी?'],
    disclaimer: '⚕️ Gene Guard AI केवळ शैक्षणिक माहिती देते. नेहमी पात्र आरोग्यसेवा प्रदात्याशी सल्लामसलत करा.',
    footer: { tagline: 'सुलभ शिक्षण आणि प्रगत AI मूल्यमापनाद्वारे अनुवांशिक जागरूकता.', platform: 'प्लॅटफॉर्म', services: 'सेवा', company: 'कंपनी', legal: 'कायदेशीर' },
  },
  te: {
    nav: { learn: 'జెనెటిక్స్ నేర్చుకోండి', disorders: 'జన్యు వ్యాధులు', counselling: 'కౌన్సెలింగ్', assessment: 'AI జన్యు మూల్యాంకనం', dna: 'DNA పరీక్ష', about: 'మా గురించి', login: 'లాగిన్', signup: 'సైన్ అప్' },
    hero: { badge: 'AI-ఆధారిత జన్యు విశ్లేషణ', title: 'మీ వ్యక్తిగత AI జన్యు సలహాదారు', subtitle: 'మీ జన్యు ప్రొఫైల్, DNA పరీక్ష ఫలితాలు, ఆరోగ్య ప్రమాదాలు మరియు కుటుంబ చరిత్ర గురించి ప్రశ్నలు అడగండి.', startChat: '💬 AI చాట్ ప్రారంభించండి', viewDash: '📊 డాష్‌బోర్డ్ చూడండి', editIntake: '← ఇన్‌టేక్ ఫారమ్', openAgents: 'ఏజెంట్ డాష్‌బోర్డ్' },
    tabs: { profile: 'రోగి ప్రొఫైల్', results: 'ఏజెంట్ ఫలితాలు', history: 'చాట్ చరిత్ర' },
    profile: { noData: 'వ్యక్తిగత AI సలహా కోసం ముందుగా మీ ఆరోగ్య ఇన్‌టేక్ ఫారమ్ పూర్తి చేయండి.', goIntake: 'ఇన్‌టేక్ ఫారమ్‌కు వెళ్ళండి' },
    agents: { noData: 'ఫలితాలు చూడటానికి ముందుగా మీ DNA ఏజెంట్‌లను అమలు చేయండి.', goAgents: 'ఏజెంట్ డాష్‌బోర్డ్ తెరవండి' },
    history: { messages: 'సందేశాలు', duration: 'వ్యవధి', clear: 'చరిత్ర తుడిచివేయండి', noHistory: 'చాట్ చరిత్ర AI సహాయకుడు నిర్వహిస్తారు. సంభాషణ ప్రారంభించడానికి చాట్ బబుల్ క్లిక్ చేయండి!' },
    chat: { title: 'Gene Guard AI', subtitle: 'వ్యక్తిగత జన్యు సలహాదారు', placeholder: 'మీ జన్యు ప్రొఫైల్ గురించి అడగండి…', welcome: 'నమస్కారం! నేను మీ Gene Guard AI సలహాదారుడిని.' },
    chips: ['నా జన్యు ప్రమాదాలు ఏమిటి?', 'నా ఏజెంట్ ఫలితాలు వివరించండి', 'నేను డాక్టర్‌తో ఏమి చర్చించాలి?'],
    disclaimer: '⚕️ Gene Guard AI విద్యా సమాచారం మాత్రమే అందిస్తుంది. ఎల్లప్పుడూ అర్హత కలిగిన వైద్యుడిని సంప్రదించండి.',
    footer: { tagline: 'అందుబాటులో ఉన్న విద్య మరియు అధునాతన AI మూల్యాంకనం ద్వారా జన్యు అవగాహన.', platform: 'ప్లాట్‌ఫారమ్', services: 'సేవలు', company: 'కంపెనీ', legal: 'చట్టపరమైన' },
  },
};


/* ─── Component ──────────────────────────────────────────────────────────────── */
const GeneticAssessmentAI = () => {
  // Language
  const [language, setLanguage] = useState('en');
  const t = translations[language];

  // Patient & agent data
  const [patient, setPatient] = useState(null);
  const [agentResults, setAgentResults] = useState(null);
  const [patientLoaded, setPatientLoaded] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('profile');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Botpress state
  const [botpressReady, setBotpressReady] = useState(false);
  const botpressInitRef = useRef(false);

  const dropdownRef = useRef(null);
  const dashboardRef = useRef(null);

  // ── Navbar scroll + click outside ──
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsProfileOpen(false);
    };
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => { window.removeEventListener('scroll', handleScroll); document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  // ── Load context layers on mount ──
  useEffect(() => {
    const saved = localStorage.getItem('geneGuardPatientProfile');
    if (saved) { try { setPatient(JSON.parse(saved)); } catch (e) { console.warn('Failed to parse patient profile:', e); } }
    setPatientLoaded(true);
    const savedAgents = localStorage.getItem('geneGuardAgentResults');
    if (savedAgents) { try { setAgentResults(JSON.parse(savedAgents)); } catch (e) { console.warn('Failed to parse agent results:', e); } }
  }, []);

  // ── Botpress: Load embed script on mount ──
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.botpress.cloud/webchat/v2.2/inject.js';
    script.async = true;
    script.onload = () => {
      setBotpressReady(true);
      console.log('[GeneticAI] ✓ Botpress script loaded');
    };
    script.onerror = () => {
      console.error('[GeneticAI] ✗ Failed to load Botpress script');
    };
    document.body.appendChild(script);

    return () => {
      // Clean up on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      const bpContainer = document.getElementById('bp-web-widget-container');
      if (bpContainer) bpContainer.remove();
      const bpWidget = document.getElementById('bp-web-widget');
      if (bpWidget) bpWidget.remove();
    };
  }, []);

  // ── Botpress: Initialize with user context once script + patient data are ready ──
  useEffect(() => {
    if (!botpressReady || !patientLoaded || botpressInitRef.current) return;

    try {
      window.botpress?.init({
        botId: 'BOTPRESS_BOT_ID_PLACEHOLDER',
        clientId: 'BOTPRESS_CLIENT_ID_PLACEHOLDER',
        userData: {
          name: patient?.fullName || 'User',
          age: patient?.age,
          bloodGroup: patient?.bloodGroup,
          conditions: patient?.knownDisorder,
          agentResults: JSON.stringify(agentResults || {})
        }
      });
      botpressInitRef.current = true;
      console.log('[GeneticAI] ✓ Botpress initialized with patient context');
    } catch (err) {
      console.error('[GeneticAI] ✗ Botpress init failed:', err.message);
    }
  }, [botpressReady, patientLoaded, patient, agentResults]);

  // ── Open Botpress chat ──
  const openBotpressChat = useCallback(() => {
    try {
      window.botpress?.open();
    } catch (err) {
      console.error('[GeneticAI] ✗ Failed to open Botpress:', err.message);
    }
  }, []);

  const scrollToDashboard = useCallback(() => {
    dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const hasIntake = !!patient;
  const hasAgents = agentResults && Object.keys(agentResults).length > 0;
  const agentCount = hasAgents ? Object.keys(agentResults).length : 0;
  const currentYear = new Date().getFullYear();

  // Profile fields to display
  const profileFields = patient ? [
    ['Full Name', patient.fullName], ['Age', patient.age], ['Sex', patient.sex],
    ['Blood Group', patient.bloodGroup], ['Family History', patient.familyHistory],
    ['Known Disorder', patient.knownDisorder], ['Symptoms', patient.symptoms],
    ['Purpose', patient.purpose], ['Medications', patient.medications],
    ['Allergies', patient.allergies], ['Location', patient.location],
    ['Consulted Doctor', patient.consultedDoctor],
  ].filter(([, v]) => v) : [];



  return (
    <div className="ga-page">
      {/* ── Particles ── */}
      <div className="ga-bg-particles">
        <div className="ga-particle" /><div className="ga-particle" /><div className="ga-particle" /><div className="ga-particle" />
        <div className="ga-helix-ring" /><div className="ga-helix-ring" />
      </div>

      {/* ── Navbar ── */}
      <nav className={`ga-navbar ${isScrolled ? 'ga-navbar-scrolled' : ''}`}>
        <div className="ga-nav-content">
          <Link to="/home" className="ga-nav-logo">
            <div className="ga-logo-circle" />
            <span className="ga-logo-brand">Gene Guard</span>
          </Link>

          <div className="ga-nav-right">
            <div className="ga-nav-links">
              <Link to="/learn-genetics" className="ga-nav-link">{t.nav.learn}</Link>
              <Link to="/genetic-disorders" className="ga-nav-link">{t.nav.disorders}</Link>
              <Link to="/counselling" className="ga-nav-link">{t.nav.counselling}</Link>
              <Link to="/genetic-assessment" className="ga-nav-link active">{t.nav.assessment}</Link>
              <Link to="/dna" className="ga-nav-link">{t.nav.dna}</Link>
              <Link to="/about" className="ga-nav-link">{t.nav.about}</Link>
            </div>

            <div className="ga-lang-buttons">
              {['en', 'hi', 'mr', 'te'].map((code, i) => (
                <button
                  key={code}
                  className={`ga-lang-btn ${language === code ? 'active' : ''}`}
                  onClick={() => setLanguage(code)}
                >
                  {['EN', 'हिं', 'मर', 'తె'][i]}
                </button>
              ))}
            </div>

            <button
              className={`ga-hamburger ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>

            <div className="ga-profile-container" ref={dropdownRef}>
              <button
                className={`ga-profile-trigger ${isProfileOpen ? 'active' : ''}`}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="User Profile"
              >
                <svg className="ga-profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {isProfileOpen && (
                <div className="ga-profile-dropdown">
                  <Link to="/login" className="ga-dropdown-item" onClick={() => setIsProfileOpen(false)}>{t.nav.login}</Link>
                  <Link to="/signup" className="ga-dropdown-item" onClick={() => setIsProfileOpen(false)}>{t.nav.signup}</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="ga-mobile-overlay">
          <Link to="/learn-genetics" className="ga-nav-link" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.learn}</Link>
          <Link to="/genetic-disorders" className="ga-nav-link" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.disorders}</Link>
          <Link to="/counselling" className="ga-nav-link" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.counselling}</Link>
          <Link to="/genetic-assessment" className="ga-nav-link active" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.assessment}</Link>
          <Link to="/dna" className="ga-nav-link" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.dna}</Link>
          <Link to="/about" className="ga-nav-link" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.about}</Link>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="ga-hero">
        <div className="ga-hero-inner">
          <div className="ga-badge"><span className="ga-badge-dot" /> {t.hero.badge}</div>
          {patient?.fullName && (
            <p className="ga-hero-greeting">Hello, {patient.fullName.split(' ')[0]} 👋</p>
          )}
          <h1>{t.hero.title}</h1>
          <p className="ga-hero-subtitle">{t.hero.subtitle}</p>
          <div className="ga-hero-actions">
            <button className="ga-primary-btn" onClick={openBotpressChat}>{t.hero.startChat}</button>
            <button className="ga-outline-btn" onClick={scrollToDashboard}>{t.hero.viewDash}</button>
            <Link to="/dna/patient-intake" className="ga-outline-btn">{t.hero.editIntake}</Link>
            <Link to="/dna/agents" className="ga-outline-btn">{t.hero.openAgents}</Link>
          </div>
          <div className="ga-context-strip">
            <div className={`ga-context-chip ${hasIntake ? 'active' : 'inactive'}`}>
              <span className={`ga-chip-dot ${hasIntake ? 'green' : 'gray'}`} />
              {hasIntake ? `Patient: ${patient.fullName || 'Loaded'}` : 'No intake data'}
            </div>
            <div className={`ga-context-chip ${hasAgents ? 'active' : 'inactive'}`}>
              <span className={`ga-chip-dot ${hasAgents ? 'green' : 'gray'}`} />
              {hasAgents ? `${agentCount} agent result${agentCount > 1 ? 's' : ''} loaded` : 'No agent results'}
            </div>
            <div className={`ga-context-chip ${botpressReady ? 'active' : 'inactive'}`}>
              <span className={`ga-chip-dot ${botpressReady ? 'green' : 'amber'}`} />
              {botpressReady ? 'AI Chat ready' : 'AI Chat loading…'}
            </div>
          </div>
        </div>
      </section>

      {/* ── Dashboard ── */}
      <section className="ga-dashboard" ref={dashboardRef}>
        <div className="ga-tab-bar">
          <button className={`ga-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 {t.tabs.profile}</button>
          <button className={`ga-tab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>🧬 {t.tabs.results}</button>
          <button className={`ga-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>💬 {t.tabs.history}</button>
        </div>

        <div className="ga-tab-content">
          {activeTab === 'profile' && (
            hasIntake ? (
              <div className="ga-profile-grid">
                {profileFields.map(([label, value]) => (
                  <div className="ga-profile-field" key={label}>
                    <label>{label}</label>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ga-empty-state">
                <span className="ga-empty-icon">📋</span>
                <p>{t.profile.noData}</p>
                <Link to="/dna/patient-intake">{t.profile.goIntake} →</Link>
              </div>
            )
          )}

          {activeTab === 'results' && (
            hasAgents ? (
              <div className="ga-agent-list">
                {Object.entries(agentResults).map(([agentId, result]) => (
                  <div className="ga-agent-card" key={agentId}>
                    <div className="ga-agent-card-header">
                      <h4>{result.title || agentId}</h4>
                      <span className={`ga-agent-status ${result.status === 'completed' ? 'completed' : 'pending'}`}>
                        {result.status || 'completed'}
                      </span>
                    </div>
                    {result.summary && <p className="ga-agent-summary">{result.summary}</p>}
                    {Array.isArray(result.highlights) && result.highlights.length > 0 && (
                      <ul className="ga-agent-highlights">
                        {result.highlights.map((h, i) => (
                          <li key={i}>{typeof h === 'string' ? h : `${h.label}: ${h.value}`}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="ga-empty-state">
                <span className="ga-empty-icon">🧬</span>
                <p>{t.agents.noData}</p>
                <Link to="/dna/agents">{t.agents.goAgents} →</Link>
              </div>
            )
          )}

          {activeTab === 'history' && (
            <div className="ga-empty-state">
              <span className="ga-empty-icon">💬</span>
              <p>{t.history.noHistory}</p>
              <button className="ga-primary-btn" onClick={openBotpressChat} style={{marginTop: '1rem', fontSize: '.9rem'}}>
                💬 Open AI Chat
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <section className="ga-disclaimer"><p>{t.disclaimer}</p></section>

      {/* ── Footer ── */}
      <footer className="ga-footer">
        <div className="ga-footer-container">
          <div className="ga-footer-top">
            <div className="ga-footer-brand">
              <Link to="/" className="ga-footer-logo">
                <div className="ga-footer-logo-circle" />
                <span className="ga-footer-logo-text">GeneGuard</span>
              </Link>
              <p className="ga-footer-tagline">{t.footer.tagline}</p>
              <div className="ga-footer-social">
                <a href="https://twitter.com" className="ga-social-link" aria-label="Twitter" target="_blank" rel="noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://linkedin.com" className="ga-social-link" aria-label="LinkedIn" target="_blank" rel="noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://github.com" className="ga-social-link" aria-label="GitHub" target="_blank" rel="noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>
            <div className="ga-footer-links-grid">
              <div>
                <h3 className="ga-footer-col-title">{t.footer.platform}</h3>
                <ul className="ga-footer-ul">
                  <li><Link to="/learn-genetics">{t.nav.learn}</Link></li>
                  <li><Link to="/genetic-disorders">{t.nav.disorders}</Link></li>
                  <li><Link to="/counselling">{t.nav.counselling}</Link></li>
                  <li><Link to="/genetic-assessment">{t.nav.assessment}</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="ga-footer-col-title">{t.footer.services}</h3>
                <ul className="ga-footer-ul">
                  <li><Link to="/dna">{t.nav.dna}</Link></li>
                  <li><a href="#reports">Reports &amp; Insights</a></li>
                  <li><a href="#consultation">Consultations</a></li>
                  <li><a href="#research">Research</a></li>
                </ul>
              </div>
              <div>
                <h3 className="ga-footer-col-title">{t.footer.company}</h3>
                <ul className="ga-footer-ul">
                  <li><Link to="/about">{t.nav.about}</Link></li>
                  <li><a href="#team">Our Team</a></li>
                  <li><a href="#careers">Careers</a></li>
                  <li><a href="#contact">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="ga-footer-col-title">{t.footer.legal}</h3>
                <ul className="ga-footer-ul">
                  <li><a href="#privacy">Privacy Policy</a></li>
                  <li><a href="#terms">Terms of Service</a></li>
                  <li><a href="#hipaa">HIPAA Compliance</a></li>
                  <li><a href="#cookies">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="ga-footer-divider" />
          <div className="ga-footer-bottom">
            <p className="ga-footer-copyright">© {currentYear} GeneGuard. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ── Chat Orb — triggers Botpress ── */}
      <button className="ga-chat-orb" onClick={openBotpressChat} aria-label="Open AI Chat" id="ga-chat-bubble">
        <div className="ga-orb-ring">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <span className="ga-orb-label">{botpressReady ? 'AI Chat' : 'Loading…'}</span>
      </button>
    </div>
  );
};

export default GeneticAssessmentAI;
