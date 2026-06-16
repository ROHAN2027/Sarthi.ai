import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';

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
      const res = await fetch(`http://localhost:5000/api/interview/${sId}/send-report`, {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Personalized Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2">
            🎉 Congratulations, {name || 'Candidate'}!
          </h1>
          <p className="text-gray-400 text-lg">
            You've completed all interview rounds
          </p>
        </div>
        
        {/* Completed Stages Summary */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Completed Rounds</h2>
          <div className="flex justify-center items-center space-x-8">
            {['dsa', 'conceptual', 'project'].map(stage => (
              <div key={stage} className="text-center">
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2
                  ${completedStages.includes(stage) ? 'bg-green-600' : 'bg-gray-600'}
                `}>
                  {completedStages.includes(stage) ? '✓' : '○'}
                </div>
                <p className={`text-sm ${completedStages.includes(stage) ? 'text-green-400' : 'text-gray-500'}`}>
                  {stage === 'dsa' ? 'DSA' : stage === 'conceptual' ? 'Conceptual' : 'Project'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Interview Complete! 🎉</h1>
          <p className="text-gray-400">
            {sessionType === 'conceptual' ? 'Conceptual Interview' : 
             sessionType === 'dsa' ? 'DSA Coding Interview' : 'Full Interview'} Results
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-gray-800 rounded-xl p-8 mb-6 text-center">
          <div className="mb-6">
            <div className={`text-7xl font-bold ${getGradeColor(percentage)} mb-2`}>
              {percentage}%
            </div>
            <div className="text-2xl text-gray-300 mb-1">
              {displayScore || 0} / {displayMaxScore || 0} Points
            </div>
            <div className={`text-xl font-semibold ${getGradeColor(percentage)}`}>
              {getGradeText(percentage)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
            <div
              className={`h-4 rounded-full transition-all duration-1000 ${
                percentage >= 80 ? 'bg-green-500' :
                percentage >= 60 ? 'bg-yellow-500' :
                percentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-gray-400">
            Questions Answered: {questionsAnswered || 0}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold">{displayScore || 0}</div>
            <div className="text-sm text-gray-400">Total Score</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">❓</div>
            <div className="text-2xl font-bold">{questionsAnswered || 0}</div>
            <div className="text-sm text-gray-400">Questions</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold">{percentage}%</div>
            <div className="text-sm text-gray-400">Accuracy</div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Performance Summary
          </h2>
          <div className="space-y-3">
            {percentage >= 80 && (
              <p className="text-gray-300">
                🌟 Outstanding performance! You demonstrated strong understanding of the concepts.
                Keep up the excellent work!
              </p>
            )}
            {percentage >= 60 && percentage < 80 && (
              <p className="text-gray-300">
                👍 Good job! You have a solid grasp of most concepts. Review the feedback to
                strengthen your weaker areas.
              </p>
            )}
            {percentage >= 40 && percentage < 60 && (
              <p className="text-gray-300">
                📚 Fair attempt. Focus on understanding core concepts more deeply. Practice
                will help improve your performance.
              </p>
            )}
            {percentage < 40 && (
              <p className="text-gray-300">
                💪 Don't be discouraged! Use this as a learning opportunity. Review the topics
                and try again. Consistent practice leads to improvement!
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Back to Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
          {!emailSent ? (
            <button
              onClick={handleEmailReport}
              disabled={sendingEmail}
              className={`px-8 py-3 rounded-lg font-semibold transition-all shadow-md ${
                sendingEmail 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
              }`}
            >
              {sendingEmail ? 'Sending Report...' : 'Email Me My Detailed Report'}
            </button>
          ) : (
            <button
              disabled
              className="px-8 py-3 bg-green-800 text-green-200 rounded-lg font-semibold cursor-not-allowed border border-green-500"
            >
              ✓ Report Sent
            </button>
          )}
        </div>

        {emailError && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500 text-red-300 rounded text-center">
            {emailError}
          </div>
        )}
        
        {emailSent && (
          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border border-emerald-500/30 text-emerald-300 rounded-lg text-center backdrop-blur-sm animate-pulse">
            ✅ Your report has been successfully mailed to you. You can now safely close this tab.
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Detailed feedback is also saved in your account dashboard.</p>
        </div>
      </div>
    </div>
  );
};

export default InterviewResults;
