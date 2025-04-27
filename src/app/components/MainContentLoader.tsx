'use client';

import React from 'react';
import { useServer } from '../context/ServerContext';

const MainContentLoader: React.FC = () => {
  const { dataReady, switchingServer, currentServer } = useServer();
  
  // Only show loader when switching servers or data is not ready
  const shouldShow = !dataReady || switchingServer;
  
  if (!shouldShow) return null;
  
  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center z-50 bg-white/70 dark:bg-gray-900/70">
      <div className="text-center p-6 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
          {currentServer ? `Loading data from ${currentServer.name}...` : 'Loading server data...'}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
          Please wait while we fetch the latest information
        </p>
      </div>
    </div>
  );
};

export default MainContentLoader;
