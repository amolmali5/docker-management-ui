'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '@/app/utils/api';
import { useAuth } from './AuthContext';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  status?: 'online' | 'offline' | 'unknown';
  isLocal?: boolean;
}

interface ServerContextType {
  servers: Server[];
  currentServer: Server | null;
  setCurrentServer: (server: Server | null) => void;
  loading: boolean;
  switchingServer: boolean;
  error: string | null;
  refreshServers: () => Promise<void>;
  dataReady: boolean; // New state to track if data is ready to be displayed
}

const ServerContext = createContext<ServerContextType>({
  servers: [],
  currentServer: null,
  setCurrentServer: () => { },
  loading: false,
  switchingServer: false,
  error: null,
  refreshServers: async () => { },
  dataReady: true, // Default to true for initial render
});

export const useServer = () => useContext(ServerContext);

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [currentServer, setCurrentServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingServer, setSwitchingServer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(true); // Start with true for initial render

  // Get auth context to check user role
  const { user, isAuthenticated } = useAuth();

  // Track previous server for reverting on connection failure
  const prevServerRef = useRef<Server | null>(null);

  const refreshServers = async () => {
    // Check if user is authenticated before making the request
    if (!isAuthenticated) {
      setError('Authentication required');
      setLoading(false);
      setSwitchingServer(false); // Clear switching state
      return;
    }

    try {
      setLoading(true);
      // Request server status update
      const response = await api.get('/api/servers?updateStatus=true');

      // Check if we got any servers
      if (response.data && Array.isArray(response.data)) {
        if (response.data.length === 0) {
          // If user is not admin, show a message
          if (user?.role !== 'admin') {
            setError('No servers available. Please contact an administrator to get access.');
          }
          setServers([]);
        } else {
          // Check if all available servers are offline
          const allServersOffline = response.data.every(server => server.status === 'offline');

          if (allServersOffline && response.data.length > 0) {
            setError('All available servers are currently offline. Please try again later or contact your administrator.');
          }

          setServers(response.data);
        }
      } else {
        console.error('Invalid server data received');
        setServers([]);
        setError('Invalid server data received');
      }

      // If we have a current server, update its data
      if (currentServer) {
        const updatedServer = response.data.find((s: Server) => s.id === currentServer.id);
        if (updatedServer) {
          setCurrentServer(updatedServer);

          // Load additional data for the current server
          try {
            // Make API calls to load server-specific data
            // These calls will depend on what data you need for each server

            // We'll use a small delay to ensure the server context is fully updated
            await new Promise(resolve => setTimeout(resolve, 500));

            // Load containers, images, volumes, etc.
            // These are example API calls - adjust based on your actual API endpoints
            try {
              await api.get(`/api/containers?serverId=${updatedServer.id}`);
            } catch (err) {
              console.error('Error loading containers:', err);
            }

            try {
              await api.get(`/api/images?serverId=${updatedServer.id}`);
            } catch (err) {
              console.error('Error loading images:', err);
            }

            try {
              await api.get(`/api/volumes?serverId=${updatedServer.id}`);
            } catch (err) {
              console.error('Error loading volumes:', err);
            }
          } catch (dataErr) {
            console.error('Error loading additional server data:', dataErr);
            // Don't set an error here as we've already loaded the servers list
          }
        }
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching servers:', err);

      // Check if it's an authentication error
      if (err.response && err.response.status === 401) {
        // Only set the error message, don't redirect automatically
        // This prevents redirect loops
        setError('Authentication error. Please log in again.');
      }
      // Check if this is a network error (backend server not running)
      else if (!err.response && (
        err.message.includes('Failed to fetch') ||
        err.message.includes('Network Error') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('ERR_CONNECTION_REFUSED')
      )) {
        setError('Failed to connect to the backend server. Please contact your administrator as the server may not be running.');

        // Keep any existing servers in the list but mark them as unknown status
        if (servers.length > 0) {
          const updatedServers = servers.map(s => ({
            ...s,
            status: 'unknown' as const
          }));
          setServers(updatedServers);
        }

        // Set dataReady to true to remove the loading state if we're switching servers
        if (switchingServer) {
          setDataReady(true);
          setSwitchingServer(false);
        }
      } else {
        setError(`Failed to fetch servers: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      // Note: We don't clear the switching state here anymore
      // It's now handled in the handleSetCurrentServer function
    }
  };

  // Load servers on initial mount, but only if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshServers();
    } else {
      setServers([]);
      setCurrentServer(null);
    }
  }, [isAuthenticated]);

  // Load saved server selection from localStorage
  useEffect(() => {
    const savedServerId = localStorage.getItem('currentServerId');

    // If we have servers available
    if (servers.length > 0) {
      // First try to use the saved server ID
      if (savedServerId) {
        const savedServer = servers.find(s => s.id === savedServerId);
        if (savedServer) {
          setCurrentServer(savedServer);
          return;
        } else {
          // If the saved server is not in the list, clear the selection
          localStorage.removeItem('currentServerId');
        }
      }

      // If no saved server or it wasn't found, set default based on user role

      // For admin users, try to set local Docker as default
      if (user?.role === 'admin') {
        const localServer = servers.find(s => s.id === 'local' || s.isLocal);
        if (localServer) {
          setCurrentServer(localServer);
          return;
        }
      }

      // Check if there are any online servers available
      const onlineServers = servers.filter(server => server.status === 'online');

      // If only one server is available, select it automatically (even if offline)
      if (servers.length === 1) {
        setCurrentServer(servers[0]);

        // If the only server is offline, show a clear message
        if (servers[0].status === 'offline') {
          setError(`The only server you have access to (${servers[0].name}) is currently offline. Please try again later or contact your administrator.`);
        }
        return;
      }

      // If there are multiple servers but all are offline
      if (servers.length > 1 && onlineServers.length === 0) {
        // Select the first server but show an error message
        setCurrentServer(servers[0]);
        setError('All available servers are currently offline. Please try again later or contact your administrator.');
        return;
      }

      // If there are online servers available, select the first online one
      if (onlineServers.length > 0) {
        setCurrentServer(onlineServers[0]);
        return;
      }

      // Otherwise, don't select any server by default for non-admin users
      setCurrentServer(null);
    } else {
      // If no servers are available, clear the current server selection
      setCurrentServer(null);
      localStorage.removeItem('currentServerId');
    }
  }, [servers, user]);

  // Save current server selection to localStorage
  useEffect(() => {
    if (currentServer) {
      localStorage.setItem('currentServerId', currentServer.id);
      // Also store the server details for direct access
      localStorage.setItem(`server_${currentServer.id}`, JSON.stringify(currentServer));
      // Update the servers array in localStorage
      localStorage.setItem('servers', JSON.stringify(servers));
    } else {
      localStorage.removeItem('currentServerId');
    }
  }, [currentServer, servers]);

  // Create a wrapper for setCurrentServer that shows loading state
  const handleSetCurrentServer = async (server: Server | null) => {
    // If switching to a different server, show loading state
    if (server?.id !== currentServer?.id) {
      try {
        // Clear any previous error messages when switching servers
        setError(null);

        // Save the current server for potential rollback
        prevServerRef.current = currentServer;

        // Mark data as not ready to show loading state
        setDataReady(false);

        // Start loading state
        setSwitchingServer(true);

        // Set the server immediately to update UI
        setCurrentServer(server);

        if (server) {
          // Pre-load data for the new server
          // console.log(`Pre-loading data for server: ${server.name}`);

          // First, refresh the servers list to get the latest status
          await refreshServers();

          // Then, make direct API calls to load the data for this server
          // These calls will populate the cache for the components
          try {
            // First, check if the server is online by making a simple request
            try {
              await api.get(`/api/system/info?serverId=${server.id}`);
            } catch (connectionErr: any) {
              console.error('Error connecting to server:', connectionErr);

              // Set a specific error message for connection issues
              setError(`Unable to connect to server "${server.name}". Please check if the server is running and accessible.`);

              // Update server status to offline in the servers list
              const updatedServers = servers.map(s =>
                s.id === server.id ? { ...s, status: 'offline' as const } : s
              );
              setServers(updatedServers);

              // Set dataReady to true to remove the loading state
              setTimeout(() => {
                setDataReady(true);
                setSwitchingServer(false);

                // If the server was already marked as offline and the user confirmed the switch,
                // keep the selection but mark it as offline
                if (server.status === 'offline') {
                  setCurrentServer({ ...server, status: 'offline' as const });
                } else {
                  // If this was an unexpected connection failure, revert to the previous server
                  // if there was one, otherwise keep the current selection but mark it as offline
                  if (prevServerRef.current && prevServerRef.current.id !== server.id) {
                    console.log('Reverting to previous server due to connection failure');
                    setCurrentServer(prevServerRef.current);
                    setError(`Could not connect to server "${server.name}". Reverted to previous server.`);
                  } else {
                    setCurrentServer({ ...server, status: 'offline' as const });
                  }
                }
              }, 1000); // Small delay to ensure UI updates properly

              // Don't proceed with loading other data
              return;
            }

            // If we get here, the server is online, so load the rest of the data

            // Load containers
            await api.get(`/api/containers?serverId=${server.id}`);
            // console.log('Containers data pre-loaded');

            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 300));

            // Load images
            await api.get(`/api/images?serverId=${server.id}`);
            // console.log('Images data pre-loaded');

            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 300));

            // Load volumes
            await api.get(`/api/volumes?serverId=${server.id}`);
            // console.log('Volumes data pre-loaded');

            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 300));

            // Load networks
            await api.get(`/api/networks?serverId=${server.id}`);
            // console.log('Networks data pre-loaded');

            // Final delay to ensure all components have updated
            await new Promise(resolve => setTimeout(resolve, 500));

            // Clear any previous error messages
            setError(null);
          } catch (err: any) {
            console.error('Error pre-loading data:', err);

            // Set a generic error message if we couldn't determine a specific one
            setError(`Error loading data from server "${server.name}": ${err.message || 'Unknown error'}`);
          }
        }
      } catch (finalErr) {
        // Handle any unexpected errors during server switching
        console.error('Unexpected error during server switching:', finalErr);
        setError(`An unexpected error occurred while switching to server "${server?.name}". Please try again.`);

        // Make sure we clear the loading state even if there's an error
        setDataReady(true);
        setSwitchingServer(false);
      } finally {
        // Create a flag to track if we've already set dataReady
        // This is needed because React state updates are asynchronous
        let alreadyHandled = false;

        // Check if we're already in a ready state (which might happen in the error handler)
        if (dataReady === true && !switchingServer) {
          alreadyHandled = true;
          console.log('Data already ready, skipping timeout');
        }

        // Only set the timeouts if we haven't already cleared the loading state
        if (!alreadyHandled) {
          // Keep dataReady false until data is fully loaded
          // This ensures the loader stays visible until all data is ready

          // Set a timeout to ensure the loader disappears after a reasonable time
          // This gives components time to load their data
          setTimeout(() => {
            console.log('Setting dataReady to true after delay');
            setDataReady(true);

            // After data is ready, we can clear the switching server flag
            setTimeout(() => {
              setSwitchingServer(false);
              console.log('Server switching completed');
            }, 1000); // 1 second delay to ensure smooth transition
          }, 3000); // 3 second delay to ensure data is loaded
        }
      }
    } else {
      setCurrentServer(server);
    }
  };

  return (
    <ServerContext.Provider
      value={{
        servers,
        currentServer,
        setCurrentServer: handleSetCurrentServer,
        loading,
        switchingServer,
        error,
        refreshServers,
        dataReady,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};
