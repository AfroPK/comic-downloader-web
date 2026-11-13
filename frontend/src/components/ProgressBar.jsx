import React, { useState } from 'react';

/**
 * A simple Tailwind-styled progress bar component.
 * @param {object} props - The component props.
 * @param {number} props.progress - Progress percentage (0-100).
 * @param {string} props.label - Descriptive label for the progress bar.
 */
const ProgressBar = ({ progress, label }) => {
  // Ensure progress is clamped between 0 and 100
  const safeProgress = Math.max(0, Math.min(100, Number(progress)));

  return (
    <div className="w-full p-4 bg-gray-100 rounded-lg shadow-inner space-y-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-500 ease-out"
          style={{ width: `${safeProgress}%` }}
        ></div>
      </div>
      <p className="text-right text-xs font-mono text-blue-600">{Math.round(safeProgress)}%</p>
    </div>
  );
};

export default ProgressBar;