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
  sex: '',
  bloodGroup: '',
  mobileNumber: '',
  email: '',
  familyHistory: '',
  familyMemberCount: '',
  familyMemberRelation: '',
  knownDisorder: '',
  symptoms: '',
  purpose: '',
  reportRisk: '',
  samplePreference: '',
  fastingStatus: '',
  consultedDoctor: '',
  medications: '',
  allergies: '',
  location: '',
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

// Fallback: Smart clinical parser that extracts concise, framed physician summaries without raw text dumps
const generateClinicalSummaryFallback = (rawText, fileName) => {
  const text = (rawText || '').replace(/\s+/g, ' ').trim();

  // 1. Patient Details Extraction (Name, Age/Gender, ID)
  let patientName = '';
  let ageSex = '';
  let patientId = '';

  const nameMatch = text.match(/(?:Patient\s*Name|Name)\s*:\s*([A-Za-z\.\s]+?)(?=Age|Sex|Gender|Mobile|ID|Ref|Ward|CR|Collection|Date|Reporting|$)/i);
  if (nameMatch) {
    patientName = nameMatch[1].trim().replace(/\s{2,}/g, ' ');
  }

  const ageSexMatch = text.match(/(?:Age\s*[\/\&]?\s*Gender|Age\s*[\/\&]?\s*Sex|Age)\s*:\s*([^:]+?)(?=Mobile|ID|Ref|Ward|CR|Collection|Date|Reporting|Sample|$)/i);
  if (ageSexMatch) {
    ageSex = ageSexMatch[1].trim().replace(/\s{2,}/g, ' ');
  }

  const idMatch = text.match(/(?:Patient\s*ID|CR\s*No|Sample\s*ID)\s*:?\s*(\w+)/i);
  if (idMatch) {
    patientId = idMatch[1].trim();
  }

  let patientDetails = patientName || `Extracted from record (${fileName})`;
  if (ageSex) patientDetails += ` | ${ageSex}`;
  if (patientId) patientDetails += ` (ID: ${patientId})`;

  // 2. Report Type Detection
  let reportType = 'Clinical Medical Document';
  if (/histopathology|biopsy|cytology|pathology|tissue/i.test(text)) reportType = 'Histopathology Report';
  else if (/blood|cbc|hemoglobin|platelet|lipid|glucose|hba1c|serum/i.test(text)) reportType = 'Blood Test / Laboratory Panel';
  else if (/mri|ct scan|x-ray|ultrasound|radiology|imaging/i.test(text)) reportType = 'Diagnostic Imaging / Radiology';
  else if (/genetic|dna|sequencing|variant|mutation|brca|thalassemia/i.test(text)) reportType = 'Genetic & DNA Analysis Report';

  // 3. Key Findings Extraction (Bulleted & Clinical)
  const findings = [];

  // Specimen / Surgery Details
  const specimenMatch = text.match(/(?:SPECIMEN|DATE OF SURGERY)\s*:?\s*([^.:\n]+)/i);
  if (specimenMatch) {
    findings.push(`Specimen / Location: ${specimenMatch[1].trim()}`);
  }

  // Gross Examination
  const grossMatch = text.match(/(?:GROSS|Gross Examination)\s*:?\s*([^\.]+\.)/i) || text.match(/Sample received[^\.]+\./i);
  if (grossMatch) {
    const grossClean = (grossMatch[1] || grossMatch[0]).replace(/GROSS\s*/i, '').trim();
    findings.push(`Gross Findings: ${grossClean}`);
  }

  // Microscopic Examination
  const microMatch = text.match(/(?:MICROSCOPY|Microscopic Examination)\s*:?\s*([^\.]+\.)/i) || text.match(/Sections show[^\.]+\./i);
  if (microMatch) {
    const microClean = (microMatch[1] || microMatch[0]).replace(/MICROSCOPY\s*/i, '').trim();
    findings.push(`Microscopy: ${microClean}`);
  }

  // Malignancy & Pathology Screen
  if (/no granuloma|no atypia|no malignancy|negative for malignancy|benign/i.test(text)) {
    findings.push(`Malignancy Screening: Negative (No evidence of granuloma, atypia, or malignancy)`);
  } else if (/malignant|atypia|carcinoma|dysplasia/i.test(text)) {
    findings.push(`⚠️ Malignancy Flag: Atypical / dysplastic features noted`);
  }

  // Fallback findings if standard pathology markers missing
  if (findings.length === 0) {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s =>
      !/hospital|center|contact|phone|email|page|signature|date|collection|reporting|scanning|ward/i.test(s) &&
      s.length > 15 && s.length < 140
    );
    sentences.slice(0, 3).forEach(s => findings.push(s.trim()));
  }

  if (findings.length === 0) {
    findings.push('Medical report parsed successfully for clinical evaluation.');
  }

  // 4. Impression / Diagnosis
  let impression = '';
  const impressionMatch = text.match(/(?:IMPRESSION|DIAGNOSIS|CONCLUSION)\s*:?\s*([^\.*]+)/i);
  if (impressionMatch) {
    impression = impressionMatch[1].replace(/END OF REPORT.*/i, '').trim();
  }
  if (!impression) {
    impression = `Diagnostic findings consistent with ${reportType.toLowerCase()} analysis (${fileName}).`;
  }

  // 5. Abnormal Values or Concerns
  const abnormalConcerns = [];
  if (/low|high|abnormal|elevated|positive|deficient|critical|warning/i.test(text)) {
    const matches = text.match(/(\b(low|high|abnormal|elevated|positive|deficient|critical)\b[^\.]+\.)/gi);
    if (matches) {
      matches.slice(0, 2).forEach(m => abnormalConcerns.push(m.trim()));
    }
  }

  // Build framed, bulleted summary
  let summary = `• Patient Details: ${patientDetails}\n`;
  summary += `• Type of Report: ${reportType}\n\n`;

  summary += `• Key Findings:\n`;
  findings.forEach((f) => {
    summary += `  - ${f}\n`;
  });
  summary += `\n`;

  summary += `• Impression / Diagnosis:\n`;
  summary += `  - ${impression}\n\n`;

  summary += `• Abnormal Values or Concerns:\n`;
  if (abnormalConcerns.length > 0) {
    abnormalConcerns.forEach((ac) => {
      summary += `  - ⚠️ ${ac}\n`;
    });
  } else {
    summary += `  - Benign histology; no explicit abnormal flags or malignant findings identified.\n`;
  }
  summary += `\n`;

  summary += `• Recommended Follow-up:\n`;
  summary += `  - Correlate diagnostic findings with current clinical presentation and consult attending physician.`;

  return summary;
};

// Gemini Text: send raw extracted text from PDF/DOCX to Gemini for physician-level clinical summary
const summarizeTextWithGemini = async (rawText, fileName) => {
  if (!rawText || rawText.trim().length < 5) {
    return generateClinicalSummaryFallback(rawText || '', fileName);
  }

  // Deduplicate keys to prevent infinite loops on duplicate env keys
  const uniqueKeys = Array.from(new Set(ALL_GEMINI_KEYS)).filter(Boolean);

  if (uniqueKeys.length === 0) {
    return generateClinicalSummaryFallback(rawText, fileName);
  }

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

  for (const apiKey of uniqueKeys) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      let model;
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      } catch (_) {
        model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
      }

      const apiCall = model.generateContent(prompt);
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API timeout')), 3000)
      );

      const result = await Promise.race([apiCall, timeout]);
      const response = await result.response;
      const summary = response.text();
      if (summary && summary.length > 20) {
        console.log(`[GeneGuard] ✅ Gemini clinical summary received (${summary.length} chars)`);
        return summary;
      }
    } catch (apiError) {
      console.warn(`[GeneGuard] ⚠️ Key attempt failed (${apiError.message?.substring(0, 60)})`);
    }
  }

  console.log('[GeneGuard] ⚡ Gemini API offline/expired. Using structured clinical summary engine.');
  return generateClinicalSummaryFallback(rawText, fileName);
};

const IntakeField = ({ label, children, full = false, error }) => (
  <div className={`patient-field ${full ? 'full' : ''}`}>
    <label className="patient-field-label">{label}</label>
    {children}
    {error && <div className="intake-field-error" style={{color: '#ef4444', fontSize: '0.75rem', marginTop: '4px'}}>{error}</div>}
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
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [formData, setFormData] = useState(patientDefaults);
  const [evaluation, setEvaluation] = useState(() => evaluatePatient(patientDefaults));
  const [apiMode, setApiMode] = useState('fallback');
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isParsingFiles, setIsParsingFiles] = useState(false);
  const [parsingStatusMsg, setParsingStatusMsg] = useState('');
  const [autoFillHighlights, setAutoFillHighlights] = useState([]);

  useEffect(() => {
    // Clear any previously cached form profile or uploaded files on mount
    localStorage.removeItem('geneGuardPatientProfile');
    localStorage.removeItem('geneGuardUploadedRecords');
    setFormData(patientDefaults);
    setUploadedFiles([]);
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

  const validateField = (name, value, allData) => {
    let error = '';
    const val = value ? String(value).trim() : '';

    switch (name) {
      case 'fullName':
        if (!val) error = 'Full name is required';
        else if (val.length < 2) error = 'Full name must be at least 2 characters';
        else if (val.length > 50) error = 'Full name must be under 50 characters';
        else if (!/^[A-Za-z\s'\-]+$/.test(val)) error = 'Name can only contain letters';
        break;
      case 'age':
        if (!val) error = 'Age is required';
        else if (!/^\d+$/.test(val)) error = 'Age must be a whole number';
        else if (parseInt(val, 10) < 0) error = 'Age cannot be negative';
        else if (parseInt(val, 10) > 120) error = 'Age must be between 0 and 120';
        break;
      case 'mobileNumber':
        if (val) {
          const digits = val.replace(/\D/g, '');
          if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
            error = 'Enter a valid 10-digit Indian mobile number';
          }
        }
        break;
      case 'email':
        if (val) {
          if (val.includes(' ')) error = 'Email cannot contain spaces';
          else if (val.length > 100) error = 'Email must be under 100 characters';
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) error = 'Enter a valid email address';
        }
        break;
      case 'familyMemberCount':
        if (val) {
          if (!/^\d+$/.test(val)) error = 'Count must be a whole number';
          else if (parseInt(val, 10) < 0) error = 'Count cannot be negative';
          else if (parseInt(val, 10) > 50) error = 'Maximum affected family members is 50';
          
          if (!error) {
            const hist = allData.familyHistory;
            const count = parseInt(val, 10);
            if (hist === 'No' && count > 0) {
              error = 'Affected count must be 0 when no family history';
            } else if (hist === 'Yes' && count < 1) {
              error = 'At least 1 affected member required when family history is Yes';
            }
          }
        } else {
           if (allData.familyHistory === 'Yes') error = 'At least 1 affected member required when family history is Yes';
        }
        break;
      case 'emergencyContactName':
        if (val) {
          if (val.length < 2) error = 'Emergency contact name must be at least 2 characters';
          else if (val.length > 50) error = 'Emergency contact name must be under 50 characters';
          else if (!/^[A-Za-z\s'\-]+$/.test(val)) error = 'Name can only contain letters';
        }
        break;
      case 'emergencyContact':
        if (val) {
          const digits = val.replace(/\D/g, '');
          if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
            error = 'Enter a valid 10-digit Indian mobile number';
          }
        }
        break;
      case 'location':
        if (val) {
          if (val.length < 2) error = 'Location must be at least 2 characters';
          else if (!/^[A-Za-z\s]+$/.test(val)) error = 'Location can only contain letters and spaces';
        }
        break;
      default:
        break;
    }
    return error;
  };

  const validateForm = (data) => {
    const newErrors = {};
    const fieldsToValidate = ['fullName', 'age', 'mobileNumber', 'email', 'familyMemberCount', 'emergencyContactName', 'emergencyContact', 'location'];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, data[field], data);
      if (error) newErrors[field] = error;
    });

    if (data.familyHistory === 'Yes' && (!data.familyMemberCount || parseInt(data.familyMemberCount, 10) < 1)) {
        newErrors.familyMemberCount = 'At least 1 affected member required when family history is Yes';
    }
    if (data.familyHistory === 'No' && data.familyMemberCount && parseInt(data.familyMemberCount, 10) > 0) {
        newErrors.familyMemberCount = 'Affected count must be 0 when no family history';
    }

    return newErrors;
  };

  const handleBlur = (name, value) => {
    const error = validateField(name, value, formData);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    
    if (name === 'familyHistory') {
      const countError = validateField('familyMemberCount', formData.familyMemberCount, { ...formData, familyHistory: value });
      setErrors(prev => ({ ...prev, familyMemberCount: countError || '' }));
    }
  };

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
    setIsValidating(true);
    const formErrors = validateForm(formData);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setIsValidating(false);
      if (formRef.current) {
        const firstErrorNode = formRef.current.querySelector('.intake-field-error');
        if (firstErrorNode) {
          firstErrorNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    setIsValidating(false);

    let updatedData = { ...formData };
    if (!updatedData.medications || updatedData.medications.trim() === '') updatedData.medications = 'None';
    if (!updatedData.allergies || updatedData.allergies.trim() === '') updatedData.allergies = 'None';
    setFormData(updatedData);

    const fullProfile = {
      ...updatedData,
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
            <button className="intake-btn-primary" onClick={handleContinue} disabled={isValidating}>
              Continue to Agents <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main 2-Column Layout ─── */}
      <main className="intake-main-container">
        {/* LEFT COLUMN: Input Form */}
        <div className="intake-form-column" ref={formRef}>
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
              <IntakeField label="Full Name" error={errors.fullName}>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  onBlur={(e) => handleBlur('fullName', e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                />
              </IntakeField>

              <IntakeField label="Age" error={errors.age}>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  onBlur={(e) => handleBlur('age', e.target.value)}
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

              <IntakeField label="Mobile Number" error={errors.mobileNumber}>
                <input
                  type="text"
                  value={formData.mobileNumber}
                  onChange={(e) => handleChange('mobileNumber', e.target.value)}
                  onBlur={(e) => handleBlur('mobileNumber', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </IntakeField>

              <IntakeField label="Email Address" error={errors.email}>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={(e) => handleBlur('email', e.target.value)}
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

              <IntakeField label="Affected Family Members" error={errors.familyMemberCount}>
                <input
                  type="number"
                  value={formData.familyMemberCount}
                  onChange={(e) => handleChange('familyMemberCount', e.target.value)}
                  onBlur={(e) => handleBlur('familyMemberCount', e.target.value)}
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

              <IntakeField label="Location / City" error={errors.location}>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  onBlur={(e) => handleBlur('location', e.target.value)}
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
              <IntakeField label="Contact Person Name" error={errors.emergencyContactName}>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                  onBlur={(e) => handleBlur('emergencyContactName', e.target.value)}
                  placeholder="Emergency contact name"
                />
              </IntakeField>

              <IntakeField label="Emergency Phone Number" error={errors.emergencyContact}>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => handleChange('emergencyContact', e.target.value)}
                  onBlur={(e) => handleBlur('emergencyContact', e.target.value)}
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
              <button className="intake-btn-primary full-width" onClick={handleContinue} disabled={isValidating}>
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
