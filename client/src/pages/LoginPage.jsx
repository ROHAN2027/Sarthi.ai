import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * LoginPage Component
 * 
 * Implements a premium pastel UI with glassmorphism, animated background,
 * and form validation. Integrates both email/password and Google OAuth 2.0.
 * 
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 * 
 * Q1: "How does the Google Sign-In button work here without a React library?"
 * A:  We use the native Google Identity Services (GSI) script loaded in index.html.
 *     In a useEffect, we initialize `window.google.accounts.id.initialize` with
 *     our client ID and a callback function. Then we render the button into a div
 *     ref using `window.google.accounts.id.renderButton`. When the user completes
 *     the OAuth flow, Google calls our callback with a JWT (credential) which we
 *     send to our backend for verification.
 * 
 * Q2: "Why do we disable the submit button while loading?"
 * A:  To prevent double-submissions (which could trigger race conditions or
 *     duplicate database entries) and to provide visual feedback to the user
 *     that their request is being processed.
 * 
 * Q3: "What is the purpose of the `location.state?.from` check?"
 * A:  If a user tries to access a protected route (e.g., /dsa) without being
 *     logged in, the ProtectedRoute redirects them to /login and passes their
 *     intended destination in `state.from`. After a successful login, we
 *     redirect them back to where they wanted to go instead of always
 *     redirecting to the home page. This is a crucial UX pattern.
 * ──────────────────────────────────────────────────────────────────────────
 */

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to the originally requested page, or default to home (/)
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    // Initialize Google Sign-In button once the script is loaded
    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          // Replace this with process.env.VITE_GOOGLE_CLIENT_ID in a real app
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE',
          callback: handleGoogleResponse
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large', width: '100%', shape: 'pill' }
        );
      } else {
        // If script hasn't loaded yet, try again in 100ms
        setTimeout(initializeGoogleSignIn, 100);
      }
    };

    initializeGoogleSignIn();
  }, []);

  const handleGoogleResponse = async (response) => {
    setIsSubmitting(true);
    setError('');
    
    try {
      await googleLogin(response.credential);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden auth-gradient-bg flex items-center justify-center p-6">
      
      {/* Decorative Floating Orbs */}
      <div className="auth-orb auth-orb-1"></div>
      <div className="auth-orb auth-orb-2"></div>
      <div className="auth-orb auth-orb-3"></div>

      {/* Main Glass Card */}
      <div className="glass-card w-full max-w-md rounded-3xl p-8 md:p-10 relative z-10 animate-slide-up shadow-pastel-lg">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-500">Sign in to continue your interview prep</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2 animate-shake">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input w-full px-5 py-4 rounded-xl border border-gray-200 bg-white/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white"
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input w-full px-5 py-4 rounded-xl border border-gray-200 bg-white/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 011.563-3.029A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-shine w-full py-4 px-6 rounded-xl text-white font-semibold text-lg shadow-pastel transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white/50 text-gray-500 rounded-full backdrop-blur-sm">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button Container */}
        <div className="flex justify-center mb-8">
          <div id="google-signin-button" className="google-btn w-full flex justify-center"></div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  );
};

export default LoginPage;
