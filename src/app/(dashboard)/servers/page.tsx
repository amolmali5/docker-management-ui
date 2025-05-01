'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaServer, FaExclamationTriangle } from 'react-icons/fa';
import api from '@/app/utils/api';
import AddServerModal from '@/app/components/AddServerModal';
import EditServerModal from '@/app/components/EditServerModal';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  status: 'online' | 'offline' | 'unknown';
}

export default function ServersPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editServer, setEditServer] = useState<Server | null>(null);

  const fetchServers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/servers');
      setServers(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching servers:', err);
      setError('Failed to fetch servers. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this server?')) {
      try {
        await api.delete(`/api/servers/${id}`);
        fetchServers();
      } catch (err) {
        console.error('Error deleting server:', err);
        setError('Failed to delete server.');
      }
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      const response = await api.post(`/api/servers/${id}/test`);
      const updatedServers = servers.map(server =>
        server.id === id ? { ...server, status: response.data.success ? 'online' : 'offline' } : server
      );
      setServers(updatedServers);
    } catch (err) {
      console.error('Error testing connection:', err);
      setError('Failed to test server connection.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-gray-500">Docker Servers</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FaPlus className="mr-2" /> Add Server
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 dark:text-gray-400 text-center">
            <p>Loading servers...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          {servers.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center text-gray-500 dark:text-gray-400">
              <FaServer className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-lg font-medium">No servers added yet</p>
              <p className="mt-1">Add your first Docker server to get started</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaPlus className="mr-2" /> Add Server
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {servers.map((server) => (
                <li key={server.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <FaServer className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{server.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {server.protocol}://{server.host}:{server.port}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${server.status === 'online'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : server.status === 'offline'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                        {server.status === 'online' ? 'Online' : server.status === 'offline' ? 'Offline' : 'Unknown'}
                      </span>
                      <button
                        onClick={() => handleTestConnection(server.id)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Test Connection"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => setEditServer(server)}
                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Edit Server"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(server.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Server"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onServerAdded={fetchServers}
        />
      )}

      {editServer && (
        <EditServerModal
          server={editServer}
          onClose={() => setEditServer(null)}
          onServerUpdated={fetchServers}
        />
      )}
    </div>
  );
}
