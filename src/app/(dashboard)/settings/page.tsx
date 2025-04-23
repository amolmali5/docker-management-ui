'use client';

import { useState, useEffect } from 'react';
import { FaSave, FaCog, FaUsers, FaServer, FaUserPlus, FaLock } from 'react-icons/fa';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import CreateUserForm from '../../components/CreateUserForm';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AppSettings {
  defaultRefreshRate: number;
  defaultTheme: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    defaultRefreshRate: 10000,
    defaultTheme: 'light'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  // Fetch users and settings
  useEffect(() => {
    const fetchData = async () => {
      if (user?.role !== 'admin') return;

      try {
        setIsLoading(true);

        // Fetch users
        const usersRes = await api.get('/api/users');
        setUsers(usersRes.data);

        // Fetch settings
        const settingsRes = await api.get('/api/settings');
        setSettings(settingsRes.data);
      } catch (err) {
        console.error('Error fetching settings data:', err);
        setError('Failed to load settings data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const res = await api.put('/api/settings', settings);
      setSettings(res.data);
      setMessage('Settings updated successfully');
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.put(`/api/users/${userId}`, { role: newRole });

      // Update local state
      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ));

      setMessage('User role updated successfully');
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/users/${userId}`);

      // Update local state
      setUsers(users.filter(user => user.id !== userId));

      setMessage('User deleted successfully');
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        <FaCog className="inline-block mr-2" />
        Application Settings
      </h1>

      {message && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 flex justify-between items-center" role="alert">
          <p>{message}</p>
          <button
            className="text-green-700 hover:text-green-900 ml-4"
            onClick={() => setMessage('')}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 flex justify-between items-center" role="alert">
          <p>{error}</p>
          <button
            className="text-red-700 hover:text-red-900 ml-4"
            onClick={() => setError('')}
            aria-label="Close error message"
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-6 text-sm font-medium ${activeTab === 'general'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <FaServer className="inline-block mr-2" />
              General
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-4 px-6 text-sm font-medium ${activeTab === 'security'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <FaLock className="inline-block mr-2" />
              Security
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-6 text-sm font-medium ${activeTab === 'users'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              <FaUsers className="inline-block mr-2" />
              User Management
            </button>
          </nav>
        </div>

        {showChangePasswordForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <ChangePasswordForm
              onSuccess={() => {
                setShowChangePasswordForm(false);
                setMessage('Password changed successfully');
              }}
              onCancel={() => setShowChangePasswordForm(false)}
            />
          </div>
        )}

        {activeTab === 'general' && (
          <form onSubmit={handleSettingsUpdate}>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="defaultTheme" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Default Theme
                  </label>
                  <select
                    id="defaultTheme"
                    value={settings.defaultTheme}
                    onChange={(e) => setSettings({ ...settings, defaultTheme: e.target.value })}
                    className="mt-1 block w-full pl-3 pr-10 py-3 text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="defaultRefreshRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Default Refresh Rate (ms)
                  </label>
                  <select
                    id="defaultRefreshRate"
                    value={settings.defaultRefreshRate}
                    onChange={(e) => setSettings({ ...settings, defaultRefreshRate: Number(e.target.value) })}
                    className="mt-1 block w-full pl-3 pr-10 py-3 text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value={5000}>5 seconds</option>
                    <option value={10000}>10 seconds</option>
                    <option value={30000}>30 seconds</option>
                    <option value={60000}>1 minute</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-right sm:px-6">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-3 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <FaSave className="mr-2 h-5 w-5" />
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'security' && (
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security Settings</h3>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm mb-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">Change Password</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Update your password to maintain account security.
              </p>
              <button
                onClick={() => setShowChangePasswordForm(true)}
                className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaLock className="mr-2" />
                Change Password
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">User Management</h3>
              <button
                onClick={() => setShowCreateUserForm(true)}
                className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaUserPlus className="mr-2" />
                Add User
              </button>
            </div>

            {showCreateUserForm && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                <CreateUserForm
                  onSuccess={() => {
                    setShowCreateUserForm(false);
                    setMessage('User created successfully');
                    // Refresh user list
                    api.get('/api/users').then(res => setUsers(res.data));
                  }}
                  onCancel={() => setShowCreateUserForm(false)}
                />
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Username
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created At
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((userItem) => (
                      <tr key={userItem.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {userItem.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {userItem.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          <select
                            value={userItem.role}
                            onChange={(e) => handleUserRoleChange(userItem.id, e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            disabled={userItem.id === user?.id} // Can't change own role
                          >
                            <option value="read">Read Only</option>
                            <option value="write">Read & Write</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {new Date(userItem.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteUser(userItem.id)}
                            disabled={userItem.id === user?.id} // Can't delete self
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
