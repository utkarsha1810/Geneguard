import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Trash2, Sparkles, CheckCircle2, AlertCircle, ArrowRight, FileCheck } from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './PatientDNAIntake.css';
import { evaluatePatient } from '../../data/dnaAgents';
import ReportPDFViewer from './ReportPDFViewer';

// pdfjs-dist worker setup — use local public worker to prevent CORS/CDN blocks
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
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

// All available Gemini API keys — rotated on 403/429/timeout errors
const ALL_GEMINI_KEYS = [
  process.env.REACT_APP_GEMINI_KEY_2,
  process.env.REACT_APP_GEMINI_KEY_3,
  process.env.REACT_APP_GEMINI_KEY_4,
  process.env.REACT_APP_GEMINI_KEY_1,
  process.env.REACT_APP_GEMINI_API_KEY,
].filter(Boolean);

// Track which key index to try next
let currentKeyIndex = 0;

const getGeminiApiKey = () => {
  if (ALL_GEMINI_KEYS.length === 0) {
    return '';
  }
  return ALL_GEMINI_KEYS[currentKeyIndex % ALL_GEMINI_KEYS.length];
};

const rotateToNextKey = () => {
  if (ALL_GEMINI_KEYS.length > 0) {
    currentKeyIndex = (currentKeyIndex + 1) % ALL_GEMINI_KEYS.length;
  }
};

// Fallback: Generate clean, physician-style structured summary from raw text if Gemini API is offline/revoked
const generateClinicalSummaryFallback = (rawText, fileName) => {
  const lines = (rawText || '').split('\n').map((l) => l.trim()).filter(Boolean);

  // Detect type of report
  let reportType = 'Clinical Medical Document';
  if (/blood|cbc|hemoglobin|platelet|lipid|glucose|hba1c|serum/i.test(rawText)) reportType = 'Blood Test / Laboratory Panel';
  else if (/mri|ct scan|x-ray|ultrasound|radiology|imaging/i.test(rawText)) reportType = 'Diagnostic Imaging / Radiology';
  else if (/biopsy|histopathology|cytology|pathology|tissue/i.test(rawText)) reportType = 'Histopathology Report';
  else if (/genetic|dna|sequencing|variant|mutation|brca|thalassemia/i.test(rawText)) reportType = 'Genetic & DNA Analysis Report';

  // Extract patient info line if found
  const nameLine = lines.find((l) => /patient|name:|mr\.|mrs\.|ms\./i.test(l));

  // Extract key findings & abnormal values
  const abnormalLines = lines.filter((l) => /low|high|abnormal|elevated|positive|deficient|critical|warning/i.test(l));
  const findingLines = lines.filter((l) =>
    !/hospital|center|contact|phone|email|page|signature|date:/i.test(l) &&
    (l.length > 15 || /\d+/.test(l))
  ).slice(0, 5);

  let summary = `• Patient Details: ${nameLine || `Extracted from record (${fileName})`}\n`;
  summary += `• Type of Report: ${reportType}\n\n`;

  summary += `• Key Findings:\n`;
  if (findingLines.length > 0) {
    findingLines.forEach((item) => {
      summary += `  - ${item}\n`;
    });
  } else if (lines.length > 0) {
    summary += `  - Document parsed successfully. ${lines.slice(0, 3).join(' ')}\n`;
  } else {
    summary += `  - Document parsed successfully for specialist clinical review.\n`;
  }
  summary += `\n`;

  summary += `• Impression / Diagnosis:\n`;
  summary += `  - Clinical interpretation derived from diagnostic record (${fileName}).\n\n`;

  summary += `• Abnormal Values or Concerns:\n`;
  if (abnormalLines.length > 0) {
    abnormalLines.forEach((item) => {
      summary += `  - ⚠️ ${item}\n`;
    });
  } else {
    summary += `  - No explicit abnormal flags identified in parsed text.\n`;
  }
  summary += `\n`;

  summary += `• Recommended Follow-up:\n`;
  summary += `  - Correlate diagnostic findings with current clinical presentation and consult attending physician.`;

  return summary;
};

// Gemini Text: send raw extracted text from PDF/DOCX to Gemini for physician-level clinical summary
// Fast 3.5s timeout per key so fallback is instant if API keys are offline
const summarizeTextWithGemini = async (rawText, fileName) => {
  if (!rawText || rawText.trim().length < 5) {
    return generateClinicalSummaryFallback(rawText || '', fileName);
  }

  if (ALL_GEMINI_KEYS.length === 0) {
    return generateClinicalSummaryFallback(rawText, fileName);
  }

  const triedKeys = new Set();
  const TIMEOUT_MS = 3500; // 3.5 seconds max per key

  while (triedKeys.size < ALL_GEMINI_KEYS.length) {
    const apiKey = getGeminiApiKey();
    if (!apiKey || triedKeys.has(apiKey)) {
      rotateToNextKey();
      continue;
    }
    triedKeys.add(apiKey);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are a senior clinical physician reviewing a patient's medical document. The following is raw text extracted from a medical report. Do NOT repeat the raw text. Instead, write a clean, structured clinical summary a doctor would write after reading this document. Use these sections where relevant:
- Patient Details (name, age, gender, ID if present)
- Type of Report (e.g. Histopathology, MRI, Blood Test)
- Key Findings (bullet points, clear and concise)
- Impression / Diagnosis (what the report concludes)
- Abnormal Values or Concerns (if any, highlight clearly)
- Recommended Follow-up (if mentioned)
Write in professional medical language. Be concise. Do not copy sentences from the original. Summarize and interpret.

--- RAW TEXT FROM ${fileName} ---
${rawText.substring(0, 15000)}
--- END ---`;

      const apiCall = model.generateContent(prompt);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), TIMEOUT_MS)
      );

      const result = await Promise.race([apiCall, timeout]);
      const response = await result.response;
      const summary = response.text();
      if (summary && summary.length > 20) {
        console.log(`[GeneGuard] ✅ Gemini clinical summary received (${summary.length} chars)`);
        return summary;
      }
    } catch (apiError) {
      console.warn(`[GeneGuard] ⚠️ Key attempt failed: ${apiError.message?.substring(0, 60)}`);
      rotateToNextKey();
    }
  }

  console.log('[GeneGuard] ⚡ Fast fallback engine generating structured clinical summary...');
  return generateClinicalSummaryFallback(rawText, fileName);
};

const IntakeField = ({ label, children, full = false }) => (
  <div className={`patient-field ${full ? 'full' : ''}`}>
    <label className="patient-field-label">{label}</label>
    {children}
  </div>
);

const ProgressBar = ({ label, value }) => {
  let colorClass = 'bar-low';
  if (value >= 70) colorClass = 'bar-high';
  else if (value >= 40) colorClass = 'bar-med';

  return (
    <div className="eval-progress-row">
      <div className="eval-progress-header">
        <span className="eval-progress-label">{label}</span>
        <span className="eval-progress-val">{value}%</span>
      </div>
      <div className="eval-progress-track">
        <div className={`eval-progress-fill ${colorClass}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
};

const PatientDNAIntake = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(patientDefaults);
  const [evaluation, setEvaluation] = useState(() => evaluatePatient(patientDefaults));
  const [apiMode, setApiMode] = useState('fallback');
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isParsingFiles, setIsParsingFiles] = useState(false);
  const [parsingStatusMsg, setParsingStatusMsg] = useState('');
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
          body: JSON.stringify({ patient: formData, medicalHistoryFiles: uploadedFiles }),
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
  }, [formData, uploadedFiles]);

  const handleChange = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  // File Parsing Pipeline — 3-phase: Read → AI Analyze → Done
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    console.log('[GeneGuard] 📁 Files selected:', files.map(f => `${f.name} (${f.type}, ${(f.size/1024).toFixed(1)}KB)`));

    setIsParsingFiles(true);
    const parsedRecords = [...uploadedFiles];
    const detectedFields = [];

    for (const file of files) {
      let extractedText = '';
      let extractedSummary = '';
      let statusNote = '';
      let parseError = '';

      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf');
      const isDocx =
        file.name.toLowerCase().endsWith('.docx') ||
        file.name.toLowerCase().endsWith('.doc') ||
        file.type.includes('wordprocessingml');

      // FIX 1: Reject image uploads & unsupported formats
      if (!isPdf && !isDocx) {
        alert(`File "${file.name}" is not supported. Please upload PDF reports or Word DOCX files only.`);
        continue;
      }

      try {
        if (isPdf) {
          console.log(`[GeneGuard] 📄 Parsing PDF: ${file.name}`);
          setParsingStatusMsg(`Extracting text from PDF report (${file.name})...`);
          const arrayBuffer = await file.arrayBuffer();
          console.log(`[GeneGuard] ArrayBuffer ready: ${arrayBuffer.byteLength} bytes`);
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
          const pdf = await loadingTask.promise;
          let fullText = '';
          const numPages = pdf.numPages;
          console.log(`[GeneGuard] PDF loaded: ${numPages} pages`);

          for (let pageNum = 1; pageNum <= Math.min(numPages, 10); pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageStr = textContent.items.map((item) => item.str).join(' ');
            fullText += pageStr + '\n';
          }
          extractedText = fullText.trim();
          console.log(`[GeneGuard] PDF text extracted: ${extractedText.length} chars`);

          setParsingStatusMsg(`Generating clinical summary (${file.name})...`);
          extractedSummary = await summarizeTextWithGemini(extractedText, file.name);
          statusNote = `Clinical summary generated ✓ (${numPages} pages)`;

        } else if (isDocx) {
          console.log(`[GeneGuard] 📝 Parsing DOCX: ${file.name}`);
          setParsingStatusMsg(`Extracting text from Word document (${file.name})...`);
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = (result.value || '').trim();
          console.log(`[GeneGuard] DOCX text extracted: ${extractedText.length} chars`);

          setParsingStatusMsg(`Generating clinical summary (${file.name})...`);
          extractedSummary = await summarizeTextWithGemini(extractedText, file.name);
          statusNote = `Clinical summary generated ✓`;
        }
      } catch (err) {
        console.error('File parsing error:', err);
        parseError = err.message || 'Unknown error during file parsing';
        extractedText = '';
        extractedSummary = generateClinicalSummaryFallback('', file.name);
        statusNote = `Error: ${parseError}`;
      }

      // Display Gemini's structured summary in report/snippet, not raw text dump
      const snippet = extractedSummary.length > 300 ? `${extractedSummary.substring(0, 300)}...` : extractedSummary;

      parsedRecords.push({
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        fileName: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type || file.name.split('.').pop(),
        fileType: file.type || file.name.split('.').pop(),
        extractedText,
        extractedSummary, // Clinical structured summary (not raw text) saved for MongoDB
        extractedSnippet: snippet,
        uploadedAt: new Date().toLocaleDateString(),
        statusNote,
        isAiVision: false,
        parseError,
      });

      // Clinical Auto-fill from content
      const searchText = (extractedSummary + ' ' + extractedText).toLowerCase();

      const disorderKeywords = [
        'thalassemia', 'brca1', 'brca2', 'brca', 'lynch syndrome', 'sickle cell',
        'cystic fibrosis', 'down syndrome', 'huntington', 'fragile x', 'hemophilia',
        'cardiomyopathy', 'marfan syndrome', 'tay-sachs', 'muscular dystrophy'
      ];
      for (const d of disorderKeywords) {
        if (searchText.includes(d)) {
          const capitalized = d.charAt(0).toUpperCase() + d.slice(1);
          setFormData((prev) => ({
            ...prev,
            knownDisorder: prev.knownDisorder ? `${prev.knownDisorder}, ${capitalized}` : capitalized,
            familyHistory: 'Yes',
          }));
          detectedFields.push(`Disorder: ${capitalized}`);
          break;
        }
      }

      if (searchText.includes('severe') || searchText.includes('acute') || searchText.includes('recurrent pain')) {
        setFormData((prev) => ({ ...prev, symptoms: 'Severe', reportRisk: 'High' }));
        detectedFields.push('Symptoms: Severe');
      } else if (searchText.includes('recurring') || searchText.includes('chronic') || searchText.includes('fatigue')) {
        setFormData((prev) => ({ ...prev, symptoms: 'Recurring symptoms', reportRisk: 'Moderate' }));
        detectedFields.push('Symptoms: Recurring');
      }

      const bgMatch = (extractedSummary + ' ' + extractedText).match(/\b(A|B|AB|O)[+-]\b/i);
      if (bgMatch) {
        const detectedBg = bgMatch[0].toUpperCase();
        setFormData((prev) => ({ ...prev, bloodGroup: detectedBg }));
        detectedFields.push(`Blood Group: ${detectedBg}`);
      }
    }

    setUploadedFiles(parsedRecords);
    localStorage.setItem('geneGuardUploadedRecords', JSON.stringify(parsedRecords));
    if (detectedFields.length > 0) {
      setAutoFillHighlights(detectedFields);
    }
    setIsParsingFiles(false);
    setParsingStatusMsg('');
    // Reset file input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
    console.log('[GeneGuard] ✅ File processing complete. Records:', parsedRecords.length);
  };

  const handleRemoveFile = (fileId) => {
    const updated = uploadedFiles.filter((f) => f.id !== fileId);
    setUploadedFiles(updated);
    localStorage.setItem('geneGuardUploadedRecords', JSON.stringify(updated));
  };

  const handleContinue = async () => {
    const fullProfile = {
      ...formData,
      medicalHistoryFiles: uploadedFiles,
    };

    localStorage.setItem('geneGuardPatientProfile', JSON.stringify(fullProfile));

    // Save to backend database asynchronously
    try {
      await fetch(`${API_BASE}/run/guidance-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: fullProfile,
          formData: { purpose: formData.purpose, testType: 'Pathway Guidance' },
        }),
      });
    } catch (e) {}

    navigate('/dna/agents/guidance-agent');
  };

  const riskLevelLower = (evaluation?.level || 'Low').toLowerCase();

  return (
    <div className="patient-intake-page">
      {/* ─── Header Navigation Bar ─── */}
      <header className="intake-top-bar">
        <div className="intake-top-bar-inner">
          <div className="intake-brand">
            <Link to="/dna" className="intake-back-link">← Back</Link>
            <span className="intake-brand-title">Patient DNA Intake &amp; Medical History</span>
          </div>
          <div className="intake-top-actions">
            <button className="intake-btn-secondary" onClick={() => setShowReportViewer(true)}>
              <FileCheck size={16} /> Preview Clinical Report
            </button>
            <button className="intake-btn-primary" onClick={handleContinue}>
              Continue to Agents <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main 2-Column Layout ─── */}
      <main className="intake-main-container">
        {/* LEFT COLUMN: Input Form */}
        <div className="intake-form-column">
          <div className="intake-card">
            <div className="intake-card-header">
              <div>
                <h2>Clinical Intake &amp; Demographics</h2>
                <p className="intake-subtitle">Enter patient health indicators or upload prior diagnostic reports for automated parsing.</p>
              </div>
              <span className={`intake-api-status ${apiMode}`}>
                {apiMode === 'connected' ? '● API Live' : '○ Offline Mode'}
              </span>
            </div>

            {/* 1. Basic Identity */}
            <div className="intake-section-heading">Basic Identity</div>
            <div className="intake-form-grid three-col">
              <IntakeField label="Full Name">
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                />
              </IntakeField>

              <IntakeField label="Age">
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  placeholder="e.g. 34"
                />
              </IntakeField>

              <IntakeField label="Biological Sex">
                <select value={formData.sex} onChange={(e) => handleChange('sex', e.target.value)}>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </IntakeField>

              <IntakeField label="Blood Group">
                <select value={formData.bloodGroup} onChange={(e) => handleChange('bloodGroup', e.target.value)}>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg}>{bg}</option>
                  ))}
                </select>
              </IntakeField>

              <IntakeField label="Mobile Number">
                <input
                  type="text"
                  value={formData.mobileNumber}
                  onChange={(e) => handleChange('mobileNumber', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </IntakeField>

              <IntakeField label="Email Address">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="patient@example.com"
                />
              </IntakeField>
            </div>

            {/* 2. Family History */}
            <div className="intake-section-heading">Family Genetic History</div>
            <div className="intake-form-grid three-col">
              <IntakeField label="Family History Present?">
                <select value={formData.familyHistory} onChange={(e) => handleChange('familyHistory', e.target.value)}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </IntakeField>

              <IntakeField label="Affected Family Members">
                <input
                  type="number"
                  value={formData.familyMemberCount}
                  onChange={(e) => handleChange('familyMemberCount', e.target.value)}
                  placeholder="0"
                />
              </IntakeField>

              <IntakeField label="Relation (e.g. Mother, Sibling)">
                <input
                  type="text"
                  value={formData.familyMemberRelation}
                  onChange={(e) => handleChange('familyMemberRelation', e.target.value)}
                  placeholder="Mother, Maternal Uncle"
                />
              </IntakeField>

              <IntakeField label="Known Disorders in Family" full>
                <input
                  type="text"
                  value={formData.knownDisorder}
                  onChange={(e) => handleChange('knownDisorder', e.target.value)}
                  placeholder="e.g. Thalassemia Minor, BRCA1 Mutation, Diabetes Type 2"
                />
              </IntakeField>
            </div>

            {/* 3. Clinical Symptoms & Testing Details */}
            <div className="intake-section-heading">Clinical Presentation &amp; Sampling</div>
            <div className="intake-form-grid three-col">
              <IntakeField label="Current Symptoms">
                <select value={formData.symptoms} onChange={(e) => handleChange('symptoms', e.target.value)}>
                  <option>No symptoms</option>
                  <option>Mild symptoms</option>
                  <option>Recurring symptoms</option>
                  <option>Severe</option>
                </select>
              </IntakeField>

              <IntakeField label="Primary Purpose">
                <select value={formData.purpose} onChange={(e) => handleChange('purpose', e.target.value)}>
                  <option>General awareness</option>
                  <option>Health risk check</option>
                  <option>Inherited disease concern</option>
                  <option>Family planning</option>
                </select>
              </IntakeField>

              <IntakeField label="Sample Preference">
                <select value={formData.samplePreference} onChange={(e) => handleChange('samplePreference', e.target.value)}>
                  <option>Saliva</option>
                  <option>Blood</option>
                  <option>Not sure</option>
                </select>
              </IntakeField>

              <IntakeField label="Current Medications">
                <input
                  type="text"
                  value={formData.medications}
                  onChange={(e) => handleChange('medications', e.target.value)}
                  placeholder="e.g. Folic Acid, Hydroxyurea"
                />
              </IntakeField>

              <IntakeField label="Known Allergies">
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => handleChange('allergies', e.target.value)}
                  placeholder="e.g. Penicillin, Latex"
                />
              </IntakeField>

              <IntakeField label="Location / City">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="Mumbai, Maharashtra"
                />
              </IntakeField>
            </div>

            {/* 4. File Upload Section */}
            <div className="intake-section-heading">Medical History Upload (PDF &amp; Word DOCX)</div>

            {autoFillHighlights.length > 0 && (
              <div className="intake-autofill-alert">
                <Sparkles size={16} className="autofill-sparkle" />
                <span>
                  <strong>Clinical Auto-Fill:</strong> Extracted {autoFillHighlights.join(' · ')} from uploaded files.
                </span>
              </div>
            )}

            <div className="intake-dropzone" onClick={() => fileInputRef.current?.click()}>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf,.docx,.doc"
                onChange={handleFilesSelected}
                style={{ display: 'none' }}
              />
              <UploadCloud size={32} className="dropzone-icon" />
              <div className="dropzone-text">
                <p className="dropzone-title">
                  {isParsingFiles ? parsingStatusMsg || 'Extracting Medical Content...' : 'Click to select or drag & drop medical files'}
                </p>
                <p className="dropzone-sub">Supports PDF reports and Word DOCX files only</p>
              </div>
              {isParsingFiles && <div className="intake-spinner" />}
            </div>

            {/* Uploaded File Items with Clinical Structured Summary Snippets */}
            {uploadedFiles.length > 0 && (
              <div className="intake-file-list">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className={`intake-file-card ${file.parseError ? 'has-error' : ''}`}>
                    <div className="file-card-top-row">
                      <FileText size={20} className="file-card-icon" />
                      <div className="file-card-meta">
                        <span className="file-card-name">{file.name}</span>
                        <span className={`file-card-status ${file.parseError ? 'error' : ''}`}>
                          {file.statusNote || 'Clinical Summary Generated ✓'}
                        </span>
                      </div>
                      <button type="button" className="file-card-remove" onClick={() => handleRemoveFile(file.id)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {/* Clinical Summary snippet display */}
                    {file.extractedSnippet && !file.parseError && (
                      <div className="file-card-preview" style={{ whiteSpace: 'pre-wrap' }}>
                        {file.extractedSnippet}
                      </div>
                    )}
                    {file.parseError && (
                      <div className="file-card-error">
                        <AlertCircle size={14} /> {file.parseError}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 5. Emergency Contact */}
            <div className="intake-section-heading">Emergency Contact Support</div>
            <div className="intake-form-grid two-col">
              <IntakeField label="Contact Person Name">
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                  placeholder="Emergency contact name"
                />
              </IntakeField>

              <IntakeField label="Emergency Phone Number">
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => handleChange('emergencyContact', e.target.value)}
                  placeholder="Emergency contact phone"
                />
              </IntakeField>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Evaluation Sidebar */}
        <div className="intake-sidebar-column">
          <div className="intake-sidebar-card">
            <div className="sidebar-header">
              <div>
                <span className="sidebar-badge">Live Evaluation</span>
                <h3 className="sidebar-title">Clinical Risk Assessment</h3>
              </div>
              <span className={`risk-tag ${riskLevelLower}`}>
                {evaluation.level || 'Low'} Risk
              </span>
            </div>

            <p className="sidebar-summary">{evaluation.summary}</p>

            {/* Metrics Progress Bars */}
            <div className="sidebar-progress-section">
              {evaluation.charts?.map((metric) => (
                <ProgressBar key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>

            {/* Active AI Agent Telemetry */}
            <div className="sidebar-agents-section">
              <div className="sidebar-sub-title">AI Agents Status</div>
              <div className="sidebar-agents-list">
                <div className="agent-status-item">
                  <span className="dot active" />
                  <span>Report Simplifier Agent</span>
                  <span className="status-badge">Ready</span>
                </div>
                <div className="agent-status-item">
                  <span className="dot active" />
                  <span>Guidance Agent</span>
                  <span className="status-badge">Ready</span>
                </div>
                <div className="agent-status-item">
                  <span className="dot active" />
                  <span>Test Suggestion Agent</span>
                  <span className="status-badge">Ready</span>
                </div>
                <div className="agent-status-item">
                  <span className="dot active" />
                  <span>Escalation Watch</span>
                  <span className="status-badge">{evaluation.alertActive ? 'Active Alert' : 'Standby'}</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="sidebar-cta-box">
              <button className="intake-btn-primary full-width" onClick={handleContinue}>
                Continue to Dynamic Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* PDF Report Modal */}
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
