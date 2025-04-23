'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import { FaPlay, FaStop, FaRedo, FaSearch, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

interface ContainerSummary {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: string;
  Status: string;
  Ports: Array<{
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
}

export default function ContainersPage() {
  const { user } = useAuth();
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [filteredContainers, setFilteredContainers] = useState<ContainerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [containerStartTimes, setContainerStartTimes] = useState<Record<string, string>>({});
  const [uptimeRefreshCounter, setUptimeRefreshCounter] = useState(0);

  // Check if user has write or admin access
  const hasWriteAccess = user && (user.role === 'write' || user.role === 'admin');

  const fetchContainers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/containers');
      const newContainers = response.data;

      // Update container start times
      setContainerStartTimes(prevStartTimes => {
        const newStartTimes = { ...prevStartTimes };

        newContainers.forEach((container: ContainerSummary) => {
          // Only calculate start time if we don't have it already
          if (!newStartTimes[container.Id]) {
            newStartTimes[container.Id] = calculateStartTime(container.Status, container.State);
          }
        });

        return newStartTimes;
      });

      setContainers(newContainers);
      // Update filtered containers based on search term
      if (searchTerm.trim() === '') {
        setFilteredContainers(newContainers);
      } else {
        setFilteredContainers(newContainers.filter(
          (container: ContainerSummary) =>
            container.Names.some((name: string) => name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            container.Image.toLowerCase().includes(searchTerm.toLowerCase()) ||
            container.Id.substring(0, 12).includes(searchTerm.toLowerCase())
        ));
      }
      setError('');
    } catch (err) {
      console.error('Error fetching containers:', err);
      setError('Failed to fetch containers. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]); // Only depend on searchTerm

  useEffect(() => {
    fetchContainers();
    // Set up polling every 10 seconds
    const interval = setInterval(fetchContainers, 10000);

    // Listen for container start time updates from the detail page
    const handleStartTimeUpdate = (event: any) => {
      const { containerId, startTime } = event.detail;
      setContainerStartTimes(prev => ({
        ...prev,
        [containerId]: startTime
      }));
    };

    window.addEventListener('containerStartTimeUpdated', handleStartTimeUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('containerStartTimeUpdated', handleStartTimeUpdate);
    };
  }, [fetchContainers]);

  // Set up a timer to refresh the uptime display every minute
  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      setUptimeRefreshCounter(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(uptimeInterval);
  }, []);

  // Update filtered containers when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredContainers(containers);
    } else {
      const filtered = containers.filter(
        container =>
          container.Names.some(name => name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          container.Image.toLowerCase().includes(searchTerm.toLowerCase()) ||
          container.Id.substring(0, 12).includes(searchTerm.toLowerCase())
      );
      setFilteredContainers(filtered);
    }
  }, [searchTerm, containers]);

  const handleContainerAction = async (id: string, action: string) => {
    try {
      setActionInProgress(id);
      await api.post(`/api/containers/${id}/${action}`);

      // If the action is start or restart, we'll let the API refresh handle the start time
      if (action === 'start' || action === 'restart') {
        // Mark this container for start time update on next refresh
        setContainerStartTimes(prev => {
          const newTimes = { ...prev };
          delete newTimes[id]; // Remove any stored time so it will be fetched fresh
          return newTimes;
        });

        // Update the container state in the local state to avoid flickering
        setContainers(prevContainers => {
          return prevContainers.map(container => {
            if (container.Id === id) {
              return {
                ...container,
                State: 'running',
                Status: 'Up less than a minute'
              };
            }
            return container;
          });
        });

        // Also update filtered containers to ensure UI consistency
        setFilteredContainers(prevFiltered => {
          return prevFiltered.map(container => {
            if (container.Id === id) {
              return {
                ...container,
                State: 'running',
                Status: 'Up less than a minute'
              };
            }
            return container;
          });
        });
      }

      // Wait a moment for the action to complete before refreshing
      setTimeout(fetchContainers, 1000);
    } catch (err) {
      console.error(`Error ${action} container:`, err);
      setError(`Failed to ${action} container. ${err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteContainer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this container? This action cannot be undone.')) {
      return;
    }

    try {
      setActionInProgress(id);
      await api.delete(`/api/containers/${id}?force=true`);

      // Remove the container from the start times
      setContainerStartTimes(prev => {
        const newStartTimes = { ...prev };
        delete newStartTimes[id];
        return newStartTimes;
      });

      // Also remove the container from the local state to avoid flickering
      setContainers(prevContainers => prevContainers.filter(container => container.Id !== id));

      // Wait a moment for the action to complete before refreshing
      setTimeout(fetchContainers, 1000);
    } catch (err) {
      console.error(`Error deleting container:`, err);
      setError(`Failed to delete container. ${err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // This function is kept for potential future use
  // const formatDate = (timestamp: number) => {
  //   const date = new Date(timestamp * 1000);
  //   return date.toLocaleString();
  // };

  // Extract the start time from the status string
  const calculateStartTime = (status: string, state: string) => {
    // If the container is not running, return appropriate message
    if (state !== 'running') {
      return 'Not running';
    }

    if (!status) return 'N/A';

    // Check if status contains "Started" information
    if (status.includes('Started')) {
      const match = status.match(/\(Started (.+?)\)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // For containers that are running but don't have explicit start time
    // Try to extract uptime information
    if (status.startsWith('Up')) {
      // Status format example: "Up 3 hours"
      const uptimeMatch = status.match(/Up ([^(]+)/);
      if (uptimeMatch && uptimeMatch[1]) {
        return `Running for ${uptimeMatch[1].trim()}`;
      }
    }

    // If we can't determine the start time but the container is running
    return 'Running';
  };

  // Get the start time for a container
  const getContainerStartTime = (container: ContainerSummary) => {
    // If we have a stored start time for this container, use it
    if (containerStartTimes[container.Id] &&
      !containerStartTimes[container.Id].startsWith('Running for')) {
      return containerStartTimes[container.Id];
    }

    // Otherwise calculate it from the status
    // The uptimeRefreshCounter dependency ensures this recalculates every minute
    const startTime = calculateStartTime(container.Status, container.State);

    // If we got a real start time (an actual date), store it
    if (startTime !== 'Running' &&
      !startTime.startsWith('Running for') &&
      startTime !== 'Not running' &&
      startTime !== 'N/A') {
      setContainerStartTimes(prev => ({
        ...prev,
        [container.Id]: startTime
      }));
    }

    return startTime;
    // Adding uptimeRefreshCounter as a dependency to ensure this re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Containers</h1>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search containers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading && containers.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Container ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Started At</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ports</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContainers.map((container) => (
                  <tr key={container.Id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/containers/${container.Id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {container.Names[0].replace('/', '')}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-gray-300">{container.Id.substring(0, 12)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-gray-300">{container.Image}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${container.State === 'running' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        container.State === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                        {container.State}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {/* Adding uptimeRefreshCounter as a dependency to force re-render */}
                      {uptimeRefreshCounter >= 0 ? getContainerStartTime(container) : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {container.Ports.length > 0 ? (
                        container.Ports.map((port, index) => (
                          <div key={index}>
                            {port.PublicPort ? `${port.PublicPort}:${port.PrivatePort}/${port.Type}` : `${port.PrivatePort}/${port.Type}`}
                          </div>
                        ))
                      ) : (
                        <span>None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {hasWriteAccess && container.State !== 'running' && (
                          <button
                            onClick={() => handleContainerAction(container.Id, 'start')}
                            disabled={actionInProgress === container.Id}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                            title="Start"
                          >
                            <FaPlay />
                          </button>
                        )}
                        {hasWriteAccess && container.State === 'running' && (
                          <button
                            onClick={() => handleContainerAction(container.Id, 'stop')}
                            disabled={actionInProgress === container.Id}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            title="Stop"
                          >
                            <FaStop />
                          </button>
                        )}
                        {hasWriteAccess && (
                          <button
                            onClick={() => handleContainerAction(container.Id, 'restart')}
                            disabled={actionInProgress === container.Id || container.State !== 'running'}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 disabled:opacity-50"
                            title="Restart"
                          >
                            <FaRedo />
                          </button>
                        )}

                        {hasWriteAccess && (
                          <button
                            onClick={() => handleDeleteContainer(container.Id)}
                            disabled={actionInProgress === container.Id}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredContainers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No containers match your search' : 'No containers found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}
