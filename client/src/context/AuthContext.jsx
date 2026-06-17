import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, signupApi, googleAuthApi, getMeApi } from '../controllers/authApi';

/**
 * AuthContext — manages authentication state across the entire app.
 *
 * State:
 *   user            — Current user object or null
 *   token           — JWT string or null
 *   isAuthenticated — Derived boolean (!!user)
 *   loading         — True during initial token validation on page load
 *
 * Actions:
 *   login(email, password)   — Authenticate with credentials
 *   signup(name, email, pw)  — Create account + auto-login
 *   googleLogin(credential)  — Authenticate with Google ID token
 *   logout()                 — Clear state + localStorage
 *
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 *
 * Q1: "Why use React Context instead of Redux or Zustand for auth?"
 * A:  Auth state is simple (user + token + loading), rarely changes (only on
 *     login/logout), and is needed globally. Context + useReducer is perfectly
 *     adequate here — no need for the ceremony of Redux. Rule of thumb: use
 *     Context for "shared global state that changes infrequently" (theme, auth,
 *     locale). Use Redux/Zustand for complex, frequently-updating state with
 *     many consumers (e.g., a real-time dashboard).
 *
 * Q2: "What happens on page refresh? How is the session persisted?"
 * A:  On mount, AuthProvider checks localStorage for a saved JWT. If found,
 *     it calls GET /api/auth/me to validate the token and fetch fresh user data.
 *     This is crucial because:
 *     1. The token might have expired (server returns 401 → we clear it).
 *     2. User data might have changed (e.g., name update).
 *     3. Tokens should be validated server-side, not just trusted client-side.
 *     During this validation, `loading` is true, which shows a loading screen
 *     instead of flashing the login page.
 *
 * Q3: "Why store the token in localStorage and not in React state alone?"
 * A:  React state is lost on page refresh (the entire React tree remounts).
 *     localStorage persists across page reloads and browser tabs. Without it,
 *     users would have to log in again every time they refresh the page.
 * ──────────────────────────────────────────────────────────────────────────
 */

const AuthContext = createContext(null);

const TOKEN_KEY = 'sarthi_auth_token';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true); // True until initial token validation completes

  /**
   * Persist or clear token in localStorage whenever it changes.
   */
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  /**
   * On mount (or token change): validate stored token by calling /api/auth/me.
   * This ensures we have fresh user data and the token hasn't expired.
   */
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const data = await getMeApi(token);
        setUser(data.user);
      } catch (error) {
        // Token is invalid or expired — clear everything
        console.warn('[AuthContext] Token validation failed:', error.message);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []); // Only run on mount, not on every token change

  /**
   * Login with email/password
   */
  const login = useCallback(async (email, password) => {
    const data = await loginApi(email, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  /**
   * Create account + auto-login
   */
  const signup = useCallback(async (name, email, password) => {
    const data = await signupApi(name, email, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  /**
   * Login with Google OAuth credential
   */
  const googleLogin = useCallback(async (credential) => {
    const data = await googleAuthApi(credential);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  /**
   * Logout — clear state and storage
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    // Debug log removed
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    login,
    signup,
    googleLogin,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
