'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaUser, FaEnvelope, FaLock, FaSave, FaMoon, FaSun, FaEye, FaEyeSlash } from 'react-icons/fa';
import { validatePassword } from '../../utils/passwordValidation';
import api from '../../utils/api';

export default function ProfilePage() {
  const { user, updateUserSettings } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumberOrSpecial: false
  });

  // Password requirements message
  const passwordRequirementsMessage = 'Password must be at least 6 characters and include uppercase, lowercase, and a number or special character';
  const [theme, setTheme] = useState(user?.settings?.theme || 'light');
  const [refreshRate, setRefreshRate] = useState(user?.settings?.refreshRate || 10000);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    try {
      const updateData: any = {};

      if (username !== user?.username) {
        updateData.username = username;
      }

      if (email !== user?.email) {
        updateData.email = email;
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setError('New passwords do not match');
          setIsLoading(false);
          return;
        }

        if (!currentPassword) {
          setError('Current password is required to set a new password');
          setIsLoading(false);
          return;
        }

        // Validate password
        const validation = validatePassword(newPassword);
        if (!validation.isValid) {
          setError(validation.error || 'Invalid password');
          setIsLoading(false);
          return;
        }

        updateData.password = newPassword;
        updateData.currentPassword = currentPassword;
      }

      if (Object.keys(updateData).length > 0) {
        await api.put(`/api/users/${user?.id}`, updateData);
      }

      // Update theme and refresh rate if changed
      if (theme !== user?.settings?.theme || refreshRate !== user?.settings?.refreshRate) {
        await updateUserSettings({ theme, refreshRate });
      }

      setMessage('Profile updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-500 mb-6">Your Profile</h1>

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
        <form onSubmit={handleProfileUpdate}>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-500 mb-3">Change Password</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Current Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer z-10"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" title="Hide password" />
                        ) : (
                          <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" title="Show password" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      New Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewPassword(value);

                          // Use the validation utility to update password strength indicators
                          const validation = validatePassword(value);
                          if (validation.requirements) {
                            setPasswordStrength(validation.requirements);
                          }
                        }}
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer z-10"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" title="Hide password" />
                        ) : (
                          <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" title="Show password" />
                        )}
                      </button>
                    </div>

                    {newPassword && (
                      <>
                        {/* Password requirements message */}
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 dark:text-gray-400">{passwordRequirementsMessage}</p>
                        </div>

                        {/* Password strength indicators */}
                        <div className="mt-2 flex items-center space-x-2">
                          <div className={`h-1 flex-1 rounded-full ${passwordStrength.hasMinLength ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <div className={`h-1 flex-1 rounded-full ${passwordStrength.hasUpperCase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <div className={`h-1 flex-1 rounded-full ${passwordStrength.hasLowerCase ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <div className={`h-1 flex-1 rounded-full ${passwordStrength.hasNumberOrSpecial ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirm New Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer z-10"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-600" title="Hide password" />
                        ) : (
                          <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-600" title="Show password" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-500 mb-3">Preferences</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Theme
                    </label>
                    <div className="mt-1">
                      <div className="flex items-center space-x-4">
                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`flex items-center px-4 py-2 border rounded-md ${theme === 'light'
                            ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          <FaSun className="mr-2" /> Light
                        </button>
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`flex items-center px-4 py-2 border rounded-md ${theme === 'dark'
                            ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          <FaMoon className="mr-2" /> Dark
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="refreshRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Refresh Rate (ms)
                    </label>
                    <div className="mt-1">
                      <select
                        id="refreshRate"
                        value={refreshRate}
                        onChange={(e) => setRefreshRate(Number(e.target.value))}
                        className="block w-full pl-3 pr-10 py-3 text-base border border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                      >
                        <option value={5000}>5 seconds</option>
                        <option value={10000}>10 seconds</option>
                        <option value={30000}>30 seconds</option>
                        <option value={60000}>1 minute</option>
                      </select>
                    </div>
                  </div>
                </div>
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
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
