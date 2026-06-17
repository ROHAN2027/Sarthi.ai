import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import VoiceInterview from '../components/VoiceInterview';

const ConceptualInterviewPage = () => {
  const navigate = useNavigate();
  const { name, setCurrentStage, completeStage, preloadGithubQuestions, githubLink } = useInterview();
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const hasPreloaded = React.useRef(false);

  // Set current stage on mount
  useEffect(() => {
    setCurrentStage('conceptual');
  }, [setCurrentStage]);

  // Preload GitHub questions ONCE if not already loaded
  useEffect(() => {
    if (githubLink && !interviewCompleted && !hasPreloaded.current) {
      // Debug log removed
      hasPreloaded.current = true;
      preloadGithubQuestions();
    }
  }, [githubLink, preloadGithubQuestions, interviewCompleted]);

  const handleInterviewComplete = (data) => {
    // Debug log removed
    setSessionData(data);
    setInterviewCompleted(true);
    
    // Mark conceptual as complete and move to Project round
    setTimeout(() => {
      completeStage('conceptual');
      setCurrentStage('project');
      navigate('/project');
    }, 3000);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans selection:bg-blue-500/30">
      {/* Header */}
      <div className="bg-[#111111]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition-all duration-200 p-2 hover:bg-white/5 rounded-lg group"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-3">
                Conceptual Technical Assessment
                <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  Live Session
                </span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 font-medium">
                Core concepts and system architecture evaluation
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-semibold text-white shadow-inner">
                {name ? name.charAt(0).toUpperCase() : 'G'}
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Candidate</div>
                <div className="text-sm text-gray-100 font-medium">{name || 'Guest User'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto pt-6 pb-24">
        {!interviewCompleted ? (
          <VoiceInterview 
            interviewType="conceptual"
            onComplete={handleInterviewComplete}
            onBack={handleGoBack}
            candidateName={name}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Round Completed</h2>
              <p className="text-gray-400 mb-8 font-medium">Preparing the project environment for your final round...</p>
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium tracking-wide text-gray-400">
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure Assessment Environment</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Expected Duration: 20-30 minutes</span>
            </div>
          </div>
          <div className="text-gray-500 flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Sarthi.ai</span>
            <span className="w-1 h-1 rounded-full bg-gray-700"></span>
            <span>Technical Assessment Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptualInterviewPage;
