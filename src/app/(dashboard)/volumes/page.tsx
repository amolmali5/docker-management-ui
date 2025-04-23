'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { FaSearch, FaExclamationTriangle, FaPlus, FaTrash, FaInfoCircle } from 'react-icons/fa';
import InspectModal from '../../components/InspectModal';
import CreateVolumeForm from '../../components/CreateVolumeForm';
import { useAuth } from '../../context/AuthContext';

interface DockerVolume {
  CreatedAt: string;
  Driver: string;
  Labels: Record<string, string>;
  Mountpoint: string;
  Name: string;
  Options: Record<string, string>;
  Scope: string;
}

interface VolumesResponse {
  Volumes: DockerVolume[];
  Warnings: string[];
}

export default function VolumesPage() {
  const { user } = useAuth();
  const [volumes, setVolumes] = useState<DockerVolume[]>([]);
  const [filteredVolumes, setFilteredVolumes] = useState<DockerVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Check if user has write or admin access
  const hasWriteAccess = user && (user.role === 'write' || user.role === 'admin');

  const fetchVolumes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/volumes');
      // Ensure we're working with a valid response
      const data = response.data as VolumesResponse;
      console.log('Volumes data:', data);

      // Make sure Volumes is an array
      const volumesArray = Array.isArray(data?.Volumes) ? data.Volumes : [];
      setVolumes(volumesArray);
      setFilteredVolumes(volumesArray);
      setError('');
    } catch (err) {
      console.error('Error fetching volumes:', err);
      setError('Failed to fetch volumes. Make sure the backend server is running.');
      // Reset to empty arrays on error
      setVolumes([]);
      setFilteredVolumes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVolumes();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchVolumes, 30000);
    return () => clearInterval(interval);
  }, [fetchVolumes]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredVolumes(volumes);
    } else {
      const filtered = volumes.filter(
        volume =>
          volume.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          volume.Driver.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVolumes(filtered);
    }
  }, [searchTerm, volumes]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleDeleteVolume = async (name: string) => {
    if (!window.confirm('Are you sure you want to delete this volume? This action cannot be undone and all data in the volume will be lost.')) {
      return;
    }

    try {
      setActionInProgress(name);
      await api.delete(`/api/volumes/${name}`);
      // Wait a moment for the action to complete before refreshing
      setTimeout(fetchVolumes, 1000);
    } catch (err) {
      console.error(`Error deleting volume:`, err);
      setError(`Failed to delete volume. ${err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleInspectVolume = async (name: string) => {
    try {
      setInspectLoading(true);
      const response = await api.get(`/api/volumes/${name}`);
      setInspectData(response.data);
    } catch (err) {
      console.error(`Error inspecting volume:`, err);
      setError(`Failed to inspect volume. ${err}`);
    } finally {
      setInspectLoading(false);
    }
  };

  const closeInspectModal = () => {
    setInspectData(null);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Volumes</h1>
        <div className="flex items-center space-x-4">
          {user?.role === 'admin' || user?.role === 'write' ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaPlus className="mr-2" />
              Create Volume
            </button>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              You need write or admin access to create volumes.
            </div>
          )}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search volumes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <CreateVolumeForm
            onSuccess={() => {
              setShowCreateForm(false);
              fetchVolumes(); // Refresh the volumes list
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading && volumes.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '25%' }}>Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '10%' }}>Driver</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '10%' }}>Scope</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '20%' }}>Created At</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '30%' }}>Mountpoint</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '5%' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredVolumes.map((volume) => (
                  <tr key={volume.Name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-300">
                      {volume.Name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                      {volume.Driver}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                      {volume.Scope}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(volume.CreatedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 overflow-hidden">
                      <div className="truncate">{volume.Mountpoint}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleInspectVolume(volume.Name)}
                          disabled={inspectLoading}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                          title="Inspect Volume"
                        >
                          <FaInfoCircle />
                        </button>
                        {hasWriteAccess && (
                          <button
                            onClick={() => handleDeleteVolume(volume.Name)}
                            disabled={actionInProgress === volume.Name}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            title="Delete Volume"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredVolumes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No volumes match your search' : 'No volumes found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {inspectData && (
        <InspectModal
          title="Volume Inspect"
          data={inspectData}
          onClose={closeInspectModal}
        />
      )}
    </div>
  );
}
