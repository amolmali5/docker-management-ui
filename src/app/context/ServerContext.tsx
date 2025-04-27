'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/app/utils/api';
import { useAuth } from './AuthContext';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  status?: 'online' | 'offline' | 'unknown';
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
        }
        setServers(response.data);
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

      // If only one server is available, select it automatically
      if (servers.length === 1) {
        setCurrentServer(servers[0]);
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
        // Mark data as not ready to show loading state
        setDataReady(false);

        // Start loading state
        setSwitchingServer(true);

        // Set the server immediately to update UI
        setCurrentServer(server);

        if (server) {
          // Pre-load data for the new server
          console.log(`Pre-loading data for server: ${server.name}`);

          // First, refresh the servers list to get the latest status
          await refreshServers();

          // Then, make direct API calls to load the data for this server
          // These calls will populate the cache for the components
          try {
            // Load containers
            await api.get(`/api/containers?serverId=${server.id}`);
            console.log('Containers data pre-loaded');

            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 300));

            // Load images
            await api.get(`/api/images?serverId=${server.id}`);
            console.log('Images data pre-loaded');

            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 300));

            // Load volumes
            await api.get(`/api/volumes?serverId=${server.id}`);
            console.log('Volumes data pre-loaded');

            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 300));

            // Load networks
            await api.get(`/api/networks?serverId=${server.id}`);
            console.log('Networks data pre-loaded');

            // Final delay to ensure all components have updated
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            console.error('Error pre-loading data:', err);
          }
        }
      } finally {
        // Always clear the loading states after all operations
        // Add a small delay to ensure the UI has updated
        setTimeout(() => {
          setSwitchingServer(false);
          // Allow rendering of children again
          setDataReady(true);
          console.log('Server switching completed');
        }, 1000);

        // IMPORTANT: Always set a maximum timeout to ensure the loader disappears
        // This prevents the loader from being stuck indefinitely
        setTimeout(() => {
          if (!dataReady || switchingServer) {
            setSwitchingServer(false);
            setDataReady(true);
            console.log('Forced loader timeout - ensuring loader disappears');
          }
        }, 10000); // 10 second maximum timeout as a failsafe
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
