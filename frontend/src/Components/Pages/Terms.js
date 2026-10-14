import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './PrivacyPolicy.css';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="policy-page">
      <header className="policy-header">
        <div className="policy-header-content">
          <div className="policy-logo" onClick={() => navigate('/home')}>
            <span className="policy-logo-icon">🧬</span>
            <span className="policy-logo-brand">GeneGuard</span>
          </div>
          <Link to="/signup" className="policy-back-btn">← Back to Registration</Link>
        </div>
      </header>

      <main className="policy-container">
        <div className="policy-card">
          <div className="policy-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
            HIPAA Security Rule & Terms
          </div>
          <h1>HIPAA Compliance & Terms of Service</h1>
          <p className="policy-subtitle">Last updated: October 2026 • Patient Rights Agreement</p>
          
          <div className="policy-section">
            <h2>1. Protected Health Information (PHI)</h2>
            <p>
              In accordance with the Health Insurance Portability and Accountability Act (HIPAA), GeneGuard treats all genetic variant records, health history, diagnostic intake summaries, and consultation audio/video sessions as Protected Health Information.
            </p>
          </div>

          <div className="policy-section">
            <h2>2. Technical Safeguards</h2>
            <ul>
              <li><strong>End-to-End Encryption:</strong> All genomic files are partitioned and encrypted with unique user-specific keys.</li>
              <li><strong>Multi-Factor Authentication:</strong> Two-step OTP verification on every login to prevent unauthorized access.</li>
              <li><strong>Automatic Inactivity Timeout:</strong> Unattended sessions automatically expire after 15 minutes to prevent unauthorized viewing.</li>
              <li><strong>Server-Side Invalidation:</strong> Global session termination capability enables instant revocation across all devices.</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>3. Consent to AI Genetic Assessment</h2>
            <p>
              You acknowledge that GeneGuard’s AI assistants and DNA analysis agents provide educational risk stratification and report interpretation to assist clinical geneticists. They do not replace a licensed clinical diagnosis.
            </p>
          </div>

          <div className="policy-footer-action">
            <button type="button" className="policy-btn" onClick={() => window.close() || navigate('/signup')}>
              Understood & Close
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Terms;
