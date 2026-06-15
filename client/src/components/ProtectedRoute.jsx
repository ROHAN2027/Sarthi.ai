import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * Behavior:
 * - If auth is loading (initial token validation): show a loading spinner
 * - If not authenticated: redirect to /login (preserving the intended destination)
 * - If authenticated: render children
 *
 * The `state={{ from: location }}` trick preserves the URL the user was trying
 * to access. After login, we can redirect them back to their intended page
 * instead of always going to /.
 *
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 *
 * Q1: "Why show a loading spinner instead of immediately redirecting?"
 * A:  On page refresh, the AuthContext needs to validate the stored JWT by
 *     calling /api/auth/me. During this async call, `loading` is true and
 *     `isAuthenticated` is false. Without the loading check, a valid user
 *     would see a brief flash of the login page before being redirected back.
 *     This is a common UX bug in poorly-implemented auth flows.
 *
 * Q2: "What is the `<Navigate>` component vs `useNavigate()`?"
 * A:  `<Navigate>` is a declarative redirect (renders during the component tree).
 *     `useNavigate()` is imperative (called in event handlers like onClick).
 *     For conditional rendering like route guards, `<Navigate>` is more appropriate.
 * ──────────────────────────────────────────────────────────────────────────
 */

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="flex flex-col items-center gap-4">
          {/* Animated spinner */}
          <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
          <p className="text-gray-400 text-sm font-medium animate-pulse">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
