import React from 'react';
import './LogoutModal.css';

const LogoutModal = ({ isOpen, onClose, onConfirm, isLoading = false, isAllDevices = false }) => {
  if (!isOpen) return null;

  return (
    <div className="logout-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
      <div className="logout-modal-backdrop" onClick={onClose}></div>
      <div className="logout-modal-card">
        <div className="logout-modal-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="28" height="28" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>

        <h3 id="logout-modal-title" className="logout-modal-title">
          {isAllDevices ? 'Log Out of All Devices?' : 'Log Out of GeneGuard?'}
        </h3>

        <p className="logout-modal-desc">
          {isAllDevices
            ? 'This will immediately revoke active sessions across all your computers, tablets, and phones. You will need to log in again.'
            : 'Are you sure you want to log out? Any unsaved assessments or notes in progress will be closed.'}
        </p>

        <div className="logout-modal-actions">
          <button
            type="button"
            className="logout-modal-btn cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="logout-modal-btn confirm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="logout-spinner"></span>
            ) : isAllDevices ? (
              'Log Out All Devices'
            ) : (
              'Confirm Log Out'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
