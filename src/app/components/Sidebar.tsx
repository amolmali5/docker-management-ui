'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  FaDocker,
  FaServer,
  FaImage,
  FaNetworkWired,
  FaCog,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChartLine,
  FaDatabase,
  FaUsers
} from 'react-icons/fa';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 z-40 p-4">
        <button
          onClick={toggleMobileMenu}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
        >
          {isMobileMenuOpen ? (
            <FaTimes className="h-6 w-6" />
          ) : (
            <FaBars className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 transition-transform duration-300 ease-in-out flex-shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/" className="flex items-center" onClick={closeMobileMenu}>
              <FaDocker className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">Docker UI</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/dashboard')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  onClick={closeMobileMenu}
                >
                  <FaChartLine className="mr-3 h-5 w-5" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/containers"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/containers')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  onClick={closeMobileMenu}
                >
                  <FaServer className="mr-3 h-5 w-5" />
                  Containers
                </Link>
              </li>
              <li>
                <Link
                  href="/images"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/images')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  onClick={closeMobileMenu}
                >
                  <FaImage className="mr-3 h-5 w-5" />
                  Images
                </Link>
              </li>
              <li>
                <Link
                  href="/networks"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/networks')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  onClick={closeMobileMenu}
                >
                  <FaNetworkWired className="mr-3 h-5 w-5" />
                  Networks
                </Link>
              </li>
              <li>
                <Link
                  href="/volumes"
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/volumes')
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  onClick={closeMobileMenu}
                >
                  <FaDatabase className="mr-3 h-5 w-5" />
                  Volumes
                </Link>
              </li>
            </ul>

            <div className="mt-8">
              <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Account
              </h3>
              <ul className="mt-2 space-y-2">
                <li>
                  <Link
                    href="/profile"
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/profile')
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    onClick={closeMobileMenu}
                  >
                    <FaUser className="mr-3 h-5 w-5" />
                    Profile
                  </Link>
                </li>
                {user?.role === 'admin' && (
                  <>
                    <li>
                      <Link
                        href="/users"
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/users')
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        onClick={closeMobileMenu}
                      >
                        <FaUsers className="mr-3 h-5 w-5" />
                        Users
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/settings"
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive('/settings')
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                        onClick={closeMobileMenu}
                      >
                        <FaCog className="mr-3 h-5 w-5" />
                        Settings
                      </Link>
                    </li>
                  </>
                )}
                <li>
                  <button
                    onClick={async () => {
                      closeMobileMenu();
                      await logout();
                      // Force redirect to root
                      window.location.href = '/';
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <FaSignOutAlt className="mr-3 h-5 w-5" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </nav>

          {/* User info */}
          {user && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'guest'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
