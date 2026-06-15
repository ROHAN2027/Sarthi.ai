import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * JWT Authentication Middleware
 *
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and attaches the authenticated user to `req.user`.
 *
 * Flow:
 * 1. Read `Authorization: Bearer <token>` header
 * 2. Verify the token's signature and expiry using `jwt.verify()`
 * 3. Decode the payload to get `userId`
 * 4. Look up the user in MongoDB
 * 5. Attach user to `req.user` → call `next()`
 * 6. On any failure → respond with 401 Unauthorized
 *
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 *
 * Q1: "What happens if the JWT has expired?"
 * A:  `jwt.verify()` throws a `TokenExpiredError`. We catch it and return 401.
 *     The client should then redirect to the login page. In a production app
 *     with refresh tokens, the client would silently request a new access token.
 *
 * Q2: "Why do we look up the user in the database on every request instead of
 *      trusting the JWT payload?"
 * A:  The JWT proves the token was issued by us, but the user might have been
 *     deleted or deactivated since issuance. The DB lookup ensures the user
 *     still exists. This is a trade-off: it adds ~1-2ms latency but gives us
 *     real-time user state. For high-throughput APIs, you might skip this and
 *     rely on short token expiry + a revocation cache (e.g., Redis blacklist).
 *
 * Q3: "What is the difference between authentication and authorization?"
 * A:  Authentication = "Who are you?" (this middleware).
 *     Authorization = "What are you allowed to do?" (e.g., role-based checks
 *     that would run AFTER this middleware, checking `req.user.role`).
 * ──────────────────────────────────────────────────────────────────────────
 */

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is malformed.',
      });
    }

    // 2. Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find user in database (ensures user still exists)
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User associated with this token no longer exists.',
      });
    }

    // 4. Attach user to request object for downstream handlers
    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors with clear messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
    }

    console.error('[AuthMiddleware] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

export default authMiddleware;
