import express from 'express';
import { signup, login, googleAuth, getMe } from '../controllers/auth_controller.js';
import authMiddleware from '../middleware/auth_middleware.js';

/**
 * Auth Routes
 *
 * POST   /api/auth/signup   → Create a new account (email/password)
 * POST   /api/auth/login    → Authenticate with email/password
 * POST   /api/auth/google   → Authenticate with Google OAuth
 * GET    /api/auth/me       → Get current user profile (protected)
 *
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 *
 * Q1: "Why is /me a GET request and not POST?"
 * A:  GET is semantically correct because we are *retrieving* data, not creating
 *     or modifying it. GET requests are also cacheable and idempotent. The user ID
 *     comes from the JWT in the Authorization header, not from the request body.
 *
 * Q2: "Why don't signup and login require the auth middleware?"
 * A:  These are the endpoints that *produce* tokens. The user doesn't have a token
 *     yet when they're logging in — that's the whole point of the login flow.
 *     Only endpoints that require an already-authenticated user need the middleware.
 *
 * Q3: "In a RESTful API, why use /api/auth/* instead of /api/users/*?"
 * A:  Separation of concerns. /api/auth/* handles authentication (identity verification),
 *     while /api/users/* would handle user CRUD operations (profile updates, admin actions).
 *     Mixing them couples two different domains and makes route protection harder.
 * ──────────────────────────────────────────────────────────────────────────
 */

const router = express.Router();

// Public routes (no auth required)
router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);

// Protected routes (auth required)
router.get('/me', authMiddleware, getMe);

export default router;
