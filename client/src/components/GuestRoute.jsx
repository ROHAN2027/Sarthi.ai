import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * GuestRoute — wraps login/signup pages to redirect authenticated users away.
 *
 * If the user is already logged in and navigates to /login or /signup,
 * they should be redirected to the home page (/).
 *
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 *
 * Q1: "Why redirect authenticated users away from the login page?"
 * A:  It's a UX best practice. If a logged-in user manually types /login in
 *     the URL bar, showing them a login form is confusing. They're already
 *     authenticated — take them to the app. It also prevents accidental
 *     double-login scenarios that could overwrite session state.
 *
 * Q2: "Why check `loading` here too?"
 * A:  Same reason as ProtectedRoute. During initial token validation, we don't
 *     know if the user is authenticated yet. Without this check, a logged-in
 *     user refreshing on /login would briefly see the login page before the
 *     redirect fires. Showing a spinner keeps the experience smooth.
 * ──────────────────────────────────────────────────────────────────────────
 */

const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
          <p className="text-gray-400 text-sm font-medium animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default GuestRoute;
