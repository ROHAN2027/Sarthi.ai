import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.model.js';

/**
 * Auth Controller — handles signup, login, Google OAuth, and profile retrieval.
 *
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 *
 * Q1: "Walk me through what happens when a user signs up."
 * A:  1. Client sends { name, email, password } to POST /api/auth/signup.
 *     2. Server validates all fields (non-empty, valid email format, pw >= 6 chars).
 *     3. Checks if email already exists in MongoDB (unique constraint).
 *     4. Generates a random salt and hashes the password using bcrypt with cost factor 12.
 *        This means 2^12 = 4096 rounds of the Blowfish cipher — each hash takes ~250ms.
 *     5. Creates the User document in MongoDB (password stored as hash, never plaintext).
 *     6. Signs a JWT with { userId } as payload, using HS256 and our server secret.
 *     7. Returns the user object (without password) and the signed JWT to the client.
 *
 * Q2: "Why cost factor 12 specifically for bcrypt?"
 * A:  It's a balance between security and UX. At cost=12, each hash takes ~250ms on
 *     modern hardware — fast enough for login but slow enough to make brute-force
 *     attacks impractical (10^6 guesses would take ~69 hours). OWASP recommends
 *     a minimum of 10. You should benchmark on your production hardware and increase
 *     the cost factor as hardware gets faster (Moore's Law).
 *
 * Q3: "Why sign the JWT on the server and not on the client?"
 * A:  The JWT secret must NEVER be on the client. If the client had the secret, anyone
 *     could forge tokens for any user. The server is the sole authority for issuing tokens.
 *     The client only stores and sends the opaque token string.
 * ──────────────────────────────────────────────────────────────────────────
 */

const BCRYPT_SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';

// Initialize Google OAuth client (lazy — only created when needed)
let googleClient = null;
const getGoogleClient = () => {
  if (!googleClient) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
};

/**
 * Helper: Generate JWT for a given user ID
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
};

/**
 * Helper: Sanitize user object for client response (strip sensitive fields)
 */
const sanitizeUser = (user) => {
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.__v;
  return userObj;
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ── Input Validation ──
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // ── Check for existing user ──
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // ── Hash password ──
    // bcrypt.hash() generates a random salt internally and combines it with the hash.
    // The salt is stored as part of the hash string itself (first 22 chars after the cost).
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // ── Create user ──
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // ── Generate JWT ──
    const token = generateToken(user._id);

    console.log(`[AuthController] New user signed up: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error('[AuthController] Signup error:', error);

    // Handle Mongoose validation errors gracefully
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    // Handle duplicate key error (race condition on unique email)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during signup. Please try again.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Input Validation ──
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    // ── Find user (explicitly select password since it's excluded by default) ──
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      // Use a generic message to avoid revealing whether the email exists (security best practice)
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // ── Check if user has a password (OAuth-only accounts won't) ──
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google sign-in. Please use "Sign in with Google".',
      });
    }

    // ── Compare passwords ──
    // bcrypt.compare() extracts the salt from the stored hash and re-hashes the
    // provided password with the same salt. If the results match, the password is correct.
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // ── Generate JWT ──
    const token = generateToken(user._id);

    console.log(`[AuthController] User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error('[AuthController] Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/google
// ─────────────────────────────────────────────────────────────────────────

/**
 * ─── Conceptual Interview Prep: Google OAuth Token Verification ──────────
 *
 * Q1: "What exactly does `verifyIdToken` do?"
 * A:  It does 4 things:
 *     1. Fetches Google's public keys (JWKs) from https://www.googleapis.com/oauth2/v3/certs
 *     2. Verifies the token's RSA signature using those public keys
 *     3. Checks that `aud` (audience) matches our Client ID — prevents token theft
 *     4. Checks `exp` (expiry) to ensure the token is still valid
 *     If ANY check fails, it throws an error.
 *
 * Q2: "What is the `sub` field in the Google token payload?"
 * A:  `sub` (subject) is Google's unique, immutable identifier for the user. Unlike
 *     email (which can change), `sub` never changes. We store it as `googleId` in our DB.
 *
 * Q3: "Why do we upsert instead of just creating a new user?"
 * A:  A user might sign up with email/password first, then later click "Sign in with Google"
 *     using the same email. Upsert (findOne + update/create) links the Google account to
 *     the existing user record instead of creating a duplicate.
 * ──────────────────────────────────────────────────────────────────────────
 */
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential token is required.',
      });
    }

    // ── Verify the Google ID token ──
    const client = getGoogleClient();
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // ── Upsert user ──
    // First, try to find by googleId (fastest, most reliable)
    // Then fall back to email (for account linking)
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (user) {
      // Update existing user with Google info (account linking)
      user.googleId = googleId;
      user.avatar = picture || user.avatar;
      if (!user.name && name) user.name = name;
      await user.save();
    } else {
      // Create new user from Google profile
      user = await User.create({
        name: name || 'Google User',
        email: email.toLowerCase(),
        googleId,
        avatar: picture || undefined, // Let the default avatar generator handle it if no picture
      });
    }

    // ── Generate our own JWT ──
    const token = generateToken(user._id);

    console.log(`[AuthController] Google auth for: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Google authentication successful.',
      user: sanitizeUser(user),
      token,
    });
  } catch (error) {
    console.error('[AuthController] Google auth error:', error);

    // Google token verification failed
    if (error.message?.includes('Token used too late') || error.message?.includes('Invalid token')) {
      return res.status(401).json({
        success: false,
        message: 'Google token is invalid or expired. Please try again.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    // req.user is attached by the auth middleware
    res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    console.error('[AuthController] GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile.',
    });
  }
};
