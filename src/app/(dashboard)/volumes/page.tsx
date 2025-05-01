'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import { FaSearch, FaExclamationTriangle, FaPlus, FaTrash, FaInfoCircle, FaSort, FaSortUp, FaSortDown, FaExpandAlt, FaCompressAlt, FaSyncAlt } from 'react-icons/fa';
import InspectModal from '../../components/InspectModal';
import CreateVolumeForm from '../../components/CreateVolumeForm';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';

interface ContainerInfo {
  Id: string;
  Name: string;
}

interface DockerVolume {
  CreatedAt: string;
  Driver: string;
  Labels: Record<string, string>;
  Mountpoint: string;
  Name: string;
  Options: Record<string, string>;
  Scope: string;
  InUse: boolean; // Added field to track if volume is being used
  UsedByContainers?: ContainerInfo[]; // Added field to track which containers are using this volume
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
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);

  // State for expanded text fields
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [expandedMountpoint, setExpandedMountpoint] = useState<string | null>(null);

  // Ref to store previous volume data for comparison
  const prevVolumesRef = useRef<DockerVolume[]>([]);

  // Sorting
  type SortField = 'name' | 'driver' | 'scope' | 'status' | 'createdAt' | 'mountpoint';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Multi-select for batch operations
  const [selectedVolumes, setSelectedVolumes] = useState<string[]>([]);
  const [batchActionInProgress, setBatchActionInProgress] = useState(false);

  // Check if user has write or admin access
  const hasWriteAccess = user && (user.role === 'write' || user.role === 'admin');

  const fetchVolumes = useCallback(async (isBackground = false) => {
    try {
      // Only show loading indicator for initial load, not for background refreshes
      if (!isBackground) {
        setLoading(true);
      }

      setIsBackgroundRefresh(isBackground);
      const response = await api.get('/api/volumes');
      // Ensure we're working with a valid response
      const data = response.data as VolumesResponse;

      // Make sure Volumes is an array
      const volumesArray = Array.isArray(data?.Volumes) ? data.Volumes : [];

      // Check if the volumes have actually changed
      const volumesChanged = isVolumesChanged(prevVolumesRef.current, volumesArray);

      // Only update state if this is not a background refresh or if the data has actually changed
      if (!isBackground || volumesChanged) {
        setVolumes(volumesArray);
        setFilteredVolumes(volumesArray);
      }

      // Update the reference to the current volumes
      prevVolumesRef.current = volumesArray;
      setError('');
    } catch (err) {
      console.error('Error fetching volumes:', err);
      if (!isBackground) {
        // Only show errors for user-initiated refreshes
        setError('Failed to fetch volumes. Make sure the backend server is running.');
        // Reset to empty arrays on error
        setVolumes([]);
        setFilteredVolumes([]);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
      setIsBackgroundRefresh(false);
    }
  }, []);

  // Get the refresh interval from context
  const { refreshInterval } = useRefresh();

  useEffect(() => {
    // Initial fetch - show loading indicator
    fetchVolumes(false);

    // Set up polling with background refresh using the user's refresh rate setting
    const interval = setInterval(() => {
      fetchVolumes(true); // Pass true to indicate this is a background refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchVolumes, refreshInterval]); // Add refreshInterval as a dependency

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // If clicking the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it as the sort field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply sorting to volumes
  const sortVolumes = (volumes: DockerVolume[]) => {
    return [...volumes].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.Name.localeCompare(b.Name);
          break;
        case 'driver':
          comparison = a.Driver.localeCompare(b.Driver);
          break;
        case 'scope':
          comparison = a.Scope.localeCompare(b.Scope);
          break;
        case 'status':
          // Sort by InUse status (true comes before false in ascending order)
          comparison = Number(b.InUse) - Number(a.InUse);
          break;
        case 'createdAt':
          // Sort by creation date
          const dateA = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
          const dateB = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'mountpoint':
          comparison = a.Mountpoint.localeCompare(b.Mountpoint);
          break;
        default:
          comparison = 0;
      }

      // Reverse the comparison if sorting in descending order
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  useEffect(() => {
    let filtered = volumes;

    // Apply search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(
        volume =>
          volume.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          volume.Driver.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered = sortVolumes(filtered);

    setFilteredVolumes(filtered);
  }, [searchTerm, volumes, sortField, sortDirection]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleDeleteVolume = async (name: string) => {
    // Find the volume in the current list
    const volume = volumes.find(v => v.Name === name);

    // Check if the volume is in use
    if (volume?.InUse) {
      setError(`Cannot delete volume "${name}" because it is currently in use by one or more containers.`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this volume? This action cannot be undone and all data in the volume will be lost.')) {
      return;
    }

    try {
      setActionInProgress(name);
      await api.delete(`/api/volumes/${name}`);
      // Wait a moment for the action to complete before refreshing
      setTimeout(() => fetchVolumes(true), 1000);
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

  // Helper function to check if volumes have changed
  const isVolumesChanged = (prevVolumes: DockerVolume[], newVolumes: DockerVolume[]): boolean => {
    // Quick check: different length means they've changed
    if (prevVolumes.length !== newVolumes.length) {
      return true;
    }

    // Create a map of volume names to their in-use status for quick lookup
    const prevVolumeMap = new Map<string, boolean>();
    prevVolumes.forEach(volume => {
      prevVolumeMap.set(volume.Name, volume.InUse || false);
    });

    // Check if any volume's in-use status has changed
    for (const volume of newVolumes) {
      const prevInUse = prevVolumeMap.get(volume.Name);

      // If volume doesn't exist in previous list or in-use status changed
      if (prevInUse === undefined || prevInUse !== (volume.InUse || false)) {
        // Check if the container usage has changed (if a container was added or removed)
        const prevVolume = prevVolumes.find(v => v.Name === volume.Name);
        const prevContainerCount = prevVolume?.UsedByContainers?.length || 0;
        const newContainerCount = volume.UsedByContainers?.length || 0;

        // Only trigger a UI update if the container count changed or the in-use status changed
        if (prevContainerCount !== newContainerCount || prevInUse !== (volume.InUse || false)) {
          return true;
        }
      }
    }

    // No changes detected
    return false;
  };

  // Handle checkbox selection
  const handleVolumeSelection = (volumeName: string) => {
    setSelectedVolumes(prev => {
      if (prev.includes(volumeName)) {
        return prev.filter(name => name !== volumeName);
      } else {
        return [...prev, volumeName];
      }
    });
  };

  // Handle "Select All" checkbox
  const handleSelectAll = () => {
    // Count how many selectable volumes there are (non-in-use)
    const selectableVolumes = filteredVolumes.filter(volume => !volume.InUse);
    const selectableVolumeNames = selectableVolumes.map(volume => volume.Name);

    // Check if all selectable volumes are already selected
    const allSelectableSelected = selectableVolumeNames.every(name =>
      selectedVolumes.includes(name)
    );

    if (allSelectableSelected) {
      // If all selectable are selected, unselect all
      setSelectedVolumes([]);
    } else {
      // Otherwise, select all non-in-use volumes
      setSelectedVolumes(selectableVolumeNames);
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedVolumes.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedVolumes.length} selected volume(s)? This action cannot be undone and all data in these volumes will be lost.`)) {
      return;
    }

    try {
      setBatchActionInProgress(true);

      // Delete volumes one by one
      for (const volumeName of selectedVolumes) {
        try {
          await api.delete(`/api/volumes/${volumeName}`);
        } catch (err) {
          console.error(`Error deleting volume ${volumeName}:`, err);
          setError(prev => prev + `\nFailed to delete volume ${volumeName}.`);
        }
      }

      // Clear selection
      setSelectedVolumes([]);

      // Refresh the volumes list
      setTimeout(() => fetchVolumes(true), 1000);
    } catch (err) {
      console.error('Error in batch delete:', err);
      setError(`Failed to complete batch delete operation. ${err}`);
    } finally {
      setBatchActionInProgress(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-gray-500">Volumes</h1>
        <div className="flex items-center space-x-4">
          {user?.role === 'admin' || user?.role === 'write' ? (
            <>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaPlus className="mr-2" />
                Create Volume
              </button>

              {selectedVolumes.length > 0 && (
                <button
                  onClick={handleBatchDelete}
                  disabled={batchActionInProgress}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <FaTrash className="mr-2" />
                  Delete Selected ({selectedVolumes.length})
                </button>
              )}
            </>
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
          <button
            onClick={() => fetchVolumes(false)}
            disabled={loading && !isBackgroundRefresh}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            title="Refresh volumes"
          >
            <FaSyncAlt className={`${(loading && !isBackgroundRefresh) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <CreateVolumeForm
            onSuccess={() => {
              setShowCreateForm(false);
              fetchVolumes(true); // Refresh the volumes list in the background
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

      {loading && !isBackgroundRefresh && volumes.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {hasWriteAccess && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '5%' }}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={
                          selectedVolumes.length > 0 &&
                          filteredVolumes.filter(v => !v.InUse).every(v => selectedVolumes.includes(v.Name))
                        }
                        onChange={handleSelectAll}
                        title="Select all volumes"
                      />
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ width: '15%' }}
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      <span>Name</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ width: '10%' }}
                    onClick={() => handleSort('driver')}
                  >
                    <div className="flex items-center">
                      <span>Driver</span>
                      {sortField === 'driver' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ width: '10%' }}
                    onClick={() => handleSort('scope')}
                  >
                    <div className="flex items-center">
                      <span>Scope</span>
                      {sortField === 'scope' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ width: '10%' }}
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    style={{ width: '15%' }}
                  >
                    <span>Container Name</span>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ width: '15%' }}
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      <span>Created At</span>
                      {sortField === 'createdAt' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    style={{ width: '25%' }}
                    onClick={() => handleSort('mountpoint')}
                  >
                    <div className="flex items-center">
                      <span>Mountpoint</span>
                      {sortField === 'mountpoint' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '5%' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredVolumes.map((volume) => (
                  <tr key={volume.Name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {hasWriteAccess && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          checked={selectedVolumes.includes(volume.Name)}
                          onChange={() => handleVolumeSelection(volume.Name)}
                          disabled={volume.InUse}
                          title={volume.InUse ? "Cannot delete volume in use" : "Select volume for deletion"}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-300">
                      <div
                        className={`cursor-pointer max-w-[200px] ${expandedName === volume.Name ? 'break-all' : 'truncate'} flex items-center`}
                        onClick={() => setExpandedName(expandedName === volume.Name ? null : volume.Name)}
                        title={expandedName === volume.Name ? "Click to collapse" : "Click to expand"}
                      >
                        <span className="mr-1">{volume.Name}</span>
                        {expandedName === volume.Name ?
                          <FaCompressAlt className="text-gray-500 text-xs flex-shrink-0" /> :
                          <FaExpandAlt className="text-gray-500 text-xs flex-shrink-0" />
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                      {volume.Driver}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                      {volume.Scope}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {volume.InUse ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          In Use
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Not Used
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {volume.UsedByContainers && volume.UsedByContainers.length > 0 ? (
                        <div className="max-h-20 overflow-y-auto">
                          {volume.UsedByContainers.map((container, index) => (
                            <div key={container.Id} className="mb-1 flex items-center">
                              <Link
                                href={`/containers/${container.Id}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px] inline-block"
                                title={`${container.Name} (ID: ${container.Id})`}
                              >
                                {container.Name}
                              </Link>
                              <FaExpandAlt className="text-gray-500 text-xs ml-1 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(volume.CreatedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 overflow-hidden">
                      <div
                        className={`cursor-pointer max-w-[300px] ${expandedMountpoint === volume.Name ? 'break-all' : 'truncate'} flex items-center`}
                        onClick={() => setExpandedMountpoint(expandedMountpoint === volume.Name ? null : volume.Name)}
                        title={expandedMountpoint === volume.Name ? "Click to collapse" : "Click to expand"}
                      >
                        <span className="mr-1">{volume.Mountpoint}</span>
                        {expandedMountpoint === volume.Name ?
                          <FaCompressAlt className="text-gray-500 text-xs flex-shrink-0" /> :
                          <FaExpandAlt className="text-gray-500 text-xs flex-shrink-0" />
                        }
                      </div>
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
                            disabled={actionInProgress === volume.Name || volume.InUse}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            title={volume.InUse ? "Cannot delete volume in use" : "Delete Volume"}
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
                    <td colSpan={hasWriteAccess ? 9 : 8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
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
