/**
 * Auth API Module — centralizes all authentication HTTP requests.
 *
 * Follows the existing pattern in apiController.js — a pure module of async
 * functions that handle fetch calls and error parsing.
 *
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 *
 * Q1: "Why create a separate API module instead of putting fetch calls directly
 *      in the AuthContext?"
 * A:  Separation of concerns. The API module handles HTTP details (URLs, headers,
 *     JSON parsing, error extraction). The Context handles React state management.
 *     This makes both independently testable and reusable. If you ever switch from
 *     fetch to axios, you only change this file.
 *
 * Q2: "Why throw errors instead of returning them?"
 * A:  The throw/catch pattern works naturally with async/await. The calling code
 *     wraps the call in try/catch, which maps cleanly to loading/error/success
 *     state transitions in React. Returning `{ ok, error }` objects is also valid
 *     (Go-style), but try/catch is more idiomatic in JS.
 * ──────────────────────────────────────────────────────────────────────────
 */

const AUTH_API_URL = 'http://localhost:5000/api/auth';

/**
 * Parse error response from the server.
 * The backend consistently returns { success: false, message: '...' }.
 */
const parseError = async (response) => {
  try {
    const data = await response.json();
    return data.message || 'Something went wrong';
  } catch {
    return 'Network error. Please check your connection.';
  }
};

/**
 * POST /api/auth/signup — Register a new user
 */
export const signupApi = async (name, email, password) => {
  const response = await fetch(`${AUTH_API_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const errorMessage = await parseError(response);
    throw new Error(errorMessage);
  }

  return response.json();
};

/**
 * POST /api/auth/login — Authenticate with email/password
 */
export const loginApi = async (email, password) => {
  const response = await fetch(`${AUTH_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorMessage = await parseError(response);
    throw new Error(errorMessage);
  }

  return response.json();
};

/**
 * POST /api/auth/google — Authenticate with Google ID token
 */
export const googleAuthApi = async (credential) => {
  const response = await fetch(`${AUTH_API_URL}/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  if (!response.ok) {
    const errorMessage = await parseError(response);
    throw new Error(errorMessage);
  }

  return response.json();
};

/**
 * GET /api/auth/me — Get current user profile (requires token)
 */
export const getMeApi = async (token) => {
  const response = await fetch(`${AUTH_API_URL}/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorMessage = await parseError(response);
    throw new Error(errorMessage);
  }

  return response.json();
};
