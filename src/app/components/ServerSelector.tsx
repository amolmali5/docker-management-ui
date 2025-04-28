'use client';

import { useState, useRef, useEffect } from 'react';
import { FaServer, FaChevronDown, FaPlus, FaSync } from 'react-icons/fa';
import { useServer } from '@/app/context/ServerContext';
import Link from 'next/link';
import { Tooltip } from '@/app/components/Tooltip';

export default function ServerSelector() {
  const { servers, currentServer, setCurrentServer, refreshServers, loading, switchingServer } = useServer();
  const [isOpen, setIsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Create a ref for the dropdown container
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Add event listener when dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleServerSelect = (server: any) => {
    // If we're already switching servers, don't allow another selection
    if (switchingServer) {
      return;
    }

    // If the server is the same as the current one, just close the dropdown
    if (currentServer?.id === server.id) {
      setIsOpen(false);
      return;
    }

    // Check if the server is offline - don't allow selection of offline servers
    if (server.status === 'offline') {
      // Just close the dropdown without switching
      setIsOpen(false);
      return;
    }

    // Otherwise, switch to the selected server
    setCurrentServer(server);
    setIsOpen(false);
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening/closing the dropdown
    setRefreshing(true);
    await refreshServers();
    setRefreshing(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={switchingServer}
          className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-l-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${switchingServer ? 'opacity-75 cursor-wait' : ''}`}
        >
          {switchingServer ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
          ) : (
            <FaServer className="text-gray-500 dark:text-gray-400" />
          )}
          <span className="max-w-[150px] truncate">
            {currentServer ? currentServer.name : 'Select Server'}
          </span>
          {currentServer && currentServer.status && !switchingServer && (
            <span
              className={`h-2 w-2 rounded-full ${currentServer.status === 'online'
                ? 'bg-green-500'
                : currentServer.status === 'offline'
                  ? 'bg-red-500'
                  : 'bg-gray-500'
                }`}
            ></span>
          )}
          <FaChevronDown className="text-gray-500 dark:text-gray-400" />
        </button>

        <Tooltip content="Refresh server status" position="bottom">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading || switchingServer}
            className={`flex items-center justify-center h-full px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${switchingServer ? 'opacity-75 cursor-wait' : ''}`}
          >
            <FaSync className={`text-gray-500 dark:text-gray-400 ${refreshing || loading || switchingServer ? 'animate-spin' : ''}`} />
          </button>
        </Tooltip>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {/* No default option for Local Docker - it must be selected from the servers list */}

            {servers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No servers available. Please contact an administrator.
              </div>
            ) : (
              servers.map((server) => (
                <button
                  key={server.id}
                  onClick={() => handleServerSelect(server)}
                  disabled={switchingServer || server.status === 'offline'}
                  className={`w-full text-left px-4 py-2 text-sm ${currentServer?.id === server.id
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : server.status === 'offline'
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${switchingServer ? 'opacity-50 cursor-wait' : ''}`}
                  role="menuitem"
                  title={server.status === 'offline' ? `Server "${server.name}" is offline and cannot be selected` : ''}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FaServer className={`mr-3 ${server.status === 'offline' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`} />
                      <div className="flex flex-col">
                        <span className={`truncate font-medium ${server.status === 'offline' ? 'text-gray-400 dark:text-gray-500' : ''}`}>
                          {server.name}
                          {server.status === 'offline' && ' (Offline - Cannot Select)'}
                        </span>
                        <span className={`text-xs truncate ${server.status === 'offline' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          {server.protocol}://{server.host}:{server.port}
                        </span>
                      </div>
                    </div>
                    <Tooltip
                      content={
                        server.status === 'online'
                          ? 'Server is online'
                          : server.status === 'offline'
                            ? 'Server is offline - cannot be selected'
                            : 'Server status unknown'
                      }
                    >
                      <span
                        className={`h-3 w-3 rounded-full ${server.status === 'online'
                          ? 'bg-green-500'
                          : server.status === 'offline'
                            ? 'bg-red-500'
                            : 'bg-gray-500'
                          }`}
                      ></span>
                    </Tooltip>
                  </div>
                </button>
              ))
            )}

            {servers.length > 0 && <hr className="my-1 border-gray-200 dark:border-gray-700" />}

            {switchingServer ? (
              <div className="block px-4 py-2 text-sm text-gray-500 dark:text-gray-500 opacity-50 cursor-wait">
                <div className="flex items-center">
                  <FaPlus className="mr-3" />
                  <span>Manage Servers</span>
                </div>
              </div>
            ) : (
              <Link
                href="/servers"
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setIsOpen(false)}
                role="menuitem"
              >
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <FaPlus className="mr-3" />
                  <span>Manage Servers</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
