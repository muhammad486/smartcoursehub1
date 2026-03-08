const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
if (!process.env.JWT_SECRET) {
  console.warn('[AUTH] WARNING: JWT_SECRET not set. Using development fallback secret. Do NOT use in production.');
}

const protect = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.log('[AUTH] No token provided');
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    console.log('[AUTH] Token found, verifying JWT...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[AUTH] JWT verified, user ID:', decoded.id);
    
    const user = await User.findById(decoded.id).select('-password');
    console.log('[AUTH] User lookup:', user ? 'FOUND' : 'NOT FOUND');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH] Error in protect middleware:', err.message);
    console.error(err);
    res.status(401).json({ message: 'Authentication failed', error: err.message });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access only' });
};

module.exports = { protect, adminOnly };