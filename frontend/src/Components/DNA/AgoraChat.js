import React, { useState, useEffect, useRef } from 'react';
import AgoraChat from 'agora-chat';
import {
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Shield,
  Bot,
  AlertCircle,
  Activity,
  Download,
  X,
  Phone,
  Video,
} from 'lucide-react';
import './AgoraChat.css';

const AgoraChatRoom = ({
  doctor,
  patientProfile = {},
  evaluation = null,
  agentResults = {},
  uploadedRecords = [],
  onSwitchToCall, // (mode) => void
  onCloseChat,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAutoReportSent, setIsAutoReportSent] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Auto-send patient report summary on chat initiation
  useEffect(() => {
    if (isAutoReportSent) return;

    const patientName = patientProfile.fullName || 'Guest Patient';
    const riskLevel = evaluation?.level || patientProfile.reportRisk || 'Moderate';
    const careLane = evaluation?.lane || 'Routine Genetic Follow-up';

    // 1. Initial automated clinical greeting
    const greetingMsg = {
      id: `msg_sys_1`,
      sender: 'doctor',
      senderName: doctor?.name || 'Genetic Counselor',
      senderAvatar: doctor?.avatar,
      text: `Hello ${patientName}. I have received your GeneGuard genetic intake profile and live risk assessment. How can I assist you today?`,
      timestamp: new Date(Date.now() - 1000 * 60).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    };

    // 2. Automated GeneGuard Assessment Packet sent from patient's app to doctor
    const reportPacketMsg = {
      id: `msg_sys_2`,
      sender: 'patient',
      senderName: patientName,
      isReportPacket: true,
      text: `📄 GeneGuard Genetic Assessment Packet shared automatically.`,
      reportData: {
        patientName,
        age: patientProfile.age || 'N/A',
        bloodGroup: patientProfile.bloodGroup || 'N/A',
        familyHistory: patientProfile.familyHistory || 'No',
        knownDisorder: patientProfile.knownDisorder || 'None reported',
        symptoms: patientProfile.symptoms || 'No symptoms',
        riskLevel,
        careLane,
        uploadedDocsCount: uploadedRecords.length,
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages([greetingMsg, reportPacketMsg]);
    setIsAutoReportSent(true);
  }, [isAutoReportSent, doctor, patientProfile, evaluation, uploadedRecords]);

  // Handle sending a text message
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputValue.trim() && !selectedFile) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: 'patient',
      senderName: patientProfile.fullName || 'Patient',
      text: inputValue.trim(),
      attachment: selectedFile,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setSelectedFile(null);

    // Simulate doctor typing & response
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const doctorReply = generateDoctorReply(inputValue, doctor, evaluation, patientProfile);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_doc_${Date.now()}`,
            sender: 'doctor',
            senderName: doctor?.name || 'Genetic Counselor',
            senderAvatar: doctor?.avatar,
            text: doctorReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'read',
          },
        ]);
      }, 2200);
    }, 800);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileMeta = {
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'doc',
      url: URL.createObjectURL(file),
    };
    setSelectedFile(fileMeta);
  };

  const riskLevel = (evaluation?.level || patientProfile.reportRisk || 'Low').toLowerCase();

  return (
    <div className="agora-chat-wrapper">
      {/* ─── Pinned AI Patient Risk Summary Banner ─── */}
      <div className="pinned-ai-summary-banner">
        <div className="ai-banner-left">
          <div className="ai-bot-badge">
            <Bot size={16} />
            <span>AI Risk Synopsis</span>
          </div>
          <div className="ai-patient-metrics">
            <span>Patient: <strong>{patientProfile.fullName || 'Guest Patient'}</strong> ({patientProfile.age || 'N/A'}y, {patientProfile.sex || 'N/A'})</span>
            <span>Blood: <strong>{patientProfile.bloodGroup || 'N/A'}</strong></span>
            <span>Goal: <strong>{patientProfile.purpose || 'Genetic Assessment'}</strong></span>
          </div>
        </div>

        <div className="ai-banner-right">
          <div className={`risk-pill ${riskLevel}`}>
            <Activity size={14} />
            <span>{evaluation?.level || patientProfile.reportRisk || 'Low'} Risk</span>
          </div>
          <div className="chat-action-quick-btns">
            <button
              className="quick-call-btn audio"
              title="Escalate to Audio Consultation"
              onClick={() => onSwitchToCall && onSwitchToCall('audio')}
            >
              <Phone size={15} />
            </button>
            <button
              className="quick-call-btn video"
              title="Escalate to HD Video Consultation"
              onClick={() => onSwitchToCall && onSwitchToCall('video')}
            >
              <Video size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Chat Messages Container ─── */}
      <div className="chat-messages-container">
        <div className="chat-security-notice">
          <Shield size={14} />
          <span>End-to-End Encrypted Session via Agora Chat &amp; HIPAA Compliant Protocol</span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.sender === 'patient';
          return (
            <div key={msg.id} className={`chat-message-row ${isMe ? 'my-message' : 'other-message'}`}>
              {!isMe && (
                <img
                  src={msg.senderAvatar || doctor?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop'}
                  alt={msg.senderName}
                  className="chat-avatar"
                />
              )}

              <div className="message-bubble-wrap">
                <span className="message-sender-name">{msg.senderName}</span>

                {/* Report Packet Card if Auto-Sent */}
                {msg.isReportPacket ? (
                  <div className="auto-report-packet-card">
                    <div className="report-packet-head">
                      <FileText size={18} className="packet-icon" />
                      <div>
                        <strong>GeneGuard Genetic Assessment Summary</strong>
                        <span>Auto-delivered on session start</span>
                      </div>
                    </div>
                    <div className="report-packet-details">
                      <div><span>Risk Lane:</span> <strong>{msg.reportData.careLane}</strong></div>
                      <div><span>Family History:</span> <strong>{msg.reportData.familyHistory}</strong></div>
                      <div><span>Known Disorder:</span> <strong>{msg.reportData.knownDisorder}</strong></div>
                      <div><span>Symptoms:</span> <strong>{msg.reportData.symptoms}</strong></div>
                      {msg.reportData.uploadedDocsCount > 0 && (
                        <div><span>Attached Records:</span> <strong>{msg.reportData.uploadedDocsCount} documents</strong></div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`message-bubble ${isMe ? 'bubble-patient' : 'bubble-doctor'}`}>
                    {msg.attachment && (
                      <div className="bubble-attachment">
                        {msg.attachment.type === 'image' ? (
                          <img src={msg.attachment.url} alt="Attachment" className="attachment-img" />
                        ) : (
                          <div className="file-attachment-chip">
                            <FileText size={18} />
                            <div>
                              <strong>{msg.attachment.name}</strong>
                              <span>{msg.attachment.size}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <p>{msg.text}</p>
                  </div>
                )}

                <div className="message-meta-row">
                  <span className="msg-timestamp">{msg.timestamp}</span>
                  {isMe && (
                    <span className="msg-status-checks">
                      {msg.status === 'read' ? <CheckCheck size={14} className="read-blue" /> : <Check size={14} />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="chat-message-row other-message">
            <img
              src={doctor?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop'}
              alt={doctor?.name}
              className="chat-avatar"
            />
            <div className="typing-indicator-bubble">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Selected File Preview Bar (before sending) ─── */}
      {selectedFile && (
        <div className="selected-file-preview">
          <div className="file-preview-info">
            <Paperclip size={16} />
            <span>{selectedFile.name} ({selectedFile.size})</span>
          </div>
          <button className="remove-file-btn" onClick={() => setSelectedFile(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ─── Chat Input Bar ─── */}
      <form className="chat-input-bar" onSubmit={handleSendMessage}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        />

        <button
          type="button"
          className="attach-btn"
          title="Attach Medical Report / Image"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={19} />
        </button>

        <input
          type="text"
          placeholder={`Message ${doctor?.name || 'Doctor'}...`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="chat-text-input"
        />

        <button
          type="submit"
          className={`chat-send-btn ${inputValue.trim() || selectedFile ? 'ready' : ''}`}
          disabled={!inputValue.trim() && !selectedFile}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

// Helper: Intelligent clinical response generator for simulated consultation loop
function generateDoctorReply(userInput, doctor, evaluation, patient) {
  const input = (userInput || '').toLowerCase();
  const docName = doctor?.name || 'Doctor';

  if (input.includes('risk') || input.includes('score') || input.includes('high') || input.includes('low')) {
    return `Based on the risk scores evaluated by GeneGuard (${evaluation?.level || 'moderate'} profile), your primary focus should be structured screening for any hereditary variants. I recommend we order a targeted multi-gene panel.`;
  }
  if (input.includes('test') || input.includes('sample') || input.includes('saliva') || input.includes('blood')) {
    return `For ${patient.purpose || 'genetic screening'}, a saliva collection kit or standard EDTA blood sample works accurately. We can arrange home collection for your convenience.`;
  }
  if (input.includes('family') || input.includes('mother') || input.includes('father') || input.includes('history')) {
    return `Family history is a crucial data point in genetic epidemiology. I will cross-reference your 3-generation lineage to look for autosomal dominant or recessive inheritance patterns.`;
  }
  if (input.includes('cost') || input.includes('fee') || input.includes('price')) {
    return `The consultation fee is ${doctor?.fee || 'covered under your plan'}. Any diagnostic test orders will include transparent pricing and insurance pre-authorization support.`;
  }

  return `Thank you for sharing that context. I have reviewed your clinical indicators and agree that focusing on ${patient.purpose || 'preventive genetic health'} will provide clarity. Let me know if you would like to review this over a video consultation.`;
}

export default AgoraChatRoom;
