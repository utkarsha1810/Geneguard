import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import bgImage from "../images/geneguardbg.png";
import "./LearningHub.css";

const rawApiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5050/api').replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const CONDITIONS = [
  "Breast Cancer (BRCA-related)",
  "Ovarian Cancer",
  "Colorectal Cancer (Lynch Syndrome)",
  "Thalassemia",
  "Sickle Cell Disease",
  "Cystic Fibrosis",
  "Huntington's Disease",
  "Muscular Dystrophy",
  "Hemophilia",
  "Familial Hypercholesterolemia",
  "Psoriasis (Family History)",
  "Type 2 Diabetes (Family History)",
]

const LEARNING_INTERESTS = [
  "Learning Recommendation",
  "Genetic Testing",
  "Family History",
  "Preventive Care",
  "Lifestyle Advice",
  "Report Explanation",
  "Disease Information",
]

const getLearningRecommendations = async (data) => {
  const response = await fetch(`${API_BASE_URL}/learning-recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API error: ${response.status}`)
  }
  return response.json()
}

function LearningHub() {
  const [condition, setCondition] = useState(CONDITIONS[0])
  const [interest, setInterest] = useState("Learning Recommendation")
  const [viewedTopic, setViewedTopic] = useState("")
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  // Navbar and responsive menu state
  const [language, setLanguage] = useState("eng")
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setRecommendations([])
    setSubmitted(false)
    try {
      const result = await getLearningRecommendations({
        disease_category: condition,
        ai_query_category: interest,
        learning_topic_viewed: viewedTopic.trim(),
        top_n: 3,
      })
      setRecommendations(result.recommendations || [])
      setSubmitted(true)
    } catch (err) {
      setError(err.message || "Unable to load recommendations. Please check that the API is running.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="learning-hub-page-wrapper">
      {/* Navbar */}
      <nav className={`dna-main-navbar ${isScrolled ? 'dna-navbar-scrolled' : ''}`}>
        <div className="dna-nav-content">
          <Link to="/home" className="dna-nav-logo" style={{ textDecoration: 'none' }}>
            <div className="dna-logo-circle" />
            <span className="dna-logo-brand">Gene Guard</span>
          </Link>

          <div className="dna-nav-right-section">
            <div className="dna-nav-links">
              <Link to="/learn-genetics" className="dna-nav-link">Learn Genetics</Link>
              <Link to="/genetic-disorders" className="dna-nav-link">Genetic Disorders</Link>
              <Link to="/counselling" className="dna-nav-link">Counselling</Link>
              <Link to="/learning-hub" className="dna-nav-link active">Learning Hub</Link>
              <Link to="/dna" className="dna-nav-link">DNA Testing</Link>
              <Link to="/about" className="dna-nav-link">About Us</Link>
            </div>

            <div className="dna-language-buttons">
              {['eng', 'hin', 'mar', 'tel'].map((code, i) => (
                <button
                  key={code}
                  className={`dna-lang-btn ${language === code ? 'active' : ''}`}
                  onClick={() => setLanguage(code)}
                >
                  {['EN', 'हिं', 'मर', 'తె'][i]}
                </button>
              ))}
            </div>

            <button
              className={`dna-hamburger-menu ${isMobileMenuOpen ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              <span className="dna-hamburger-line" />
              <span className="dna-hamburger-line" />
              <span className="dna-hamburger-line" />
            </button>

            <div className="dna-profile-container" ref={dropdownRef}>
              <button
                className={`dna-profile-trigger ${isProfileOpen ? 'active' : ''}`}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="User Profile"
              >
                <svg className="dna-profile-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {isProfileOpen && (
                <div className="dna-profile-dropdown">
                  <Link to="/login" className="dna-dropdown-item" onClick={() => setIsProfileOpen(false)}>Login</Link>
                  <Link to="/signup" className="dna-dropdown-item" onClick={() => setIsProfileOpen(false)}>Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="dna-mobile-menu-overlay">
          <Link to="/learn-genetics" className="dna-nav-link" onClick={handleLinkClick}>Learn Genetics</Link>
          <Link to="/genetic-disorders" className="dna-nav-link" onClick={handleLinkClick}>Genetic Disorders</Link>
          <Link to="/counselling" className="dna-nav-link" onClick={handleLinkClick}>Counselling</Link>
          <Link to="/learning-hub" className="dna-nav-link active" onClick={handleLinkClick}>Learning Hub</Link>
          <Link to="/dna" className="dna-nav-link" onClick={handleLinkClick}>DNA Testing</Link>
          <Link to="/about" className="dna-nav-link" onClick={handleLinkClick}>About Us</Link>
        </div>
      )}

      {/* Main Content */}
      <main style={styles.page}>
        <section style={styles.hero}>
          <h1 style={styles.title}>Your Genetic Learning Journey</h1>
          <p style={styles.subtitle}>
            Discover educational resources selected according to your learning interests and the topic you want to understand.
          </p>
        </section>

        <section style={styles.formCard}>
          <h2 style={styles.sectionTitle}>Personalize your learning</h2>
          <p style={styles.muted}>Choose a topic to receive three educational recommendations.</p>

          <form onSubmit={handleSubmit}>
            <label style={styles.label} htmlFor="condition">Genetic condition or area of interest</label>
            <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)} style={styles.input} required>
              {CONDITIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <label style={styles.label} htmlFor="interest">What would you like to learn about?</label>
            <select id="interest" value={interest} onChange={(e) => setInterest(e.target.value)} style={styles.input}>
              {LEARNING_INTERESTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <label style={styles.label} htmlFor="viewedTopic">Previously viewed learning topic (optional)</label>
            <input id="viewedTopic" type="text" value={viewedTopic} onChange={(e) => setViewedTopic(e.target.value)} placeholder="e.g. Genetic Testing" style={styles.input} />

            <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1, cursor: loading ? "wait" : "pointer" }}>
              {loading ? "Finding resources..." : "Get Recommendations"}
            </button>
          </form>

          {error && <div role="alert" style={styles.error}>{error}</div>}
        </section>

        {loading && <p role="status" style={styles.status}>Finding learning resources for you...</p>}

        {submitted && !loading && (
          <section style={styles.results}>
            <h2 style={styles.sectionTitle}>Your recommended resources</h2>
            {recommendations.length === 0 ? (
              <p>No recommendations were returned. Try another learning interest.</p>
            ) : (
              <div style={styles.grid}>
                {recommendations.map((item, index) => (
                  <article key={`${item.Topic_ID || item.Learning_Topic}-${index}`} style={styles.card}>
                    <div style={styles.cardTop}>
                      <span style={styles.number}>0{index + 1}</span>
                      <span style={styles.difficulty}>{item.Difficulty || "Learning resource"}</span>
                    </div>
                    <h3 style={styles.cardTitle}>{item.Learning_Topic}</h3>
                    <p style={styles.category}>{item.Category || "Genetics Education"}</p>
                    <p style={styles.description}>{item.Description || "Explore this topic to build your understanding."}</p>
                    {item.Score !== undefined && <p style={styles.score}>Recommendation score: {item.Score}</p>}
                    <div style={styles.resource}>
                      <span style={styles.resourceLabel}>RESOURCE</span>
                      <p style={styles.resourceName}>{item.Resource_Name || "Educational resource"}</p>
                      {item.Resource_URL && (() => {
                        try {
                          const url = new URL(item.Resource_URL)
                          if (url.protocol !== "https:" && url.protocol !== "http:") return null
                          return <a href={url.href} target="_blank" rel="noopener noreferrer" style={styles.link}>Explore resource ↗</a>
                        } catch { return null }
                      })()}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <p style={styles.disclaimer}>These recommendations are for educational purposes only. They do not establish a diagnosis or replace advice from a qualified healthcare professional.</p>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-bg-grid" />
        <div className="footer-gradient-orb" />

        <div className="footer-container">
          <div className="footer-top">
            {/* Brand Column */}
            <div className="footer-brand-section">
              <Link to="/home" className="footer-logo">
                <div className="footer-logo-circle"></div>
                <span className="footer-logo-text">GeneGuard</span>
              </Link>
              <p className="footer-tagline">
                Empowering genetic awareness through accessible education, advanced AI assessment, and personalized insights.
              </p>
              <div className="footer-social">
                <a href="https://twitter.com" className="social-link" aria-label="Twitter" target="_blank" rel="noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://linkedin.com" className="social-link" aria-label="LinkedIn" target="_blank" rel="noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="https://github.com" className="social-link" aria-label="GitHub" target="_blank" rel="noreferrer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Links Grid */}
            <div className="footer-links-grid">
              <div className="footer-column">
                <h4 className="footer-column-title">Platform</h4>
                <ul className="footer-links">
                  <li><Link to="/learn-genetics">Learn Genetics</Link></li>
                  <li><Link to="/genetic-disorders">Genetic Disorders</Link></li>
                  <li><Link to="/counselling">Genetic Counseling</Link></li>
                  <li><Link to="/learning-hub">Learning Hub</Link></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4 className="footer-column-title">Services</h4>
                <ul className="footer-links">
                  <li><Link to="/dna">DNA Testing</Link></li>
                  <li><a href="#reports">Reports & Insights</a></li>
                  <li><a href="#consultations">Consultations</a></li>
                  <li><a href="#research">Research</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4 className="footer-column-title">Company</h4>
                <ul className="footer-links">
                  <li><Link to="/about">About Us</Link></li>
                  <li><a href="#team">Our Team</a></li>
                  <li><a href="#careers">Careers</a></li>
                  <li><a href="#contact">Contact</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4 className="footer-column-title">Legal</h4>
                <ul className="footer-links">
                  <li><a href="#privacy">Privacy Policy</a></li>
                  <li><a href="#terms">Terms of Service</a></li>
                  <li><a href="#hipaa">HIPAA Compliance</a></li>
                  <li><a href="#cookies">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="footer-divider">
            <div className="divider-glow" />
          </div>

          {/* Bottom */}
          <div className="footer-bottom">
            <p className="footer-copyright">© 2026 GeneGuard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const styles = {
  page: {
    width: "100%",
    maxWidth: "none",
    boxSizing: "border-box",
    margin: 0,
    padding: "100px clamp(18px, 5vw, 76px) 80px",
    minHeight: "100vh",
    color: "#17354A",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    backgroundColor: "#F3FAF8",
    backgroundImage: `
      linear-gradient(
        rgba(247, 252, 250, 0.18),
        rgba(247, 252, 250, 0.30)
      ),
      url(${bgImage})
    `,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
  },
  hero: { width: "100%", maxWidth: "1100px", boxSizing: "border-box", margin: "0 auto 30px", padding: "clamp(30px, 5vw, 56px) 28px", textAlign: "center", background: "linear-gradient(135deg, rgba(255,255,255,0.48), rgba(224,247,244,0.32))", border: "1px solid rgba(255,255,255,0.72)", borderRadius: "28px", boxShadow: "0 18px 50px rgba(26,78,88,0.10)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" },
  title: { fontSize: "clamp(30px, 4.5vw, 52px)", lineHeight: 1.15, letterSpacing: "-1.5px", fontWeight: "800", margin: "12px 0 16px", color: "#173D4E" },
  subtitle: { maxWidth: "620px", margin: "0 auto", color: "#496775", fontSize: "16px", lineHeight: 1.8 },
  formCard: { width: "100%", maxWidth: "900px", boxSizing: "border-box", margin: "0 auto", padding: "clamp(24px, 4vw, 40px)", border: "1px solid rgba(255,255,255,0.65)", borderRadius: "24px", background: "linear-gradient(135deg, rgba(222,242,250,0.66), rgba(192,224,239,0.48))", boxShadow: "0 18px 50px rgba(29,78,100,0.14)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)" },
  sectionTitle: { fontSize: "clamp(23px, 3vw, 29px)", letterSpacing: "-0.6px", color: "#173D4E", marginTop: 0, marginBottom: "10px", fontWeight: "750" },
  muted: { color: "#607784", lineHeight: 1.8, fontSize: "14px" },
  label: { display: "block", color: "#284C5B", fontWeight: "700", marginTop: "23px", marginBottom: "10px", fontSize: "14px" },
  input: { display: "block", width: "100%", boxSizing: "border-box", minHeight: "52px", padding: "13px 16px", border: "1px solid #C8DDD9", borderRadius: "12px", background: "rgba(255,255,255,0.96)", color: "#17354A", fontSize: "15px", outlineColor: "#0D9488", boxShadow: "0 2px 6px rgba(23,61,78,0.04)" },
  button: { width: "100%", marginTop: "30px", padding: "16px 20px", border: "1px solid #0D9488", borderRadius: "12px", background: "linear-gradient(110deg, #0D9488, #14B8A6)", color: "#FFFFFF", fontSize: "15px", fontWeight: "800", letterSpacing: "0.3px", boxShadow: "0 8px 22px rgba(13,148,136,0.22)", transition: "opacity 0.2s ease, transform 0.2s ease" },
  error: { marginTop: "18px", padding: "14px 16px", border: "1px solid #FECACA", borderRadius: "12px", background: "#FFF1F2", color: "#9F1239", lineHeight: 1.6 },
  status: { textAlign: "center", padding: "28px 16px", color: "#087F72", fontWeight: "600" },
  results: { width: "100%", maxWidth: "1440px", boxSizing: "border-box", margin: "48px auto 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "22px", alignItems: "stretch" },
  card: { display: "flex", flexDirection: "column", minWidth: 0, padding: "27px", border: "1px solid rgba(255,255,255,0.95)", borderRadius: "22px", background: "rgba(255,255,255,0.88)", boxShadow: "0 14px 38px rgba(29,78,75,0.10)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", transition: "border-color 0.2s ease, transform 0.2s ease" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "20px" },
  number: { color: "#0D9488", fontWeight: "800", fontSize: "13px", letterSpacing: "1.5px" },
  difficulty: { background: "#E6F7F3", color: "#087F72", border: "1px solid #B8E6DB", borderRadius: "30px", padding: "7px 12px", fontSize: "12px", fontWeight: "700", textTransform: "capitalize" },
  cardTitle: { color: "#173D4E", fontSize: "22px", lineHeight: 1.4, letterSpacing: "-0.4px", margin: "0 0 12px", fontWeight: "750" },
  category: { color: "#087F72", fontSize: "11px", lineHeight: 1.6, fontWeight: "800", letterSpacing: "1.1px", textTransform: "uppercase", margin: "0 0 12px" },
  description: { color: "#526D7A", fontSize: "14px", lineHeight: 1.9, flexGrow: 1, margin: "0 0 20px" },
  score: { display: "inline-block", alignSelf: "flex-start", padding: "9px 12px", borderRadius: "10px", border: "1px solid #D5E8E3", background: "#F0F8F5", color: "#315D68", fontSize: "12px", fontWeight: "650", margin: "0 0 20px" },
  resource: { marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #DFECE8" },
  resourceLabel: { display: "block", fontSize: "10px", color: "#718A93", fontWeight: "800", letterSpacing: "1.7px", marginBottom: "9px" },
  resourceName: { color: "#234A59", fontSize: "14px", fontWeight: "700", lineHeight: 1.6, margin: "0 0 15px" },
  link: { display: "inline-flex", alignItems: "center", gap: "6px", color: "#087F72", fontSize: "14px", fontWeight: "750", textDecoration: "none", paddingBottom: "4px", borderBottom: "1px solid rgba(8,127,114,0.35)" },
  disclaimer: { marginTop: "30px", padding: "18px 20px", border: "1px solid rgba(255,255,255,0.90)", borderRadius: "14px", background: "rgba(255,255,255,0.78)", color: "#526D7A", fontSize: "12px", lineHeight: 1.9, boxShadow: "0 8px 24px rgba(29,78,75,0.06)" }
}

export default LearningHub
