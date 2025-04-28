'use client';

import React from 'react';
import { useServer } from '../context/ServerContext';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ContentBlockerProps {
  children: React.ReactNode;
}

const ContentBlocker: React.FC<ContentBlockerProps> = ({ children }) => {
  const { dataReady, switchingServer, currentServer, error } = useServer();

  // Block content when switching servers OR when data is not ready
  // This ensures the loader stays visible until data is fully loaded
  const shouldBlock = switchingServer || !dataReady;

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
            {/* Check if there's an error about offline servers or backend server issues */}
            {error && (error.includes('offline') || error.includes('backend server')) ? (
              <>
                {/* Warning icon for offline servers */}
                <div className="flex justify-center mb-5">
                  <FaExclamationTriangle className="h-14 w-14 text-yellow-500" />
                </div>

                {/* Primary message */}
                <p className="text-gray-800 dark:text-gray-200 text-xl font-medium">
                  {error.includes('offline') ? 'Server Offline' : 'Connection Error'}
                </p>

                {/* Error message */}
                <p className="text-gray-600 dark:text-gray-400 text-base mt-2">
                  {error}
                </p>

                {/* Advice */}
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-left">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    <strong>What you can do:</strong>
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-5 space-y-1">
                    {error.includes('backend server') ? (
                      <>
                        <li>The application server may not be running</li>
                        <li>Contact your administrator for assistance</li>
                        <li>Try refreshing the page after a few minutes</li>
                      </>
                    ) : (
                      <>
                        <li>Check if the Docker server is running</li>
                        <li>Verify your network connection</li>
                        <li>Contact your administrator for assistance</li>
                      </>
                    )}
                  </ul>
                </div>
              </>
            ) : (
              <>
                {/* Regular spinner for normal loading */}
                <div className="inline-block animate-spin rounded-full h-14 w-14 border-t-3 border-b-3 border-blue-500 mb-5"></div>

                {/* Primary message */}
                <p className="text-gray-800 dark:text-gray-200 text-xl font-medium">
                  {currentServer ? `Loading data from ${currentServer.name}...` : 'Loading server data...'}
                </p>

                {/* Secondary message */}
                <p className="text-gray-600 dark:text-gray-400 text-base mt-2">
                  Please wait while we fetch the latest information
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ContentBlocker;
