'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/app/utils/api';
import { FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { useNavigation } from '../context/NavigationContext';

interface ContainerLogsProps {
  containerId: string;
}

export default function ContainerLogs({ containerId }: ContainerLogsProps) {
  const [logs, setLogs] = useState<string>('');
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Use the navigation context for section-specific loading
  const { startNavigation, endNavigation } = useNavigation();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Start navigation loading for the "containers" section
      startNavigation('containers');

      const response = await api.get(`/api/containers/${containerId}/logs`);
      setLogs(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching container logs:', err);
      setError('Failed to fetch container logs. Make sure the backend server is running.');
    } finally {
      setLoading(false);
      // End navigation loading
      endNavigation();
    }
  };

  useEffect(() => {
    fetchLogs();

    // Set up polling if autoRefresh is enabled
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [containerId, autoRefresh]);

  useEffect(() => {
    // Scroll to bottom when logs update
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Container Logs</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              id="auto-refresh"
              type="checkbox"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="auto-refresh" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              Auto-refresh
            </label>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <FaSync className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-md h-96 overflow-auto">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : logs ? (
          <pre className="whitespace-pre-wrap break-words">{logs}</pre>
        ) : (
          <p className="text-gray-500">No logs available.</p>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
