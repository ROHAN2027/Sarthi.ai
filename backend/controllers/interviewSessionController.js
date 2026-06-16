import InterviewSession from '../models/interviewSession.model.js';
import ConceptualQuestion from '../models/conceptualQuestion.model.js';
import { evaluateConceptualAnswer } from '../services/geminiEvaluator.js';
import { generateInterviewReportPDF } from '../services/pdfService.js';
import { sendReportEmail } from '../services/emailService.js';

/**
 * Start a new interview session
 * POST /api/interview/start
 */
export const startInterview = async (req, res) => {
  try {
    const { sessionType, questionCount = 5, category } = req.body;

    if (!sessionType || !['dsa', 'conceptual', 'project', 'full'].includes(sessionType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session type. Must be: dsa, conceptual, project, or full'
      });
    }

    // Create new session
    const session = new InterviewSession({
      sessionType,
      userId: req.body.userId || 'anonymous',
      startedAt: new Date(),
      status: 'in_progress'
    });

    // For conceptual interviews, fetch questions
    if (sessionType === 'conceptual' || sessionType === 'full') {
      const matchStage = category ? { category } : {};
      
      // Weighted selection: 40% Easy, 40% Medium, 20% Hard
      const easyCount = Math.floor(questionCount * 0.4);
      const mediumCount = Math.floor(questionCount * 0.4);
      const hardCount = questionCount - easyCount - mediumCount;

      const easyQuestions = await ConceptualQuestion.aggregate([
        { $match: { ...matchStage, difficulty: 'Easy' } },
        { $sample: { size: easyCount } }
      ]);

      const mediumQuestions = await ConceptualQuestion.aggregate([
        { $match: { ...matchStage, difficulty: 'Medium' } },
        { $sample: { size: mediumCount } }
      ]);

      const hardQuestions = await ConceptualQuestion.aggregate([
        { $match: { ...matchStage, difficulty: 'Hard' } },
        { $sample: { size: hardCount } }
      ]);

      const allQuestions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);

      // Initialize conceptual questions in session
      session.conceptualQuestions = shuffled.map(q => ({
        questionId: q._id,
        category: q.category,
        difficulty: q.difficulty,
        questionText: q.question
      }));

      session.conceptualMaxScore = shuffled.length * 10; // 10 points per question
    }

    await session.save();

    res.json({
      success: true,
      sessionId: session._id,
      sessionType: session.sessionType,
      message: 'Interview session started',
      questions: session.conceptualQuestions.map(q => ({
        _id: q._id,
        category: q.category,
        difficulty: q.difficulty,
        questionText: q.questionText
      }))
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start interview session'
    });
  }
};

/**
 * Submit conceptual answer
 * POST /api/interview/:sessionId/submit-conceptual
 */
export const submitConceptualAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, answer, transcript, isSkipped = false } = req.body;

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Find the question in session
    const questionIndex = session.conceptualQuestions.findIndex(
      q => q._id.toString() === questionId
    );

    if (questionIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Question not found in session'
      });
    }

    const sessionQuestion = session.conceptualQuestions[questionIndex];

    // Handle skipped question
    if (isSkipped) {
      sessionQuestion.isSkipped = true;
      sessionQuestion.userAnswer = '[SKIPPED]';
      sessionQuestion.aiEvaluation = {
        score: 0,
        feedback: 'Question was skipped.',
        keyPointsCovered: [],
        missedPoints: []
      };
      sessionQuestion.timestamp = new Date();

      session.updateConceptualScore();
      await session.save();

      return res.json({
        success: true,
        score: 0,
        feedback: 'Question skipped',
        currentScore: session.conceptualTotalScore,
        maxScore: session.conceptualMaxScore
      });
    }

    // Get full question details for evaluation
    const fullQuestion = await ConceptualQuestion.findById(sessionQuestion.questionId);
    if (!fullQuestion) {
      return res.status(404).json({
        success: false,
        error: 'Question details not found'
      });
    }

    // Evaluate answer with Gemini
    const evaluation = await evaluateConceptualAnswer(fullQuestion, answer);

    // Update session
    sessionQuestion.userAnswer = answer;
    sessionQuestion.transcript = transcript || answer;
    sessionQuestion.aiEvaluation = evaluation;
    sessionQuestion.timestamp = new Date();

    session.updateConceptualScore();
    await session.save();

    res.json({
      success: true,
      score: evaluation.score,
      feedback: evaluation.feedback,
      keyPointsCovered: evaluation.keyPointsCovered,
      missedPoints: evaluation.missedPoints,
      currentScore: session.conceptualTotalScore,
      maxScore: session.conceptualMaxScore
    });
  } catch (error) {
    console.error('Error submitting conceptual answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit answer'
    });
  }
};

/**
 * Submit DSA code
 * POST /api/interview/:sessionId/submit-dsa
 */
export const submitDSACode = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      problemId,
      problemTitle,
      difficulty,
      code,
      language,
      testResults,
      timeTaken,
      isSkipped = false
    } = req.body;

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Calculate score based on test results (proportional scoring - Option B)
    let score = 0;
    if (!isSkipped && testResults) {
      const { totalTests, passedTests } = testResults;
      if (totalTests > 0) {
        // Proportional: 5 marks * (passedTests / totalTests)
        score = Math.round((passedTests / totalTests) * 5);
      }
    }

    // Add DSA question to session
    session.dsaQuestions.push({
      problemId,
      problemTitle,
      difficulty,
      submittedCode: code || '',
      language,
      testResults: testResults || { totalTests: 0, passedTests: 0, failedTests: [] },
      timeTaken: timeTaken || 0,
      isSkipped,
      score,
      maxScore: 5,
      timestamp: new Date()
    });

    session.updateDSAScore();
    await session.save();

    res.json({
      success: true,
      score,
      maxScore: 5,
      passedTests: testResults?.passedTests || 0,
      totalTests: testResults?.totalTests || 0,
      currentScore: session.dsaTotalScore,
      maxPossibleScore: session.dsaMaxScore
    });
  } catch (error) {
    console.error('Error submitting DSA code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit DSA code'
    });
  }
};

/**
 * Complete interview session
 * POST /api/interview/:sessionId/complete
 */
export const completeInterview = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    session.status = 'completed';
    session.completedAt = new Date();
    session.calculateFinalScore();
    
    await session.save();

    res.json({
      success: true,
      sessionId: session._id,
      sessionType: session.sessionType,
      finalScore: session.finalScore,
      finalMaxScore: session.finalMaxScore,
      percentage: session.percentage,
      dsaScore: session.dsaTotalScore,
      dsaMaxScore: session.dsaMaxScore,
      conceptualScore: session.conceptualTotalScore,
      conceptualMaxScore: session.conceptualMaxScore,
      completedAt: session.completedAt
    });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete interview'
    });
  }
};

/**
 * Get interview session details
 * GET /api/interview/:sessionId
 */
export const getInterviewSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findById(sessionId)
      .populate('dsaQuestions.problemId')
      .populate('conceptualQuestions.questionId');

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session'
    });
  }
};

/**
 * Get user's interview history
 * GET /api/interview/history/:userId
 */
export const getInterviewHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const sessions = await InterviewSession.find({ userId })
      .sort({ startedAt: -1 })
      .limit(20)
      .select('-dsaQuestions.submittedCode -conceptualQuestions.transcript');

    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    console.error('Error fetching interview history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch interview history'
    });
  }
};

/**
 * Generate PDF report and send via email
 * POST /api/interview/:sessionId/send-report
 */
export const sendSessionReport = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const session = await InterviewSession.findById(sessionId)
      .populate('dsaQuestions.problemId')
      .populate('conceptualQuestions.questionId');

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Pass a dummy user object with name derived from email if not provided
    const userMock = { name: email.split('@')[0] };
    const pdfBuffer = await generateInterviewReportPDF(session, userMock);
    const emailResult = await sendReportEmail(email, pdfBuffer, session);

    res.json({
      success: true,
      message: 'Report sent successfully',
      mocked: emailResult.mocked
    });
  } catch (error) {
    console.error('Error generating or sending report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send report'
    });
  }
};
