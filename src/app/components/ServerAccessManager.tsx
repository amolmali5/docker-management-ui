'use client';

import React, { useState, useEffect } from 'react';
import { FaServer, FaCheck, FaTimes, FaGlobe } from 'react-icons/fa';
import api from '@/app/utils/api';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  status?: 'online' | 'offline' | 'unknown';
}

interface ServerAccess {
  type: 'all' | 'specific' | 'none';
  serverIds?: string[];
}

interface ServerAccessManagerProps {
  userId: number;
  initialServerAccess?: ServerAccess;
  onSave: (serverAccess: ServerAccess) => void;
  disabled?: boolean;
}

const ServerAccessManager: React.FC<ServerAccessManagerProps> = ({
  userId,
  initialServerAccess = { type: 'all' },
  onSave,
  disabled = false
}) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverAccess, setServerAccess] = useState<ServerAccess>(initialServerAccess);
  const [error, setError] = useState<string | null>(null);

  // Fetch servers
  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/servers');
        setServers(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching servers:', err);
        setError('Failed to fetch servers');
      } finally {
        setLoading(false);
      }
    };

    fetchServers();
  }, []);

  // Handle access type change
  const handleAccessTypeChange = (type: 'all' | 'specific' | 'none') => {
    let newAccess;
    if (type === 'specific') {
      newAccess = {
        type,
        serverIds: serverAccess.serverIds || []
      };
    } else {
      newAccess = { type };
    }
    setServerAccess(newAccess);
    onSave(newAccess); // Notify parent component of changes
  };

  // Handle server selection
  const handleServerSelection = (serverId: string) => {
    let newAccess;

    if (!serverAccess.serverIds) {
      newAccess = {
        ...serverAccess,
        serverIds: [serverId]
      };
    } else {
      const isSelected = serverAccess.serverIds.includes(serverId);

      if (isSelected) {
        // Remove server from selection
        newAccess = {
          ...serverAccess,
          serverIds: serverAccess.serverIds.filter(id => id !== serverId)
        };
      } else {
        // Add server to selection
        newAccess = {
          ...serverAccess,
          serverIds: [...serverAccess.serverIds, serverId]
        };
      }
    }

    setServerAccess(newAccess);
    onSave(newAccess); // Notify parent component of changes
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-400 mb-4">Server Access</h3>

      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Access Type
          </label>

          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="accessType"
                value="all"
                checked={serverAccess.type === 'all'}
                onChange={() => handleAccessTypeChange('all')}
                disabled={disabled}
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300 flex items-center">
                <FaGlobe className="mr-1" /> All Servers
              </span>
            </label>

            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="accessType"
                value="specific"
                checked={serverAccess.type === 'specific'}
                onChange={() => handleAccessTypeChange('specific')}
                disabled={disabled}
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">Specific Servers</span>
            </label>

            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-blue-600"
                name="accessType"
                value="none"
                checked={serverAccess.type === 'none'}
                onChange={() => handleAccessTypeChange('none')}
                disabled={disabled}
              />
              <span className="ml-2 text-gray-700 dark:text-gray-300">No Servers</span>
            </label>
          </div>
        </div>

        {serverAccess.type === 'specific' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Servers
            </label>

            {loading ? (
              <div className="flex justify-center items-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : servers.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                No servers available
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
                {servers.map(server => (
                  <div
                    key={server.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer ${serverAccess.serverIds?.includes(server.id)
                      ? 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                      }`}
                    onClick={() => !disabled && handleServerSelection(server.id)}
                  >
                    <div className="flex items-center">
                      <FaServer className="mr-2 text-gray-500 dark:text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">{server.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {server.protocol}://{server.host}:{server.port}
                        </div>
                      </div>
                    </div>

                    {serverAccess.serverIds?.includes(server.id) && (
                      <FaCheck className="text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {serverAccess.type === 'specific' && serverAccess.serverIds?.length === 0 && (
              <div className="mt-2 text-yellow-600 dark:text-yellow-400 text-sm">
                <FaTimes className="inline mr-1" /> No servers selected. User will not have access to any servers.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerAccessManager;
