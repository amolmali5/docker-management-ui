'use client';

import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  fullScreen = false,
  className = ''
}) => {
  if (!isVisible) return null;

  // Base classes for the overlay
  const baseClasses = "bg-black bg-opacity-50 z-50 flex items-center justify-center";

  // Classes based on whether it's fullscreen or not
  const positionClasses = fullScreen ? "fixed inset-0" : "absolute inset-0";

  return (
    <div className={`${baseClasses} ${positionClasses} ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
