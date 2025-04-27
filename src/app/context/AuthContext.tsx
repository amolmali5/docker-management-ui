'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstLogin?: boolean;
  settings: {
    theme: string;
    refreshRate: number;
  };
  serverAccess?: {
    type: 'all' | 'specific' | 'none';
    serverIds?: string[];
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserSettings: (settings: Partial<User['settings']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user on initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if we have a token in localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found in localStorage, user is not authenticated');
          // No token, so we're not authenticated
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        console.log('Token found in localStorage, attempting to load user data');
        console.log('Token starts with:', token.substring(0, 10) + '...');

        // Try to get user data
        const res = await api.get('/api/auth/user');
        if (res.status === 200) {
          console.log('User data loaded successfully:', res.data);
          setUser(res.data);
          setIsAuthenticated(true);
        } else {
          console.error('Invalid response when loading user:', res);
          // Invalid response, clear auth state
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('token');
        }
      } catch (err: any) {
        console.error('Failed to load user:', err);

        // Log more detailed error information
        if (err.response) {
          console.error('Error response:', {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers
          });
        }

        setUser(null);
        setIsAuthenticated(false);

        // Clear any stored tokens
        if (typeof window !== 'undefined') {
          console.log('Clearing authentication data due to error');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Login user
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('AuthContext: Attempting login with:', { username, password: '***' });

      // Make the login request
      const res = await api.post('/api/auth/login', { username, password });
      console.log('AuthContext: Login response:', { status: res.status, data: res.data });

      // Validate the response
      if (!res.data || !res.data.token || !res.data.user) {
        console.error('AuthContext: Invalid login response format', res.data);
        throw new Error('Invalid response from server');
      }

      // Store token in localStorage
      if (res.data.token && typeof window !== 'undefined') {
        // Clear any existing token first
        localStorage.removeItem('token');

        // Store the new token
        localStorage.setItem('token', res.data.token);

        // Log token storage (don't show the full token)
        console.log('Token stored in localStorage. Token starts with:',
          res.data.token.substring(0, 10) + '...');
      } else {
        console.error('No token received from server or window is undefined');
      }

      setUser(res.data.user);
      setIsAuthenticated(true);
      // Let the component handle navigation
    } catch (err: any) {
      console.error('AuthContext: Login error:', err);
      // Clear any existing auth state
      setUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      // Throw a more descriptive error
      console.error('Login error details:', {
        response: err.response?.data,
        status: err.response?.status,
        message: err.message
      });

      // Always throw a generic error for login failures
      throw new Error('Login failed - Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  // Register user
  const register = async (username: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('AuthContext: Attempting registration with:', { username, email, password: '***' });

      const res = await api.post('/api/auth/register', { username, email, password });
      console.log('AuthContext: Registration response:', { status: res.status, data: res.data });

      // Store token in localStorage
      if (res.data.token && typeof window !== 'undefined') {
        localStorage.setItem('token', res.data.token);
      }

      setUser(res.data.user);
      setIsAuthenticated(true);
      // Let the component handle navigation
    } catch (err: any) {
      console.error('Registration error:', err);
      console.error('Registration error details:', {
        response: err.response?.data,
        status: err.response?.status,
        message: err.message
      });
      throw new Error(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // First clear state and tokens before making the API call
      // This ensures we're logged out even if the API call fails
      setUser(null);
      setIsAuthenticated(false);

      // Clear any stored tokens from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // Clear any other auth-related items
        localStorage.removeItem('user');
      }

      // Try to call the logout API, but don't wait for it
      // This prevents the "Unexpected token '<'" error from blocking the logout
      api.post('/api/auth/logout').catch(error => {
        console.error('Logout API error (non-blocking):', error);
      });

      // Handle navigation to root page where login form is
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
      // Even if there's an error, we've already cleared state and tokens above
      window.location.href = '/';
    }
  };

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await api.post('/api/auth/change-password', { currentPassword, newPassword });

      // If successful, update the user's firstLogin status
      if (user && user.firstLogin) {
        setUser({ ...user, firstLogin: false });
      }

      return res.data;
    } catch (err: any) {
      console.error('Failed to change password:', err);
      throw new Error(err.response?.data?.error || 'Failed to change password');
    }
  };

  // Update user settings
  const updateUserSettings = async (settings: Partial<User['settings']>) => {
    if (!user) return;

    try {
      const res = await api.put(`/api/users/${user.id}`, { settings });
      setUser({ ...user, settings: { ...user.settings, ...settings } });
    } catch (err) {
      console.error('Failed to update user settings:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        changePassword,
        updateUserSettings
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
