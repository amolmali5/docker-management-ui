'use client';

import React from 'react';
import { useServer } from '../context/ServerContext';

interface ContentBlockerProps {
  children: React.ReactNode;
}

const ContentBlocker: React.FC<ContentBlockerProps> = ({ children }) => {
  const { dataReady, switchingServer, currentServer } = useServer();

  // Only block content when switching servers
  // We're removing the dataReady check to prevent blocking navigation
  const shouldBlock = switchingServer;

  return (
    <div className="relative w-full h-full overflow-y-auto">
      {/* Always render children */}
      <div className="min-h-full">
        {children}
      </div>

      {/* The loading overlay - only shown when shouldBlock is true */}
      {shouldBlock && (
        <>
          {/* Full-screen overlay to block all interactions */}
          <div className="fixed inset-0 z-40 bg-transparent cursor-not-allowed"></div>

          {/* Loader positioned in the center of the screen with a more prominent design */}
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-300 dark:border-blue-700 p-6 text-center"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '400px',
              width: '90%',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {/* Spinner */}
            <div className="inline-block animate-spin rounded-full h-14 w-14 border-t-3 border-b-3 border-blue-500 mb-5"></div>

            {/* Primary message */}
            <p className="text-gray-800 dark:text-gray-200 text-xl font-medium">
              {currentServer ? `Loading data from ${currentServer.name}...` : 'Loading server data...'}
            </p>

            {/* Secondary message */}
            <p className="text-gray-600 dark:text-gray-400 text-base mt-2">
              Please wait while we fetch the latest information
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ContentBlocker;
