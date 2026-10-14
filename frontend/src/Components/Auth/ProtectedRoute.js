import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUser } from '../../utils/auth';

export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const location = useLocation();
  const authed = isAuthenticated();
  const user = getUser();

  if (!authed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export const PublicRoute = ({ children }) => {
  const authed = isAuthenticated();
  const user = getUser();

  if (authed) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default ProtectedRoute;
