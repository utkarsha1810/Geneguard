/**
 * GeneGuard Auth Utilities
 * Manages tokens, user state, server invalidation, and auto-logout on 401
 */

export const getToken = () => {
  return localStorage.getItem('token');
};

export const getUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const isAuthenticated = () => {
  return Boolean(getToken());
};

export const setAuthSession = ({ token, user, userId, role, firstName }) => {
  if (token) localStorage.setItem('token', token);
  if (userId) localStorage.setItem('userId', userId);
  if (role) localStorage.setItem('role', role);
  if (firstName) localStorage.setItem('firstName', firstName);

  const userPayload = user || {
    userId: userId || localStorage.getItem('userId'),
    role: role || localStorage.getItem('role'),
    firstName: firstName || localStorage.getItem('firstName'),
    email: user?.email,
  };

  localStorage.setItem('user', JSON.stringify(userPayload));
};

export const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  localStorage.removeItem('firstName');
};

/**
 * Perform logout, clear all storage, and redirect to /login
 */
export const logout = async (navigate, message = '') => {
  const token = getToken();
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5050';

  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      // Ignore network errors on logout
    }
  }

  clearAuthSession();

  if (message) {
    sessionStorage.setItem('authToastMessage', message);
  }

  if (navigate) {
    navigate('/login', { replace: true });
  } else {
    window.location.href = '/login';
  }
};

/**
 * Authenticated API Fetch Wrapper
 * Automatically attaches Bearer token and triggers auto-logout on 401 (token expired/invalidated)
 */
export const authFetch = async (url, options = {}, navigate) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      console.warn('[authFetch] 401 Unauthorized received. Logging out user.');
      await logout(navigate, 'Your session has expired. Please log in again.');
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  } catch (error) {
    throw error;
  }
};

export default {
  getToken,
  getUser,
  isAuthenticated,
  setAuthSession,
  clearAuthSession,
  logout,
  authFetch,
};
