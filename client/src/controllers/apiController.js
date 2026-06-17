import { API_BASE_URL as BASE_URL } from '../config';

// API Base URL
export const API_BASE_URL = `${BASE_URL}/api/problems`;

/**
 * Fetch random questions from backend
 * @param {number} count - Number of questions to fetch
 * @returns {Promise} Array of questions with details and time limits
 */
export const fetchRandomQuestions = async (count) => {
  try {
    // Step 1: Get random question titles and time limits
    const randomResponse = await fetch(`${API_BASE_URL}/random/questions?count=${count}`);
    if (!randomResponse.ok) {
      throw new Error('Failed to fetch random questions');
    }
    const randomData = await randomResponse.json();
    
    // Step 2: Fetch full details for each question
    const questionDetailsPromises = randomData.questions.map(async (q) => {
      const detailResponse = await fetch(`${API_BASE_URL}/${encodeURIComponent(q.title)}`);
      if (!detailResponse.ok) {
        throw new Error(`Failed to fetch details for ${q.title}`);
      }
      const details = await detailResponse.json();
      
      // Add timeLimit from the random questions response (in seconds)
      return {
        ...details,
        timeLimit: q.timeLimit * 60 // Convert minutes to seconds
      };
    });
    
    const questionsWithDetails = await Promise.all(questionDetailsPromises);
    return questionsWithDetails;
  } catch (error) {
    console.error('Error fetching questions:', error);
    throw error;
  }
};
