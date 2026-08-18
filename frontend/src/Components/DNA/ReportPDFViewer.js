import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { dnaAgentConfigs } from '../../data/dnaAgents';
import './ReportPDFViewer.css';

/**
 * ReportPDFViewer — Full-screen clinical medical report preview and PDF generator.
 *
 * Props:
 *   isOpen          — boolean, controls visibility
 *   onClose         — callback to close modal
 *   patient         — patient profile object
 *   evaluation      — evaluation result from evaluatePatient()
 *   agentResults    — object keyed by agentId → output
 *   uploadedRecords — array of uploaded & parsed medical files
 *   intakeOnly      — if true, only renders Intake Summary (Pages 1–2)
 */
const ReportPDFViewer = ({
  isOpen,
  onClose,
  patient = {},
  evaluation = null,
  agentResults = {},
  uploadedRecords = [],
  intakeOnly = false,
}) => {
  const captureRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const timestamp = new Date().toLocaleString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const p = {
    fullName: patient.fullName || 'Guest Patient',
    age: patient.age || 'N/A',
    sex: patient.sex || 'N/A',
    bloodGroup: patient.bloodGroup || 'N/A',
    familyHistory: patient.familyHistory || 'No',
    familyMemberCount: patient.familyMemberCount || '0',
    familyMemberRelation: patient.familyMemberRelation || 'None reported',
    knownDisorder: patient.knownDisorder || 'None reported',
    symptoms: patient.symptoms || 'No symptoms',
    purpose: patient.purpose || 'General awareness',
    reportRisk: patient.reportRisk || 'Low',
    samplePreference: patient.samplePreference || 'Saliva Kit',
    fastingStatus: patient.fastingStatus || 'Yes',
    location: patient.location || 'Mumbai, India',
    emergencyContactName: patient.emergencyContactName || 'None listed',
    emergencyContact: patient.emergencyContact || 'None listed',
    consultedDoctor: patient.consultedDoctor || 'No',
    medications: patient.medications || 'None',
    allergies: patient.allergies || 'None reported',
    mobileNumber: patient.mobileNumber || 'Not provided',
    email: patient.email || 'Not provided',
  };

  const charts = evaluation?.charts || [];
  const riskLevel = (evaluation?.level || patient.reportRisk || 'Low').toLowerCase();

  const getRiskClass = (value) => {
    if (value >= 70) return 'risk-high';
    if (value >= 40) return 'risk-moderate';
    return 'risk-low';
  };

  const agentSections = dnaAgentConfigs.map((agent) => ({
    ...agent,
    result: agentResults[agent.id] || null,
  }));

  const allRecommendations = [];
  agentSections.forEach((agent) => {
    if (agent.result?.nextSteps) {
      agent.result.nextSteps.forEach((step) => allRecommendations.push(step));
    }
  });
  if (allRecommendations.length === 0) {
    allRecommendations.push(
      'Schedule a follow-up consultation with a board-certified Genetic Counselor.',
      'Provide 3-generation family health pedigree for comprehensive risk inheritance modeling.',
      'Maintain routine screening intervals according to standard clinical genomics guidelines.',
    );
  }

  const handleDownload = async () => {
    if (!captureRef.current || isDownloading) return;
    setIsDownloading(true);

    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 800,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let position = 0;
      let remaining = imgHeight;

      // First page
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Remaining pages
      while (remaining > pdfHeight) {
        position -= pdfHeight;
        remaining -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      }

      const cleanName = p.fullName.replace(/[^a-zA-Z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = intakeOnly
        ? `GeneGuard_Intake_Summary_${cleanName}_${dateStr}.pdf`
        : `GeneGuard_Clinical_Assessment_${cleanName}_${dateStr}.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const totalPages = intakeOnly ? 2 : uploadedRecords.length > 0 ? 5 : 4;

  /* ─────────────────────────────────────────────────────────────
     Clean A4 Clinical Medical Report Template
     White background, crisp borders, alternating row colors,
     running page numbers, and professional Arial typography.
     ───────────────────────────────────────────────────────────── */
  const ReportContent = () => (
    <div className="report-clinical-document">

      {/* ═══════════════════════════════════════════════════════════
          PAGE 1: COVER PAGE
          ═══════════════════════════════════════════════════════════ */}
      <div className="clinical-page page-cover">
        <div className="clinical-header-watermark">GENEGUARD CLINICAL GENOMICS</div>

        <div className="cover-center-branding">
          <div className="cover-logo-mark">
            <div className="logo-dna-circle"></div>
            <span className="logo-text">GeneGuard</span>
          </div>
          <span className="cover-department-tag">Department of AI-Assisted Clinical Genomics</span>
          <h1 className="cover-main-title">Genetic Assessment Report</h1>
          <p className="cover-doc-type">
            {intakeOnly ? 'PATIENT INTAKE & TRIAGE SUMMARY' : 'COMPREHENSIVE MULTI-AGENT GENOMIC ANALYSIS'}
          </p>
        </div>

        <div className="cover-patient-summary-card">
          <div className="card-heading-bar">PATIENT IDENTIFICATION</div>
          <div className="cover-grid-two-col">
            <div className="cover-field">
              <span className="label">Patient Name:</span>
              <span className="val bold">{p.fullName}</span>
            </div>
            <div className="cover-field">
              <span className="label">Assessment Date:</span>
              <span className="val">{timestamp}</span>
            </div>
            <div className="cover-field">
              <span className="label">Age / Sex:</span>
              <span className="val">{p.age} Years / {p.sex}</span>
            </div>
            <div className="cover-field">
              <span className="label">Blood Group:</span>
              <span className="val bold">{p.bloodGroup}</span>
            </div>
            <div className="cover-field">
              <span className="label">Primary Goal:</span>
              <span className="val">{p.purpose}</span>
            </div>
            <div className="cover-field">
              <span className="label">Triage Lane:</span>
              <span className={`val risk-indicator-text ${riskLevel}`}>{evaluation?.lane || 'Standard Review'}</span>
            </div>
          </div>
        </div>

        <div className="cover-disclaimer-box">
          <strong>LEGAL &amp; MEDICAL DISCLAIMER:</strong> This report is compiled by GeneGuard's computational intelligence system for clinical screening, educational context, and specialist decision support.
          It does not substitute for definitive in-vitro diagnostic assays, physical examinations, or certified medical genetics diagnosis. All findings must be reviewed with an attending geneticist.
        </div>

        <div className="clinical-page-footer">
          <span>CONFIDENTIAL MEDICAL RECORD · GENEGUARD AI</span>
          <span>Page 1 of {totalPages}</span>
        </div>
      </div>

      <hr className="page-delimiter" />

      {/* ═══════════════════════════════════════════════════════════
          PAGE 2: PATIENT PROFILE SUMMARY
          ═══════════════════════════════════════════════════════════ */}
      <div className="clinical-page">
        <div className="page-running-header">
          <span>GeneGuard Assessment Report</span>
          <span>Patient: {p.fullName}</span>
        </div>

        <h2 className="clinical-section-title">
          <span className="sec-num">1.</span> Patient Intake &amp; Identity Profile
        </h2>

        <table className="clinical-table">
          <tbody>
            <tr>
              <td className="field-name">Full Legal Name</td>
              <td className="field-val bold">{p.fullName}</td>
              <td className="field-name">Age / Sex</td>
              <td className="field-val">{p.age} / {p.sex}</td>
            </tr>
            <tr>
              <td className="field-name">Blood Group</td>
              <td className="field-val">{p.bloodGroup}</td>
              <td className="field-name">Location / Region</td>
              <td className="field-val">{p.location}</td>
            </tr>
            <tr>
              <td className="field-name">Mobile Phone</td>
              <td className="field-val">{p.mobileNumber}</td>
              <td className="field-name">Email Address</td>
              <td className="field-val">{p.email}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="clinical-section-title">
          <span className="sec-num">2.</span> Family History &amp; Clinical Indicators
        </h2>

        <table className="clinical-table zebra">
          <tbody>
            <tr>
              <td className="field-name">Family History of Genetic Disorder</td>
              <td className="field-val bold">{p.familyHistory}</td>
            </tr>
            <tr>
              <td className="field-name">Affected Family Member Count</td>
              <td className="field-val">{p.familyMemberCount}</td>
            </tr>
            <tr>
              <td className="field-name">Affected Family Member Relation</td>
              <td className="field-val">{p.familyMemberRelation}</td>
            </tr>
            <tr>
              <td className="field-name">Known Disorder in Family Lineage</td>
              <td className="field-val highlight-danger">{p.knownDisorder}</td>
            </tr>
            <tr>
              <td className="field-name">Current Symptoms / Clinical Presentation</td>
              <td className="field-val">{p.symptoms}</td>
            </tr>
            <tr>
              <td className="field-name">Primary Testing Purpose</td>
              <td className="field-val">{p.purpose}</td>
            </tr>
            <tr>
              <td className="field-name">Preferred Sample Collection</td>
              <td className="field-val">{p.samplePreference} (Fasting restrictions followed: {p.fastingStatus})</td>
            </tr>
            <tr>
              <td className="field-name">Current Medications</td>
              <td className="field-val">{p.medications}</td>
            </tr>
            <tr>
              <td className="field-name">Known Allergies</td>
              <td className="field-val">{p.allergies}</td>
            </tr>
            <tr>
              <td className="field-name">Emergency Contact Support</td>
              <td className="field-val">{p.emergencyContactName} · {p.emergencyContact}</td>
            </tr>
          </tbody>
        </table>

        {/* ─── Uploaded Medical History — AI Analyzed Summary ─── */}
        {uploadedRecords && uploadedRecords.length > 0 && (
          <>
            <h2 className="clinical-section-title" style={{ marginTop: '1.2rem' }}>
              <span className="sec-num">3.</span> Uploaded Medical History — AI Analyzed Summary
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              {uploadedRecords.map((doc, idx) => (
                <div key={idx} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                  {/* File metadata header */}
                  <div style={{ background: '#f1f5f9', padding: '0.55rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#0f172a' }}>
                      {idx + 1}. {doc.fileName || doc.name}
                      {doc.isAiVision ? ' — Analyzed by Gemini AI Vision' : ''}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {doc.fileType || doc.type || 'Document'} · {doc.uploadedAt || 'Attached'}
                    </span>
                  </div>
                  {/* Clinical summary body */}
                  <div style={{ padding: '0.65rem 0.85rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Clinical Summary
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: '#1e293b',
                      lineHeight: '1.55',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      padding: '0.5rem 0.65rem',
                      background: '#ffffff',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                    }}>
                      {doc.extractedSummary || doc.extractedText || doc.extractedSnippet || 'Medical record verified and attached for specialist review.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="compliance-banner-strip">
          <strong>HIPAA &amp; GINA Protection:</strong> Protected Health Information (PHI) compliant under Section 164.514. Genetic non-discrimination enforced.
        </div>

        <div className="clinical-page-footer">
          <span>CONFIDENTIAL MEDICAL RECORD · GENEGUARD AI</span>
          <span>Page 2 of {totalPages}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PAGE 3: RISK ASSESSMENT OVERVIEW (Full report only)
          ═══════════════════════════════════════════════════════════ */}
      {!intakeOnly && evaluation && (
        <>
          <hr className="page-delimiter" />
          <div className="clinical-page">
            <div className="page-running-header">
              <span>GeneGuard Assessment Report</span>
              <span>Patient: {p.fullName}</span>
            </div>

            <h2 className="clinical-section-title">
              <span className="sec-num">3.</span> Genomic Risk Indices &amp; Triage Overview
            </h2>

            <div className="clinical-risk-metrics-grid">
              {charts.map((metric) => {
                const cls = getRiskClass(metric.value);
                return (
                  <div key={metric.label} className="clinical-metric-card">
                    <div className="metric-title">{metric.label}</div>
                    <div className={`metric-big-num ${cls}`}>{metric.value}%</div>
                    <div className="metric-bar-bg">
                      <div className={`metric-bar-fill ${cls}`} style={{ width: `${metric.value}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <h2 className="clinical-section-title">
              <span className="sec-num">4.</span> Clinical Pathway Determination
            </h2>

            <table className="clinical-table">
              <tbody>
                <tr>
                  <td className="field-name">Assessed Risk Tier</td>
                  <td className="field-val bold" style={{ color: riskLevel === 'high' ? '#dc2626' : riskLevel === 'moderate' ? '#d97706' : '#16a34a' }}>
                    {evaluation.level.toUpperCase()} PRIORITY
                  </td>
                </tr>
                <tr>
                  <td className="field-name">Assigned Care Lane</td>
                  <td className="field-val bold">{evaluation.lane}</td>
                </tr>
                <tr>
                  <td className="field-name">Escalation Alert Status</td>
                  <td className="field-val">{evaluation.alertActive ? 'ACTIVE — Urgent specialist consultation indicated' : 'STANDBY — Standard clinical follow-up'}</td>
                </tr>
                <tr>
                  <td className="field-name">Analytical Summary</td>
                  <td className="field-val">{evaluation.summary}</td>
                </tr>
              </tbody>
            </table>

            <div className="clinical-page-footer">
              <span>CONFIDENTIAL MEDICAL RECORD · GENEGUARD AI</span>
              <span>Page 3 of {totalPages}</span>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PAGE 4: AGENT RESULTS BREAKDOWN (Full report only)
          ═══════════════════════════════════════════════════════════ */}
      {!intakeOnly && (
        <>
          <hr className="page-delimiter" />
          <div className="clinical-page">
            <div className="page-running-header">
              <span>GeneGuard Assessment Report</span>
              <span>Patient: {p.fullName}</span>
            </div>

            <h2 className="clinical-section-title">
              <span className="sec-num">5.</span> Multi-Agent Computational Insights
            </h2>

            <div className="agent-clinical-cards-list">
              {agentSections.map((agent) => (
                <div key={agent.id} className="agent-clinical-card">
                  <div className="agent-card-header-row">
                    <span className="agent-icon-badge">{agent.icon}</span>
                    <div className="agent-name-wrap">
                      <h4>{agent.name}</h4>
                      <span className="agent-purpose-text">{agent.purpose}</span>
                    </div>
                    <span className="agent-status-tag">{agent.result ? agent.result.status || 'Completed' : 'Standby'}</span>
                  </div>

                  <div className="agent-output-body">
                    {agent.result ? (
                      <>
                        <p className="agent-summary-p">{agent.result.summary}</p>
                        {agent.result.highlights && agent.result.highlights.length > 0 && (
                          <div className="agent-insights-table-wrap">
                            <table className="clinical-table-mini">
                              <tbody>
                                {agent.result.highlights.slice(0, 3).map((item, idx) => {
                                  const detail = typeof item === 'string' ? { label: `Observation ${idx + 1}`, value: item } : item;
                                  return (
                                    <tr key={idx}>
                                      <td className="mini-lbl">{detail.label}:</td>
                                      <td className="mini-val">{String(detail.value || '')}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="agent-pending-text">Analysis awaiting specialized agent run trigger.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="clinical-page-footer">
              <span>CONFIDENTIAL MEDICAL RECORD · GENEGUARD AI</span>
              <span>Page 4 of {totalPages}</span>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PAGE 5: ATTACHED MEDICAL RECORDS & RECOMMENDATIONS
          ═══════════════════════════════════════════════════════════ */}
      {!intakeOnly && (
        <>
          <hr className="page-delimiter" />
          <div className="clinical-page">
            <div className="page-running-header">
              <span>GeneGuard Assessment Report</span>
              <span>Patient: {p.fullName}</span>
            </div>

            {uploadedRecords && uploadedRecords.length > 0 && (
              <>
                <h2 className="clinical-section-title">
                  <span className="sec-num">6.</span> Attached Medical History &amp; Parsed Records
                </h2>
                <table className="clinical-table zebra">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Document</th>
                      <th style={{ width: '20%' }}>Date</th>
                      <th>Parsed Clinical Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedRecords.map((doc, idx) => (
                      <tr key={idx}>
                        <td className="bold">{doc.name}</td>
                        <td>{doc.uploadedAt || 'Attached'}</td>
                        <td style={{ fontSize: '0.8rem', color: '#334155' }}>
                          {doc.extractedSnippet || 'Verified clinical document'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h2 className="clinical-section-title">
              <span className="sec-num">{uploadedRecords.length > 0 ? '7.' : '6.'}</span> Clinical Recommendations &amp; Next Steps
            </h2>

            <ul className="clinical-recommendations-list">
              {allRecommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>

            <table className="clinical-table">
              <tbody>
                <tr>
                  <td className="field-name">Specialist Referral Recommendation</td>
                  <td className="field-val bold">Board Certified Genetic Counselor, Clinical Medical Geneticist</td>
                </tr>
                <tr>
                  <td className="field-name">Recommended Review Window</td>
                  <td className="field-val">
                    {riskLevel === 'high' ? 'Within 7–14 calendar days' : riskLevel === 'moderate' ? 'Within 30 days' : 'Routine 6–12 month wellness interval'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="clinical-seal-box">
              <div className="seal-text">
                <strong>GENEGUARD VERIFIED ASSESSMENT</strong>
                <span>Generated via GeneGuard Secure Genomics Pipeline v3.2</span>
              </div>
            </div>

            <div className="clinical-page-footer">
              <span>CONFIDENTIAL MEDICAL RECORD · GENEGUARD AI</span>
              <span>Page {totalPages} of {totalPages}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* ─── Modal Overlay (Glassmorphism outer wrapper) ─── */}
      <div className="report-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="report-modal-container">
          {/* Modal Toolbar */}
          <div className="report-modal-toolbar">
            <span className="report-modal-title">
              {intakeOnly ? '📋 Patient Intake Clinical Report' : '📄 Comprehensive Genetic Assessment Report'}
            </span>
            <div className="report-modal-actions">
              <button
                className={`report-modal-btn download-btn ${isDownloading ? 'downloading' : ''}`}
                onClick={handleDownload}
                title="Download Formatted PDF"
                aria-label="Download Formatted PDF"
              >
                {isDownloading ? (
                  <span style={{ fontSize: '0.85rem' }}>⏳</span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
              </button>
              <button className="report-modal-btn" onClick={onClose} title="Close Modal" aria-label="Close Modal">
                ✕
              </button>
            </div>
          </div>

          {/* Scrollable Preview Area */}
          <div className="report-preview-scroll">
            <ReportContent />
          </div>
        </div>
      </div>

      {/* ─── Hidden html2canvas capture target ─── */}
      <div className="report-capture-hidden" ref={captureRef}>
        <ReportContent />
      </div>
    </>
  );
};

export default ReportPDFViewer;
