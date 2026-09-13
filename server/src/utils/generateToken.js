// server/src/utils/generateToken.js
const jwt = require('jsonwebtoken');

/**
 * Sign and return a JWT for the given user.
 * Payload: { id, email, role }
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = generateToken;
