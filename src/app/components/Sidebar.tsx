'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useServer } from '../context/ServerContext';
import NavLink from './NavLink';
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
  const { servers, currentServer, error } = useServer();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasOnlyOfflineServer, setHasOnlyOfflineServer] = useState(false);

  // Check if user has access to only one server and it's offline
  useEffect(() => {
    // If there's only one server and it's offline
    if (servers.length === 1 && servers[0].status === 'offline') {
      setHasOnlyOfflineServer(true);
    } else {
      setHasOnlyOfflineServer(false);
    }
  }, [servers]);

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
            <div className="flex items-center">
              <FaDocker className="h-8 w-8 text-blue-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700">Docker UI</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-2">
              <li>
                {hasOnlyOfflineServer ? (
                  <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <FaChartLine className="mr-3 h-5 w-5" />
                    Dashboard
                  </div>
                ) : (
                  <NavLink
                    href="/dashboard"
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                    activeClassName="bg-blue-100 text-blue-700 dark:bg-gray-500 dark:text-white border-l-4 border-blue-500 dark:border-blue-400"
                    onClick={closeMobileMenu}
                  >
                    <FaChartLine className="mr-3 h-5 w-5" />
                    Dashboard
                  </NavLink>
                )}
              </li>
              <li>
                {hasOnlyOfflineServer ? (
                  <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <FaServer className="mr-3 h-5 w-5" />
                    Containers
                  </div>
                ) : (
                  <NavLink
                    href="/containers"
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                    activeClassName="bg-blue-100 text-blue-700 dark:bg-gray-600 dark:text-white border-l-4 border-blue-500 dark:border-blue-400"
                    onClick={closeMobileMenu}
                  >
                    <FaServer className="mr-3 h-5 w-5" />
                    Containers
                  </NavLink>
                )}
              </li>
              <li>
                {hasOnlyOfflineServer ? (
                  <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <FaImage className="mr-3 h-5 w-5" />
                    Images
                  </div>
                ) : (
                  <NavLink
                    href="/images"
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                    activeClassName="bg-blue-100 text-blue-700 dark:bg-gray-600 dark:text-white border-l-4 border-blue-500 dark:border-blue-400"
                    onClick={closeMobileMenu}
                  >
                    <FaImage className="mr-3 h-5 w-5" />
                    Images
                  </NavLink>
                )}
              </li>
              <li>
                {hasOnlyOfflineServer ? (
                  <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <FaNetworkWired className="mr-3 h-5 w-5" />
                    Networks
                  </div>
                ) : (
                  <NavLink
                    href="/networks"
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                    activeClassName="bg-blue-100 text-blue-700 dark:bg-gray-600 dark:text-white border-l-4 border-blue-500 dark:border-blue-400"
                    onClick={closeMobileMenu}
                  >
                    <FaNetworkWired className="mr-3 h-5 w-5" />
                    Networks
                  </NavLink>
                )}
              </li>
              <li>
                {hasOnlyOfflineServer ? (
                  <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <FaDatabase className="mr-3 h-5 w-5" />
                    Volumes
                  </div>
                ) : (
                  <NavLink
                    href="/volumes"
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                    activeClassName="bg-blue-100 text-blue-700 dark:bg-gray-600 dark:text-white border-l-4 border-blue-500 dark:border-blue-400"
                    onClick={closeMobileMenu}
                  >
                    <FaDatabase className="mr-3 h-5 w-5" />
                    Volumes
                  </NavLink>
                )}
              </li>
              <li>
                {hasOnlyOfflineServer ? (
                  <div className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-400 dark:text-gray-500 cursor-not-allowed">
                    <FaServer className="mr-3 h-5 w-5" />
                    Remote Servers
                  </div>
                ) : (
                  <NavLink
                    href="/servers"
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                    activeClassName="bg-blue-100 text-blue-700 dark:bg-gray-600 dark:text-white border-l-4 border-blue-500 dark:border-blue-400"
                    onClick={closeMobileMenu}
                  >
                    <FaServer className="mr-3 h-5 w-5" />
                    Remote Servers
                  </NavLink>
                )}
              </li>
            </ul>

            <div className="mt-8">
              <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Account
              </h3>
              <ul className="mt-2 space-y-2">
                <li>
                  <NavLink
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                    activeClassName="bg-blue-100 text-blue-700 dark:bg-gray-600 dark:text-white border-l-4 border-blue-500 dark:border-blue-400"
                    onClick={closeMobileMenu}
                  >
                    <FaUser className="mr-3 h-5 w-5" />
                    Profile
                  </NavLink>
                </li>
                {user?.role === 'admin' && (
                  <>
                    <li>
                      <NavLink
                        href="/users"
                        className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                        activeClassName="bg-blue-100 text-blue-700 dark:bg-gray-600 dark:text-white border-l-4 border-blue-500 dark:border-blue-400"
                        onClick={closeMobileMenu}
                      >
                        <FaUsers className="mr-3 h-5 w-5" />
                        Users
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        href="/settings"
                        className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                        activeClassName="bg-blue-100 text-blue-700 dark:bg-gray-600 dark:text-white border-l-4 border-blue-500 dark:border-blue-400"
                        onClick={closeMobileMenu}
                      >
                        <FaCog className="mr-3 h-5 w-5" />
                        Settings
                      </NavLink>
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
                    className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
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
