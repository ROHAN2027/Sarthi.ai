import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { setUserInfo, setCurrentStage, resetInterview } = useInterview();
  const { user, logout } = useAuth();
  
  // Theme state with localStorage persistence
  const [theme, setTheme] = useState('dark');
  
  // Form states (preserve ALL original functionality)
  const [formData, setFormData] = useState({
    name: '',
    resumeFile: null
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('sarthi-theme') || 'dark';
    setTheme(savedTheme);
    console.log('[LandingPage] Mounted - ready for new interview');
  }, []);

  // Auto-fill user name if available from auth
  useEffect(() => {
    if (user && user.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
  }, [user]);

  // Persist theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('sarthi-theme', theme);
  }, [theme]);

  // Toggle theme handler
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Preserve original handlers
  const handleNameChange = (e) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
    setError(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      setFormData(prev => ({ ...prev, resumeFile: file }));
      setError(null);
    }
  };

  const handleResumeUpload = async () => {
    if (!formData.resumeFile) return;

    setUploading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', formData.resumeFile);

      const response = await fetch('http://localhost:8000/parse-resume', {
        method: 'POST',
        body: formDataToSend
      });

      if (!response.ok) {
        throw new Error('Failed to parse resume');
      }

      const data = await response.json();
      console.log('[LandingPage] Parsed resume data:', data);
      setParsedData(data);
      
      // Auto-fill name if not provided
      if (!formData.name && data.name) {
        setFormData(prev => ({ ...prev, name: data.name }));
      }
    } catch (err) {
      console.error('[LandingPage] Resume parsing error:', err);
      setError(err.message || 'Failed to parse resume');
    } finally {
      setUploading(false);
    }
  };

  const handleStartInterview = () => {
    if (!formData.name) {
      setError('Please enter your name');
      return;
    }

    if (!parsedData) {
      setError('Please upload and parse your resume first');
      return;
    }

    console.log('[LandingPage] Starting interview with data:', {
      name: formData.name,
      email: parsedData.email,
      github_links: parsedData.github_links
    });

    // Store user info in context (preserve original functionality)
    setUserInfo(
      formData.name,
      parsedData.email,
      parsedData.github_links
    );

    // Set initial stage
    setCurrentStage('dsa');

    // Navigate to DSA round
    navigate('/dsa');
  };

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${theme === 'dark' ? 'dark bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900'}`}>
      {/* Header */}
      <header className={`w-full px-6 py-4 flex justify-between items-center backdrop-blur-sm transition-all duration-300 ${theme === 'dark' ? 'bg-gray-900/50 border-b border-gray-800' : 'bg-white/50 border-b border-gray-200'}`}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md">
            <img 
              src="/src/data/WhatsApp Image 2025-11-07 at 17.43.30_7cdd5e13.jpg" 
              alt="Sarthi Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-bold text-xl">Sarthi.ai</h1>
            <p className={`text-xs transition-all duration-300 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              AI-powered technical interview simulator
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3 mr-4">
              <img src={user.avatar} alt="User Avatar" className="w-8 h-8 rounded-full shadow-sm" />
              <span className={`text-sm font-medium hidden md:block ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{user.name}</span>
              <button 
                onClick={logout}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${theme === 'dark' ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
              >
                Logout
              </button>
            </div>
          )}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`p-3 rounded-full transition-all duration-300 ${theme === 'dark' ? 'hover:bg-gray-800 hover:shadow-lg' : 'hover:bg-gray-200 hover:shadow-md'}`}
          >
          {theme === 'dark' ? (
            // Sun icon for light mode
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            // Moon icon for dark mode
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-8 space-y-6 transition-all duration-300 backdrop-blur-lg ${
          theme === 'dark' 
            ? 'bg-gray-900/80 border border-gray-800' 
            : 'bg-white/80 border border-gray-200'
        }`}>
          
          <h2 className="text-3xl font-bold text-center">Get Started</h2>
          
          {/* Name Input */}
          <div className="space-y-2">
            <label htmlFor="name-input" className="block text-sm font-medium">
              Your Name *
            </label>
            <input
              id="name-input"
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Enter your full name"
              className={`w-full px-4 py-3 rounded-md border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Resume Upload */}
          <div className="space-y-2">
            <label htmlFor="resume-upload" className="block text-sm font-medium">
              Upload Resume (PDF) *
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="resume-upload"
            />
            <label
              htmlFor="resume-upload"
              className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-md cursor-pointer transition-all duration-300 ${
                theme === 'dark'
                  ? 'border-gray-700 hover:border-blue-500 bg-gray-800'
                  : 'border-gray-300 hover:border-blue-500 bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm">
                {formData.resumeFile ? formData.resumeFile.name : 'No file selected (PDF only)'}
              </span>
            </label>
            
            {formData.resumeFile && !parsedData && (
              <button
                onClick={handleResumeUpload}
                disabled={uploading}
                className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white'
                }`}
              >
                {uploading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Parsing Resume...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Parse Resume
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className={`p-4 rounded-md border-l-4 transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-red-900/20 border-red-500 text-red-300'
                : 'bg-red-100 border-red-500 text-red-700'
            }`}>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Parsed Info Display */}
          {parsedData && (
            <div className={`p-4 rounded-md border-l-4 transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-green-900/20 border-green-500 text-green-300'
                : 'bg-green-100 border-green-500 text-green-700'
            }`}>
              <h3 className="text-sm font-semibold mb-2">✓ Resume Scanned</h3>
              <div className="text-sm space-y-1">
                {parsedData.email && (
                  <p><span className="font-medium">Email:</span> {parsedData.email}</p>
                )}
                {parsedData.github_links && parsedData.github_links.length > 0 && (
                  <p><span className="font-medium">GitHub:</span> {parsedData.github_links.length} link(s) found</p>
                )}
              </div>
            </div>
          )}

          {/* Start Interview Button */}
          <button
            onClick={handleStartInterview}
            disabled={!formData.name || !parsedData || uploading}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl relative overflow-hidden group ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:via-green-700 hover:to-teal-700 text-white'
                : 'bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Interview Journey
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
          
          {/* Info Badge */}
          <div className={`text-center py-3 px-4 rounded-lg transition-all duration-300 ${
            theme === 'dark' ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-xs font-medium transition-all duration-300 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
              DSA → Conceptual → Project
            </p>
            <p className={`text-xs mt-1 transition-all duration-300 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Complete all 3 rounds for comprehensive feedback
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`text-center py-8 transition-all duration-300 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-400 bg-gray-900/30' : 'text-gray-500 bg-white/30'}`}>
        <p className="text-sm font-medium">Powered by AI • Real-time Evaluation • Comprehensive Feedback</p>
        <p className={`text-xs mt-2 transition-all duration-300 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          © 2025 Sarthi Interview Platform. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
