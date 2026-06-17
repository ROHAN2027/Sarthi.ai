import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import { API_BASE_URL } from '../config';

const InterviewResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { name, email, completedStages, resetInterview } = useInterview();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState(null);

  const handleEmailReport = async () => {
    if (!email) {
      setEmailError("User email not found. Please check your profile.");
      return;
    }
    setSendingEmail(true);
    setEmailError(null);
    try {
      // The state might be nested depending on which page navigated here
      const actualSession = sessionData?.sessionData || sessionData;
      const sId = actualSession?.sessionId || actualSession?._id;

      // Use full URL or proxy based on standard setup
      const res = await fetch(`${API_BASE_URL}/api/interview/${sId}/send-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setEmailSent(true);
      } else {
        setEmailError(data.error || "Failed to send report");
      }
    } catch (err) {
      setEmailError(err.message || "Network error while sending report");
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    // Get data from navigation state or fetch from API
    if (location.state) {
      setSessionData(location.state);
      setLoading(false);
    } else {
      // If no state, show completion screen
      setLoading(false);
    }
  }, [location.state]);

  const handleStartNewInterview = () => {
    resetInterview();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading results...</p>
        </div>
      </div>
    );
  }

  const actualSession = sessionData?.sessionData || sessionData || {};
  const { sessionType, totalScore, maxScore, questionsAnswered, finalScore, finalMaxScore } = actualSession;
  
  // Handle both pre-completion stats and final completed stats
  const displayScore = finalScore !== undefined ? finalScore : totalScore;
  const displayMaxScore = finalMaxScore !== undefined ? finalMaxScore : maxScore;
  const percentage = displayMaxScore > 0 ? Math.round((displayScore / displayMaxScore) * 100) : 0;

  const getGradeColor = (percent) => {
    if (percent >= 80) return 'text-green-500';
    if (percent >= 60) return 'text-yellow-500';
    if (percent >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getGradeText = (percent) => {
    if (percent >= 80) return 'Excellent';
    if (percent >= 60) return 'Good';
    if (percent >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0a0a] to-[#0a0a0a] text-white p-6 font-sans">
      {/* Personalized Header */}
      <div className="max-w-5xl mx-auto mb-10 pt-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            Assessment Results
          </h1>
          <p className="text-blue-400 font-medium tracking-wide">
            {name ? `Candidate: ${name}` : 'Detailed Evaluation Report'}
          </p>
        </div>
        
        {/* Completed Stages Summary */}
        <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 mb-8 shadow-2xl">
          <h2 className="text-lg font-semibold mb-6 text-center text-gray-300 tracking-wide uppercase text-sm">Evaluation Modules</h2>
          <div className="flex justify-center items-center space-x-12">
            {['dsa', 'conceptual', 'project'].map(stage => (
              <div key={stage} className="text-center group">
                <div className={`
                  w-14 h-14 rounded-full flex items-center justify-center mb-3 mx-auto transition-all duration-300
                  ${completedStages.includes(stage) 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                    : 'bg-white/5 border border-white/5 text-gray-600'}
                `}>
                  {completedStages.includes(stage) ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <p className={`text-sm font-medium tracking-wide ${completedStages.includes(stage) ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {stage === 'dsa' ? 'Data Structures' : stage === 'conceptual' ? 'System Design' : 'Project Architecture'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-semibold mb-3 text-white tracking-tight">Performance Analytics</h2>
          <p className="text-gray-400 font-medium">
            {sessionType === 'conceptual' ? 'Conceptual Assessment' : 
             sessionType === 'dsa' ? 'Algorithmic Assessment' : 'Comprehensive Assessment'} Summary
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-gradient-to-b from-[#111111]/90 to-[#0a0a0a] backdrop-blur-xl border border-white/5 rounded-3xl p-10 mb-8 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          <div className="mb-8">
            <div className={`text-8xl font-bold tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-br ${
                percentage >= 80 ? 'from-emerald-400 to-teal-600' :
                percentage >= 60 ? 'from-blue-400 to-indigo-600' :
                percentage >= 40 ? 'from-yellow-400 to-orange-600' : 'from-red-400 to-rose-600'
              }`}>
              {percentage}%
            </div>
            <div className="text-lg text-gray-400 font-medium mb-2 uppercase tracking-widest">
              {displayScore || 0} / {displayMaxScore || 0} Total Points
            </div>
            <div className={`text-xl font-semibold mt-4 ${
                percentage >= 80 ? 'text-emerald-400' :
                percentage >= 60 ? 'text-blue-400' :
                percentage >= 40 ? 'text-yellow-400' : 'text-red-400'
              }`}>
              {getGradeText(percentage)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/5 rounded-full h-3 mb-6 overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                percentage >= 80 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                percentage >= 60 ? 'bg-gradient-to-r from-blue-500 to-indigo-400' :
                percentage >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' : 'bg-gradient-to-r from-red-500 to-rose-400'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-gray-500 text-sm font-medium tracking-wide">
            TOTAL QUESTIONS EVALUATED: {questionsAnswered || 0}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center shadow-lg hover:bg-white/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{displayScore || 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Raw Score</div>
          </div>
          <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center shadow-lg hover:bg-white/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{questionsAnswered || 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Questions</div>
          </div>
          <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center shadow-lg hover:bg-white/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{percentage}%</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Accuracy</div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 mb-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 flex items-center text-white tracking-tight">
            <svg className="w-5 h-5 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Executive Summary
          </h2>
          <div className="p-5 rounded-xl bg-white/5 border border-white/5 text-gray-300 leading-relaxed font-medium">
            {percentage >= 80 && (
              <p>
                Outstanding technical proficiency demonstrated. The candidate showed exceptional understanding of the core architecture and systematic problem-solving capabilities. Highly recommended to proceed.
              </p>
            )}
            {percentage >= 60 && percentage < 80 && (
              <p>
                Solid foundational knowledge displayed. The candidate possesses a competent grasp of the evaluated technologies. Further refinement in advanced concepts could elevate the overall assessment.
              </p>
            )}
            {percentage >= 40 && percentage < 60 && (
              <p>
                Adequate technical understanding shown. The candidate met the basic requirements but may need additional support or training in core areas to handle more complex architectural challenges.
              </p>
            )}
            {percentage < 40 && (
              <p>
                The assessment indicates significant gaps in the required technical proficiency. The candidate struggled with key concepts and would benefit from further preparation before attempting similar technical evaluations.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-medium tracking-wide transition-all duration-200"
          >
            Return to Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3.5 bg-white text-black hover:bg-gray-100 rounded-xl font-semibold tracking-wide transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            Retake Assessment
          </button>
          {!emailSent ? (
            <button
              onClick={handleEmailReport}
              disabled={sendingEmail}
              className={`px-8 py-3.5 rounded-xl font-semibold tracking-wide transition-all duration-200 shadow-lg border ${
                sendingEmail 
                  ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-500/30 hover:border-blue-400/50'
              }`}
            >
              {sendingEmail ? 'Processing...' : 'Export Detailed Report'}
            </button>
          ) : (
            <button
              disabled
              className="px-8 py-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl font-medium cursor-not-allowed border border-emerald-500/20"
            >
              Report Dispatched Successfully
            </button>
          )}
        </div>

        {emailError && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center text-sm font-medium">
            {emailError}
          </div>
        )}
        
        {emailSent && (
          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center text-sm font-medium backdrop-blur-sm animate-pulse">
            The detailed assessment report has been dispatched to the candidate's registered email address.
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 text-center text-gray-600 text-xs font-medium tracking-widest uppercase mb-8">
          <p>Sarthi.ai Technical Evaluation Platform</p>
        </div>
      </div>
    </div>
  );
};

export default InterviewResults;
