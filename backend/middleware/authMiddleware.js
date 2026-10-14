import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gene_guard_jwt_secret_key_2026_super_secure';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // If not guest, perform database verification of tokenVersion
    if (decoded.role !== 'guest' && decoded.userId) {
      const user = await User.findById(decoded.userId).select('tokenVersion status role firstName lastName email');
      if (!user) {
        return res.status(401).json({ success: false, error: 'Account no longer exists.' });
      }

      if (user.status === 'inactive') {
        return res.status(403).json({ success: false, error: 'Account is deactivated. Please contact support.' });
      }

      // Check tokenVersion match
      const dbVersion = user.tokenVersion || 0;
      const tokenVer = decoded.tokenVersion || 0;
      if (dbVersion !== tokenVer) {
        return res.status(401).json({
          success: false,
          error: 'Session has expired or was revoked. Please log in again.',
          tokenInvalidated: true,
        });
      }

      req.currentUser = user;
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.', details: error.message });
  }
};

export const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied. Admin role required.' });
  }
  next();
};

export default { verifyToken, verifyAdmin };

