import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * SignupPage Component
 * 
 * Implements a premium pastel UI for user registration.
 * Includes real-time password strength validation and Google OAuth integration.
 * 
 * ─── Conceptual Interview Prep ───────────────────────────────────────────
 * 
 * Q1: "Why do we evaluate password strength on the client side instead of the server?"
 * A:  Client-side validation provides immediate, real-time feedback, which is much
 *     better UX than waiting for a server round-trip. However, the server MUST also
 *     enforce minimum length/complexity rules because the client can be bypassed.
 *     Security must always be enforced on the backend; frontend validation is just UX.
 * 
 * Q2: "Why do we use the `useLocation` hook and `state?.from` here as well?"
 * A:  Just like login, a user might have tried to access a protected route, got
 *     redirected to /login, and then clicked "Sign Up". We want to preserve their
 *     original destination through the entire flow so we can route them correctly
 *     after they finally create their account.
 * ──────────────────────────────────────────────────────────────────────────
 */

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE',
          callback: handleGoogleResponse
        });
        
        window.google.accounts.id.renderButton(
          document.getElementById('google-signup-button'),
          { theme: 'outline', size: 'large', width: '100%', shape: 'pill' }
        );
      } else {
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
      setError(err.message || 'Google sign-up failed');
      setIsSubmitting(false);
    }
  };

  // Basic password strength checker
  const getPasswordStrength = (pw) => {
    if (!pw) return '';
    if (pw.length < 6) return 'weak';
    if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) return 'strong';
    return 'medium';
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await signup(name, email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden auth-gradient-bg flex items-center justify-center p-6 py-12">
      
      {/* Decorative Floating Orbs */}
      <div className="auth-orb auth-orb-1"></div>
      <div className="auth-orb auth-orb-2"></div>

      {/* Main Glass Card */}
      <div className="glass-card w-full max-w-lg rounded-3xl p-8 md:p-10 relative z-10 animate-slide-up shadow-pastel-lg">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-500">Join Sarthi.ai and ace your interviews</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2 animate-shake">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Field */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="auth-input w-full px-5 py-3 rounded-xl border border-gray-200 bg-white/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white"
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input w-full px-5 py-3 rounded-xl border border-gray-200 bg-white/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white"
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password Fields Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input w-full px-5 py-3 rounded-xl border border-gray-200 bg-white/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 011.563-3.029A9.97 9.97 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              
              {/* Password Strength Meter */}
              {password && (
                <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                  <div className={`h-1 rounded-full transition-all duration-500 strength-${passwordStrength}`}></div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="confirmPassword">Confirm</label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`auth-input w-full px-5 py-3 rounded-xl border bg-white/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white ${
                  confirmPassword && password !== confirmPassword ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                }`}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (confirmPassword && password !== confirmPassword)}
            className="btn-shine w-full py-4 px-6 mt-4 rounded-xl text-white font-semibold text-lg shadow-pastel transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white/50 text-gray-500 rounded-full backdrop-blur-sm">Or</span>
          </div>
        </div>

        {/* Google OAuth Button Container */}
        <div className="flex justify-center mb-6">
          <div id="google-signup-button" className="google-btn w-full flex justify-center"></div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">
            Log in
          </Link>
        </p>

      </div>
    </div>
  );
};

export default SignupPage;
