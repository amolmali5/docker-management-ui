'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../utils/api';
import { useRefresh } from '../../context/RefreshContext';
import {
  FaDocker, FaServer, FaMemory, FaNetworkWired, FaExclamationTriangle,
  FaDatabase, FaSyncAlt, FaChartPie, FaBoxOpen, FaHdd, FaNetworkWired as FaNetwork,
  FaThermometerHalf, FaCloudDownloadAlt, FaLayerGroup, FaInfoCircle
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import Link from 'next/link';
import NavLink from '../components/NavLink';
// We don't need to import PageLoading here as it's used in the layout

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
}

export default function Home() {
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      // Only set loading state if we don't already have data
      if (!systemInfo || containers.length === 0) {
        setLoading(true);
      }

      // Use AbortController to cancel requests if they take too long
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const [containersResponse, systemInfoResponse] = await Promise.all([
        api.get('/api/containers', { signal: controller.signal }),
        api.get('/api/system/info', { signal: controller.signal })
      ]);

      clearTimeout(timeoutId);

      setContainers(containersResponse.data);
      setSystemInfo(systemInfoResponse.data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching data:', err);
      // Don't show error for aborted requests
      if (err.name !== 'AbortError') {
        setError('Failed to fetch data. Make sure the backend server is running.');
      }
    } finally {
      setLoading(false);
    }
  }, [containers.length, systemInfo]);

  // Get the refresh interval from context
  const { refreshInterval } = useRefresh();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const isRefreshing = useRef(false);

  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Only set up auto-refresh if enabled and interval is reasonable
    let interval: NodeJS.Timeout | null = null;

    if (autoRefresh && refreshInterval && refreshInterval > 1000) {
      interval = setInterval(() => {
        // Prevent multiple simultaneous refreshes
        if (!isRefreshing.current) {
          isRefreshing.current = true;
          fetchData().finally(() => {
            isRefreshing.current = false;
          });
        }
      }, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, refreshInterval, autoRefresh]);

  const containerStatusData = [
    { name: 'Running', value: systemInfo?.ContainersRunning || 0 },
    { name: 'Paused', value: systemInfo?.ContainersPaused || 0 },
    { name: 'Stopped', value: systemInfo?.ContainersStopped || 0 }
  ];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {autoRefresh ? (
              <span className="flex items-center">
                <span className="inline-block h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Auto-refresh: {refreshInterval ? `${refreshInterval / 1000}s` : 'On'}
              </span>
            ) : (
              <span>Auto-refresh: Off</span>
            )}
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md
              ${autoRefresh
                ? 'text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-200 dark:bg-green-900 dark:hover:bg-green-800'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
          >
            <FaSyncAlt className={`${autoRefresh ? 'animate-spin-slow' : ''}`} />
          </button>
          <button
            onClick={() => {
              isRefreshing.current = true;
              fetchData().finally(() => {
                isRefreshing.current = false;
              });
            }}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            title="Manual refresh"
          >
            <FaSyncAlt className={`${loading ? 'animate-spin' : ''}`} />
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

      {loading && !systemInfo ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 dark:text-gray-400 text-center">
            <p>Loading dashboard data...</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Please wait while we fetch the latest information</p>
          </div>
        </div>
      ) : (
        <>
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-4">
                  <FaDocker className="h-6 w-6 text-blue-500 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Containers</p>
                  <p className="text-lg font-semibold">{systemInfo?.Containers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mr-4">
                  <FaServer className="h-6 w-6 text-green-500 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Images</p>
                  <p className="text-lg font-semibold">{systemInfo?.Images || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 mr-4">
                  <FaMemory className="h-6 w-6 text-purple-500 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Memory</p>
                  <p className="text-lg font-semibold">{systemInfo ? formatBytes(systemInfo.MemTotal) : '0 GB'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 mr-4">
                  <FaNetworkWired className="h-6 w-6 text-yellow-500 dark:text-yellow-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">CPUs</p>
                  <p className="text-lg font-semibold">{systemInfo?.NCPU || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Container Status Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Container Status</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={containerStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Containers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">Recent Containers</h2>
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
                        <NavLink href={`/containers/${container.Id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {container.Names[0].replace('/', '')}
                        </NavLink>
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
                <NavLink href="/containers" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center">
                  <span>View all containers</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </NavLink>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
