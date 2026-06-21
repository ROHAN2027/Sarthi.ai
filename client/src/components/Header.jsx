import React from 'react';
import { formatTime, getTimerColor, getProgressStatus } from '../controllers/utilsController';
import sarthiLogo from '../data/logo.jpg';

/**
 * Header Component with Timer and Progress
 */
const Header = ({ 
  currentProblemIndex, 
  totalQuestions, 
  timeRemaining, 
  completedProblems, 
  skippedProblems 
}) => {
  return (
    <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
          <img 
            src={sarthiLogo} 
            alt="Sarthi Logo" 
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-xl font-bold">Sarthi.ai</h1>
        <span className="text-gray-400">|</span>
        <span className="text-gray-300">AI Interview Platform</span>
      </div>
      
      {/* Interview Progress & Timer */}
      <div className="flex items-center space-x-6">
        {/* Progress */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Question</span>
          <span className="text-lg font-bold text-white">
            {currentProblemIndex + 1} / {totalQuestions}
          </span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-600"></div>

        {/* Timer */}
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-lg font-mono font-bold ${getTimerColor(timeRemaining)}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center space-x-1">
          {Array.from({ length: totalQuestions }).map((_, index) => {
            const { colorClass, status } = getProgressStatus(
              index, 
              currentProblemIndex, 
              completedProblems, 
              skippedProblems
            );
            
            return (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${colorClass}`}
                title={status}
              />
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;
