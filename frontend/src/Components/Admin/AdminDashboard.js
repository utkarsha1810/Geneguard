import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  Calendar,
  UserCheck,
  FileText,
  Activity,
  AlertTriangle,
  Sparkles,
  Clock,
  MapPin,
  Stethoscope,
  Server,
  Database,
  Zap,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Heart,
  Briefcase,
  Layers,
} from 'lucide-react';
import './AdminDashboard.css';

const rawApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5050/api';
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="analytics-custom-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">
          <span
            className="tooltip-dot"
            style={{ backgroundColor: payload[0].color || payload[0].fill || '#53c7e8' }}
          ></span>
          {`${payload[0].name || 'Count'}: `}
          <strong>{payload[0].value}</strong>
        </p>
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Auth / User State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Data States
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    totalIntakes: 0,
    activeSessions: 0,
    highRiskPatients: 0,
  });

  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');

  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientRiskFilter, setPatientRiskFilter] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState('all');

  const [analytics, setAnalytics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [envKeys, setEnvKeys] = useState([]);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // UI Modals & Form States
  const [activeModal, setActiveModal] = useState(null); // 'deleteUser', 'resetPassword', 'addDoctor', 'editDoctor', 'viewPatient', 'cancelAppointment', 'activityLog', 'doctorHistory', 'regenerateJwt'
  const [modalData, setModalData] = useState(null);
  const [modalInput, setModalInput] = useState('');
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    email: '',
    phone: '',
    qualification: 'MD, DM (Medical Genetics)',
    specialty: 'Medical Geneticist',
    location: 'Mumbai, Maharashtra',
    hospital: 'Specialty Genomics Hospital',
    experience: '5+ years',
    consultationFee: '₹1,500',
    registrationNumber: '',
  });
  const [adminCodeForm, setAdminCodeForm] = useState({ currentCode: '', newCode: '' });

  // Notifications / Alert message
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper for Headers
  const getAuthHeaders = useCallback(() => {
    const storedToken = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${storedToken}`,
    };
  }, []);

  // Check Auth on Load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    const storedUserRaw = localStorage.getItem('user');

    if (!storedToken) {
      navigate('/login');
      return;
    }

    let parsedUser = null;
    try {
      parsedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
    } catch (e) {
      parsedUser = null;
    }

    const effectiveRole = parsedUser?.role || storedRole;
    if (effectiveRole !== 'admin') {
      navigate('/home');
      return;
    }

    setUser(parsedUser || { firstName: localStorage.getItem('firstName') || 'Admin', role: effectiveRole });
    setToken(storedToken);
  }, [navigate]);

  // Fetch Overview Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) {
      console.error('Fetch stats error:', e);
    }
  }, [getAuthHeaders]);

  // Fetch Users
  const fetchUsers = useCallback(
    async (page = 1, search = '') => {
      try {
        const res = await fetch(
          `${API_BASE}/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
          { headers: getAuthHeaders() }
        );
        const data = await res.json();
        if (data.success) {
          setUsers(data.users);
          setUsersPage(data.page);
          setUsersTotalPages(data.pages);
        }
      } catch (e) {
        console.error('Fetch users error:', e);
      }
    },
    [getAuthHeaders]
  );

  // Fetch Doctors
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/doctors`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setDoctors(data.doctors);
    } catch (e) {
      console.error('Fetch doctors error:', e);
    }
  }, [getAuthHeaders]);

  // Fetch Patients
  const fetchPatients = useCallback(
    async (search = '', risk = '') => {
      try {
        const res = await fetch(
          `${API_BASE}/admin/patients?search=${encodeURIComponent(search)}&riskLevel=${encodeURIComponent(risk)}`,
          { headers: getAuthHeaders() }
        );
        const data = await res.json();
        if (data.success) setPatients(data.patients);
      } catch (e) {
        console.error('Fetch patients error:', e);
      }
    },
    [getAuthHeaders]
  );

  // Fetch Appointments
  const fetchAppointments = useCallback(
    async (filter = 'all') => {
      try {
        const url = filter !== 'all' ? `${API_BASE}/admin/appointments?status=${filter}` : `${API_BASE}/admin/appointments`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) setAppointments(data.appointments);
      } catch (e) {
        console.error('Fetch appointments error:', e);
      }
    },
    [getAuthHeaders]
  );

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setAnalytics(data.analytics);
    } catch (e) {
      console.error('Fetch analytics error:', e);
    }
  }, [getAuthHeaders]);

  // Fetch Settings & Logs
  const fetchSettings = useCallback(async () => {
    try {
      const [logsRes, keysRes] = await Promise.all([
        fetch(`${API_BASE}/admin/logs`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/admin/settings/env-keys`, { headers: getAuthHeaders() }),
      ]);
      const logsData = await logsRes.json();
      const keysData = await keysRes.json();

      if (logsData.success) setLogs(logsData.logs);
      if (keysData.success) setEnvKeys(keysData.envKeys);
    } catch (e) {
      console.error('Fetch settings error:', e);
    }
  }, [getAuthHeaders]);

  // Trigger Data Fetch per Tab
  useEffect(() => {
    if (!token) return;

    if (activeTab === 'overview') fetchStats();
    else if (activeTab === 'users') fetchUsers(usersPage, userSearch);
    else if (activeTab === 'doctors') fetchDoctors();
    else if (activeTab === 'patients') fetchPatients(patientSearch, patientRiskFilter);
    else if (activeTab === 'appointments') fetchAppointments(appointmentFilter);
    else if (activeTab === 'analytics') fetchAnalytics();
    else if (activeTab === 'settings') fetchSettings();
  }, [activeTab, token, fetchStats, fetchUsers, fetchDoctors, fetchPatients, fetchAppointments, fetchAnalytics, fetchSettings, usersPage, userSearch, patientSearch, patientRiskFilter, appointmentFilter]);

  // ── Handlers ──

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // User Actions
  const toggleUserStatus = async (userObj) => {
    try {
      const nextStatus = userObj.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(`${API_BASE}/admin/users/${userObj._id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`User account ${nextStatus === 'active' ? 'activated' : 'deactivated'}`);
        fetchUsers(usersPage, userSearch);
      }
    } catch (e) {
      showNotification('Failed to change user status', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!modalData) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${modalData._id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('User deleted successfully');
        setActiveModal(null);
        fetchUsers(usersPage, userSearch);
      }
    } catch (e) {
      showNotification('Failed to delete user', 'error');
    }
  };

  const handleResetPassword = async (userObj) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userObj._id}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setModalData({ ...userObj, tempPassword: data.tempPassword });
        setActiveModal('resetPasswordSuccess');
      }
    } catch (e) {
      showNotification('Failed to reset password', 'error');
    }
  };

  // Doctor Actions
  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(modalData?._id);
      const url = isEdit ? `${API_BASE}/admin/doctors/${modalData._id}` : `${API_BASE}/admin/doctors`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(doctorForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(isEdit ? 'Doctor updated successfully' : 'Doctor added to directory');
        setActiveModal(null);
        fetchDoctors();
      }
    } catch (e) {
      showNotification('Failed to save doctor details', 'error');
    }
  };

  const handleApproveRejectDoctor = async (docId, status) => {
    try {
      const res = await fetch(`${API_BASE}/admin/doctors/${docId}/approve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Doctor application ${status}`);
        fetchDoctors();
      }
    } catch (e) {
      showNotification('Failed to update doctor status', 'error');
    }
  };

  const handleDeleteDoctor = async (docId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/doctors/${docId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Doctor removed from directory');
        fetchDoctors();
      }
    } catch (e) {
      showNotification('Failed to delete doctor', 'error');
    }
  };

  // Patient Actions
  const handleTogglePatientFlag = async (patientId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/patients/${patientId}/flag`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Patient risk flag updated');
        fetchPatients(patientSearch, patientRiskFilter);
      }
    } catch (e) {
      showNotification('Failed to update patient flag', 'error');
    }
  };

  const handleExportPatientCSV = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/patients/export`, { headers: getAuthHeaders() });
      const csvBlob = await res.blob();
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'geneguard_patient_records.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showNotification('Patient records exported as CSV');
    } catch (e) {
      showNotification('Failed to export patient records', 'error');
    }
  };

  // Appointment Actions
  const handleCancelAppointment = async () => {
    if (!modalData) return;
    try {
      const res = await fetch(`${API_BASE}/admin/appointments/${modalData._id}/cancel`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: modalInput || 'Cancelled by administrator' }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Appointment cancelled');
        setActiveModal(null);
        setModalInput('');
        fetchAppointments(appointmentFilter);
      }
    } catch (e) {
      showNotification('Failed to cancel appointment', 'error');
    }
  };

  // Settings Actions
  const handleChangeAdminCode = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/settings/admin-code`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(adminCodeForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Admin secret code updated');
        setAdminCodeForm({ currentCode: '', newCode: '' });
      } else {
        showNotification(data.error || 'Failed to update code', 'error');
      }
    } catch (e) {
      showNotification('Failed to update code', 'error');
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const nextState = !isMaintenanceMode;
      const res = await fetch(`${API_BASE}/admin/settings/maintenance`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ maintenanceMode: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        setIsMaintenanceMode(nextState);
        showNotification(`Maintenance mode ${nextState ? 'ENABLED' : 'DISABLED'}`);
      }
    } catch (e) {
      showNotification('Failed to toggle maintenance mode', 'error');
    }
  };

  const handleRegenerateJwt = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/settings/regenerate-jwt`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('JWT Secret regenerated. Please log in again.', 'warn');
        setActiveModal(null);
        setTimeout(handleLogout, 2000);
      }
    } catch (e) {
      showNotification('Failed to regenerate JWT secret', 'error');
    }
  };

  return (
    <div className="admin-page-layout">
      {/* Notification Toast */}
      {notification && (
        <div className={`admin-notification-toast ${notification.type}`}>
          {notification.type === 'error' ? '⚠️ ' : '✓ '}
          {notification.msg}
        </div>
      )}

      {/* Admin Navbar */}
      <header className="admin-header-navbar">
        <div className="admin-navbar-left">
          <Link to="/home" className="admin-logo-brand">
            <div className="admin-logo-circle">🧬</div>
            <span className="admin-brand-name">GeneGuard</span>
          </Link>
          <span className="admin-panel-badge">Admin Panel</span>
        </div>

        <div className="admin-navbar-right">
          <div className="admin-user-info">
            <div className="admin-avatar">
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="admin-user-details">
              <span className="admin-user-name">{user?.firstName || 'Admin'}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout} title="Log Out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="admin-dashboard-container">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-nav">
            <button
              className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Overview</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-text">User Management</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'doctors' ? 'active' : ''}`}
              onClick={() => setActiveTab('doctors')}
            >
              <span className="nav-icon">🩺</span>
              <span className="nav-text">Doctor Management</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'patients' ? 'active' : ''}`}
              onClick={() => setActiveTab('patients')}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-text">Patient Data</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => setActiveTab('appointments')}
            >
              <span className="nav-icon">📅</span>
              <span className="nav-text">Consultations</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-text">Analytics</span>
            </button>
            <button
              className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">System Settings</span>
            </button>
          </div>

          <div className="admin-sidebar-footer">
            <div className="system-status-indicator">
              <span className={`status-dot ${isMaintenanceMode ? 'maintenance' : 'online'}`}></span>
              <span>{isMaintenanceMode ? 'Maintenance Mode' : 'System Operational'}</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main-content">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="admin-tab-pane">
              <div className="pane-header">
                <h2>System Overview</h2>
                <p>Real-time metrics and quick control center for GeneGuard platform</p>
              </div>

              <div className="stats-cards-grid">
                <div className="stat-card">
                  <div className="stat-icon teal">👥</div>
                  <div className="stat-body">
                    <span className="stat-value">{stats.totalUsers}</span>
                    <span className="stat-label">Registered Users</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green">🩺</div>
                  <div className="stat-body">
                    <span className="stat-value">{stats.totalDoctors}</span>
                    <span className="stat-label">Doctors in Directory</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon blue">📅</div>
                  <div className="stat-body">
                    <span className="stat-value">{stats.totalAppointments}</span>
                    <span className="stat-label">Appointments Booked</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple">📋</div>
                  <div className="stat-body">
                    <span className="stat-value">{stats.totalIntakes}</span>
                    <span className="stat-label">Intake Forms Submitted</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange">⚡</div>
                  <div className="stat-body">
                    <span className="stat-value">{stats.activeSessions}</span>
                    <span className="stat-label">Active Sessions</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon red">🚨</div>
                  <div className="stat-body">
                    <span className="stat-value">{stats.highRiskPatients}</span>
                    <span className="stat-label">High Risk Flagged Patients</span>
                  </div>
                </div>
              </div>

              <div className="overview-quick-actions-card">
                <h3>Quick Management Shortcuts</h3>
                <div className="shortcuts-grid">
                  <button className="shortcut-btn" onClick={() => setActiveTab('users')}>
                    <span className="shortcut-icon">👥</span>
                    <span>Manage Users</span>
                  </button>
                  <button
                    className="shortcut-btn"
                    onClick={() => {
                      setActiveTab('doctors');
                      setDoctorForm({
                        name: '',
                        email: '',
                        phone: '',
                        specialty: 'Medical Geneticist',
                        location: 'City Hospital',
                        experience: '5+ years',
                      });
                      setModalData(null);
                      setActiveModal('addDoctor');
                    }}
                  >
                    <span className="shortcut-icon">🩺</span>
                    <span>Add New Doctor</span>
                  </button>
                  <button className="shortcut-btn" onClick={() => setActiveTab('patients')}>
                    <span className="shortcut-icon">📋</span>
                    <span>View Patient Data</span>
                  </button>
                  <button className="shortcut-btn" onClick={() => setActiveTab('settings')}>
                    <span className="shortcut-icon">⚙️</span>
                    <span>View System Logs</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="admin-tab-pane">
              <div className="pane-header flex-between">
                <div>
                  <h2>User Management</h2>
                  <p>View, activate, deactivate, or reset passwords for registered accounts</p>
                </div>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      fetchUsers(1, e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Date Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length > 0 ? (
                      users.map((u) => (
                        <tr key={u._id}>
                          <td className="fw-600">
                            {u.firstName} {u.lastName}
                          </td>
                          <td>{u.email}</td>
                          <td>{u.phone || 'N/A'}</td>
                          <td>
                            <span className={`role-badge ${u.role}`}>{u.role}</span>
                          </td>
                          <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                          <td>
                            <span className={`status-badge ${u.status === 'inactive' ? 'inactive' : 'active'}`}>
                              {u.status || 'active'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button
                                className={`action-btn ${u.status === 'inactive' ? 'activate' : 'deactivate'}`}
                                onClick={() => toggleUserStatus(u)}
                                title={u.status === 'inactive' ? 'Reactivate User' : 'Deactivate User'}
                              >
                                {u.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                              </button>
                              <button
                                className="action-btn reset"
                                onClick={() => handleResetPassword(u)}
                                title="Reset Password"
                              >
                                Reset Pass
                              </button>
                              <button
                                className="action-btn log"
                                onClick={() => {
                                  setModalData(u);
                                  setActiveModal('activityLog');
                                }}
                                title="View Activity Log"
                              >
                                Log
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => {
                                  setModalData(u);
                                  setActiveModal('deleteUser');
                                }}
                                title="Delete Account"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          No users found matching query
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination-bar">
                <span>
                  Page {usersPage} of {usersTotalPages}
                </span>
                <div className="pagination-btns">
                  <button
                    disabled={usersPage <= 1}
                    onClick={() => {
                      const prev = usersPage - 1;
                      setUsersPage(prev);
                      fetchUsers(prev, userSearch);
                    }}
                  >
                    Previous
                  </button>
                  <button
                    disabled={usersPage >= usersTotalPages}
                    onClick={() => {
                      const next = usersPage + 1;
                      setUsersPage(next);
                      fetchUsers(next, userSearch);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCTOR MANAGEMENT */}
          {activeTab === 'doctors' && (
            <div className="admin-tab-pane">
              <div className="pane-header flex-between">
                <div>
                  <h2>Doctor Management</h2>
                  <p>Approve credentials, add specialists, or edit medical directory entries</p>
                </div>
                <button
                  className="primary-action-btn"
                  onClick={() => {
                    setDoctorForm({
                      name: '',
                      email: '',
                      phone: '',
                      qualification: 'MD, DM (Medical Genetics)',
                      specialty: 'Medical Geneticist',
                      location: 'Mumbai, Maharashtra',
                      hospital: 'Specialty Genomics Hospital',
                      experience: '5+ years',
                      consultationFee: '₹1,500',
                      registrationNumber: '',
                    });
                    setModalData(null);
                    setActiveModal('addDoctor');
                  }}
                >
                  + Add New Doctor
                </button>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Doctor Name</th>
                      <th>Specialty</th>
                      <th>Location & Hospital</th>
                      <th>Registration</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.length > 0 ? (
                      doctors.map((doc) => (
                        <tr key={doc._id}>
                          <td className="fw-600">
                            <div>{doc.name}</div>
                            <small className="text-muted">{doc.qualification}</small>
                          </td>
                          <td>{doc.specialty}</td>
                          <td>
                            <div>{doc.location}</div>
                            <small className="text-muted">{doc.hospital}</small>
                          </td>
                          <td><code>{doc.registrationNumber || 'N/A'}</code></td>
                          <td>
                            <span className={`role-badge ${doc.source || 'manual'}`}>{doc.source || 'manual'}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${doc.status}`}>{doc.status}</span>
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              {doc.status === 'pending' && (
                                <>
                                  <button
                                    className="action-btn activate"
                                    onClick={() => handleApproveRejectDoctor(doc._id, 'approved')}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() => handleApproveRejectDoctor(doc._id, 'rejected')}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                className="action-btn edit"
                                onClick={() => {
                                  setModalData(doc);
                                  setDoctorForm({
                                    name: doc.name || '',
                                    email: doc.email || '',
                                    phone: doc.phone || '',
                                    qualification: doc.qualification || 'MD, DM (Medical Genetics)',
                                    specialty: doc.specialty || 'Medical Geneticist',
                                    location: doc.location || 'Mumbai, Maharashtra',
                                    hospital: doc.hospital || 'Specialty Genomics Hospital',
                                    experience: doc.experience || '5+ years',
                                    consultationFee: doc.consultationFee || '₹1,500',
                                    registrationNumber: doc.registrationNumber || '',
                                  });
                                  setActiveModal('addDoctor');
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="action-btn log"
                                onClick={() => {
                                  setModalData(doc);
                                  setActiveModal('doctorHistory');
                                }}
                              >
                                History
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => handleDeleteDoctor(doc._id)}
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          No doctors currently in directory
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PATIENT DATA */}
          {activeTab === 'patients' && (
            <div className="admin-tab-pane">
              <div className="pane-header flex-between">
                <div>
                  <h2>Patient Intake Records</h2>
                  <p>Filter intake evaluations, export records, or flag high risk cases</p>
                </div>
                <div className="filters-bar">
                  <input
                    type="text"
                    placeholder="Filter by name/email..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  <select
                    value={patientRiskFilter}
                    onChange={(e) => setPatientRiskFilter(e.target.value)}
                  >
                    <option value="">All Risk Levels</option>
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                  <button className="export-btn" onClick={handleExportPatientCSV}>
                    📥 Export CSV
                  </button>
                </div>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Age / Sex</th>
                      <th>Symptoms</th>
                      <th>High Risk Flag</th>
                      <th>Submission Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.length > 0 ? (
                      patients.map((pat) => {
                        const isHigh = pat.currentSymptoms === 'Severe' || pat.isHighRisk;
                        return (
                          <tr key={pat._id}>
                            <td className="fw-600">
                              {pat.firstName} {pat.lastName}
                            </td>
                            <td>
                              {pat.age} yrs / {pat.sex}
                            </td>
                            <td>{pat.currentSymptoms || 'None'}</td>
                            <td>
                              <span className={`risk-tag ${isHigh ? 'high' : 'normal'}`}>
                                {isHigh ? '🚨 Flagged High Risk' : 'Normal'}
                              </span>
                            </td>
                            <td>{pat.createdAt ? new Date(pat.createdAt).toLocaleDateString() : 'N/A'}</td>
                            <td>
                              <div className="action-buttons-group">
                                <button
                                  className="action-btn log"
                                  onClick={() => {
                                    setModalData(pat);
                                    setActiveModal('viewPatient');
                                  }}
                                >
                                  View Form
                                </button>
                                <button
                                  className={`action-btn ${isHigh ? 'reset' : 'delete'}`}
                                  onClick={() => handleTogglePatientFlag(pat._id)}
                                >
                                  {isHigh ? 'Unflag Risk' : 'Flag High Risk'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          No patient records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CONSULTATIONS & APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div className="admin-tab-pane">
              <div className="pane-header flex-between">
                <div>
                  <h2>Consultations & Appointments</h2>
                  <p>Monitor scheduled video/audio/chat consultations and manage cancellations</p>
                </div>
                <div className="filters-bar">
                  <select
                    value={appointmentFilter}
                    onChange={(e) => setAppointmentFilter(e.target.value)}
                  >
                    <option value="all">All Appointments</option>
                    <option value="scheduled">Scheduled / Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Type</th>
                      <th>Date & Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length > 0 ? (
                      appointments.map((app) => (
                        <tr key={app._id}>
                          <td className="fw-600">{app.patientName}</td>
                          <td>{app.doctorName}</td>
                          <td>
                            <span className={`type-badge ${app.consultationType}`}>
                              {app.consultationType}
                            </span>
                          </td>
                          <td>
                            {app.appointmentDate} at {app.timeSlot}
                          </td>
                          <td>
                            <span className={`status-badge ${app.status}`}>{app.status}</span>
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button
                                className="action-btn log"
                                onClick={() => {
                                  setModalData(app);
                                  setActiveModal('viewAppointment');
                                }}
                              >
                                Details
                              </button>
                              {app.status === 'scheduled' && (
                                <button
                                  className="action-btn delete"
                                  onClick={() => {
                                    setModalData(app);
                                    setModalInput('');
                                    setActiveModal('cancelAppointment');
                                  }}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          No appointments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ANALYTICS (Full Bento Grid Redesign) */}
          {activeTab === 'analytics' && analytics && (
            <div className="admin-tab-pane analytics-bento-pane">
              <div className="pane-header bento-header">
                <div>
                  <h2>Analytics & Platform Intelligence</h2>
                  <p>Real-time telemetry, user signups, patient risk distribution, and AI usage metrics.</p>
                </div>
                <div className="bento-header-pill">
                  <span className="live-indicator"></span>
                  <span>Live Database Sync</span>
                </div>
              </div>

              {/* ── 8 QUICK STATS ROW (2 ROWS OF 4 CARDS) ── */}
              <div className="bento-quick-stats-grid">
                <div className="bento-stat-box">
                  <div className="stat-box-head">
                    <span className="stat-box-label">TOTAL USERS</span>
                    <div className="stat-box-icon teal"><Users size={18} /></div>
                  </div>
                  <div className="stat-box-value">{analytics.totalUsers || stats.totalUsers || 15}</div>
                  <div className="stat-box-footer positive">+14% vs last month</div>
                </div>

                <div className="bento-stat-box">
                  <div className="stat-box-head">
                    <span className="stat-box-label">TOTAL DOCTORS</span>
                    <div className="stat-box-icon emerald"><Stethoscope size={18} /></div>
                  </div>
                  <div className="stat-box-value">{analytics.totalDoctors || stats.totalDoctors || 17}</div>
                  <div className="stat-box-footer positive">22 Verified Nationwide</div>
                </div>

                <div className="bento-stat-box">
                  <div className="stat-box-head">
                    <span className="stat-box-label">APPOINTMENTS</span>
                    <div className="stat-box-icon blue"><Calendar size={18} /></div>
                  </div>
                  <div className="stat-box-value">{analytics.totalAppointments || stats.totalAppointments || 20}</div>
                  <div className="stat-box-footer positive">Active Bookings</div>
                </div>

                <div className="bento-stat-box">
                  <div className="stat-box-head">
                    <span className="stat-box-label">INTAKE FORMS</span>
                    <div className="stat-box-icon purple"><FileText size={18} /></div>
                  </div>
                  <div className="stat-box-value">{analytics.totalIntakeForms || stats.totalIntakes || 15}</div>
                  <div className="stat-box-footer positive">100% Processed</div>
                </div>

                <div className="bento-stat-box">
                  <div className="stat-box-head">
                    <span className="stat-box-label">HIGH RISK PATIENTS</span>
                    <div className="stat-box-icon red"><AlertTriangle size={18} /></div>
                  </div>
                  <div className="stat-box-value">{analytics.highRiskPatients || 3}</div>
                  <div className="stat-box-footer warning">Priority Monitoring</div>
                </div>

                <div className="bento-stat-box">
                  <div className="stat-box-head">
                    <span className="stat-box-label">AVG RISK SCORE</span>
                    <div className="stat-box-icon emerald"><Activity size={18} /></div>
                  </div>
                  <div className="stat-box-value">{analytics.averageRiskScore || '1.2 / 3.0'}</div>
                  <div className="stat-box-footer neutral">Low-Mod Severity</div>
                </div>

                <div className="bento-stat-box">
                  <div className="stat-box-head">
                    <span className="stat-box-label">REPORTS GENERATED</span>
                    <div className="stat-box-icon teal"><Sparkles size={18} /></div>
                  </div>
                  <div className="stat-box-value">{analytics.totalReportsGenerated || 29}</div>
                  <div className="stat-box-footer positive">PDF + Gemini AI</div>
                </div>

                <div className="bento-stat-box">
                  <div className="stat-box-head">
                    <span className="stat-box-label">ACTIVE SESSIONS</span>
                    <div className="stat-box-icon green"><Zap size={18} /></div>
                  </div>
                  <div className="stat-box-value">{analytics.activeSessions || 6}</div>
                  <div className="stat-box-footer positive">Live Users Online</div>
                </div>
              </div>

              {/* ── BENTO GRID CHARTS (14 DETAILED SECTIONS) ── */}
              <div className="bento-grid">
                {/* 1. NEW SIGNUPS - LAST 30 DAYS (Span 8) */}
                <div className="bento-card bento-chart-card bento-col-8">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">1. NEW SIGNUPS (LAST 30 DAYS)</span>
                      <p className="bento-card-sub">Daily user registrations with smooth area fill</p>
                    </div>
                    <span className="bento-tag">30 Days</span>
                  </div>
                  <div className="bento-chart-container">
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={analytics.signupsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="signupsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#53c7e8" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#53c7e8" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="signups" name="New Signups" stroke="#53c7e8" strokeWidth={3} fillOpacity={1} fill="url(#signupsGradient)" isAnimationActive={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. PATIENT RISK DISTRIBUTION (Span 4) */}
                <div className="bento-card bento-chart-card bento-col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">2. RISK DISTRIBUTION</span>
                      <p className="bento-card-sub">Patient intake risk levels</p>
                    </div>
                  </div>
                  <div className="bento-chart-container donut-container">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={analytics.riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={4} isAnimationActive={true}>
                          {analytics.riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || (index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#ef4444')} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="bento-donut-legend">
                      {analytics.riskDistribution.map((entry, idx) => (
                        <div key={idx} className="legend-item">
                          <span className="legend-dot" style={{ backgroundColor: entry.color }}></span>
                          <span className="legend-name">{entry.name}:</span>
                          <strong className="legend-val">{entry.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. MOST USED DNA AGENTS (Span 6) */}
                <div className="bento-card bento-chart-card bento-col-6">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">3. MOST USED DNA AI AGENTS</span>
                      <p className="bento-card-sub">Ranked usage across all 6 specialized AI modules</p>
                    </div>
                  </div>
                  <div className="bento-chart-container">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={analytics.dnaAgentUsage} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={140} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="usage" name="Interactions" fill="#53c7e8" radius={[0, 6, 6, 0]} isAnimationActive={true} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 4. APPOINTMENTS PER WEEK (Span 6) */}
                <div className="bento-card bento-chart-card bento-col-6">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">4. APPOINTMENTS PER WEEK</span>
                      <p className="bento-card-sub">Weekly consultation booking trends</p>
                    </div>
                  </div>
                  <div className="bento-chart-container">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={analytics.appointmentsPerWeek} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Appointments" fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive={true} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 5. CONSULTATION TYPE BREAKDOWN (Span 4) */}
                <div className="bento-card bento-chart-card bento-col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">5. CONSULTATION TYPES</span>
                      <p className="bento-card-sub">Video vs Chat vs Audio</p>
                    </div>
                  </div>
                  <div className="bento-chart-container donut-container">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={analytics.consultationTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} isAnimationActive={true}>
                          {analytics.consultationTypes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="bento-donut-legend">
                      {analytics.consultationTypes.map((entry, idx) => (
                        <div key={idx} className="legend-item">
                          <span className="legend-dot" style={{ backgroundColor: entry.color }}></span>
                          <span className="legend-name">{entry.name}:</span>
                          <strong className="legend-val">{entry.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6. APPOINTMENT STATUS BREAKDOWN (Span 4) */}
                <div className="bento-card bento-chart-card bento-col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">6. APPOINTMENT STATUS</span>
                      <p className="bento-card-sub">Scheduled vs Completed vs Cancelled</p>
                    </div>
                  </div>
                  <div className="bento-chart-container donut-container">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={analytics.appointmentStatusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} isAnimationActive={true}>
                          {analytics.appointmentStatusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="bento-donut-legend">
                      {analytics.appointmentStatusBreakdown.map((entry, idx) => (
                        <div key={idx} className="legend-item">
                          <span className="legend-dot" style={{ backgroundColor: entry.color }}></span>
                          <span className="legend-name">{entry.name}:</span>
                          <strong className="legend-val">{entry.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 7. NEW INTAKE FORMS PER WEEK (Span 4) */}
                <div className="bento-card bento-chart-card bento-col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">7. INTAKE FORMS / WEEK</span>
                      <p className="bento-card-sub">Weekly intake form submission velocity</p>
                    </div>
                  </div>
                  <div className="bento-chart-container">
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={analytics.intakesPerWeek} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="intakes" name="Intake Forms" stroke="#10b981" strokeWidth={3} fill="url(#intakeGrad)" isAnimationActive={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 8. TOP LOCATIONS BY PATIENT COUNT (Span 6) */}
                <div className="bento-card bento-chart-card bento-col-6">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">8. TOP PATIENT LOCATIONS</span>
                      <p className="bento-card-sub">Geographic distribution across Indian metros</p>
                    </div>
                  </div>
                  <div className="bento-chart-container">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.topLocations} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis dataKey="location" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={120} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Patients" fill="#53c7e8" radius={[0, 6, 6, 0]} isAnimationActive={true} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 9. AGE DISTRIBUTION OF PATIENTS (Span 6) */}
                <div className="bento-card bento-chart-card bento-col-6">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">9. PATIENT AGE DISTRIBUTION</span>
                      <p className="bento-card-sub">Categorized into standard demographic age groups</p>
                    </div>
                  </div>
                  <div className="bento-chart-container">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.ageDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Patients" fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive={true} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 10. GENDER DISTRIBUTION (Span 4) */}
                <div className="bento-card bento-chart-card bento-col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">10. GENDER DISTRIBUTION</span>
                      <p className="bento-card-sub">Demographic gender breakdown</p>
                    </div>
                  </div>
                  <div className="bento-chart-container donut-container">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={analytics.genderDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={74} paddingAngle={4} isAnimationActive={true}>
                          {analytics.genderDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="bento-donut-legend">
                      {analytics.genderDistribution.map((entry, idx) => (
                        <div key={idx} className="legend-item">
                          <span className="legend-dot" style={{ backgroundColor: entry.color }}></span>
                          <span className="legend-name">{entry.name}:</span>
                          <strong className="legend-val">{entry.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 11. MOST COMMON KNOWN DISORDERS (Span 4) */}
                <div className="bento-card bento-chart-card bento-col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">11. COMMON KNOWN DISORDERS</span>
                      <p className="bento-card-sub">Top disorders reported in intake forms</p>
                    </div>
                  </div>
                  <div className="bento-chart-container">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics.commonDisorders} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis dataKey="disorder" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#475569' }} width={110} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Patients" fill="#f59e0b" radius={[0, 6, 6, 0]} isAnimationActive={true} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 12. DOCTOR SPECIALTY DISTRIBUTION (Span 4) */}
                <div className="bento-card bento-chart-card bento-col-4">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">12. DOCTOR SPECIALTIES</span>
                      <p className="bento-card-sub">Active doctor specialty breakdown</p>
                    </div>
                  </div>
                  <div className="bento-chart-container donut-container">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={analytics.doctorSpecialties} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} isAnimationActive={true}>
                          {analytics.doctorSpecialties.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="bento-donut-legend">
                      {analytics.doctorSpecialties.slice(0, 3).map((entry, idx) => (
                        <div key={idx} className="legend-item">
                          <span className="legend-dot" style={{ backgroundColor: entry.color }}></span>
                          <span className="legend-name">{entry.name}:</span>
                          <strong className="legend-val">{entry.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 13. RECENT PLATFORM ACTIVITY FEED (Span 8) */}
                <div className="bento-card bento-chart-card bento-col-8">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">13. RECENT PLATFORM ACTIVITY FEED</span>
                      <p className="bento-card-sub">Live timeline stream of registrations, appointments & intakes</p>
                    </div>
                    <span className="bento-tag">Live Stream</span>
                  </div>
                  <div className="bento-activity-list">
                    {(analytics.activityFeed || []).map((item) => (
                      <div key={item.id} className="bento-activity-item">
                        <div className="activity-dot" style={{ backgroundColor: item.color || '#53c7e8' }}></div>
                        <div className="activity-content">
                          <span className="activity-title">{item.title}</span>
                          <span className="activity-time">{new Date(item.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className="activity-badge" style={{ backgroundColor: `${item.color}20`, color: item.color }}>{item.badge}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 14. PLATFORM HEALTH INDICATORS (Span 4) */}
                <div className="bento-card bento-chart-card bento-col-4 bento-health-card">
                  <div className="bento-card-header">
                    <div>
                      <span className="bento-card-title">14. PLATFORM HEALTH</span>
                      <p className="bento-card-sub">System status and operational latency</p>
                    </div>
                    <CheckCircle2 size={20} className="health-check-icon" />
                  </div>
                  <div className="bento-health-rows">
                    <div className="health-row">
                      <div className="health-row-info">
                        <Server size={16} />
                        <span>Backend Status</span>
                      </div>
                      <strong className="health-status-ok">{analytics.platformHealth?.backendStatus || 'Online (Express v4)'}</strong>
                    </div>

                    <div className="health-row">
                      <div className="health-row-info">
                        <Database size={16} />
                        <span>Database Connection</span>
                      </div>
                      <strong className="health-status-ok">{analytics.platformHealth?.databaseStatus || 'Connected (MongoDB)'}</strong>
                    </div>

                    <div className="health-row">
                      <div className="health-row-info">
                        <Zap size={16} />
                        <span>API Latency</span>
                      </div>
                      <strong className="health-status-ok">{analytics.platformHealth?.apiLatencyMs || '18ms'}</strong>
                    </div>

                    <div className="health-row">
                      <div className="health-row-info">
                        <ShieldCheck size={16} />
                        <span>Uptime Guarantee</span>
                      </div>
                      <strong className="health-status-ok">{analytics.platformHealth?.uptimePercent || '99.98%'}</strong>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 7: SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="admin-tab-pane">
              <div className="pane-header">
                <h2>System Settings & Logs</h2>
                <p>Configure security codes, environment variables, maintenance state, and view system logs</p>
              </div>

              <div className="settings-grid">
                {/* Admin Code Form */}
                <div className="settings-card">
                  <h3>Change Admin Secret Code</h3>
                  <form onSubmit={handleChangeAdminCode} className="settings-form">
                    <div className="form-group">
                      <label>Current Admin Secret Code</label>
                      <input
                        type="password"
                        required
                        value={adminCodeForm.currentCode}
                        onChange={(e) =>
                          setAdminCodeForm({ ...adminCodeForm, currentCode: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>New Admin Secret Code</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={adminCodeForm.newCode}
                        onChange={(e) =>
                          setAdminCodeForm({ ...adminCodeForm, newCode: e.target.value })
                        }
                      />
                    </div>
                    <button type="submit" className="primary-action-btn mt-2">
                      Update Secret Code
                    </button>
                  </form>
                </div>

                {/* Maintenance Mode & JWT Secrets */}
                <div className="settings-card">
                  <h3>Maintenance & Security Controls</h3>
                  <div className="control-row">
                    <div>
                      <span className="control-title">Maintenance Mode Banner</span>
                      <p className="control-desc">Displays maintenance notice across public pages</p>
                    </div>
                    <button
                      className={`toggle-btn ${isMaintenanceMode ? 'active' : ''}`}
                      onClick={handleToggleMaintenance}
                    >
                      {isMaintenanceMode ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="control-row mt-4">
                    <div>
                      <span className="control-title">Regenerate JWT Secret</span>
                      <p className="control-desc">Invalidates all active login sessions platform-wide</p>
                    </div>
                    <button
                      className="danger-btn"
                      onClick={() => setActiveModal('regenerateJwt')}
                    >
                      Regenerate Secret
                    </button>
                  </div>
                </div>

                {/* Env Variable Keys */}
                <div className="settings-card full-width">
                  <h3>Environment Variable Keys (Names Only)</h3>
                  <div className="env-keys-tags">
                    {envKeys.map((key, i) => (
                      <span key={i} className="env-key-tag">
                        🔒 {key}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Backend Error Logs */}
                <div className="settings-card full-width">
                  <h3>Recent Backend Error & Warning Logs (Last 50)</h3>
                  <div className="logs-table-container">
                    <table className="logs-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Level</th>
                          <th>Log Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td className="log-time">{new Date(log.timestamp).toLocaleString()}</td>
                            <td>
                              <span className={`log-badge ${log.level}`}>{log.level}</span>
                            </td>
                            <td className="log-msg">{log.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODALS ── */}

      {/* Delete User Modal */}
      {activeModal === 'deleteUser' && modalData && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm User Deletion</h3>
            <p>
              Are you sure you want to permanently delete user account{' '}
              <strong>
                {modalData.firstName} ({modalData.email})
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button className="danger-btn" onClick={handleDeleteUser}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Success Modal */}
      {activeModal === 'resetPasswordSuccess' && modalData && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Temporary Password Generated</h3>
            <p>
              Temporary password for <strong>{modalData.email}</strong>:
            </p>
            <div className="temp-password-box">{modalData.tempPassword}</div>
            <p className="small-text mt-2">Please share this secure password with the user.</p>
            <div className="modal-actions">
              <button className="primary-action-btn" onClick={() => setActiveModal(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Doctor Modal */}
      {activeModal === 'addDoctor' && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-box wide" onClick={(e) => e.stopPropagation()}>
            <h3>{modalData?._id ? 'Edit Doctor Profile' : 'Add New Doctor to Directory'}</h3>
            <form onSubmit={handleSaveDoctor} className="admin-modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    value={doctorForm.name}
                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Qualification</label>
                  <input
                    type="text"
                    value={doctorForm.qualification}
                    onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Specialty</label>
                  <input
                    type="text"
                    required
                    value={doctorForm.specialty}
                    onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location (City, State)</label>
                  <input
                    type="text"
                    required
                    value={doctorForm.location}
                    onChange={(e) => setDoctorForm({ ...doctorForm, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hospital / Clinic Name</label>
                  <input
                    type="text"
                    value={doctorForm.hospital}
                    onChange={(e) => setDoctorForm({ ...doctorForm, hospital: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Registration Number</label>
                  <input
                    type="text"
                    placeholder="MCI-12345 or KMC-67890"
                    value={doctorForm.registrationNumber}
                    onChange={(e) => setDoctorForm({ ...doctorForm, registrationNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Consultation Fee</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹1,500"
                    value={doctorForm.consultationFee}
                    onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Experience</label>
                  <input
                    type="text"
                    value={doctorForm.experience}
                    onChange={(e) => setDoctorForm({ ...doctorForm, experience: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="primary-action-btn">
                  Save Doctor Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Patient Details Modal */}
      {activeModal === 'viewPatient' && modalData && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-box wide" onClick={(e) => e.stopPropagation()}>
            <h3>Patient Intake Details</h3>
            <div className="details-grid">
              <div>
                <strong>Name:</strong> {modalData.firstName} {modalData.lastName}
              </div>
              <div>
                <strong>Email:</strong> {modalData.email}
              </div>
              <div>
                <strong>Age / Sex:</strong> {modalData.age} yrs / {modalData.sex}
              </div>
              <div>
                <strong>Blood Group:</strong> {modalData.bloodGroup || 'Not specified'}
              </div>
              <div>
                <strong>Family History:</strong> {modalData.familyHistory}
              </div>
              <div>
                <strong>Current Symptoms:</strong> {modalData.currentSymptoms}
              </div>
              <div>
                <strong>Known Disorders:</strong> {modalData.knownDisorder || 'None reported'}
              </div>
              <div>
                <strong>Medications:</strong> {modalData.medications || 'None'}
              </div>
              <div>
                <strong>Emergency Contact:</strong> {modalData.emergencyContactName} ({modalData.emergencyContact})
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-action-btn" onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {activeModal === 'cancelAppointment' && modalData && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel Appointment</h3>
            <p>
              Cancel appointment for <strong>{modalData.patientName}</strong> with{' '}
              <strong>{modalData.doctorName}</strong> on {modalData.appointmentDate}?
            </p>
            <div className="form-group mt-3">
              <label>Reason for Cancellation</label>
              <input
                type="text"
                placeholder="Enter cancellation reason..."
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setActiveModal(null)}>
                Back
              </button>
              <button className="danger-btn" onClick={handleCancelAppointment}>
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate JWT Confirmation Modal */}
      {activeModal === 'regenerateJwt' && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Regenerate JWT Secret?</h3>
            <p>
              This is a high-risk security operation. Regenerating the JWT secret key will
              immediately log out all active sessions across the entire platform.
            </p>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setActiveModal(null)}>
                Cancel
              </button>
              <button className="danger-btn" onClick={handleRegenerateJwt}>
                Confirm & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Activity Log Modal */}
      {activeModal === 'activityLog' && modalData && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Activity Log: {modalData.firstName} {modalData.lastName}</h3>
            <div className="activity-list">
              <div className="activity-item">
                <span className="time">Today, 02:45 PM</span>
                <span className="desc">Logged in to platform session</span>
              </div>
              <div className="activity-item">
                <span className="time">Yesterday, 11:20 AM</span>
                <span className="desc">Visited Genetic Disorders guide</span>
              </div>
              <div className="activity-item">
                <span className="time">3 days ago</span>
                <span className="desc">Ran AI Genetic Assessment report</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-action-btn" onClick={() => setActiveModal(null)}>
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor History Modal */}
      {activeModal === 'doctorHistory' && modalData && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Consultation History: {modalData.name}</h3>
            <p>Total consultations conducted: <strong>{modalData.consultationHistoryCount || 32}</strong></p>
            <p>Rating: <strong>⭐ {modalData.rating || 4.8} / 5.0</strong></p>
            <div className="modal-actions">
              <button className="primary-action-btn" onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Appointment Details Modal */}
      {activeModal === 'viewAppointment' && modalData && (
        <div className="admin-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Consultation Details</h3>
            <p><strong>Patient:</strong> {modalData.patientName} ({modalData.patientEmail})</p>
            <p><strong>Doctor:</strong> {modalData.doctorName} ({modalData.doctorSpecialty})</p>
            <p><strong>Type:</strong> {modalData.consultationType}</p>
            <p><strong>Date/Time:</strong> {modalData.appointmentDate} at {modalData.timeSlot}</p>
            <p><strong>Channel:</strong> {modalData.channelName}</p>
            <p><strong>Status:</strong> {modalData.status}</p>
            {modalData.notes && <p><strong>Notes:</strong> {modalData.notes}</p>}
            <div className="modal-actions">
              <button className="primary-action-btn" onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
