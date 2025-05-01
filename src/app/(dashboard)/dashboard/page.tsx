'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../utils/api';
import { useServer } from '../../context/ServerContext';
import { useRefresh } from '../../context/RefreshContext';
import { useAuth } from '../../context/AuthContext';
import { FaExclamationTriangle, FaMemory, FaMicrochip } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ContentBlocker from '../../components/ContentBlocker';

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

interface SystemInfo {
  Containers: number;
  ContainersRunning: number;
  ContainersPaused: number;
  ContainersStopped: number;
  Images: number;
  NCPU: number;
  MemTotal: number;
  Volumes: number;
  Networks: number;
}

export default function Dashboard() {
  // Get server context to track server changes
  const { currentServer, switchingServer, dataReady, servers } = useServer();

  // Get user context to check if user is admin
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Check if the user has access to any online server
  const hasAnyOnlineServer = servers.some(server => server.status === 'online');

  // For admin users, check if local Docker server is available and online
  const localDockerServer = servers.find(s => s.id === 'local' || s.isLocal);
  const isLocalDockerOnline = localDockerServer?.status === 'online';

  // Show offline message if:
  // 1. User has no online servers OR
  // 2. Current server is offline AND it's not the initial load
  // For admin users, we'll check if local Docker is available and online
  const showOfflineMessage =
    (!hasAnyOnlineServer && servers.length > 0) || // Only show if we've loaded servers
    (currentServer?.status === 'offline' && !(isAdmin && isLocalDockerOnline && !currentServer));

  // Initialize state based on server status
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);

  // Clear data when server status changes or on component mount
  useEffect(() => {
    // Skip this effect if we haven't loaded servers yet
    if (servers.length === 0) {
      return;
    }

    // Always check server status on component mount or when it changes
    if (showOfflineMessage) {
      console.log("No online servers available or current server is offline, clearing all data");
      // Clear any existing data to prevent flashing
      setContainers([]);
      setSystemInfo(null);
      setLoading(false);

      // Set appropriate error message based on the situation
      if (hasAnyOnlineServer) {
        setError(`The selected server "${currentServer?.name}" is currently offline. Please select another server.`);
      } else if (servers.length === 1) {
        setError('The only server you have access to is currently offline. Please try again later or contact your administrator.');
      } else {
        setError('All available servers are currently offline. Please try again later or contact your administrator.');
      }

      // Clear any existing interval
      if (intervalRef.current) {
        console.log("Clearing existing refresh interval due to offline server");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [showOfflineMessage, hasAnyOnlineServer, currentServer?.name, servers.length]);

  // Get the refresh interval from context
  const { refreshInterval } = useRefresh();

  // Ref to store previous data for comparison
  const prevDataRef = useRef<{ containers: ContainerSummary[], systemInfo: SystemInfo | null }>({
    containers: [],
    systemInfo: null
  });

  // Helper function to check if data has changed
  const isDataChanged = (
    prevContainers: ContainerSummary[],
    newContainers: ContainerSummary[],
    prevSystemInfo: SystemInfo | null,
    newSystemInfo: SystemInfo | null
  ): boolean => {
    // Quick check: different container length means they've changed
    if (prevContainers.length !== newContainers.length) {
      return true;
    }

    // Check if system info has changed
    if (prevSystemInfo === null && newSystemInfo !== null) {
      return true;
    }

    if (prevSystemInfo !== null && newSystemInfo !== null) {
      // Check if any important system info fields have changed
      if (
        prevSystemInfo.Containers !== newSystemInfo.Containers ||
        prevSystemInfo.ContainersRunning !== newSystemInfo.ContainersRunning ||
        prevSystemInfo.ContainersPaused !== newSystemInfo.ContainersPaused ||
        prevSystemInfo.ContainersStopped !== newSystemInfo.ContainersStopped ||
        prevSystemInfo.Images !== newSystemInfo.Images ||
        prevSystemInfo.Volumes !== newSystemInfo.Volumes ||
        prevSystemInfo.Networks !== newSystemInfo.Networks
      ) {
        return true;
      }
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

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    console.log("fetchData called", isBackgroundRefresh ? "(background refresh)" : "");

    // If we're switching servers, don't fetch data
    if (switchingServer) {
      console.log("Server is switching, skipping data fetch");
      return;
    }

    // If there's a backend server error, don't try to fetch data
    if (error && error.includes('backend server')) {
      console.log("Backend server error, skipping data fetch");
      return;
    }

    // Skip this function if we haven't loaded servers yet
    if (servers.length === 0) {
      console.log("No servers loaded yet, skipping data fetch");
      return;
    }

    // If no online servers are available or current server is offline, don't fetch data
    if (showOfflineMessage) {
      console.log("No online servers available or current server is offline, skipping data fetch");

      // Clear any existing data to prevent flashing
      setContainers([]);
      setSystemInfo(null);

      return;
    }

    // Set background refresh state for UI
    setIsBackgroundRefresh(isBackgroundRefresh);

    try {

      // Use AbortController to cancel requests if they take too long
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("Request timeout reached, aborting");
        controller.abort();
      }, 30000); // 30 second timeout - increased to handle slower connections

      console.log("Making API requests", currentServer ? `for server: ${currentServer.name}` : "for default server");

      // Include the server ID in the API requests if available
      const serverParam = currentServer ? `?serverId=${currentServer.id}` : '';

      // Fetch all required data in parallel
      const [containersResponse, systemInfoResponse, volumesResponse, networksResponse] = await Promise.all([
        api.get(`/api/containers${serverParam}`, { signal: controller.signal }),
        api.get(`/api/system/info${serverParam}`, { signal: controller.signal }),
        api.get(`/api/volumes${serverParam}`, { signal: controller.signal }),
        api.get(`/api/networks${serverParam}`, { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);
      console.log("API requests completed successfully");

      const newContainers = containersResponse.data;
      const newSystemInfo = systemInfoResponse.data;

      // Add volume and network counts to systemInfo
      newSystemInfo.Volumes = volumesResponse.data.Volumes ? volumesResponse.data.Volumes.length : 0;
      newSystemInfo.Networks = networksResponse.data.length || 0;

      // Check if the data has actually changed
      const dataChanged = isDataChanged(
        prevDataRef.current.containers,
        newContainers,
        prevDataRef.current.systemInfo,
        newSystemInfo
      );

      // Only update state if this is not a background refresh or if the data has actually changed
      if (!isBackgroundRefresh || dataChanged) {
        console.log("Data changed or not a background refresh, updating state");
        setContainers(newContainers);
        setSystemInfo(newSystemInfo);
      } else {
        console.log("No data changes detected during background refresh, skipping update");
      }

      // Update the reference to the current data
      prevDataRef.current = {
        containers: newContainers,
        systemInfo: newSystemInfo
      };

      setError('');
    } catch (err: any) {
      console.error('Error fetching data:', err);

      // Don't show error for aborted or canceled requests, or during server switching
      if (err.name !== 'AbortError' && err.name !== 'CanceledError' && !switchingServer) {
        // Check if this is a network error (backend server not running)
        if (err.message && (
          err.message.includes('Failed to fetch') ||
          err.message.includes('Network Error') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('ETIMEDOUT') ||
          err.message.includes('ERR_CONNECTION_REFUSED')
        )) {
          setError('Failed to fetch data. Please contact your administrator as the backend server may not be running.');
        } else {
          setError('Failed to fetch data. Make sure the backend server is running.');
        }
      } else {
        console.log(`Request was ${err.name === 'AbortError' ? 'aborted' : 'canceled'} ${switchingServer ? 'during server switch' : ''}`);
      }
    } finally {
      // Reset background refresh state
      setIsBackgroundRefresh(false);
    }
  }, [currentServer, containers.length, systemInfo, switchingServer, showOfflineMessage, servers.length]);  // Include currentServer, data state, switchingServer, server status, and servers.length in dependencies

  // Track server changes
  const prevServerRef = useRef<any>(null);

  // Ref to store the interval ID
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effect for initial data loading and setting up auto-refresh
  useEffect(() => {
    console.log("Initial data loading effect");

    // Skip this effect if we haven't loaded servers yet
    if (servers.length === 0) {
      console.log("No servers loaded yet, waiting for servers to load");
      return;
    }

    // Check if no online servers are available or current server is offline
    if (showOfflineMessage) {
      console.log("No online servers available or current server is offline, not setting up any data fetching");

      // Clear any existing data to prevent flashing
      setContainers([]);
      setSystemInfo(null);
      setLoading(false);

      // Set appropriate error message based on the situation
      if (hasAnyOnlineServer) {
        setError(`The selected server "${currentServer?.name}" is currently offline. Please select another server.`);
      } else if (servers.length === 1) {
        setError('The only server you have access to is currently offline. Please try again later or contact your administrator.');
      } else {
        setError('All available servers are currently offline. Please try again later or contact your administrator.');
      }

      // Clear any existing interval
      if (intervalRef.current) {
        console.log("Clearing existing refresh interval");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Don't fetch data, don't set up new interval
      return;
    }

    // If we're switching servers, don't do anything - completely stop refreshing
    if (switchingServer) {
      console.log("Server is switching, stopping all refreshes");

      // Clear any existing interval
      if (intervalRef.current) {
        console.log("Clearing existing refresh interval");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Don't fetch data, don't set up new interval
      return;
    }

    // Update the previous server reference
    prevServerRef.current = currentServer;

    // Initial fetch - show loading indicator
    // If server changed, this is not a background refresh
    fetchData(false);

    // Clear any existing interval before setting up a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up polling with background refresh using the user's refresh rate setting
    console.log("Setting up new refresh interval");
    intervalRef.current = setInterval(() => {
      // Double-check we're not switching servers before refreshing
      if (!switchingServer) {
        console.log("Auto-refresh triggered");
        fetchData(true); // This is a background refresh
      } else {
        console.log("Skipping auto-refresh while switching servers");
      }
    }, refreshInterval);

    // Clean up interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        console.log("Cleaning up refresh interval");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Include currentServer, refreshInterval, switchingServer, showOfflineMessage, hasAnyOnlineServer, and servers.length in dependencies
  }, [fetchData, currentServer, refreshInterval, switchingServer, showOfflineMessage, hasAnyOnlineServer, servers.length]);

  // Calculate container status data with percentages
  const calculateContainerStatusData = () => {
    const running = systemInfo?.ContainersRunning || 0;
    const paused = systemInfo?.ContainersPaused || 0;
    const stopped = systemInfo?.ContainersStopped || 0;
    const total = running + paused + stopped;

    // Calculate percentages, handle division by zero
    const runningPercent = total > 0 ? Math.round((running / total) * 100) : 0;
    const pausedPercent = total > 0 ? Math.round((paused / total) * 100) : 0;
    const stoppedPercent = total > 0 ? Math.round((stopped / total) * 100) : 0;

    return [
      {
        name: 'Running',
        value: running,
        percent: runningPercent,
        fill: '#10B981' // Green color for running
      },
      {
        name: 'Paused',
        value: paused,
        percent: pausedPercent,
        fill: '#F59E0B' // Amber color for paused
      },
      {
        name: 'Stopped',
        value: stopped,
        percent: stoppedPercent,
        fill: '#EF4444' // Red color for stopped
      }
    ];
  };

  const containerStatusData = calculateContainerStatusData();

  // Format bytes to human-readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format memory specifically for the dashboard card
  const formatMemory = (bytes: number) => {
    if (bytes === 0) return '0 GB';
    // Convert to GB and round to 2 decimal places
    const gbValue = bytes / (1024 * 1024 * 1024);
    // Format to 2 decimal places
    return gbValue.toFixed(2) + ' GB';
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-500">Dashboard</h1>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Handle offline server case outside of ContentBlocker */}
      {showOfflineMessage ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <FaExclamationTriangle className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {hasAnyOnlineServer ? "Server Offline" : "All Servers Offline"}
            </h2>
            <p className="max-w-md mx-auto">
              {hasAnyOnlineServer
                ? `The selected server "${currentServer?.name}" is currently offline.`
                : servers.length === 1
                  ? "The only server you have access to is currently offline."
                  : "All available servers are currently offline."}
              You can still access your profile settings, but other features are unavailable.
              {hasAnyOnlineServer && (
                <span className="block mt-2 text-gray-500 dark:text-gray-400">
                  Please select another server from the server dropdown.
                </span>
              )}
              {!hasAnyOnlineServer && (
                <span className="block mt-2 text-gray-500 dark:text-gray-400">
                  Please try again later or contact your administrator.
                </span>
              )}
            </p>
          </div>
        </div>
      ) : (
        <ContentBlocker>
          {/* System Overview */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {/* Containers Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mb-3">
                  <svg className="h-6 w-6 text-blue-500 dark:text-blue-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                    <line x1="7" y1="7" x2="17" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="7" y1="17" x2="17" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 w-full">Containers</p>
                <a href="/containers" className="text-xl font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  {systemInfo?.Containers || 0}
                </a>
              </div>
            </div>

            {/* Images Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mb-3">
                  <svg className="h-6 w-6 text-green-500 dark:text-green-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M6 16L9 12L12 15L15 11L18 16H6Z" fill="currentColor" />
                    <circle cx="9" cy="9" r="1.5" fill="currentColor" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 w-full">Images</p>
                <a href="/images" className="text-xl font-semibold text-green-600 dark:text-green-400 hover:underline">
                  {systemInfo?.Images || 0}
                </a>
              </div>
            </div>

            {/* Volumes Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900 mb-3">
                  <svg className="h-6 w-6 text-indigo-500 dark:text-indigo-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4 5v4c0 1.657 3.582 3 8 3s8-1.343 8-3V5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4 9v4c0 1.657 3.582 3 8 3s8-1.343 8-3V9" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4 13v4c0 1.657 3.582 3 8 3s8-1.343 8-3v-4" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 w-full">Volumes</p>
                <a href="/volumes" className="text-xl font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  {systemInfo?.Volumes || 0}
                </a>
              </div>
            </div>

            {/* Networks Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 mb-3">
                  <svg className="h-6 w-6 text-yellow-500 dark:text-yellow-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="9" y="3" width="6" height="6" rx="1" fill="currentColor" />
                    <rect x="3" y="15" width="6" height="6" rx="1" fill="currentColor" />
                    <rect x="15" y="15" width="6" height="6" rx="1" fill="currentColor" />
                    <path d="M12 9v2M12 11h-6M12 11h6M6 15v-4M18 15v-4" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 w-full">Networks</p>
                <a href="/networks" className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 hover:underline">
                  {systemInfo?.Networks || 0}
                </a>
              </div>
            </div>

            {/* Memory Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 mb-3">
                  <FaMemory className="h-6 w-6 text-purple-500 dark:text-purple-300" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 w-full">Memory</p>
                <div className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                  {systemInfo ? formatMemory(systemInfo.MemTotal) : '0 GB'}
                </div>
              </div>
            </div>

            {/* CPUs Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-pink-100 dark:bg-pink-900 mb-3">
                  <FaMicrochip className="h-6 w-6 text-pink-500 dark:text-pink-300" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 w-full">CPUs</p>
                <div className="text-xl font-semibold text-pink-600 dark:text-pink-400">
                  {systemInfo?.NCPU || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Container Status Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-500">Container Status</h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total Containers: <span className="font-semibold text-gray-700 dark:text-gray-300">{systemInfo?.Containers || 0}</span>
              </div>
            </div>

            {/* Status summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {containerStatusData.map((status, index) => (
                <div
                  key={index}
                  className="text-center p-3 rounded-lg transition-all duration-200 hover:shadow-md"
                  style={{ backgroundColor: `${status.fill}20`, borderLeft: `4px solid ${status.fill}` }}
                >
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: status.fill }}></div>
                    <span className="font-medium">{status.name}</span>
                  </div>
                  <div className="text-2xl font-bold">{status.value}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{status.percent}% of total</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={containerStatusData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value, name, props) => {
                      return [`${value} containers (${props.payload.percent}%)`, 'Count'];
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{
                      fontWeight: 'bold',
                      marginBottom: '5px'
                    }}
                  />
                  <Bar
                    dataKey="value"
                    name="Containers"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1000}
                  >
                    {containerStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Containers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-500">Recent Containers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ports</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {containers.slice(0, 5).map((container) => (
                    <tr key={container.Id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a href={`/containers/${container.Id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {container.Names[0].replace('/', '')}
                        </a>
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
                    </tr>
                  ))}
                  {containers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No containers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {containers.length > 5 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <a href="/containers" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center">
                  <span>View all containers</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </ContentBlocker>
      )}
    </div>
  );
}
