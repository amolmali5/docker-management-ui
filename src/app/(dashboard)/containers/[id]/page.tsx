'use client';

import { useState, useEffect, useCallback, use } from 'react';
// import { useRouter } from 'next/navigation';
import api from '@/app/utils/api';
import { FaArrowLeft, FaPlay, FaStop, FaRedo, FaExclamationTriangle, FaTerminal, FaFileAlt, FaNetworkWired, FaDatabase, FaSearch, FaCode } from 'react-icons/fa';
import Link from 'next/link';
import ContainerLogs from '@/app/components/ContainerLogs';
import ContainerEnvForm from '@/app/components/ContainerEnvForm';
import ContainerTerminal from '@/app/components/ContainerTerminal';
import { useAuth } from '@/app/context/AuthContext';

interface ContainerDetails {
  Id: string;
  Name: string;
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    OOMKilled: boolean;
    Dead: boolean;
    Pid: number;
    ExitCode: number;
    Error: string;
    StartedAt: string;
    FinishedAt: string;
  };
  Ports: Array<{
    IP: string;
    PrivatePort: number;
    PublicPort: number;
    Type: string;
  }>;
  Mounts: Array<{
    Type: string;
    Source: string;
    Destination: string;
    Mode: string;
    RW: boolean;
    Propagation: string;
  }>;
  Config: {
    Env: string[];
    Image: string;
    Labels: Record<string, string>;
    ExposedPorts?: Record<string, any>;
  };
  NetworkSettings: {
    Networks: Record<string, {
      IPAddress: string;
      Gateway: string;
      MacAddress: string;
    }>;
  };
  HostConfig?: {
    PortBindings?: Record<string, Array<{ HostIp: string; HostPort: string }>>;
  };
}

export default function ContainerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use
  const unwrappedParams = use(params);
  const { user } = useAuth();
  // const router = useRouter();
  const [container, setContainer] = useState<ContainerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEnvForm, setShowEnvForm] = useState(false);

  const fetchContainer = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/containers/${unwrappedParams.id}`);
      setContainer(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching container details:', err);
      setError('Failed to fetch container details. Make sure the backend server is running.');
      setContainer(null);
    } finally {
      setLoading(false);
    }
  }, [unwrappedParams.id]);

  useEffect(() => {
    fetchContainer();

    // Set up polling every 5 seconds, but only if the form is not open
    let interval: NodeJS.Timeout | null = null;
    if (!showEnvForm) {
      interval = setInterval(fetchContainer, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchContainer, showEnvForm]);

  const handleAction = async (action: string) => {
    try {
      setActionLoading(true);
      await api.post(`/api/containers/${unwrappedParams.id}/${action}`);
      fetchContainer();
    } catch (err) {
      console.error(`Error performing ${action} action:`, err);
      setError(`Failed to ${action} container. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };

  // Get the actual start time from the container state
  const calculateStartTime = (container: ContainerDetails | null) => {
    if (!container) return 'N/A';

    // If the container is running, use the StartedAt time from State
    if (container.State?.Status === 'running') {
      if (container.State?.StartedAt && container.State.StartedAt !== '0001-01-01T00:00:00Z') {
        const date = new Date(container.State.StartedAt);
        return date.toLocaleString();
      } else {
        // Try to extract uptime information from State.Status
        const status = container.State?.Status || '';
        if (status.toLowerCase() === 'running') {
          return 'Running';
        }
        return 'Running (start time unknown)';
      }
    }

    // If the container is not running, show when it was last running
    if (container.State?.FinishedAt && container.State.FinishedAt !== '0001-01-01T00:00:00Z') {
      return 'Not running (last ran: ' + new Date(container.State.FinishedAt).toLocaleString() + ')';
    }

    // If we can't determine the start time, show N/A
    return 'Not running';
  };

  // When the container details are fetched, update the start time in the parent component's state
  useEffect(() => {
    if (container && container.Id) {
      // Calculate the start time
      const startTime = calculateStartTime(container);

      // This is a hack to communicate with the parent component
      // In a real app, we would use a context or Redux store
      const startTimeEvent = new CustomEvent('containerStartTimeUpdated', {
        detail: {
          containerId: container.Id,
          startTime: startTime
        }
      });
      window.dispatchEvent(startTimeEvent);
    }
  }, [container]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'exited':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'created':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading && !container) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error && !container) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
        <div className="flex justify-center">
          <Link
            href="/containers"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FaArrowLeft className="mr-2" />
            Containers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link
            href="/containers"
            className="inline-flex items-center mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaArrowLeft />
          </Link>
          <h1 className="text-2xl font-bold truncate max-w-2xl">
            {container?.Name?.replace(/^\//, '') || 'Container Details'}
          </h1>
        </div>
        <div className="flex space-x-2">
          {container?.State?.Status?.toLowerCase() === 'running' ? (
            <>
              {user?.role === 'admin' || user?.role === 'write' ? (
                <>
                  <button
                    onClick={() => handleAction('stop')}
                    disabled={actionLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <FaStop className="mr-2" />
                    Stop
                  </button>
                  <button
                    onClick={() => handleAction('restart')}
                    disabled={actionLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                  >
                    <FaRedo className="mr-2" />
                    Restart
                  </button>
                </>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  You need write or admin access to control this container.
                </div>
              )}
            </>
          ) : (
            user?.role === 'admin' || user?.role === 'write' ? (
              <button
                onClick={() => handleAction('start')}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <FaPlay className="mr-2" />
                Start
              </button>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                You need write or admin access to control this container.
              </div>
            )
          )}
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

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Container Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Details and configuration.</p>
          </div>
          <div>
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(container?.State?.Status || '')}`}>
              {container?.State?.Status || 'Unknown'}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('overview')}
            >
              <FaFileAlt className="inline mr-2" />
              Overview
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'logs' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('logs')}
            >
              <FaTerminal className="inline mr-2" />
              Logs
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'env' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('env')}
            >
              <FaDatabase className="inline mr-2" />
              Environment
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'network' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('network')}
            >
              <FaNetworkWired className="inline mr-2" />
              Network
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'inspect' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('inspect')}
            >
              <FaSearch className="inline mr-2" />
              Inspect
            </button>
            {container?.State?.Running && (user?.role === 'admin' || user?.role === 'write') && (
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'terminal' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                onClick={() => setActiveTab('terminal')}
              >
                <FaCode className="inline mr-2" />
                Terminal
              </button>
            )}
          </div>

          {activeTab === 'overview' && (
            <dl>
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Container ID</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300 sm:mt-0 sm:col-span-2 font-mono">{container?.Id}</dd>
              </div>
              <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300 sm:mt-0 sm:col-span-2">{container?.Name?.replace(/^\//, '')}</dd>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Image</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300 sm:mt-0 sm:col-span-2">{container?.Config?.Image}</dd>
              </div>
              <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Command</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300 sm:mt-0 sm:col-span-2 font-mono">{container?.Command}</dd>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Started At</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-300 sm:mt-0 sm:col-span-2">{calculateStartTime(container)}</dd>
              </div>

              {container?.State?.ExitCode !== undefined && container?.State?.ExitCode !== 0 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Exit Code</dt>
                  <dd className="mt-1 text-sm text-red-600 dark:text-red-400 sm:mt-0 sm:col-span-2">{container?.State?.ExitCode}</dd>
                </div>
              )}
              {container?.State?.Error && (
                <div className="bg-gray-50 dark:bg-gray-900 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Error</dt>
                  <dd className="mt-1 text-sm text-red-600 dark:text-red-400 sm:mt-0 sm:col-span-2">{container?.State?.Error}</dd>
                </div>
              )}
            </dl>
          )}

          {activeTab === 'logs' && (
            <div className="p-4">
              <ContainerLogs containerId={unwrappedParams.id} />
            </div>
          )}

          {activeTab === 'env' && (
            <div className="p-4">
              {user?.role === 'admin' || user?.role === 'write' ? (
                <button
                  onClick={() => setShowEnvForm(true)}
                  className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Environment Variables
                </button>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  You need write or admin access to edit environment variables.
                </div>
              )}
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
                <h4 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Environment Variables</h4>
                {container?.Config?.Env && container.Config.Env.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {container.Config.Env.map((env, index) => {
                      const [key, ...valueParts] = env.split('=');
                      const value = valueParts.join('='); // Handle values that might contain = characters
                      return (
                        <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded-md">
                          <span className="font-mono text-sm">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{key}</span>
                            {value && (
                              <>
                                <span className="text-gray-500 dark:text-gray-400"> = </span>
                                <span className="text-green-600 dark:text-green-400">{value}</span>
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No environment variables found.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="p-4">
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md mb-4">
                <h4 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Networks</h4>
                {container?.NetworkSettings?.Networks && Object.keys(container.NetworkSettings.Networks).length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(container.NetworkSettings.Networks).map(([networkName, network]) => (
                      <div key={networkName} className="bg-white dark:bg-gray-800 p-4 rounded-md">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-2">{networkName}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">IP Address: </span>
                            <span className="font-mono">{network.IPAddress || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Gateway: </span>
                            <span className="font-mono">{network.Gateway || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">MAC Address: </span>
                            <span className="font-mono">{network.MacAddress || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No network information found.</p>
                )}
              </div>

              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
                <h4 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Port Mappings</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mapping</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Protocol</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {/* Show port mappings from HostConfig.PortBindings */}
                      {container?.HostConfig?.PortBindings && Object.entries(container.HostConfig.PortBindings).length > 0 ? (
                        Object.entries(container.HostConfig.PortBindings).map(([portKey, bindings], index) => {
                          const [containerPort, protocol] = portKey.split('/');
                          return bindings.map((binding, bindingIndex) => (
                            <tr key={`binding-${index}-${bindingIndex}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                <span className="font-semibold">
                                  {binding.HostPort}:{containerPort}/{protocol}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{protocol}</td>
                            </tr>
                          ));
                        }).flat()
                      ) : (
                        // Fallback to Ports array if HostConfig.PortBindings is not available
                        container?.Ports && container.Ports.length > 0 ? (
                          container.Ports.map((port, index) => (
                            <tr key={`port-${index}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                <span className="font-semibold">
                                  {port.PublicPort ? `${port.PublicPort}:${port.PrivatePort}/${port.Type}` : `${port.PrivatePort}/${port.Type}`}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{port.Type}</td>
                            </tr>
                          ))
                        ) : null
                      )}

                      {/* If no ports are found in the Ports array or HostConfig, check ExposedPorts */}
                      {(!container?.Ports || container.Ports.length === 0) &&
                        (!container?.HostConfig?.PortBindings || Object.entries(container.HostConfig.PortBindings).length === 0) &&
                        container?.Config?.ExposedPorts && Object.keys(container.Config.ExposedPorts).length > 0 && (
                          Object.keys(container.Config.ExposedPorts).map((portKey, index) => {
                            const [port, protocol] = portKey.split('/');
                            return (
                              <tr key={`config-${index}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                  <span className="text-gray-500">-</span>:{port}/{protocol}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{protocol}</td>
                              </tr>
                            );
                          })
                        )}

                      {/* Show a message if no ports are found */}
                      {(!container?.Ports || container.Ports.length === 0) &&
                        (!container?.HostConfig?.PortBindings || Object.entries(container.HostConfig.PortBindings).length === 0) &&
                        (!container?.Config?.ExposedPorts || Object.keys(container.Config.ExposedPorts).length === 0) && (
                          <tr>
                            <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                              No port mappings found.
                            </td>
                          </tr>
                        )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inspect' && (
            <div className="p-4">
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">Raw Inspect Data</h4>
                  <button
                    onClick={() => {
                      // Copy to clipboard
                      navigator.clipboard.writeText(JSON.stringify(container, null, 2));
                      alert('Inspect data copied to clipboard');
                    }}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-md overflow-auto max-h-[600px]">
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(container, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terminal' && container?.State?.Running && (
            <div className="p-4">
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
                <h4 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Interactive Terminal</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  This is a fully interactive terminal connected to the container. You can run commands as if you were directly connected to the container.
                </p>
                <ContainerTerminal containerId={unwrappedParams.id} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showEnvForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <ContainerEnvForm
            containerId={unwrappedParams.id}
            containerName={container?.Name?.replace(/^\//, '') || ''}
            currentEnv={container?.Config?.Env || []}
            onSuccess={() => {
              setShowEnvForm(false);
              fetchContainer();
            }}
            onCancel={() => setShowEnvForm(false)}
          />
        </div>
      )}

    </div>
  );
}
