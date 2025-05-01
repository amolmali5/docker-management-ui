'use client';

import React, { useState, useEffect } from 'react';
import { FaServer, FaTimes, FaExclamationTriangle, FaSave } from 'react-icons/fa';
import api from '@/app/utils/api';
import ServerAccessManager from './ServerAccessManager';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  serverAccess?: {
    type: 'all' | 'specific' | 'none';
    serverIds?: string[];
  };
}

interface EditUserServerAccessProps {
  userId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditUserServerAccess({ userId, onSuccess, onCancel }: EditUserServerAccessProps) {
  const [user, setUser] = useState<User | null>(null);
  const [serverAccess, setServerAccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/users/${userId}`);
        setUser(response.data);
        setServerAccess(response.data.serverAccess || { type: 'all' });
        setError('');
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleServerAccessChange = (newServerAccess: any) => {
    // Just update the local state, don't save to server yet
    setServerAccess(newServerAccess);
    // Clear any success message when changes are made
    if (message) {
      setMessage('');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      await api.put(`/api/users/${userId}`, { serverAccess });

      setMessage('Server access updated successfully');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('Error updating server access:', err);
      setError('Failed to update server access');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="text-center text-red-500">
          <FaExclamationTriangle className="mx-auto h-12 w-12 mb-4" />
          <h3 className="text-lg font-medium">User not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-400">Edit Server Access</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <FaTimes className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{user.username}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
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

      {message && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p>{message}</p>
        </div>
      )}

      <ServerAccessManager
        userId={userId}
        initialServerAccess={serverAccess}
        onSave={handleServerAccessChange}
        disabled={saving}
      />

      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="mr-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <FaSave className="mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
