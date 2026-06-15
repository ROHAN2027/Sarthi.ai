import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InterviewProvider } from './context/InterviewContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LandingPage from './pages/LandingPage';
import DSAInterviewPage from './pages/DSAInterviewPage';
import ConceptualInterviewPage from './pages/ConceptualInterviewPage';
import ProjectInterviewPage from './pages/ProjectInterviewPage';
import InterviewResults from './pages/InterviewResults';

/**
 * App — Root component with auth-aware routing.
 *
 * Provider hierarchy: AuthProvider → InterviewProvider → Router
 * - AuthProvider is outermost so InterviewProvider can access auth state
 * - Router is inside both providers so all pages can use navigation + context
 *
 * Route protection:
 * - /login, /signup: GuestRoute — redirects authenticated users to /
 * - All other routes: ProtectedRoute — redirects guests to /login
 *
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 *
 * Q1: "Why is AuthProvider above InterviewProvider and not the other way around?"
 * A:  AuthProvider manages the user identity — who is logged in. InterviewProvider
 *     manages the interview session — what stage they're in. The interview session
 *     may need to know who the user is (e.g., to auto-fill their name), but auth
 *     never needs to know about the interview. This follows the dependency rule:
 *     outer providers should be more stable and less specific.
 *
 * Q2: "Could you use nested layouts instead of wrapping each route individually?"
 * A:  Yes! React Router v6+ supports <Route element={<ProtectedLayout />}> with
 *     <Outlet /> for nested routes. That's cleaner for many protected routes.
 *     We're doing it inline here for clarity and because we only have 5-6 routes.
 * ──────────────────────────────────────────────────────────────────────────
 */

function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <Router>
          <Routes>
            {/* Public: Auth pages (redirect to / if already logged in) */}
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />

            {/* Protected: Interview platform (redirect to /login if not authenticated) */}
            <Route path="/" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
            <Route path="/dsa" element={<ProtectedRoute><DSAInterviewPage /></ProtectedRoute>} />
            <Route path="/conceptual" element={<ProtectedRoute><ConceptualInterviewPage /></ProtectedRoute>} />
            <Route path="/project" element={<ProtectedRoute><ProjectInterviewPage /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><InterviewResults /></ProtectedRoute>} />
          </Routes>
        </Router>
      </InterviewProvider>
    </AuthProvider>
  );
}

export default App;
