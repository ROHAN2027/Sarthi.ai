import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { WS_BASE_URL } from '../config';

const VoiceInterview = ({ 
  interviewType = 'conceptual', 
  onComplete,
  preloadedQuestions = null,
  githubRepo = null,
  candidateName = null 
}) => {
  const { user } = useAuth();
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  // Interview state
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [questionContext, setQuestionContext] = useState('');
  const [isFollowUp, setIsFollowUp] = useState(false);
  
  // Project interview specific - use prop if provided
  const [repoUrl, setRepoUrl] = useState(githubRepo || '');
  const [repoInputError, setRepoInputError] = useState(null);
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Feedback state
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [currentScore, setCurrentScore] = useState(0);
  
  // Error state
  const [error, setError] = useState(null);

  // Chat conversation history - NEW for realistic UI
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);

  // Theme state - dark/light toggle
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Refs
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const hasAutoStarted = useRef(false);
  const chatContainerRef = useRef(null);

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopRecording();
    };
  }, []);

  // Auto-start project interview if GitHub repo is preloaded
  useEffect(() => {
    if (
      interviewType === 'project' && 
      githubRepo && 
      !interviewStarted && 
      isConnected && 
      !hasAutoStarted.current
    ) {
      hasAutoStarted.current = true;
      // Small delay to ensure WebSocket is fully ready
      setTimeout(() => {
        startProjectInterview();
      }, 500);
    }
  }, [githubRepo, interviewStarted, isConnected, interviewType]);

  // Auto-scroll to latest message in chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversationHistory, showTypingIndicator]);

  /**
   * Connect to WebSocket server
   */
  const connectWebSocket = () => {
    try {
      // Debug log removed
      const ws = new WebSocket(`${WS_BASE_URL}/ws/voice`);
      
      ws.onopen = () => {
        // Debug log removed
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Debug log removed
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setError('WebSocket connection error. Please ensure backend is running on port 5000.');
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        // Debug log removed
        setIsConnected(false);
        
        // Only auto-reconnect if:
        // 1. Interview hasn't started yet
        // 2. Connection was not closed intentionally (code 1000 = normal closure)
        // 3. Not already attempting to reconnect
        if (!interviewStarted && event.code !== 1000 && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
          // Debug log removed
          setTimeout(() => {
            // Double-check we're still not connected before reconnecting
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
              // Debug log removed
              connectWebSocket();
            }
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Failed to create connection:', err);
      setError(`Failed to connect to WebSocket: ${err.message}`);
      setIsConnected(false);
    }
  };

  /**
   * Handle incoming WebSocket messages
   */
  const handleWebSocketMessage = (data) => {
    // Debug log removed

    switch (data.type) {
      case 'connected':
        setSessionId(data.sessionId);
        break;

      case 'ai_question':
        setShowTypingIndicator(true);
        
        // Small delay to simulate typing
        setTimeout(() => {
          setShowTypingIndicator(false);
          
          // Add question to conversation history
          const questionMessage = {
            id: `q-${Date.now()}`,
            role: 'bot',
            type: 'question',
            text: data.text,
            questionNumber: data.questionNumber,
            totalQuestions: data.totalQuestions,
            context: data.context || '',
            isFollowUp: data.isFollowUp || false,
            category: data.category,
            difficulty: data.difficulty,
            timestamp: new Date()
          };
          
          setConversationHistory(prev => [...prev, questionMessage]);
          setCurrentQuestion(data.text);
          setQuestionNumber(data.questionNumber);
          setTotalQuestions(data.totalQuestions);
          setQuestionContext(data.context || '');
          setIsFollowUp(data.isFollowUp || false);
          setTranscript(''); // Clear previous answer
          setLastEvaluation(null);
        }, 800); // 800ms typing delay for realism
        break;

      case 'audio_stream_start':
        setIsAISpeaking(true);
        audioQueueRef.current = [];
        break;

      case 'audio_chunk':
        // Just buffer the chunks, don't play yet
        audioQueueRef.current.push(data.data);
        break;

      case 'audio_stream_end':
        // Now play all buffered audio at once
        setIsAISpeaking(false);
        
        // Check if this is silent mode (rate limit hit)
        if (data.silentMode) {
          console.warn('[VoiceInterview] Voice unavailable (rate limit), continuing in text mode');
          // Show notification to user
          setError('Voice temporarily unavailable. Interview continues in text mode.');
          setTimeout(() => setError(null), 5000); // Clear after 5 seconds
          audioQueueRef.current = []; // Clear any partial audio
        } else {
          playAudioQueue();
        }
        break;

      case 'transcription':
        const transcribedText = data.text;
        setTranscript(transcribedText);
        
        // Add user answer to conversation history
        const answerMessage = {
          id: `a-${Date.now()}`,
          role: 'user',
          type: 'answer',
          text: transcribedText,
          timestamp: new Date()
        };
        
        setConversationHistory(prev => [...prev, answerMessage]);
        break;

      case 'evaluation':
        const feedbackMessage = {
          id: `f-${Date.now()}`,
          role: 'bot',
          type: 'feedback',
          score: data.score,
          feedback: data.feedback,
          keyPointsCovered: data.keyPointsCovered,
          missedPoints: data.missedPoints,
          timestamp: new Date()
        };
        
        setConversationHistory(prev => [...prev, feedbackMessage]);
        setLastEvaluation({
          score: data.score,
          feedback: data.feedback
        });
        setCurrentScore(data.currentScore);
        break;

      case 'interview_complete':
        // Debug log removed
        handleInterviewComplete(data);
        break;

      case 'error':
        setError(data.message);
        break;

      default:
        console.warn('Unknown message type:', data.type);
    }
  };

  /**
   * Start the interview
   */
  const startInterview = () => {
    if (!wsRef.current || !isConnected) {
      setError('Not connected to server');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'start_interview',
      interviewType: interviewType,
      userId: user?._id || 'anonymous'
    }));

    setInterviewStarted(true);
  };

  /**
   * Start project interview with GitHub repo
   */
  const startProjectInterview = () => {
    if (!wsRef.current || !isConnected) {
      setError('Not connected to server');
      return;
    }

    // Validate GitHub URL
    if (!repoUrl.match(/github\.com\/[\w-]+\/[\w-]+/)) {
      setRepoInputError('Please enter a valid GitHub repository URL');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'start_project_interview',
      repoUrl: repoUrl,
      userId: user?._id || 'anonymous'
    }));

    setInterviewStarted(true);
    setRepoInputError(null);
  };

  /**
   * Start recording audio
   */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder with appropriate MIME type
      const options = { mimeType: 'audio/webm' };
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Convert blob to base64 and send
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            wsRef.current.send(JSON.stringify({
              type: 'audio_chunk',
              data: base64,
              format: 'webm'
            }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Send audio_end message
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'audio_end' }));
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording and send chunks every 1000ms
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setError(null);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Microphone access denied or unavailable');
    }
  };

  /**
   * Stop recording audio
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  /**
   * Play audio queue with improved buffering - concatenates all chunks into single buffer
   */
  const playAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;

    // Initialize AudioContext if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    try {
      // Concatenate all base64 chunks into a single binary string first
      let allBinaryData = '';
      while (audioQueueRef.current.length > 0) {
        const base64Audio = audioQueueRef.current.shift();
        allBinaryData += atob(base64Audio);
      }

      // Convert concatenated string to ArrayBuffer
      const len = allBinaryData.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = allBinaryData.charCodeAt(i);
      }

      // Decode the entire audio as a single buffer
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

      // Play the single concatenated buffer (no gaps, no glitches!)
      await playSingleAudioBuffer(audioContext, audioBuffer);

    } catch (err) {
      console.error('Error playing audio:', err);
    }

    isPlayingRef.current = false;
  };

  /**
   * Play a single audio buffer
   */
  const playSingleAudioBuffer = (context, buffer) => {
    return new Promise((resolve) => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = resolve;
      source.start(0);
    });
  };

  /**
   * Skip current question
   */
  const skipQuestion = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Add skip message to conversation
      const skipMessage = {
        id: `skip-${Date.now()}`,
        role: 'user',
        type: 'answer',
        text: '[Skipped]',
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, skipMessage]);
      setTranscript('[Skipped]');
      
      wsRef.current.send(JSON.stringify({ type: 'skip_question' }));
    }
  };

  /**
   * Handle interview completion - FIX: Ensure onComplete is called
   */
  const handleInterviewComplete = (data) => {
    // Debug log removed
    
    // Add completion message to chat
    const completionMessage = {
      id: `complete-${Date.now()}`,
      role: 'bot',
      type: 'completion',
      text: `🎉 Interview completed! You scored ${data.totalScore}/${data.maxScore} points (${data.percentage}%)`,
      totalScore: data.totalScore,
      maxScore: data.maxScore,
      percentage: data.percentage,
      timestamp: new Date()
    };
    
    setConversationHistory(prev => [...prev, completionMessage]);
    
    // CRITICAL FIX: Ensure onComplete callback is called
    if (onComplete && typeof onComplete === 'function') {
      // Debug log removed
      onComplete(data);
    } else {
      console.error('[VoiceInterview] onComplete callback not provided or not a function!');
    }
  };

  return (
    <div className={`voice-interview min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} ${isDarkMode ? 'text-white' : 'text-black'} p-6 transition-colors duration-300`}>
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {interviewType === 'conceptual' ? 'Conceptual' : 'Project'} Interview
          </h1>
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} transition-all`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className={`px-3 py-1 rounded-full text-sm border ${
              isConnected 
                ? (isDarkMode ? 'bg-white/10 border-white/30' : 'bg-black/10 border-black/30')
                : (isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10')
            }`}>
              {isConnected ? '● Connected' : wsRef.current?.readyState === WebSocket.CONNECTING ? '● Connecting...' : '● Disconnected'}
            </div>
            <div className="text-lg font-semibold">
              Score: {currentScore}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`${isDarkMode ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'} border rounded-lg p-4 mb-6`}>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Start Interview Button */}
        {!interviewStarted && isConnected && (
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'} rounded-lg p-8 text-center mb-6`}>
            <h2 className="text-2xl mb-4">Ready to begin?</h2>
            
            {/* Project Interview: Show Repo Input */}
            {interviewType === 'project' ? (
              <>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                  Enter your GitHub repository URL to start a project-specific technical interview.
                </p>
                <div className="max-w-2xl mx-auto mb-6">
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className={`w-full px-4 py-3 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-black placeholder-gray-500'} border rounded-lg focus:outline-none ${isDarkMode ? 'focus:border-blue-500' : 'focus:border-blue-400'} mb-2`}
                  />
                  {repoInputError && (
                    <p className={`${isDarkMode ? 'text-red-400' : 'text-red-600'} text-sm text-left`}>{repoInputError}</p>
                  )}
                  <p className={`${isDarkMode ? 'text-gray-500' : 'text-gray-600'} text-sm text-left mt-2`}>
                    💡 The AI will analyze your repository and ask {totalQuestions} questions about your project
                  </p>
                </div>
                <button
                  onClick={startProjectInterview}
                  disabled={!repoUrl.trim()}
                  className={`${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} px-8 py-3 rounded-lg font-semibold text-lg ${isDarkMode ? 'disabled:bg-gray-700 disabled:text-gray-500' : 'disabled:bg-gray-300 disabled:text-gray-500'} disabled:cursor-not-allowed`}
                >
                  Analyze Repository & Start Interview
                </button>
              </>
            ) : (
              /* Conceptual Interview */
              <>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                  You'll be asked {totalQuestions} questions. You can answer using voice or skip questions.
                </p>
                <button
                  onClick={startInterview}
                  className={`${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} px-8 py-3 rounded-lg font-semibold text-lg`}
                >
                  Start Interview
                </button>
              </>
            )}
          </div>
        )}

        {/* Interview In Progress - BLACK/WHITE THEMED */}
        {interviewStarted && (
          <>
            {/* Progress Bar */}
            <div className="mb-4">
              <div className={`flex justify-between text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span>Question {questionNumber} of {totalQuestions}</span>
                <span>{Math.round((questionNumber / totalQuestions) * 100)}% Complete</span>
              </div>
              <div className={`w-full rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}>
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-white' : 'bg-black'}`}
                  style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Chat Container */}
            <div 
              ref={chatContainerRef}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100 border border-gray-200'} rounded-lg p-4 mb-4 h-[500px] overflow-y-auto`}
              style={{ 
                scrollBehavior: 'smooth'
              }}
            >
              {conversationHistory.length === 0 && (
                <div className={`flex items-center justify-center h-full ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>Your conversation will appear here...</p>
                  </div>
                </div>
              )}

              {/* Render conversation messages */}
              {conversationHistory.map((message) => (
                <ChatMessage key={message.id} message={message} isDarkMode={isDarkMode} />
              ))}

              {/* Typing Indicator */}
              {showTypingIndicator && (
                <div className="flex items-start space-x-3 mb-4 animate-fadeIn">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-lg p-4 max-w-[80%]">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Speaking Indicator */}
              {isAISpeaking && (
                <div className="flex items-center justify-center text-blue-400 text-sm mb-2">
                  <div className="animate-pulse mr-2">�</div>
                  <span>AI is speaking...</span>
                </div>
              )}
            </div>

            {/* Recording Status */}
            {isRecording && (
              <div className="flex items-center justify-center text-red-400 mb-3 animate-pulse">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-ping"></div>
                <span className="font-semibold">Recording your answer...</span>
              </div>
            )}

            {/* Controls */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAISpeaking}
                className={`px-8 py-4 rounded-lg font-semibold text-lg flex items-center space-x-2 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors`}
              >
                {isRecording ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    <span>Start Recording</span>
                  </>
                )}
              </button>

              <button
                onClick={skipQuestion}
                disabled={isAISpeaking || isRecording}
                className="px-6 py-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold text-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                Skip Question
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ChatMessage Component for rendering individual messages
const ChatMessage = ({ message, isDarkMode }) => {
  const { role, type, text, timestamp } = message;
  
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Bot messages (questions and feedback)
  if (role === 'bot') {
    if (type === 'question') {
      return (
        <div className="flex items-start space-x-3 mb-4 animate-fadeIn">
          <div className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-white/10 border border-white/20' : 'bg-black/10 border border-black/20'} flex items-center justify-center flex-shrink-0`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 max-w-[80%]">
            <div className={`${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'} border rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  AI Interviewer {message.isFollowUp && '• Follow-up'}
                </span>
                <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{formatTime(timestamp)}</span>
              </div>
              <p className={`leading-relaxed ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{text}</p>
              {message.context && (
                <div className={`mt-2 pt-2 ${isDarkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'}`}>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    💡 Context: {message.context}
                  </p>
                </div>
              )}
              <div className="mt-2 flex items-center space-x-2 text-xs">
                {message.category && (
                  <span className={`px-2 py-1 rounded ${isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-black/10 text-gray-600'}`}>{message.category}</span>
                )}
                {message.difficulty && (
                  <span className={`px-2 py-1 rounded ${isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-black/10 text-gray-600'}`}>
                    {message.difficulty}
                  </span>
                )}
                <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>Q{message.questionNumber}/{message.totalQuestions}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (type === 'feedback') {
      return (
        <div className="flex items-start space-x-3 mb-4 animate-fadeIn">
          <div className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-white/10 border border-white/20' : 'bg-black/10 border border-black/20'} flex items-center justify-center flex-shrink-0`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 max-w-[80%]">
            <div className={`${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-black/10 border-black/20'} border rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Feedback</span>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatTime(timestamp)}</span>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>+{message.score}</span>
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>points</span>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{message.feedback}</p>
            </div>
          </div>
        </div>
      );
    }
    
    if (type === 'completion') {
      return (
        <div className="flex justify-center mb-4 animate-fadeIn">
          <div className={`${isDarkMode ? 'bg-white/10 border-white/20' : 'bg-black/10 border-black/20'} border rounded-lg p-4 max-w-md text-center`}>
            <div className="text-3xl mb-2">🎉</div>
            <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{text}</p>
          </div>
        </div>
      );
    }
  }

  // User messages (answers)
  if (role === 'user') {
    const isSkipped = text === '[Skipped]';
    
    return (
      <div className="flex items-start space-x-3 mb-4 justify-end animate-fadeIn">
        <div className="flex-1 max-w-[80%] flex justify-end">
          <div className={`rounded-lg p-4 border ${
            isDarkMode 
              ? (isSkipped ? 'bg-white/5 border-white/10' : 'bg-white/10 border-white/20')
              : (isSkipped ? 'bg-black/5 border-black/10' : 'bg-black/10 border-black/20')
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>You</span>
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} ml-4`}>{formatTime(timestamp)}</span>
            </div>
            <p className={`text-sm leading-relaxed ${
              isSkipped 
                ? (isDarkMode ? 'text-gray-500 italic' : 'text-gray-600 italic')
                : (isDarkMode ? 'text-gray-100' : 'text-gray-900')
            }`}>
              {text}
            </p>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-white/10 border border-white/20' : 'bg-black/10 border border-black/20'} flex items-center justify-center flex-shrink-0`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    );
  }

  return null;
};

export default VoiceInterview;
