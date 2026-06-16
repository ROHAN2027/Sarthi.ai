import express from 'express';
import {
  startInterview,
  submitConceptualAnswer,
  submitDSACode,
  completeInterview,
  getInterviewSession,
  getInterviewHistory,
  sendSessionReport
} from '../controllers/interviewSessionController.js';

const router = express.Router();

// Start new interview session
router.post('/start', startInterview);

// Submit conceptual answer
router.post('/:sessionId/submit-conceptual', submitConceptualAnswer);

// Submit DSA code
router.post('/:sessionId/submit-dsa', submitDSACode);

// Complete interview
router.post('/:sessionId/complete', completeInterview);

// Send PDF report via email
router.post('/:sessionId/send-report', sendSessionReport);

// Get session details
router.get('/:sessionId', getInterviewSession);

// Get user history
router.get('/history/:userId', getInterviewHistory);

export default router;
