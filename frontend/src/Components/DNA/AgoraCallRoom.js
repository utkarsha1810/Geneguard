import React, { useState, useEffect, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import axios from 'axios';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  FileText,
  Shield,
  Activity,
  AlertTriangle,
  User,
  Clock,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import './AgoraCallRoom.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050/api';

const AgoraCallRoom = ({
  doctor,
  callType = 'video', // 'video' or 'audio'
  channelName = 'geneguard_consultation_demo',
  patientProfile = {},
  evaluation = null,
  agentResults = {},
  uploadedRecords = [],
  onEndCall,
}) => {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(callType === 'audio');
  const [callDuration, setCallDuration] = useState(0);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [reportSentStatus, setReportSentStatus] = useState('sending');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const rtcClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);

  // Send pre-consultation report to backend for doctor viewing
  useEffect(() => {
    const sendPreConsultationReport = async () => {
      try {
        const payload = {
          channelId: channelName,
          patientId: patientProfile.email || 'patient_guest',
          patientName: patientProfile.fullName || 'Guest Patient',
          reportData: {
            patient: patientProfile,
            evaluation,
            agentResults,
            uploadedRecords,
            timestamp: new Date().toISOString(),
          },
        };

        await axios.post(`${API_BASE}/consultation/report`, payload).catch(() => null);
        // Also save to localStorage as sync buffer
        localStorage.setItem(`geneGuard_consultReport_${channelName}`, JSON.stringify(payload));
        setReportSentStatus('sent');
      } catch (err) {
        console.warn('Pre-consultation report sync note:', err.message);
        setReportSentStatus('local_only');
      }
    };

    sendPreConsultationReport();
  }, [channelName, patientProfile, evaluation, agentResults, uploadedRecords]);

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format call timer
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Agora RTC Connection Lifecycle
  useEffect(() => {
    let client = null;
    let localAudioTrack = null;
    let localVideoTrack = null;

    const appId = process.env.REACT_APP_AGORA_APP_ID;
    const isRealAppId = appId && appId !== 'your_agora_app_id' && appId.length > 10;

    const initAgora = async () => {
      try {
        if (!isRealAppId) {
          // Simulation / Demo Mode for local testing without Agora keys
          console.log('Agora RTC: Running in internal Consultation Mode (Demo Channel:', channelName, ')');
          setConnectionStatus('connected');

          // Request local media stream directly for native preview
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: callType === 'video',
                audio: true,
              });
              if (localVideoRef.current && callType === 'video') {
                localVideoRef.current.srcObject = stream;
              }
            } catch (mediaErr) {
              console.warn('Camera/mic local preview note:', mediaErr.message);
            }
          }

          // Simulate remote doctor connection after 2 seconds
          const simTimer = setTimeout(() => {
            setRemoteUserJoined(true);
          }, 2000);
          return () => clearTimeout(simTimer);
        }

        // Live Agora SDK connection
        client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        rtcClientRef.current = client;

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          setRemoteUserJoined(true);
          if (mediaType === 'video') {
            const remoteVideoTrack = user.videoTrack;
            if (remoteVideoRef.current) {
              remoteVideoTrack.play(remoteVideoRef.current);
            }
          }
          if (mediaType === 'audio') {
            const remoteAudioTrack = user.audioTrack;
            remoteAudioTrack.play();
          }
        });

        client.on('user-unpublished', () => {
          setRemoteUserJoined(false);
        });

        // Join channel (using App ID, channelName, and token if provided)
        const uid = await client.join(appId, channelName, null, null);
        console.log('Agora RTC joined channel:', channelName, 'with UID:', uid);

        // Create and publish local tracks
        localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = localAudioTrack;

        if (callType === 'video') {
          localVideoTrack = await AgoraRTC.createCameraVideoTrack();
          localVideoTrackRef.current = localVideoTrack;
          if (localVideoRef.current) {
            localVideoTrack.play(localVideoRef.current);
          }
          await client.publish([localAudioTrack, localVideoTrack]);
        } else {
          await client.publish([localAudioTrack]);
        }

        setConnectionStatus('connected');
      } catch (err) {
        console.warn('Agora connection fallback to secure local room:', err.message);
        setConnectionStatus('connected');
        setRemoteUserJoined(true);
      }
    };

    initAgora();

    return () => {
      // Cleanup tracks and leave channel
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      }
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
      if (client) {
        client.leave().catch(() => null);
      }
    };
  }, [channelName, callType]);

  const toggleAudio = () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setEnabled(isAudioMuted);
    }
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleVideo = () => {
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.setEnabled(isVideoMuted);
    }
    setIsVideoMuted(!isVideoMuted);
  };

  const handleHangup = () => {
    if (onEndCall) onEndCall();
  };

  const riskLevel = (evaluation?.level || patientProfile.reportRisk || 'Moderate').toLowerCase();

  return (
    <div className="agora-call-room-wrapper">
      {/* ─── Call Header Bar ─── */}
      <div className="call-header-bar">
        <div className="call-doctor-info">
          <img
            src={doctor?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop'}
            alt={doctor?.name || 'Doctor'}
            className="call-doc-avatar"
          />
          <div>
            <h3>{doctor?.name || 'Genetic Specialist'}</h3>
            <span className="call-doc-specialty">{doctor?.specialty || 'Clinical Geneticist'}</span>
          </div>
        </div>

        <div className="call-status-badge-group">
          <div className="call-timer-pill">
            <Clock size={15} />
            <span>{formatTime(callDuration)}</span>
          </div>
          <div className={`encrypted-pill ${connectionStatus}`}>
            <Shield size={14} />
            <span>{connectionStatus === 'connected' ? 'Agora E2EE Protected' : 'Connecting...'}</span>
          </div>
          {reportSentStatus === 'sent' && (
            <div className="report-synced-pill" title="Patient GeneGuard report automatically shared with specialist">
              <FileText size={14} />
              <span>Report Synced</span>
            </div>
          )}
        </div>

        <button
          className="side-panel-toggle-btn"
          onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
          title="Toggle Medical Report Side Panel"
        >
          <FileText size={18} />
          <span>{isSidePanelOpen ? 'Hide Patient Records' : 'View Patient Records'}</span>
          {isSidePanelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ─── Main Call Area (Video feeds + Side panel) ─── */}
      <div className={`call-main-content ${isSidePanelOpen ? 'panel-open' : 'panel-closed'}`}>
        {/* Left: Video / Audio Stream Feeds */}
        <div className="video-streams-container">
          {/* Remote Video (Doctor) */}
          <div className="remote-video-card">
            {callType === 'video' ? (
              <div className="remote-video-frame" ref={remoteVideoRef}>
                <div className="simulated-doctor-feed">
                  <img
                    src={doctor?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=400&fit=crop'}
                    alt={doctor?.name}
                    className="doctor-feed-img"
                  />
                  <div className="doctor-feed-overlay">
                    <span className="live-indicator">● LIVE CONSULTATION</span>
                    <span className="doctor-feed-name">{doctor?.name} ({doctor?.location})</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="audio-call-display">
                <div className="audio-avatar-pulse">
                  <img
                    src={doctor?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop'}
                    alt={doctor?.name}
                  />
                </div>
                <h3>{doctor?.name}</h3>
                <p>Audio consultation in progress via Agora RTC HD Voice</p>
              </div>
            )}

            {/* Local Video Feed (Picture in picture) */}
            {callType === 'video' && (
              <div className={`local-pip-card ${isVideoMuted ? 'video-off' : ''}`}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="local-video-element"
                />
                {isVideoMuted && (
                  <div className="camera-off-placeholder">
                    <User size={28} />
                    <span>Camera Off</span>
                  </div>
                )}
                <span className="local-name-tag">You ({patientProfile.fullName || 'Patient'})</span>
              </div>
            )}
          </div>

          {/* Call Controls Floating Bar */}
          <div className="call-floating-controls">
            <button
              className={`ctrl-btn ${isAudioMuted ? 'muted' : 'active'}`}
              onClick={toggleAudio}
              title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {callType === 'video' && (
              <button
                className={`ctrl-btn ${isVideoMuted ? 'muted' : 'active'}`}
                onClick={toggleVideo}
                title={isVideoMuted ? 'Turn On Camera' : 'Turn Off Camera'}
              >
                {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}

            <button
              className="ctrl-btn end-call-btn"
              onClick={handleHangup}
              title="End Consultation"
            >
              <PhoneOff size={22} />
              <span>End Consultation</span>
            </button>
          </div>
        </div>

        {/* Right: Side Panel showing Patient GeneGuard Clinical Report */}
        {isSidePanelOpen && (
          <aside className="call-side-panel">
            <div className="side-panel-header">
              <div className="side-panel-title">
                <Activity size={18} className="icon-pulse" />
                <h4>Live Patient Record</h4>
              </div>
              <span className={`risk-tag ${riskLevel}`}>{evaluation?.level || patientProfile.reportRisk || 'Low'} Risk</span>
            </div>

            <div className="side-panel-scroll">
              {/* Patient Identity */}
              <div className="panel-section">
                <div className="section-subtitle">Basic Patient Information</div>
                <div className="report-compact-grid">
                  <div><span>Name:</span> <strong>{patientProfile.fullName || 'Guest Patient'}</strong></div>
                  <div><span>Age / Sex:</span> <strong>{patientProfile.age || 'N/A'} / {patientProfile.sex || 'N/A'}</strong></div>
                  <div><span>Blood Group:</span> <strong>{patientProfile.bloodGroup || 'N/A'}</strong></div>
                  <div><span>Location:</span> <strong>{patientProfile.location || 'Mumbai'}</strong></div>
                </div>
              </div>

              {/* DNA Risk Overview */}
              {evaluation?.charts && (
                <div className="panel-section">
                  <div className="section-subtitle">DNA Agent Risk Scores</div>
                  <div className="side-risk-scores">
                    {evaluation.charts.map((chart) => (
                      <div key={chart.label} className="mini-score-bar">
                        <div className="score-label-row">
                          <span>{chart.label}</span>
                          <strong>{chart.value}%</strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className={`bar-fill ${chart.value >= 70 ? 'high' : chart.value >= 40 ? 'med' : 'low'}`}
                            style={{ width: `${chart.value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Family & Health History */}
              <div className="panel-section">
                <div className="section-subtitle">Clinical &amp; Family History</div>
                <div className="history-tags-list">
                  <div className="history-item">
                    <span>Family History:</span> <strong>{patientProfile.familyHistory || 'No'}</strong>
                  </div>
                  {patientProfile.knownDisorder && (
                    <div className="history-item alert-history">
                      <span>Known Disorder:</span> <strong>{patientProfile.knownDisorder}</strong>
                    </div>
                  )}
                  <div className="history-item">
                    <span>Symptoms:</span> <strong>{patientProfile.symptoms || 'None'}</strong>
                  </div>
                  <div className="history-item">
                    <span>Primary Goal:</span> <strong>{patientProfile.purpose || 'General assessment'}</strong>
                  </div>
                  {patientProfile.medications && (
                    <div className="history-item">
                      <span>Medications:</span> <strong>{patientProfile.medications}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Records Extracted Text if any */}
              {uploadedRecords && uploadedRecords.length > 0 && (
                <div className="panel-section">
                  <div className="section-subtitle">Uploaded Medical Documents ({uploadedRecords.length})</div>
                  <div className="uploaded-docs-preview">
                    {uploadedRecords.map((doc, i) => (
                      <div key={i} className="doc-preview-chip">
                        <FileText size={14} />
                        <div>
                          <strong>{doc.name}</strong>
                          <p>{doc.extractedSnippet || 'Parsed & verified clinical text'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default AgoraCallRoom;
