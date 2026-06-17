import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { API_BASE_URL } from '../config';

const EditorPanel = ({ problem, onSkip, onSubmit, timeRemaining }) => {
  const [language, setLanguage] = useState('python');
  
  // Get boilerplate code from problem object, fallback to empty string
  const getBoilerplateCode = (lang) => {
    if (!problem || !problem.boilerplate_code) return '';
    return problem.boilerplate_code[lang] || '';
  };
  
  const [code, setCode] = useState(getBoilerplateCode('python'));
  const [output, setOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editorHeight, setEditorHeight] = useState(60); // Percentage
  const [isDraggingVertical, setIsDraggingVertical] = useState(false);
  const panelRef = React.useRef(null);

  // Update code when problem changes (e.g., moving to next question)
  React.useEffect(() => {
    if (problem && problem.boilerplate_code) {
      setCode(getBoilerplateCode(language));
      setOutput(null);
    }
  }, [problem]);

  // Handle language change
  const onLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
    setCode(getBoilerplateCode(newLanguage));
    setOutput(null);
  };

  // Handle editor change
  const handleEditorChange = (value) => {
    setCode(value);
  };

  // Handle vertical resize
  const handleVerticalMouseDown = (e) => {
    setIsDraggingVertical(true);
    e.preventDefault();
  };

  const handleVerticalMouseMove = (e) => {
    if (!isDraggingVertical || !panelRef.current) return;

    const panel = panelRef.current;
    const panelRect = panel.getBoundingClientRect();
    const newEditorHeight = ((e.clientY - panelRect.top) / panelRect.height) * 100;

    // Limit height between 30% and 80%
    if (newEditorHeight >= 30 && newEditorHeight <= 80) {
      setEditorHeight(newEditorHeight);
    }
  };

  const handleVerticalMouseUp = () => {
    setIsDraggingVertical(false);
  };

  // Add event listeners for vertical dragging
  React.useEffect(() => {
    if (isDraggingVertical) {
      document.addEventListener('mousemove', handleVerticalMouseMove);
      document.addEventListener('mouseup', handleVerticalMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleVerticalMouseMove);
      document.removeEventListener('mouseup', handleVerticalMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      document.removeEventListener('mousemove', handleVerticalMouseMove);
      document.removeEventListener('mouseup', handleVerticalMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDraggingVertical]);

  // Handle skip button
  const handleSkipQuestion = () => {
    if (onSkip) {
      onSkip(code);
    }
  };

  // Handle Run Code - Test against visible test cases
  const handleRunCode = async () => {
    setIsLoading(true);
    setOutput(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/problems/run/${encodeURIComponent(problem.title)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: language,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        setOutput({
          type: 'error',
          message: result.error || 'Failed to run code',
          details: result.details,
        });
      } else {
        setOutput({
          type: 'run',
          results: result.results,
        });
      }

      setIsLoading(false);
    } catch (error) {
      setOutput({
        type: 'error',
        message: 'Network error occurred',
        details: error.message,
      });
      setIsLoading(false);
    }
  };

  // Handle Submit Code - Test against all test cases
  const handleSubmitCode = async () => {
    setIsLoading(true);
    setOutput(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/problems/submit/${encodeURIComponent(problem.title)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: language,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        setOutput({
          type: 'error',
          message: result.error || 'Failed to submit code',
          details: result.details,
        });
      } else {
        setOutput({
          type: 'submit',
          ...result,
        });

        // If submission was accepted, move to next question after 3 seconds
        if (result.status === 'Accepted') {
          setTimeout(() => {
            if (onSubmit) {
              onSubmit(code, result);
            }
          }, 3000);
        }
      }

      setIsLoading(false);
    } catch (error) {
      setOutput({
        type: 'error',
        message: 'Network error occurred',
        details: error.message,
      });
      setIsLoading(false);
    }
  };

  // Render output content based on state
  const renderOutput = () => {
    // Time warning (last minute)
    const showTimeWarning = timeRemaining !== null && timeRemaining <= 60 && timeRemaining > 0;

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-600">Running test cases...</p>
          </div>
        </div>
      );
    }

    if (!output) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
          {showTimeWarning && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg animate-pulse">
              <p className="text-red-700 font-semibold flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Less than 1 minute remaining!
              </p>
            </div>
          )}
          <p>Click "Run Code" to test with sample cases or "Submit" to evaluate your solution</p>
        </div>
      );
    }

    // Handle Error output
    if (output.type === 'error') {
      return (
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg font-semibold text-red-700">Error</span>
            </div>
            <p className="text-red-700">{output.message}</p>
            {output.details && (
              <pre className="mt-2 text-sm text-red-600 bg-white p-2 rounded overflow-auto">
                {output.details}
              </pre>
            )}
          </div>
        </div>
      );
    }

    // Handle Run Code output (detailed test case results)
    if (output.type === 'run') {
      return (
        <div className="p-4 overflow-auto">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Results</h3>
          <div className="space-y-3">
            {output.results.map((result, index) => {
              const isAccepted = result.status === 'Accepted';
              return (
                <div
                  key={index}
                  className={`border rounded-lg p-3 ${
                    isAccepted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-700">
                      Test Case {index + 1}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        isAccepted ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {result.status}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium text-gray-600">Input: </span>
                      <code className="bg-white px-2 py-1 rounded text-xs text-blue-700">
                        {result.testCase}
                      </code>
                    </div>

                    {result.expectedOutput && (
                      <div>
                        <span className="font-medium text-gray-600">Expected Output: </span>
                        <code className="bg-white px-2 py-1 rounded text-xs text-green-700">
                          {result.expectedOutput}
                        </code>
                      </div>
                    )}

                    {result.stdout && (
                      <div>
                        <span className="font-medium text-gray-600">Your Output: </span>
                        <code className={`bg-white px-2 py-1 rounded text-xs ${
                          result.expectedOutput && result.stdout.trim() === result.expectedOutput.trim() 
                            ? 'text-green-700' 
                            : 'text-blue-700'
                        }`}>
                          {result.stdout.trim()}
                        </code>
                      </div>
                    )}

                    {result.stderr && (
                      <div>
                        <span className="font-medium text-red-600">Error: </span>
                        <pre className="bg-white px-2 py-1 rounded text-xs text-red-600 overflow-auto">
                          {result.stderr}
                        </pre>
                      </div>
                    )}

                    {result.compile_output && (
                      <div>
                        <span className="font-medium text-red-600">Compile Error: </span>
                        <pre className="bg-white px-2 py-1 rounded text-xs text-red-600 overflow-auto">
                          {result.compile_output}
                        </pre>
                      </div>
                    )}

                    {result.time && (
                      <div className="text-gray-500 text-xs">
                        Time: {result.time}s | Memory: {result.memory} KB
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Handle Submit output (summary)
    if (output.type === 'submit') {
      const isAccepted = output.status === 'Accepted';
      return (
        <div className="p-4">
          <div
            className={`p-4 rounded-lg ${
              isAccepted ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center mb-2">
              {isAccepted ? (
                <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={`text-lg font-semibold ${isAccepted ? 'text-green-700' : 'text-red-700'}`}>
                {output.status}
              </span>
            </div>

            {isAccepted ? (
              <div>
                <p className="text-green-700 mb-2">All test cases passed!</p>
                <p className="text-sm text-gray-600">
                  Total: {output.totalTestCases} test cases
                </p>
                <p className="text-sm text-green-600 mt-2">Moving to next question...</p>
              </div>
            ) : (
              <div>
                <p className="text-red-700 mb-2">Failed on test case {output.testCaseNumber} of {output.totalTestCases}</p>
                
                {output.compile_output && (
                  <div className="mt-3">
                    <span className="font-medium text-red-600">Compile Error:</span>
                    <pre className="bg-white p-2 rounded text-sm text-red-600 mt-1 overflow-auto">
                      {output.compile_output}
                    </pre>
                  </div>
                )}

                {output.stderr && (
                  <div className="mt-3">
                    <span className="font-medium text-red-600">Runtime Error:</span>
                    <pre className="bg-white p-2 rounded text-sm text-red-600 mt-1 overflow-auto">
                      {output.stderr}
                    </pre>
                  </div>
                )}

                {output.stdout && (
                  <div className="mt-3 text-sm">
                    <span className="font-medium text-gray-700">Your Output: </span>
                    <code className="bg-white px-2 py-1 rounded">{output.stdout}</code>
                  </div>
                )}

                {output.expected && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-gray-700">Expected: </span>
                    <code className="bg-white px-2 py-1 rounded">{output.expected}</code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback
    return null;
  };

  return (
    <div ref={panelRef} className="h-full flex flex-col bg-gray-50 relative">
      {/* Editor Section */}
      <div 
        className="flex flex-col border-b border-gray-300"
        style={{ height: `${editorHeight}%` }}
      >
        {/* Language Selector */}
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <select
            value={language}
            onChange={onLanguageChange}
            className="bg-gray-700 text-white px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* Horizontal Resize Handle */}
      <div
        className="h-1 bg-gray-300 hover:bg-blue-500 cursor-row-resize flex-shrink-0 relative group transition-colors"
        onMouseDown={handleVerticalMouseDown}
      >
        <div className="absolute inset-0 -top-1 -bottom-1" />
        {/* Dots indicator in the middle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Output Section */}
      <div 
        className="flex flex-col"
        style={{ height: `${100 - editorHeight}%` }}
      >
        {/* Output Header with Action Buttons */}
        <div className="bg-gray-200 px-4 py-2 flex items-center justify-between border-b border-gray-300 flex-shrink-0">
          <h3 className="font-semibold text-gray-800">Output</h3>
          <div className="flex items-center space-x-3">
            {/* Run Code Button */}
            <button
              onClick={handleRunCode}
              disabled={isLoading}
              className={`px-4 py-2 rounded font-medium flex items-center space-x-2 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title="Run code with sample test cases"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Run Code</span>
            </button>

            {/* Skip Button */}
            <button
              onClick={handleSkipQuestion}
              disabled={isLoading}
              className={`px-4 py-2 rounded font-medium flex items-center space-x-2 ${
                isLoading
                  ? 'bg-gray-300 cursor-not-allowed text-gray-400'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
              title="Skip this question and move to next"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              <span>Skip</span>
            </button>

            {/* Submit Button */}
            <button
              onClick={handleSubmitCode}
              disabled={isLoading}
              className={`px-4 py-2 rounded font-medium flex items-center space-x-2 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              title="Submit your solution for evaluation"
            >
              {isLoading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Submit</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Content */}
        <div className="flex-1 overflow-y-auto bg-white">{renderOutput()}</div>
      </div>
    </div>
  );
};

export default EditorPanel;
