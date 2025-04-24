'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import { FaPlay, FaStop, FaRedo, FaSearch, FaExclamationTriangle, FaTrash, FaSort, FaSortUp, FaSortDown, FaChevronDown, FaChevronRight, FaPause, FaSyncAlt } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';

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
  Labels?: Record<string, string>;
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
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);

  // Ref to store previous container data for comparison
  const prevContainersRef = useRef<ContainerSummary[]>([]);

  // Sorting
  type SortField = 'name' | 'id' | 'image' | 'status' | 'startTime' | 'ports';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Multi-select for batch operations
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [batchActionInProgress, setBatchActionInProgress] = useState(false);

  // Group management
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Check if user has write or admin access
  const hasWriteAccess = user && (user.role === 'write' || user.role === 'admin');

  const fetchContainers = useCallback(async (isBackground = false) => {
    try {
      // Only show loading indicator for initial load, not for background refreshes
      if (!isBackground) {
        setLoading(true);
      }

      setIsBackgroundRefresh(isBackground);
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

      // Check if the containers have actually changed
      const containersChanged = isContainersChanged(prevContainersRef.current, newContainers);

      // Only update state if this is not a background refresh or if the data has actually changed
      if (!isBackground || containersChanged) {
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
      }

      // Update the reference to the current containers
      prevContainersRef.current = newContainers;
      setError('');
    } catch (err) {
      console.error('Error fetching containers:', err);
      if (!isBackground) {
        // Only show errors for user-initiated refreshes
        setError('Failed to fetch containers. Make sure the backend server is running.');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
      setIsBackgroundRefresh(false);
    }
  }, [searchTerm]); // Only depend on searchTerm

  // Get the refresh interval from context
  const { refreshInterval } = useRefresh();

  useEffect(() => {
    // Initial fetch - show loading indicator
    fetchContainers(false);

    // Set up polling with background refresh using the user's refresh rate setting
    const interval = setInterval(() => {
      fetchContainers(true); // Pass true to indicate this is a background refresh
    }, refreshInterval);

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
  }, [fetchContainers, refreshInterval]); // Add refreshInterval as a dependency

  // Set up a timer to refresh the uptime display every minute
  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      setUptimeRefreshCounter(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(uptimeInterval);
  }, []);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it as the sort field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply sorting to containers
  const sortContainers = (containers: ContainerSummary[]) => {
    return [...containers].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          // Sort by first name (removing leading slash if present)
          const nameA = a.Names[0].replace('/', '');
          const nameB = b.Names[0].replace('/', '');
          comparison = nameA.localeCompare(nameB);
          break;
        case 'id':
          comparison = a.Id.localeCompare(b.Id);
          break;
        case 'image':
          comparison = a.Image.localeCompare(b.Image);
          break;
        case 'status':
          // Sort by state (running, paused, exited)
          comparison = a.State.localeCompare(b.State);
          break;
        case 'startTime':
          // Sort by start time
          const timeA = getContainerStartTime(a);
          const timeB = getContainerStartTime(b);

          // Handle special cases like "Running for X" or "Not running"
          if (timeA.startsWith('Running for') && timeB.startsWith('Running for')) {
            // Extract the time values and compare
            const extractTime = (str: string) => {
              const match = str.match(/Running for (\d+)/);
              return match ? parseInt(match[1], 10) : 0;
            };
            comparison = extractTime(timeB) - extractTime(timeA); // Newer first
          } else if (timeA.startsWith('Running for')) {
            comparison = -1; // Running containers first
          } else if (timeB.startsWith('Running for')) {
            comparison = 1;
          } else {
            comparison = timeA.localeCompare(timeB);
          }
          break;
        case 'ports':
          // Sort by number of ports
          comparison = a.Ports.length - b.Ports.length;
          break;
        default:
          comparison = 0;
      }

      // Reverse the comparison if sorting in descending order
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Update filtered containers when search term or sort changes
  useEffect(() => {
    let filtered = containers;

    // Apply search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(
        container =>
          container.Names.some(name => name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          container.Image.toLowerCase().includes(searchTerm.toLowerCase()) ||
          container.Id.substring(0, 12).includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered = sortContainers(filtered);

    setFilteredContainers(filtered);
  }, [searchTerm, containers, sortField, sortDirection, uptimeRefreshCounter]);

  const handleContainerAction = async (id: string, action: string) => {
    try {
      setActionInProgress(id);

      // Make the API call and handle any errors
      try {
        await api.post(`/api/containers/${id}/${action}`);
      } catch (apiError: any) {
        // Extract the error message from the API response
        const errorMessage = apiError.response?.data?.error || apiError.message;
        throw new Error(errorMessage);
      }

      // Update container state based on the action
      // Mark this container for start time update on next refresh if needed
      if (action === 'start' || action === 'unpause' || action === 'restart') {
        setContainerStartTimes(prev => {
          const newTimes = { ...prev };
          delete newTimes[id]; // Remove any stored time so it will be fetched fresh
          return newTimes;
        });
      }

      // Update the container state in the local state to avoid flickering
      setContainers(prevContainers => {
        return prevContainers.map(container => {
          if (container.Id === id) {
            // Handle different actions
            switch (action) {
              case 'start':
              case 'restart':
                return {
                  ...container,
                  State: 'running',
                  Status: 'Up less than a minute'
                };
              case 'unpause':
                return {
                  ...container,
                  State: 'running',
                  // Keep existing status if it has "Up" in it, otherwise set a default
                  Status: container.Status.includes('Up') ? container.Status : 'Up less than a minute'
                };
              case 'pause':
                return {
                  ...container,
                  State: 'paused',
                  Status: container.Status.replace('Up', 'Paused')
                };
              case 'stop':
                return {
                  ...container,
                  State: 'exited',
                  Status: 'Exited recently'
                };
              default:
                return container;
            }
          }
          return container;
        });
      });

      // Also update filtered containers to ensure UI consistency
      setFilteredContainers(prevFiltered => {
        return prevFiltered.map(container => {
          if (container.Id === id) {
            // Handle different actions
            switch (action) {
              case 'start':
              case 'restart':
                return {
                  ...container,
                  State: 'running',
                  Status: 'Up less than a minute'
                };
              case 'unpause':
                return {
                  ...container,
                  State: 'running',
                  // Keep existing status if it has "Up" in it, otherwise set a default
                  Status: container.Status.includes('Up') ? container.Status : 'Up less than a minute'
                };
              case 'pause':
                return {
                  ...container,
                  State: 'paused',
                  Status: container.Status.replace('Up', 'Paused')
                };
              case 'stop':
                return {
                  ...container,
                  State: 'exited',
                  Status: 'Exited recently'
                };
              default:
                return container;
            }
          }
          return container;
        });
      });

      // Wait a moment for the action to complete before refreshing
      setTimeout(() => fetchContainers(true), 1000);
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
      setTimeout(() => fetchContainers(true), 1000);
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

  // Handle checkbox selection
  const handleContainerSelection = (containerId: string) => {
    setSelectedContainers(prev => {
      if (prev.includes(containerId)) {
        return prev.filter(id => id !== containerId);
      } else {
        return [...prev, containerId];
      }
    });
  };

  // Handle "Select All" checkbox
  const handleSelectAll = () => {
    if (selectedContainers.length === filteredContainers.length) {
      // If all are selected, unselect all
      setSelectedContainers([]);
    } else {
      // Otherwise, select all containers
      const containerIds = filteredContainers.map(container => container.Id);
      setSelectedContainers(containerIds);
    }
  };

  // Handle "Select All in Group" checkbox
  const handleSelectAllInGroup = (groupContainers: ContainerSummary[]) => {
    const containerIds = groupContainers.map(container => container.Id);

    // Check if all containers in this group are already selected
    const allInGroupSelected = containerIds.every(id => selectedContainers.includes(id));

    if (allInGroupSelected) {
      // If all in group are selected, unselect them
      setSelectedContainers(prev => prev.filter(id => !containerIds.includes(id)));
    } else {
      // Otherwise, add all group containers to selection
      setSelectedContainers(prev => {
        // Create a new array with all previously selected containers
        // that are not in this group, plus all containers in this group
        const newSelection = [...prev.filter(id => !containerIds.includes(id)), ...containerIds];
        return newSelection;
      });
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedContainers.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedContainers.length} selected container(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBatchActionInProgress(true);

      // Delete containers one by one
      for (const containerId of selectedContainers) {
        try {
          await api.delete(`/api/containers/${containerId}?force=true`);

          // Remove the container from the start times
          setContainerStartTimes(prev => {
            const newStartTimes = { ...prev };
            delete newStartTimes[containerId];
            return newStartTimes;
          });

          // Also remove the container from the local state to avoid flickering
          setContainers(prevContainers => prevContainers.filter(container => container.Id !== containerId));
        } catch (err) {
          console.error(`Error deleting container ${containerId}:`, err);
          setError(prev => prev + `\nFailed to delete container ${containerId}.`);
        }
      }

      // Clear selection
      setSelectedContainers([]);

      // Refresh the containers list
      setTimeout(() => fetchContainers(true), 1000);
    } catch (err) {
      console.error('Error in batch delete:', err);
      setError(`Failed to complete batch delete operation. ${err}`);
    } finally {
      setBatchActionInProgress(false);
    }
  };

  // Get the group name for a container (Docker Compose project or Stack name)
  const getContainerGroup = (container: ContainerSummary): string => {
    if (!container.Labels) return 'Ungrouped';

    // Check for Docker Compose labels
    if (container.Labels['com.docker.compose.project']) {
      return `Compose: ${container.Labels['com.docker.compose.project']}`;
    }

    // Check for Docker Stack labels
    if (container.Labels['com.docker.stack.namespace']) {
      return `Stack: ${container.Labels['com.docker.stack.namespace']}`;
    }

    // No group found
    return 'Ungrouped';
  };

  // Group containers by their Docker Compose project or Stack name
  const groupContainers = (containers: ContainerSummary[]): Record<string, ContainerSummary[]> => {
    const groups: Record<string, ContainerSummary[]> = {};

    containers.forEach(container => {
      const groupName = getContainerGroup(container);

      if (!groups[groupName]) {
        groups[groupName] = [];
      }

      groups[groupName].push(container);
    });

    return groups;
  };

  // Toggle group expansion
  const toggleGroupExpansion = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Initialize expanded groups when containers change
  useEffect(() => {
    const groups = groupContainers(containers);

    // Try to load saved state from localStorage
    let savedState: Record<string, boolean> = {};
    try {
      const savedStateJson = localStorage.getItem('containerGroupsExpandedState');
      if (savedStateJson) {
        savedState = JSON.parse(savedStateJson);
      }
    } catch (err) {
      console.error('Error loading saved group state:', err);
    }

    // Initialize groups with saved state or default to expanded
    const initialExpandedState: Record<string, boolean> = {};
    Object.keys(groups).forEach(groupName => {
      // If we have a saved state for this group, use it, otherwise default to expanded
      initialExpandedState[groupName] = savedState[groupName] !== undefined
        ? savedState[groupName]
        : true;
    });

    setExpandedGroups(initialExpandedState);
  }, [containers]);

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    // Only save if we have groups (avoid saving empty state)
    if (Object.keys(expandedGroups).length > 0) {
      try {
        localStorage.setItem('containerGroupsExpandedState', JSON.stringify(expandedGroups));
      } catch (err) {
        console.error('Error saving group state:', err);
      }
    }
  }, [expandedGroups]);

  // Helper function to check if containers have changed
  const isContainersChanged = (prevContainers: ContainerSummary[], newContainers: ContainerSummary[]): boolean => {
    // Quick check: different length means they've changed
    if (prevContainers.length !== newContainers.length) {
      return true;
    }

    // Create a map of container IDs to their states and statuses for quick lookup
    const prevContainerMap = new Map<string, { state: string, status: string }>();
    prevContainers.forEach(container => {
      prevContainerMap.set(container.Id, {
        state: container.State,
        status: container.Status
      });
    });

    // Check if any container's state or status has changed
    for (const container of newContainers) {
      const prevContainer = prevContainerMap.get(container.Id);

      // If container doesn't exist in previous list or state/status changed
      if (!prevContainer ||
        prevContainer.state !== container.State ||
        // Only consider status changes that affect the container state
        (prevContainer.status !== container.Status &&
          (container.Status.includes('Up') !== prevContainer.status.includes('Up') ||
            container.Status.includes('Paused') !== prevContainer.status.includes('Paused') ||
            container.Status.includes('Exited') !== prevContainer.status.includes('Exited')))
      ) {
        return true;
      }
    }

    // No changes detected
    return false;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Containers</h1>
        <div className="flex items-center space-x-4">
          {hasWriteAccess && selectedContainers.length > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={batchActionInProgress}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <FaTrash className="mr-2" />
              Delete Selected ({selectedContainers.length})
            </button>
          )}
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
          <button
            onClick={() => fetchContainers(false)}
            disabled={loading && !isBackgroundRefresh}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            title="Refresh containers"
          >
            <FaSyncAlt className={`${(loading && !isBackgroundRefresh) ? 'animate-spin' : ''}`} />
          </button>
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

      {loading && !isBackgroundRefresh && containers.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {hasWriteAccess && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '5%' }}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={selectedContainers.length > 0 && selectedContainers.length === filteredContainers.length}
                        onChange={handleSelectAll}
                        title="Select all containers"
                      />
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      <span>Name</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center">
                      <span>Container ID</span>
                      {sortField === 'id' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('image')}
                  >
                    <div className="flex items-center">
                      <span>Image</span>
                      {sortField === 'image' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('startTime')}
                  >
                    <div className="flex items-center">
                      <span>Last Started At</span>
                      {sortField === 'startTime' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('ports')}
                  >
                    <div className="flex items-center">
                      <span>Ports</span>
                      {sortField === 'ports' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(groupContainers(filteredContainers)).map(([groupName, groupContainers]) => (
                  <React.Fragment key={groupName}>
                    {/* Group header row */}
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <td colSpan={hasWriteAccess ? 8 : 7} className="px-6 py-3">
                        <div className="flex items-center justify-between">
                          <button
                            className="flex items-center text-left font-medium text-gray-900 dark:text-white"
                            onClick={() => toggleGroupExpansion(groupName)}
                          >
                            <span className="mr-2">
                              {expandedGroups[groupName] ? <FaChevronDown className="inline" /> : <FaChevronRight className="inline" />}
                            </span>
                            <span className="font-bold">{groupName}</span>
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              ({groupContainers.length} container{groupContainers.length !== 1 ? 's' : ''})
                            </span>
                          </button>

                          {hasWriteAccess && (
                            <div className="flex items-center">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                                  checked={groupContainers.every(container => selectedContainers.includes(container.Id))}
                                  onChange={() => handleSelectAllInGroup(groupContainers)}
                                  title="Select all containers in this group"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Select All in Group</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Container rows - only show if group is expanded */}
                    {expandedGroups[groupName] && groupContainers.map((container) => (
                      <tr key={container.Id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        {hasWriteAccess && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={selectedContainers.includes(container.Id)}
                              onChange={() => handleContainerSelection(container.Id)}
                              title="Select container for deletion"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/containers/${container.Id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            {container.Names[0].replace('/', '')}
                          </Link>
                          {container.Labels && container.Labels['com.docker.compose.service'] && (
                            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                              Service: {container.Labels['com.docker.compose.service']}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-300">{container.Id.substring(0, 12)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="max-w-[200px] overflow-hidden">
                            <span
                              className="text-sm text-gray-900 dark:text-gray-300 truncate block"
                              title={container.Image}
                            >
                              {container.Image}
                            </span>
                          </div>
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
                            {hasWriteAccess && container.State !== 'running' && container.State !== 'paused' && (
                              <button
                                onClick={() => handleContainerAction(container.Id, 'start')}
                                disabled={actionInProgress === container.Id}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                                title="Start"
                              >
                                <FaPlay />
                              </button>
                            )}
                            {hasWriteAccess && container.State === 'paused' && (
                              <button
                                onClick={() => handleContainerAction(container.Id, 'unpause')}
                                disabled={actionInProgress === container.Id}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                                title="Unpause"
                              >
                                <FaPlay />
                              </button>
                            )}
                            {hasWriteAccess && container.State === 'running' && (
                              <>
                                <button
                                  onClick={() => handleContainerAction(container.Id, 'pause')}
                                  disabled={actionInProgress === container.Id}
                                  className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 disabled:opacity-50"
                                  title="Pause (freeze container)"
                                >
                                  <FaPause />
                                </button>
                                <button
                                  onClick={() => handleContainerAction(container.Id, 'stop')}
                                  disabled={actionInProgress === container.Id}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                  title="Stop (terminate container)"
                                >
                                  <FaStop />
                                </button>
                              </>
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
                  </React.Fragment>
                ))}
                {filteredContainers.length === 0 && (
                  <tr>
                    <td colSpan={hasWriteAccess ? 8 : 7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
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
