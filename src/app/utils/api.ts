import axios, { AxiosRequestConfig } from 'axios';

// Create a base API instance
const createApiInstance = (baseURL: string = 'http://localhost:3001') => {
  const instance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
    // Only consider 2xx responses as successful
    validateStatus: function (status) {
      // Return true only for successful status codes
      // This will cause axios to throw errors for non-2xx responses
      return status >= 200 && status < 300;
    },
  });

  // Add a request interceptor to include the token in all requests
  instance.interceptors.request.use(
    config => {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // Log request details for debugging
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        hasToken: !!token,
        withCredentials: config.withCredentials
      });

      // If token exists, add it to the request headers
      if (token) {
        config.headers = config.headers || {};
        config.headers['x-auth-token'] = token;

        // Also add as Authorization header for better compatibility
        config.headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn(`No auth token found for request to ${config.url}`);
      }

      return config;
    },
    error => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Add a response interceptor to handle errors better
  instance.interceptors.response.use(
    response => response, // Return successful responses as-is
    error => {
      // For errors, check if the response is HTML (which would cause JSON parse errors)
      if (error.response &&
        error.response.headers &&
        error.response.headers['content-type'] &&
        error.response.headers['content-type'].includes('text/html')) {
        // Create a more friendly error instead of letting it fail with "Unexpected token '<'"
        console.error('Received HTML response instead of JSON', {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          status: error.response?.status,
          statusText: error.response?.statusText
        });

        // Log the HTML response for debugging
        if (error.response.data && typeof error.response.data === 'string') {
          console.error('HTML Response:', error.response.data.substring(0, 500) + '...');
        }

        return Promise.reject(new Error('Server returned an HTML response instead of JSON. This may indicate a server-side error or authentication issue.'));
      }

      // Log other types of errors with more details
      console.error('API Error:', {
        message: error.message,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      return Promise.reject(error);
    }
  );

  return instance;
};

// Default API instance for local Docker
const defaultApi = createApiInstance();

// Function to get the current server from localStorage
const getCurrentServer = () => {
  if (typeof window === 'undefined') return null;

  try {
    const serverId = localStorage.getItem('currentServerId');
    if (!serverId) {
      console.log('No current server ID found in localStorage');
      return null;
    }

    console.log('Current server ID from localStorage:', serverId);

    // Try to get the server directly from localStorage
    const serverJson = localStorage.getItem(`server_${serverId}`);
    if (serverJson) {
      console.log('Found server details in localStorage');
      return JSON.parse(serverJson);
    }

    // Fallback to the old method
    const serversJson = localStorage.getItem('servers');
    if (!serversJson) {
      console.log('No servers found in localStorage');
      return null;
    }

    const servers = JSON.parse(serversJson);
    const server = servers.find((s: any) => s.id === serverId);
    console.log('Server from servers array:', server);
    return server || null;
  } catch (error) {
    console.error('Error getting current server:', error);
    return null;
  }
};

// Enhanced API with server selection support
const api = {
  async get(url: string, config?: AxiosRequestConfig) {
    const server = getCurrentServer();

    // If we're accessing server management endpoints, always use the default API
    if (url.startsWith('/api/servers')) {
      return defaultApi.get(url, config);
    }

    // If we have a selected remote server, add the server ID to the request
    if (server) {
      const serverConfig = {
        ...config,
        headers: {
          ...config?.headers,
          'X-Server-ID': server.id
        }
      };
      console.log(`API Request to ${url} with server ID: ${server.id}`, serverConfig);
      return defaultApi.get(url, serverConfig);
    }

    // Otherwise, use the default API
    return defaultApi.get(url, config);
  },

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    const server = getCurrentServer();

    // If we're accessing server management endpoints, always use the default API
    if (url.startsWith('/api/servers')) {
      return defaultApi.post(url, data, config);
    }

    // If we have a selected remote server, add the server ID to the request
    if (server) {
      const serverConfig = {
        ...config,
        headers: {
          ...config?.headers,
          'X-Server-ID': server.id
        }
      };
      return defaultApi.post(url, data, serverConfig);
    }

    // Otherwise, use the default API
    return defaultApi.post(url, data, config);
  },

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    const server = getCurrentServer();

    // If we're accessing server management endpoints, always use the default API
    if (url.startsWith('/api/servers')) {
      return defaultApi.put(url, data, config);
    }

    // If we have a selected remote server, add the server ID to the request
    if (server) {
      const serverConfig = {
        ...config,
        headers: {
          ...config?.headers,
          'X-Server-ID': server.id
        }
      };
      return defaultApi.put(url, data, serverConfig);
    }

    // Otherwise, use the default API
    return defaultApi.put(url, data, config);
  },

  async delete(url: string, config?: AxiosRequestConfig) {
    const server = getCurrentServer();

    // If we're accessing server management endpoints, always use the default API
    if (url.startsWith('/api/servers')) {
      return defaultApi.delete(url, config);
    }

    // If we have a selected remote server, add the server ID to the request
    if (server) {
      const serverConfig = {
        ...config,
        headers: {
          ...config?.headers,
          'X-Server-ID': server.id
        }
      };
      return defaultApi.delete(url, serverConfig);
    }

    // Otherwise, use the default API
    return defaultApi.delete(url, config);
  },

  // Expose the underlying axios instance for advanced use cases
  axios: defaultApi
};

export default api;
