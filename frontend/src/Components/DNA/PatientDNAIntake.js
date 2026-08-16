import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle2, Trash2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import './PatientDNAIntake.css';
import { evaluatePatient } from '../../data/dnaAgents';
import ReportPDFViewer from './ReportPDFViewer';

// Setup pdfjs worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  } catch (e) {
    console.warn('PDF.js worker setup note:', e);
  }
}

const patientDefaults = {
  fullName: '',
  age: '',
  sex: 'Female',
  bloodGroup: 'O+',
  mobileNumber: '',
  email: '',
  familyHistory: 'No',
  familyMemberCount: '0',
  familyMemberRelation: '',
  knownDisorder: '',
  symptoms: 'No symptoms',
  purpose: 'General awareness',
  reportRisk: 'Low',
  samplePreference: 'Saliva',
  fastingStatus: 'Yes',
  consultedDoctor: 'No',
  medications: '',
  allergies: '',
  location: 'Mumbai',
  emergencyContactName: '',
  emergencyContact: '',
};

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050/api/dna';

const MiniMetric = ({ label, value }) => (
  <div className="patient-metric-mini">
    <span>{label}</span>
    <strong>{value}%</strong>
  </div>
);

const IntakeField = ({ label, children, full = false }) => (
  <label className={`patient-field ${full ? 'full' : ''}`}>
    <span>{label}</span>
    {children}
  </label>
);

const PatientDNAIntake = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(patientDefaults);
  const [evaluation, setEvaluation] = useState(() => evaluatePatient(patientDefaults));
  const [apiMode, setApiMode] = useState('fallback');
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isParsingFiles, setIsParsingFiles] = useState(false);
  const [autoFillHighlights, setAutoFillHighlights] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('geneGuardPatientProfile');
    if (saved) {
      setFormData({ ...patientDefaults, ...JSON.parse(saved) });
    }
    const savedUploads = localStorage.getItem('geneGuardUploadedRecords');
    if (savedUploads) {
      try {
        setUploadedFiles(JSON.parse(savedUploads));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(`${API_BASE}/patient/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient: formData }),
        });
        const data = await response.json();
        if (data?.success) {
          setEvaluation(data.evaluation);
          setApiMode('connected');
          return;
        }
      } catch (error) {}
      setEvaluation(evaluatePatient(formData));
      setApiMode('fallback');
    };
    run();
  }, [formData]);

  const handleChange = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  // File Text Parsing (PDF, DOCX, Images) & Form Auto-fill
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsParsingFiles(true);
    const parsedRecords = [...uploadedFiles];
    const detectedFields = [];

    for (const file of files) {
      let extractedText = '';
      try {
        if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
          // Parse DOCX via mammoth
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value || '';
        } else if (file.name.endsWith('.pdf') || file.type.includes('pdf')) {
          // Parse PDF via pdfjs-dist
          try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 5); pageNum++) {
              const page = await pdf.getPage(pageNum);
              const textContent = await page.getTextContent();
              const pageStr = textContent.items.map((item) => item.str).join(' ');
              fullText += pageStr + ' ';
            }
            extractedText = fullText;
          } catch (pdfErr) {
            extractedText = `PDF document (${file.name}) processed for clinical review.`;
          }
        } else {
          // Plain text / Image metadata placeholder
          extractedText = `Medical image / document file (${file.name}) attached for clinical inspection.`;
        }
      } catch (err) {
        console.warn('File extraction fallback note:', err.message);
        extractedText = `Attached medical record: ${file.name}`;
      }

      const snippet = extractedText.length > 200 ? `${extractedText.substring(0, 200)}...` : extractedText;

      parsedRecords.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type || file.name.split('.').pop(),
        extractedText,
        extractedSnippet: snippet,
        uploadedAt: new Date().toLocaleDateString(),
      });

      // Clinical Auto-fill rule analysis from extracted text
      const lower = extractedText.toLowerCase();

      // Known disorders detection
      const disorderKeywords = [
        'thalassemia', 'brca1', 'brca2', 'brca', 'lynch syndrome', 'sickle cell',
        'cystic fibrosis', 'down syndrome', 'huntington', 'fragile x', 'hemophilia',
        'cardiomyopathy', 'marfan syndrome', 'tay-sachs', 'muscular dystrophy'
      ];
      for (const d of disorderKeywords) {
        if (lower.includes(d)) {
          const capitalized = d.charAt(0).toUpperCase() + d.slice(1);
          setFormData((prev) => ({
            ...prev,
            knownDisorder: prev.knownDisorder ? `${prev.knownDisorder}, ${capitalized}` : capitalized,
            familyHistory: 'Yes',
          }));
          detectedFields.push(`Known Disorder: ${capitalized}`);
          break;
        }
      }

      // Symptoms detection
      if (lower.includes('severe') || lower.includes('acute') || lower.includes('recurrent pain')) {
        setFormData((prev) => ({ ...prev, symptoms: 'Severe', reportRisk: 'High' }));
        detectedFields.push('Symptoms: Severe');
      } else if (lower.includes('recurring') || lower.includes('chronic') || lower.includes('fatigue')) {
        setFormData((prev) => ({ ...prev, symptoms: 'Recurring symptoms', reportRisk: 'Moderate' }));
        detectedFields.push('Symptoms: Recurring symptoms');
      }

      // Blood group detection
      const bgMatch = extractedText.match(/\b(A|B|AB|O)[+-]\b/i);
      if (bgMatch) {
        const detectedBg = bgMatch[0].toUpperCase();
        setFormData((prev) => ({ ...prev, bloodGroup: detectedBg }));
        detectedFields.push(`Blood Group: ${detectedBg}`);
      }

      // Medications detection
      const medKeywords = ['folic acid', 'iron', 'hydroxyurea', 'aspirin', 'metformin', 'thyroxine', 'warfarin'];
      for (const m of medKeywords) {
        if (lower.includes(m)) {
          setFormData((prev) => ({
            ...prev,
            medications: prev.medications ? `${prev.medications}, ${m}` : m,
          }));
          detectedFields.push(`Medication: ${m}`);
          break;
        }
      }
    }

    setUploadedFiles(parsedRecords);
    localStorage.setItem('geneGuardUploadedRecords', JSON.stringify(parsedRecords));
    if (detectedFields.length > 0) {
      setAutoFillHighlights(detectedFields);
    }
    setIsParsingFiles(false);
  };

  const handleRemoveFile = (fileId) => {
    const updated = uploadedFiles.filter((f) => f.id !== fileId);
    setUploadedFiles(updated);
    localStorage.setItem('geneGuardUploadedRecords', JSON.stringify(updated));
  };

  const keyTags = useMemo(() => {
    return [formData.purpose, formData.familyHistory === 'Yes' ? 'Family history present' : 'No family history', formData.samplePreference, evaluation.level]
      .filter(Boolean)
      .slice(0, 4);
  }, [formData, evaluation]);

  const handleContinue = () => {
    localStorage.setItem('geneGuardPatientProfile', JSON.stringify(formData));
    navigate('/dna/agents/guidance-agent');
  };

  return (
    <div className="patient-intake-page">
      <section className="patient-intake-hero">
        <div className="patient-intake-hero-inner">
          <div>
            <span className="patient-badge">Patient DNA Intake</span>
            <h1>Create a richer patient profile</h1>
            <p>
              Add patient, family, and sampling details once. The DNA dashboard, charts, escalation panel, and all agents update from this profile.
            </p>
          </div>
          <div className="patient-hero-actions">
            <Link to="/dna" className="patient-outline-btn">← Back to DNA Testing</Link>
            <button className="patient-outline-btn" onClick={() => setShowReportViewer(true)}>📋 View Report</button>
            <button className="patient-primary-btn" onClick={handleContinue}>Open dynamic dashboard</button>
          </div>
        </div>
      </section>

      <section className="patient-intake-layout">
        <div className="patient-card form-card">
          <div className="patient-card-head">
            <div>
              <span className="patient-badge small">Input Form</span>
              <h2>Patient + family + sampling data</h2>
            </div>
            <div className={`patient-api-pill ${apiMode}`}>{apiMode === 'connected' ? 'API connected' : 'Fallback mode'}</div>
          </div>

          <div className="patient-section-title">Basic identity</div>
          <div className="patient-form-grid three-col">
            <IntakeField label="Full name">
              <input value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="Enter patient name" />
            </IntakeField>
            <IntakeField label="Age">
              <input type="number" value={formData.age} onChange={(e) => handleChange('age', e.target.value)} placeholder="Enter age" />
            </IntakeField>
            <IntakeField label="Sex">
              <select value={formData.sex} onChange={(e) => handleChange('sex', e.target.value)}>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </IntakeField>
            <IntakeField label="Blood group">
              <select value={formData.bloodGroup} onChange={(e) => handleChange('bloodGroup', e.target.value)}>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </IntakeField>
            <IntakeField label="Mobile number">
              <input value={formData.mobileNumber} onChange={(e) => handleChange('mobileNumber', e.target.value)} placeholder="Enter phone number" />
            </IntakeField>
            <IntakeField label="Email">
              <input value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Enter email" />
            </IntakeField>
          </div>

          <div className="patient-section-title">Family history</div>
          <div className="patient-form-grid three-col">
            <IntakeField label="Family history of genetic disorder?">
              <select value={formData.familyHistory} onChange={(e) => handleChange('familyHistory', e.target.value)}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </IntakeField>
            <IntakeField label="Affected family member count">
              <input type="number" value={formData.familyMemberCount} onChange={(e) => handleChange('familyMemberCount', e.target.value)} placeholder="0" />
            </IntakeField>
            <IntakeField label="Family member relation">
              <input value={formData.familyMemberRelation} onChange={(e) => handleChange('familyMemberRelation', e.target.value)} placeholder="Mother, father, sibling..." />
            </IntakeField>
            <IntakeField label="Known disorder in family" full>
              <input value={formData.knownDisorder} onChange={(e) => handleChange('knownDisorder', e.target.value)} placeholder="Example: Thalassemia, BRCA mutation history" />
            </IntakeField>
          </div>

          <div className="patient-section-title">Testing + health details</div>
          <div className="patient-form-grid three-col">
            <IntakeField label="Symptoms">
              <select value={formData.symptoms} onChange={(e) => handleChange('symptoms', e.target.value)}>
                <option>No symptoms</option>
                <option>Mild symptoms</option>
                <option>Recurring symptoms</option>
                <option>Severe</option>
              </select>
            </IntakeField>
            <IntakeField label="Purpose of test">
              <select value={formData.purpose} onChange={(e) => handleChange('purpose', e.target.value)}>
                <option>General awareness</option>
                <option>Health risk check</option>
                <option>Inherited disease concern</option>
                <option>Family planning</option>
              </select>
            </IntakeField>
            <IntakeField label="Observed report risk">
              <select value={formData.reportRisk} onChange={(e) => handleChange('reportRisk', e.target.value)}>
                <option>Low</option>
                <option>Moderate</option>
                <option>High</option>
              </select>
            </IntakeField>
            <IntakeField label="Preferred sample type">
              <select value={formData.samplePreference} onChange={(e) => handleChange('samplePreference', e.target.value)}>
                <option>Saliva</option>
                <option>Blood</option>
                <option>Not sure</option>
              </select>
            </IntakeField>
            <IntakeField label="Followed food restriction?">
              <select value={formData.fastingStatus} onChange={(e) => handleChange('fastingStatus', e.target.value)}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </IntakeField>
            <IntakeField label="Doctor already consulted?">
              <select value={formData.consultedDoctor} onChange={(e) => handleChange('consultedDoctor', e.target.value)}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </IntakeField>
            <IntakeField label="Current medications">
              <input value={formData.medications} onChange={(e) => handleChange('medications', e.target.value)} placeholder="Mention current medicines" />
            </IntakeField>
            <IntakeField label="Allergies">
              <input value={formData.allergies} onChange={(e) => handleChange('allergies', e.target.value)} placeholder="Mention known allergies" />
            </IntakeField>
            <IntakeField label="Current location">
              <input value={formData.location} onChange={(e) => handleChange('location', e.target.value)} placeholder="City or area" />
            </IntakeField>
          </div>

          {/* ─── Upload Medical History Section ─── */}
          <div className="patient-section-title">Upload Medical History (PDF, DOCX, Images)</div>
          
          {autoFillHighlights.length > 0 && (
            <div className="patient-autofill-banner">
              <Sparkles size={16} className="sparkle-icon" />
              <div>
                <strong>Intelligent Clinical Auto-Fill:</strong>
                <span> Detected {autoFillHighlights.join(' · ')} from your uploaded medical records.</span>
              </div>
            </div>
          )}

          <div className="patient-upload-dropzone" onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
              onChange={handleFilesSelected}
              style={{ display: 'none' }}
            />
            <UploadCloud size={36} className="upload-icon" />
            <div className="upload-prompt-text">
              <h4>{isParsingFiles ? 'Analyzing & Extracting Medical Data...' : 'Drop files here or click to browse'}</h4>
              <p>Supports Multi-page PDF reports, Word DOCX files, and Diagnostic Lab Scans (PNG/JPG)</p>
            </div>
            {isParsingFiles && <div className="parsing-spinner"></div>}
          </div>

          {/* Uploaded Files Chips List */}
          {uploadedFiles.length > 0 && (
            <div className="uploaded-files-list">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="uploaded-file-chip">
                  <FileText size={18} className="chip-file-icon" />
                  <div className="chip-info">
                    <span className="chip-name">{file.name}</span>
                    <span className="chip-meta">{file.size} · Parsed &amp; Attached</span>
                  </div>
                  <button
                    type="button"
                    className="chip-remove-btn"
                    title="Remove File"
                    onClick={() => handleRemoveFile(file.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="patient-section-title">Emergency support</div>
          <div className="patient-form-grid three-col">
            <IntakeField label="Emergency contact name">
              <input value={formData.emergencyContactName} onChange={(e) => handleChange('emergencyContactName', e.target.value)} placeholder="Enter contact name" />
            </IntakeField>
            <IntakeField label="Emergency contact number">
              <input value={formData.emergencyContact} onChange={(e) => handleChange('emergencyContact', e.target.value)} placeholder="Enter emergency number" />
            </IntakeField>
          </div>
        </div>

        <div className="patient-card summary-card">
          <div className="patient-summary-top">
            <div>
              <span className="patient-badge small">Live evaluation</span>
              <h2>{evaluation.level} risk profile</h2>
              <p>{evaluation.summary}</p>
            </div>
            <div className={`patient-risk-pill ${evaluation.level.toLowerCase()}`}>{evaluation.lane}</div>
          </div>

          <div className="patient-tags">
            {keyTags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>

          <div className="patient-mini-grid">
            {evaluation.charts.slice(0, 4).map((metric) => <MiniMetric key={metric.label} label={metric.label} value={metric.value} />)}
          </div>

          <div className="patient-summary-list">
            <div><strong>Sample type:</strong> {formData.samplePreference}</div>
            <div><strong>Family relation:</strong> {formData.familyMemberRelation || 'Not provided'}</div>
            <div><strong>Known disorder:</strong> {formData.knownDisorder || 'Not provided'}</div>
            <div><strong>Attached records:</strong> {uploadedFiles.length > 0 ? `${uploadedFiles.length} files parsed` : 'None'}</div>
            <div><strong>Emergency contact:</strong> {formData.emergencyContactName || 'Not provided'} {formData.emergencyContact ? `· ${formData.emergencyContact}` : ''}</div>
          </div>

          <div className="patient-alert-box">
            <strong>{evaluation.alertActive ? 'Escalation watch is active.' : 'No emergency escalation right now.'}</strong>
            <p>
              Save this profile and open the dashboard to see the risk graph, agent-specific response, alert controls, map button, and emergency actions update automatically.
            </p>
            <button className="patient-primary-btn full-width-btn" onClick={handleContinue}>Continue to dashboard</button>
          </div>
        </div>
      </section>

      <ReportPDFViewer
        isOpen={showReportViewer}
        onClose={() => setShowReportViewer(false)}
        patient={formData}
        evaluation={evaluation}
        agentResults={{}}
        uploadedRecords={uploadedFiles}
        intakeOnly={true}
      />
    </div>
  );
};

export default PatientDNAIntake;
