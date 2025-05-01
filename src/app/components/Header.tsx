'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaBell, FaUser, FaCog, FaSignOutAlt, FaMoon, FaSun, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useServer } from '../context/ServerContext';
import ServerSelector from './ServerSelector';

export default function Header() {
  const { user, logout, updateUserSettings } = useAuth();
  const { error, currentServer } = useServer();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showError, setShowError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Get page title based on current path
  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname?.startsWith('/containers')) {
      if (pathname === '/containers') return 'Containers';
      return 'Container Details';
    }
    if (pathname === '/images') return 'Images';
    if (pathname === '/networks') return 'Networks';
    if (pathname === '/volumes') return 'Volumes';
    if (pathname === '/servers') return 'Docker Servers';
    if (pathname === '/profile') return 'Your Profile';
    if (pathname === '/settings') return 'Settings';
    if (pathname === '/login') return 'Login';
    if (pathname === '/register') return 'Register';
    return 'Docker Management UI';
  };

  // Toggle dark mode
  const toggleDarkMode = async () => {
    // Get current state before toggling
    const currentIsDark = document.documentElement.classList.contains('dark');
    const newMode = !currentIsDark;

    // Update UI immediately
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);

    // Store in localStorage for persistence
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    console.log('Theme toggled to:', newMode ? 'dark' : 'light');

    // Save user preference if logged in
    if (user) {
      try {
        await updateUserSettings({ theme: newMode ? 'dark' : 'light' });
        console.log('Theme updated successfully in user settings');
      } catch (err) {
        console.error('Failed to update theme in user settings:', err);
        // We don't revert the UI since we've already saved to localStorage
      }
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set initial dark mode based on the current state of the document
  useEffect(() => {
    // Only run in the browser
    if (typeof window !== 'undefined') {
      // Check if dark mode is currently active
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
      console.log('Initial dark mode state:', isDark);

      // If user has settings, update the UI to match
      if (user?.settings?.theme) {
        const userPrefersDark = user.settings.theme === 'dark';
        if (isDark !== userPrefersDark) {
          // Update UI to match user settings
          document.documentElement.classList.toggle('dark', userPrefersDark);
          setIsDarkMode(userPrefersDark);
          console.log('Updated dark mode to match user settings:', userPrefersDark);
        }
      }
    }
  }, [user]);

  // Show error notification when error changes
  useEffect(() => {
    if (error) {
      setShowError(true);

      // Auto-hide the error after 10 seconds
      const timer = setTimeout(() => {
        setShowError(false);
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [error]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
      {/* Server error notification */}
      {showError && error && (
        <div className="bg-red-100 dark:bg-red-900 border-b border-red-200 dark:border-red-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaExclamationTriangle className="text-red-500 dark:text-red-400 mr-2" />
              <span className="text-red-800 dark:text-red-200 text-sm font-medium">
                {error}
              </span>
            </div>
            <button
              onClick={() => setShowError(false)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {currentServer && currentServer.status === 'offline' && (
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Server "{currentServer.name}" appears to be offline. Please check your connection settings or try again later.
            </p>
          )}
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-400">{getPageTitle()}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Server Selector */}
            {user && <ServerSelector />}

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">{isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}</span>
              {isDarkMode ? (
                <FaSun className="h-6 w-6" />
              ) : (
                <FaMoon className="h-6 w-6" />
              )}
            </button>

            {/* Notifications */}
            {/* <button
              type="button"
              className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="sr-only">View notifications</span>
              <FaBell className="h-6 w-6" />
            </button> */}

              {/* Profile dropdown */}
              {user && (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    className="flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    id="user-menu-button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                    </div>
                  </button>
                  {isProfileMenuOpen && (
                    <div
                      className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                        role="menuitem"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <FaUser className="mr-2 h-4 w-4" />
                        Your Profile
                      </Link>
                      {user.role === 'admin' && (
                        <Link
                          href="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                          role="menuitem"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <FaCog className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 text-left"
                        role="menuitem"
                      >
                        <FaSignOutAlt className="mr-2 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }
