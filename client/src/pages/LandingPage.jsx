import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, PYTHON_API_URL } from '../config';
import sarthiLogo from '../data/WhatsApp Image 2025-11-07 at 17.43.30_7cdd5e13.jpg';

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

  // History state
  const [pastSessions, setPastSessions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [emailSendingMap, setEmailSendingMap] = useState({});

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('sarthi-theme') || 'dark';
    setTheme(savedTheme);
    // Debug log removed
  }, []);

  // Auto-fill user name if available from auth
  useEffect(() => {
    if (user && user.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
  }, [user]);

  // Fetch interview history when user logs in
  useEffect(() => {
    if (user && user._id) {
      setLoadingHistory(true);
      fetch(`${API_BASE_URL}/api/interview/history/${user._id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setPastSessions(data.sessions);
        })
        .catch(err => console.error('Failed to fetch history:', err))
        .finally(() => setLoadingHistory(false));
    }
  }, [user]);

  const handleResendReport = async (sessionId) => {
    if (!user?.email) return;
    setEmailSendingMap(prev => ({ ...prev, [sessionId]: 'sending' }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/${sessionId}/send-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      setEmailSendingMap(prev => ({ 
        ...prev, 
        [sessionId]: data.success ? 'sent' : 'error' 
      }));
      if (data.success) {
        setTimeout(() => {
          setEmailSendingMap(prev => ({ ...prev, [sessionId]: null }));
        }, 5000);
      }
    } catch (err) {
      setEmailSendingMap(prev => ({ ...prev, [sessionId]: 'error' }));
    }
  };

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

      const response = await fetch(`${PYTHON_API_URL}/parse-resume`, {
        method: 'POST',
        body: formDataToSend
      });

      if (!response.ok) {
        throw new Error('Failed to parse resume');
      }

      const data = await response.json();
      // Debug log removed
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
    <div className="min-h-screen flex flex-col font-sans selection:bg-blue-500/30 bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0a0a] to-[#0a0a0a] text-white">
      {/* Header */}
      <header className="w-full px-6 py-4 flex justify-between items-center backdrop-blur-xl bg-[#111111]/80 border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md border border-white/10">
            <img 
              src={sarthiLogo} 
              alt="Sarthi Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-white">Sarthi.ai</h1>
            <p className="text-xs transition-all duration-300 text-gray-400 font-medium">
              AI-powered technical interview simulator
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3 mr-4">
              <img src={user.avatar} alt="User Avatar" className="w-8 h-8 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/10" />
              <span className="text-sm font-medium hidden md:block text-gray-200">{user.name}</span>
              <button 
                onClick={logout}
                className="text-xs px-3 py-1.5 rounded-md border transition-colors border-white/10 text-gray-300 hover:bg-white/5"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center py-12 px-6 space-y-12 w-full max-w-6xl mx-auto">
        <div className="w-full max-w-lg rounded-2xl shadow-2xl p-8 space-y-6 backdrop-blur-xl bg-[#111111]/80 border border-white/5">
          
          <h2 className="text-3xl font-bold text-center tracking-tight text-white">Get Started</h2>
          
          {/* Name Input */}
          <div className="space-y-2">
            <label htmlFor="name-input" className="block text-sm font-medium text-gray-300">
              Your Name *
            </label>
            <input
              id="name-input"
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white/5 border-white/10 text-white placeholder-gray-500"
            />
          </div>

          {/* Resume Upload */}
          <div className="space-y-2">
            <label htmlFor="resume-upload" className="block text-sm font-medium text-gray-300">
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
              className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 border-white/10 hover:border-blue-500/50 bg-white/5 hover:bg-white/10"
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
                className="w-full py-3.5 mt-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
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
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Parsed Info Display */}
          {parsedData && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 backdrop-blur-sm">
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
            className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] relative overflow-hidden group bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:via-emerald-400 hover:to-teal-400 text-white"
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
          <div className="text-center py-3 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs font-medium text-blue-400 uppercase tracking-widest">
              DSA → Conceptual → Project
            </p>
            <p className="text-xs mt-1 text-gray-400 font-medium">
              Complete all 3 rounds for comprehensive feedback
            </p>
          </div>
        </div>

        {/* Past Interview History Panel */}
        {user && (
          <div className="w-full max-w-4xl space-y-6 mt-12">
            <h3 className="text-2xl font-bold text-white tracking-tight">Past Interview Reports</h3>
            {loadingHistory ? (
              <p className="text-gray-400 font-medium">Loading history...</p>
            ) : pastSessions.length === 0 ? (
              <p className="text-gray-400 font-medium">No completed interviews found. Start your journey above!</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {pastSessions.map(session => {
                  const percentage = session.percentage || (session.finalMaxScore > 0 ? Math.round((session.finalScore/session.finalMaxScore)*100) : 0);
                  const sendingState = emailSendingMap[session._id];
                  
                  return (
                    <div key={session._id} className="p-6 rounded-2xl border transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 bg-[#111111]/80 border-white/5 hover:border-white/10 backdrop-blur-xl">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {session.sessionType.toUpperCase()}
                          </span>
                          <p className="mt-3 text-sm text-gray-400 font-medium">
                            {new Date(session.completedAt || session.startedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${
                            percentage >= 80 ? 'text-emerald-400' : percentage >= 60 ? 'text-yellow-400' : 'text-orange-400'
                          }`}>{percentage}%</div>
                          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
                            {session.finalScore || 0} / {session.finalMaxScore || 0} pts
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleResendReport(session._id)}
                        disabled={sendingState === 'sending' || sendingState === 'sent'}
                        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex justify-center items-center mt-2 ${
                          sendingState === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-not-allowed' :
                          sendingState === 'sending' ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5' :
                          'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {sendingState === 'sent' ? 'Report Sent' :
                         sendingState === 'sending' ? 'Sending...' : 'Email Me Report'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 backdrop-blur-xl bg-[#0a0a0a]/80 border-t border-white/5 mt-auto">
        <p className="text-sm font-medium text-gray-400 tracking-wide">Powered by AI • Real-time Evaluation • Comprehensive Feedback</p>
        <p className="text-xs mt-2 text-gray-500 uppercase tracking-widest font-semibold">
          © {new Date().getFullYear()} Sarthi Interview Platform. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
