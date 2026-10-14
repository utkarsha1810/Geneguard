import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getUser, authFetch, logout, setAuthSession } from '../../utils/auth';
import LogoutModal from '../Auth/LogoutModal';
import './Settings.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', cls: '' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) s++;
  if (s <= 2) return { score: 1, label: 'Weak', cls: 'weak' };
  if (s <= 3) return { score: 2, label: 'Medium', cls: 'medium' };
  return { score: 3, label: 'Strong', cls: 'strong' };
};

const Settings = () => {
  const navigate = useNavigate();
  const currentUser = getUser();

  // Active section tab
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password' | 'sessions'

  // Profile form state
  const [profile, setProfile] = useState({
    firstName: currentUser?.firstName || '',
    lastName: '',
    email: currentUser?.email || '',
    phone: '',
    dateOfBirth: '',
    role: currentUser?.role || 'user',
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Change password form state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Logout modal state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAllDevicesLogout, setIsAllDevicesLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load user profile from backend on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/auth/me`, {}, navigate);
        const data = await res.json();
        if (data.success && data.user) {
          setProfile({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            dateOfBirth: data.user.dateOfBirth || '',
            role: data.user.role || 'user',
          });
        }
      } catch (err) {
        console.warn('Could not fetch profile:', err.message);
      }
    };
    fetchProfile();
  }, [navigate]);

  // Live Password checklist
  const pwRules = useMemo(() => {
    const pw = passwords.newPassword;
    return {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /\d/.test(pw),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    };
  }, [passwords.newPassword]);

  const allRulesMet = Object.values(pwRules).every(Boolean);
  const newPwStrength = useMemo(() => getPasswordStrength(passwords.newPassword), [passwords.newPassword]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setIsProfileLoading(true);

    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/auth/profile`,
        {
          method: 'PUT',
          body: JSON.stringify({
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone,
            dateOfBirth: profile.dateOfBirth,
          }),
        },
        navigate
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setAuthSession({
        user: { ...currentUser, firstName: profile.firstName, email: profile.email },
        firstName: profile.firstName,
      });

      setProfileMsg({ type: 'success', text: '✓ Profile updated successfully!' });
      setTimeout(() => setProfileMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Error saving changes' });
    } finally {
      setIsProfileLoading(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!passwords.currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Current password is required.' });
      return;
    }

    if (!allRulesMet) {
      setPasswordMsg({ type: 'error', text: 'New password must satisfy all security rules.' });
      return;
    }

    if (passwords.newPassword !== passwords.confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsPasswordLoading(true);

    try {
      const res = await authFetch(
        `${API_BASE_URL}/api/auth/change-password`,
        {
          method: 'POST',
          body: JSON.stringify({
            currentPassword: passwords.currentPassword,
            newPassword: passwords.newPassword,
          }),
        },
        navigate
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to change password');
      }

      // Update active token with the newly issued token
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      setPasswordMsg({
        type: 'success',
        text: '✓ Password changed successfully! All other devices have been logged out.',
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setTimeout(() => setPasswordMsg({ type: '', text: '' }), 5000);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Could not change password' });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Handle Logout Confirmation
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);

    if (isAllDevicesLogout) {
      try {
        await authFetch(`${API_BASE_URL}/api/auth/logout-all`, { method: 'POST' }, navigate);
      } catch (e) {
        // Continue with local clear
      }
      await logout(navigate, 'Logged out of all devices successfully.');
    } else {
      await logout(navigate, 'Logged out successfully.');
    }

    setIsLoggingOut(false);
    setIsLogoutModalOpen(false);
  };

  return (
    <div className="settings-page">
      {/* Top Navbar */}
      <header className="settings-header">
        <div className="settings-header-content">
          <div className="settings-logo" onClick={() => navigate('/home')}>
            <span className="settings-logo-icon">🧬</span>
            <span className="settings-logo-brand">GeneGuard</span>
          </div>

          <div className="settings-header-right">
            <Link to="/home" className="settings-nav-link">Home</Link>
            <Link to="/dna" className="settings-nav-link">DNA Portal</Link>
            {currentUser?.role === 'admin' && (
              <Link to="/admin" className="settings-nav-link admin-tag">Admin</Link>
            )}
            <button
              type="button"
              className="settings-quick-logout"
              onClick={() => {
                setIsAllDevicesLogout(false);
                setIsLogoutModalOpen(true);
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Settings Body */}
      <main className="settings-container">
        <div className="settings-sidebar">
          <div className="user-profile-summary">
            <div className="user-avatar-circle">
              {profile.firstName ? profile.firstName[0].toUpperCase() : 'U'}
            </div>
            <div className="user-summary-text">
              <h3 className="user-summary-name">{profile.firstName || 'User'} {profile.lastName}</h3>
              <p className="user-summary-email">{profile.email}</p>
              <span className={`user-role-badge ${profile.role}`}>{profile.role.toUpperCase()}</span>
            </div>
          </div>

          <nav className="settings-tabs">
            <button
              type="button"
              className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Information
            </button>

            <button
              type="button"
              className={`settings-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Security & Password
            </button>

            <button
              type="button"
              className={`settings-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => setActiveTab('sessions')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              Active Sessions
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="settings-content-card">

          {/* ─── TAB 1: PROFILE INFORMATION ─── */}
          {activeTab === 'profile' && (
            <div>
              <div className="settings-card-header">
                <h2>Account Profile</h2>
                <p>Manage your personal details and genomic contact preferences.</p>
              </div>

              {profileMsg.text && (
                <div className={`settings-banner ${profileMsg.type}`}>
                  {profileMsg.text}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="settings-form">
                <div className="settings-row">
                  <div className="settings-field">
                    <label htmlFor="settings-fn">First Name</label>
                    <input
                      id="settings-fn"
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="settings-field">
                    <label htmlFor="settings-ln">Last Name</label>
                    <input
                      id="settings-ln"
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="settings-field">
                  <label htmlFor="settings-email">Email Address (Primary Identifier)</label>
                  <input
                    id="settings-email"
                    type="email"
                    value={profile.email}
                    disabled
                    title="Email cannot be edited directly for security reasons"
                    style={{ opacity: 0.65, cursor: 'not-allowed' }}
                  />
                  <span className="field-hint">Email is linked to two-step login OTPs and HIPAA security records.</span>
                </div>

                <div className="settings-row">
                  <div className="settings-field">
                    <label htmlFor="settings-phone">Phone Number (10 Digits)</label>
                    <input
                      id="settings-phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      maxLength={10}
                      placeholder="10-digit mobile number"
                    />
                  </div>

                  <div className="settings-field">
                    <label htmlFor="settings-dob">Date of Birth</label>
                    <input
                      id="settings-dob"
                      type="date"
                      value={profile.dateOfBirth}
                      onChange={(e) => setProfile(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="settings-form-footer">
                  <button type="submit" className="settings-save-btn" disabled={isProfileLoading}>
                    {isProfileLoading ? <span className="settings-btn-spinner"></span> : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── TAB 2: CHANGE PASSWORD ─── */}
          {activeTab === 'password' && (
            <div>
              <div className="settings-card-header">
                <h2>Security & Password</h2>
                <p>Update your password. Changing your password invalidates all other active sessions.</p>
              </div>

              {passwordMsg.text && (
                <div className={`settings-banner ${passwordMsg.type}`}>
                  {passwordMsg.text}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="settings-form">
                {/* Current Password */}
                <div className="settings-field">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="currentPassword"
                      type={showCurrentPw ? 'text' : 'password'}
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="pw-toggle-btn"
                      onClick={() => setShowCurrentPw(prev => !prev)}
                      aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPw ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="settings-field">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPassword"
                      type={showNewPw ? 'text' : 'password'}
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="pw-toggle-btn"
                      onClick={() => setShowNewPw(prev => !prev)}
                      aria-label={showNewPw ? 'Hide password' : 'Show password'}
                    >
                      {showNewPw ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>

                  {/* Strength Bar */}
                  {passwords.newPassword && (
                    <div className="password-strength-container">
                      <div className="strength-bars">
                        <div className={`strength-bar ${newPwStrength.score >= 1 ? newPwStrength.cls : ''}`} />
                        <div className={`strength-bar ${newPwStrength.score >= 2 ? newPwStrength.cls : ''}`} />
                        <div className={`strength-bar ${newPwStrength.score >= 3 ? newPwStrength.cls : ''}`} />
                      </div>
                      <span className={`strength-label ${newPwStrength.cls}`}>{newPwStrength.label}</span>
                    </div>
                  )}

                  {/* Live Password Checklist */}
                  <div className="password-checklist" aria-live="polite">
                    <div className={`checklist-item ${pwRules.length ? 'met' : ''}`}>
                      <span className="checklist-icon">{pwRules.length ? '✓' : '○'}</span>
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`checklist-item ${pwRules.uppercase ? 'met' : ''}`}>
                      <span className="checklist-icon">{pwRules.uppercase ? '✓' : '○'}</span>
                      <span>One uppercase letter (A-Z)</span>
                    </div>
                    <div className={`checklist-item ${pwRules.lowercase ? 'met' : ''}`}>
                      <span className="checklist-icon">{pwRules.lowercase ? '✓' : '○'}</span>
                      <span>One lowercase letter (a-z)</span>
                    </div>
                    <div className={`checklist-item ${pwRules.number ? 'met' : ''}`}>
                      <span className="checklist-icon">{pwRules.number ? '✓' : '○'}</span>
                      <span>One number (0-9)</span>
                    </div>
                    <div className={`checklist-item ${pwRules.special ? 'met' : ''}`}>
                      <span className="checklist-icon">{pwRules.special ? '✓' : '○'}</span>
                      <span>One special character (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="settings-field">
                  <label htmlFor="confirmNewPassword">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmNewPassword"
                      type={showConfirmPw ? 'text' : 'password'}
                      value={passwords.confirmNewPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                      required
                    />
                    {passwords.confirmNewPassword && passwords.newPassword === passwords.confirmNewPassword && (
                      <span className="pw-match-badge" title="Passwords match">✓</span>
                    )}
                    <button
                      type="button"
                      className="pw-toggle-btn"
                      onClick={() => setShowConfirmPw(prev => !prev)}
                      aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPw ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div className="settings-form-footer">
                  <button
                    type="submit"
                    className="settings-save-btn"
                    disabled={isPasswordLoading || !allRulesMet || passwords.newPassword !== passwords.confirmNewPassword}
                  >
                    {isPasswordLoading ? <span className="settings-btn-spinner"></span> : 'Update Password & Revoke Other Sessions'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── TAB 3: ACTIVE SESSIONS & LOGOUT ALL ─── */}
          {activeTab === 'sessions' && (
            <div>
              <div className="settings-card-header">
                <h2>Active Device Sessions</h2>
                <p>Manage authenticated logins. Invalidate stolen or outdated tokens across all devices.</p>
              </div>

              <div className="session-item current">
                <div className="session-icon">💻</div>
                <div className="session-info">
                  <div className="session-title">
                    Current Browser Session <span className="active-badge">Active Now</span>
                  </div>
                  <div className="session-meta">
                    Protected with two-step login OTP • HIPAA Inactivity Guard Active
                  </div>
                </div>
              </div>

              <div className="danger-zone-card">
                <h3>Global Session Revocation</h3>
                <p>
                  Suspect unauthorized access or misplaced a device? Logging out of all devices immediately increments your token security version on the server, terminating every other session.
                </p>

                <div className="danger-zone-actions">
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => {
                      setIsAllDevicesLogout(true);
                      setIsLogoutModalOpen(true);
                    }}
                  >
                    Log Out of All Devices
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        isAllDevices={isAllDevicesLogout}
        isLoading={isLoggingOut}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default Settings;
