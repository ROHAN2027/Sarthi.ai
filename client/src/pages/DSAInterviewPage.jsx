import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';
import CodeEditor from '../components/CodeEditor';
import Header from '../components/Header';
import { 
  LoadingScreen, 
  ErrorScreen, 
  InterviewCompleteScreen, 
  NoQuestionsScreen 
} from '../components/ScreenViews';
import { fetchRandomQuestions } from '../controllers/apiController';
import { 
  handleSkipQuestion, 
  handleSubmitQuestion, 
  handleAutoSubmitQuestion, 
  moveToNextQuestion 
} from '../controllers/interviewController';

function DSAInterviewPage() {
  const navigate = useNavigate();
  const { name, setCurrentStage, completeStage, preloadGithubQuestions, githubLink } = useInterview();
  
  // Interview state
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [completedProblems, setCompletedProblems] = useState([]);
  const [skippedProblems, setSkippedProblems] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(null); // Time in seconds
  const [interviewComplete, setInterviewComplete] = useState(false);
  
  // Questions from backend
  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const totalQuestions = 2; // We'll fetch 2 questions
  
  const currentProblem = problems[currentProblemIndex];
  
  const hasPreloaded = React.useRef(false);

  // Set current stage on mount
  useEffect(() => {
    setCurrentStage('dsa');
  }, [setCurrentStage]);

  // Preload GitHub questions in background ONCE (if link available)
  useEffect(() => {
    if (githubLink && !interviewComplete && !hasPreloaded.current) {
      // Debug log removed
      hasPreloaded.current = true;
      // Start preloading after a short delay (let DSA load first)
      const timer = setTimeout(() => {
        preloadGithubQuestions();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [githubLink, preloadGithubQuestions, interviewComplete]);

  // Fetch questions from backend on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        const questionsWithDetails = await fetchRandomQuestions(totalQuestions);
        setProblems(questionsWithDetails);
        
        // Set initial timer based on first question's time limit
        if (questionsWithDetails.length > 0) {
          setTimeRemaining(questionsWithDetails[0].timeLimit);
        }
        
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, []);

  // Update timer when question changes
  useEffect(() => {
    if (problems.length > 0 && currentProblemIndex < problems.length) {
      setTimeRemaining(problems[currentProblemIndex].timeLimit);
    }
  }, [currentProblemIndex, problems]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || interviewComplete) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up! Auto-submit
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, interviewComplete]);

  // Move to next question wrapper
  const moveToNext = () => {
    moveToNextQuestion(currentProblemIndex, totalQuestions, setCurrentProblemIndex, setInterviewComplete);
  };

  // Handle skip
  const handleSkip = (code) => {
    handleSkipQuestion(currentProblemIndex, skippedProblems, setSkippedProblems, moveToNext);
  };

  // Handle submit
  const handleSubmit = (code, result) => {
    handleSubmitQuestion(currentProblemIndex, completedProblems, setCompletedProblems, moveToNext);
  };

  // Handle auto-submit when timer expires
  const handleAutoSubmit = () => {
    handleAutoSubmitQuestion(currentProblemIndex, completedProblems, setCompletedProblems, moveToNext);
  };

  // Loading screen
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Error screen
  if (error) {
    return <ErrorScreen error={error} />;
  }

  // Interview complete screen - Auto navigate to next round
  if (interviewComplete) {
    // Mark DSA as complete and move to Conceptual
    setTimeout(() => {
      completeStage('dsa');
      setCurrentStage('conceptual');
      navigate('/conceptual');
    }, 3000); // 3 second delay to show completion screen

    return (
      <InterviewCompleteScreen 
        totalQuestions={totalQuestions}
        completedProblems={completedProblems}
        skippedProblems={skippedProblems}
        nextRound="Conceptual Interview"
      />
    );
  }

  // Check if problems are loaded
  if (problems.length === 0) {
    return <NoQuestionsScreen />;
  }

  return (
    <div className="App">
      {/* Header with Timer and Progress */}
      <Header
        currentProblemIndex={currentProblemIndex}
        totalQuestions={totalQuestions}
        timeRemaining={timeRemaining}
        completedProblems={completedProblems}
        skippedProblems={skippedProblems}
        candidateName={name}
      />

      {/* Main Content */}
      <main className="h-[calc(100vh-120px)]">
        <CodeEditor 
          problem={currentProblem}
          onSkip={handleSkip}
          onSubmit={handleSubmit}
          timeRemaining={timeRemaining}
        />
      </main>
    </div>
  );
}

export default DSAInterviewPage;
