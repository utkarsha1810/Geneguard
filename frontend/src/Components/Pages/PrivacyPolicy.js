import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
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
          <div className="policy-badge">Compliance & Privacy Protocol</div>
          <h1>Privacy Policy & Data Protection</h1>
          <p className="policy-subtitle">Last updated: October 2026 • Version 3.4</p>
          
          <div className="policy-section">
            <h2>1. Commitment to Genomic Privacy</h2>
            <p>
              GeneGuard adheres to the highest international standards of genetic and health data protection. Your genomic data, personal identifiers, and consultation history are safeguarded using AES-256 encryption at rest and TLS 1.3 encryption in transit.
            </p>
          </div>

          <div className="policy-section">
            <h2>2. Information We Collect</h2>
            <ul>
              <li><strong>Account Identifiers:</strong> Name, contact email, phone number, and verified date of birth.</li>
              <li><strong>Genomic & Clinical Data:</strong> Raw VCF sequences, uploaded variant reports, and clinical consultation records.</li>
              <li><strong>Security Audit Trails:</strong> Authentication timestamps, IP logs for session tracking, and device security signatures.</li>
            </ul>
          </div>

          <div className="policy-section">
            <h2>3. Zero Commercial Monetization</h2>
            <p>
              GeneGuard will never sell, lease, or monetize your genomic or personal health data to pharmaceutical sponsors, advertising networks, or third-party aggregators.
            </p>
          </div>

          <div className="policy-section">
            <h2>4. Your Data Rights</h2>
            <p>
              You maintain total ownership of your genetic files. You may request data export in standardized formats or permanent deletion of your account and biological markers at any time through Account Settings.
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

export default PrivacyPolicy;
