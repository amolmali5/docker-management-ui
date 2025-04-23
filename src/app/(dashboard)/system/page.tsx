'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { FaExclamationTriangle, FaDocker, FaServer, FaMemory, FaNetworkWired } from 'react-icons/fa';

interface SystemInfo {
  ID: string;
  Containers: number;
  ContainersRunning: number;
  ContainersPaused: number;
  ContainersStopped: number;
  Images: number;
  Driver: string;
  DriverStatus: [string, string][];
  SystemStatus: [string, string][] | null;
  Plugins: {
    Volume: string[];
    Network: string[];
    Authorization: string[];
    Log: string[];
  } | Record<string, string[]>;
  MemoryLimit: boolean;
  SwapLimit: boolean;
  KernelMemory: boolean;
  KernelMemoryTCP: boolean;
  CpuCfsPeriod: boolean;
  CpuCfsQuota: boolean;
  CPUShares: boolean;
  CPUSet: boolean;
  PidsLimit: boolean;
  IPv4Forwarding: boolean;
  BridgeNfIptables: boolean;
  BridgeNfIp6tables: boolean;
  Debug: boolean;
  NFd: number;
  OomKillDisable: boolean;
  NGoroutines: number;
  SystemTime: string;
  LoggingDriver: string;
  CgroupDriver: string;
  CgroupVersion: string;
  NEventsListener: number;
  KernelVersion: string;
  OperatingSystem: string;
  OSVersion: string;
  OSType: string;
  Architecture: string;
  NCPU: number;
  MemTotal: number;
  DockerRootDir: string;
  HttpProxy: string;
  HttpsProxy: string;
  NoProxy: string;
  Name: string;
  Labels: string[];
  ExperimentalBuild: boolean;
  ServerVersion: string;
  Runtimes: Record<string, { path: string }>;
  DefaultRuntime: string;
  Swarm: {
    NodeID: string;
    NodeAddr: string;
    LocalNodeState: string;
    ControlAvailable: boolean;
    Error: string;
    RemoteManagers: null | any[];
  };
  LiveRestoreEnabled: boolean;
  Isolation: string;
  InitBinary: string;
  ContainerdCommit: {
    ID: string;
    Expected: string;
  };
  RuncCommit: {
    ID: string;
    Expected: string;
  };
  InitCommit: {
    ID: string;
    Expected: string;
  };
  SecurityOptions: string[];
}

interface DockerVersion {
  Platform: {
    Name: string;
  };
  Components: Array<{
    Name: string;
    Version: string;
    Details?: {
      ApiVersion: string;
      Arch: string;
      BuildTime: string;
      Experimental: string;
      GitCommit: string;
      GoVersion: string;
      KernelVersion: string;
      MinAPIVersion: string;
      Os: string;
    };
  }>;
  Version: string;
  ApiVersion: string;
  MinAPIVersion: string;
  GitCommit: string;
  GoVersion: string;
  Os: string;
  Arch: string;
  KernelVersion: string;
  BuildTime: string;
}

export default function SystemPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [dockerVersion, setDockerVersion] = useState<DockerVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [infoResponse, versionResponse] = await Promise.all([
        api.get('/api/system/info'),
        api.get('/api/system/version')
      ]);

      setSystemInfo(infoResponse.data);
      setDockerVersion(versionResponse.data);
      setError('');
    } catch (err) {
      console.error('Error fetching system data:', err);
      setError('Failed to fetch system data. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">System Information</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {systemInfo && (
        <>
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-4">
                  <FaDocker className="h-6 w-6 text-blue-500 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Docker Version</p>
                  <p className="text-lg font-semibold">{dockerVersion?.Version || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mr-4">
                  <FaServer className="h-6 w-6 text-green-500 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">OS / Architecture</p>
                  <p className="text-lg font-semibold">{systemInfo.OSType} / {systemInfo.Architecture}</p>
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
                  <p className="text-lg font-semibold">{formatBytes(systemInfo.MemTotal)}</p>
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
                  <p className="text-lg font-semibold">{systemInfo.NCPU}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Docker Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">Docker Information</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Server Version</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.ServerVersion}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">API Version</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{dockerVersion?.ApiVersion || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Go Version</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{dockerVersion?.GoVersion || 'N/A'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">OS</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.OperatingSystem} ({systemInfo.OSVersion})</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Kernel Version</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.KernelVersion}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Storage Driver</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.Driver}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Logging Driver</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.LoggingDriver}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Cgroup Driver</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.CgroupDriver}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Cgroup Version</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.CgroupVersion}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Container Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">Container Statistics</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Containers</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.Containers}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Running</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.ContainersRunning}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Paused</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.ContainersPaused}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Stopped</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.ContainersStopped}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">Storage</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Images</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.Images}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Docker Root Directory</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">{systemInfo.DockerRootDir}</dd>
                </div>
                {systemInfo.DriverStatus && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Driver Status</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {systemInfo.DriverStatus.map((status, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">{status[0]}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{status[1]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
