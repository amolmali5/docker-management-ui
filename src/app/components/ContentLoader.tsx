'use client';

import React from 'react';

interface ContentLoaderProps {
  isVisible: boolean;
  message?: string;
}

export const ContentLoader: React.FC<ContentLoaderProps> = ({
  isVisible,
  message = 'Loading content...'
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900 bg-opacity-80 dark:bg-opacity-80 z-40 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">{message}</p>
      </div>
    </div>
  );
};

export default ContentLoader;
