'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { FaSearch, FaExclamationTriangle, FaPlus, FaTrash, FaInfoCircle, FaSort, FaSortUp, FaSortDown, FaSyncAlt } from 'react-icons/fa';
import InspectModal from '../../components/InspectModal';
import CreateNetworkForm from '../../components/CreateNetworkForm';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';

interface DockerNetwork {
  Id: string;
  Name: string;
  Driver: string;
  Scope: string;
  Internal: boolean;
  EnableIPv6: boolean;
  IPAM: {
    Driver: string;
    Config: Array<{
      Subnet?: string;
      Gateway?: string;
    }>;
  };
  Containers: Record<string, {
    Name: string;
    EndpointID: string;
    MacAddress: string;
    IPv4Address: string;
    IPv6Address: string;
  }>;
  Options: Record<string, string>;
  Labels: Record<string, string>;
}

export default function NetworksPage() {
  const { user } = useAuth();
  const [networks, setNetworks] = useState<DockerNetwork[]>([]);
  const [filteredNetworks, setFilteredNetworks] = useState<DockerNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Sorting
  type SortField = 'name' | 'id' | 'driver' | 'scope' | 'subnet' | 'containers';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Multi-select for batch operations
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [batchActionInProgress, setBatchActionInProgress] = useState(false);

  // Check if user has write or admin access
  const hasWriteAccess = user && (user.role === 'write' || user.role === 'admin');

  const fetchNetworks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/networks');
      // Ensure we're working with an array
      const networksData = Array.isArray(response.data) ? response.data : [];
      console.log('Networks data:', networksData);
      setNetworks(networksData);
      setFilteredNetworks(networksData);
      setError('');
    } catch (err) {
      console.error('Error fetching networks:', err);
      setError('Failed to fetch networks. Make sure the backend server is running.');
      // Reset to empty arrays on error
      setNetworks([]);
      setFilteredNetworks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get the refresh interval from context
  const { refreshInterval } = useRefresh();

  useEffect(() => {
    fetchNetworks();
    // Set up polling using the user's refresh rate setting
    const interval = setInterval(fetchNetworks, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchNetworks, refreshInterval]); // Add refreshInterval as a dependency

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

  // Apply sorting to networks
  const sortNetworks = (networks: DockerNetwork[]) => {
    return [...networks].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.Name.localeCompare(b.Name);
          break;
        case 'id':
          comparison = a.Id.localeCompare(b.Id);
          break;
        case 'driver':
          comparison = a.Driver.localeCompare(b.Driver);
          break;
        case 'scope':
          comparison = a.Scope.localeCompare(b.Scope);
          break;
        case 'subnet':
          // Sort by subnet (if available)
          const subnetA = a.IPAM && a.IPAM.Config && a.IPAM.Config.length > 0 && a.IPAM.Config[0].Subnet
            ? a.IPAM.Config[0].Subnet
            : '';
          const subnetB = b.IPAM && b.IPAM.Config && b.IPAM.Config.length > 0 && b.IPAM.Config[0].Subnet
            ? b.IPAM.Config[0].Subnet
            : '';
          comparison = subnetA.localeCompare(subnetB);
          break;
        case 'containers':
          // Sort by number of containers
          const containersA = a.Containers ? Object.keys(a.Containers).length : 0;
          const containersB = b.Containers ? Object.keys(b.Containers).length : 0;
          comparison = containersA - containersB;
          break;
        default:
          comparison = 0;
      }

      // Reverse the comparison if sorting in descending order
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  useEffect(() => {
    let filtered = networks;

    // Apply search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(
        network =>
          network.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          network.Driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
          network.Id.substring(0, 12).includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered = sortNetworks(filtered);

    setFilteredNetworks(filtered);
  }, [searchTerm, networks, sortField, sortDirection]);

  const getContainerCount = (network: DockerNetwork) => {
    return network.Containers ? Object.keys(network.Containers).length : 0;
  };

  const handleDeleteNetwork = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this network? This action cannot be undone.')) {
      return;
    }

    try {
      setActionInProgress(id);
      await api.delete(`/api/networks/${id}`);
      // Wait a moment for the action to complete before refreshing
      setTimeout(fetchNetworks, 1000);
    } catch (err) {
      console.error(`Error deleting network:`, err);
      setError(`Failed to delete network. ${err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleInspectNetwork = async (id: string) => {
    try {
      setInspectLoading(true);
      const response = await api.get(`/api/networks/${id}`);
      setInspectData(response.data);
    } catch (err) {
      console.error(`Error inspecting network:`, err);
      setError(`Failed to inspect network. ${err}`);
    } finally {
      setInspectLoading(false);
    }
  };

  const closeInspectModal = () => {
    setInspectData(null);
  };

  // Handle checkbox selection
  const handleNetworkSelection = (networkId: string) => {
    // Check if the network has containers attached
    const network = networks.find(n => n.Id === networkId);
    if (network && getContainerCount(network) > 0) {
      // Don't allow selection of networks with containers
      return;
    }

    setSelectedNetworks(prev => {
      if (prev.includes(networkId)) {
        return prev.filter(id => id !== networkId);
      } else {
        return [...prev, networkId];
      }
    });
  };

  // Handle "Select All" checkbox
  const handleSelectAll = () => {
    // Get all networks that don't have containers attached
    const selectableNetworks = networks.filter(network => getContainerCount(network) === 0);
    const selectableNetworkIds = selectableNetworks.map(network => network.Id);

    // Check if all selectable networks are already selected
    const allSelectableSelected = selectableNetworkIds.every(id =>
      selectedNetworks.includes(id)
    );

    if (allSelectableSelected) {
      // If all selectable are selected, unselect all
      setSelectedNetworks([]);
    } else {
      // Otherwise, select all networks without containers
      setSelectedNetworks(selectableNetworkIds);
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedNetworks.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedNetworks.length} selected network(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBatchActionInProgress(true);

      // Delete networks one by one
      for (const networkId of selectedNetworks) {
        try {
          await api.delete(`/api/networks/${networkId}`);
        } catch (err) {
          console.error(`Error deleting network ${networkId}:`, err);
          setError(prev => prev + `\nFailed to delete network ${networkId}.`);
        }
      }

      // Clear selection
      setSelectedNetworks([]);

      // Refresh the networks list
      setTimeout(fetchNetworks, 1000);
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
        <h1 className="text-2xl font-bold dark:text-gray-500">Networks</h1>
        <div className="flex items-center space-x-4">
          {user?.role === 'admin' || user?.role === 'write' ? (
            <>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaPlus className="mr-2" />
                Create Network
              </button>

              {selectedNetworks.length > 0 && (
                <button
                  onClick={handleBatchDelete}
                  disabled={batchActionInProgress}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <FaTrash className="mr-2" />
                  Delete Selected ({selectedNetworks.length})
                </button>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              You need write or admin access to create networks.
            </div>
          )}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search networks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={fetchNetworks}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            title="Refresh networks"
          >
            <FaSyncAlt className={`${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <CreateNetworkForm
            onSuccess={() => {
              setShowCreateForm(false);
              fetchNetworks(); // Refresh the networks list
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

      {loading && networks.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {hasWriteAccess && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" style={{ width: '5%' }}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={
                          selectedNetworks.length > 0 &&
                          networks.filter(n => getContainerCount(n) === 0).every(n => selectedNetworks.includes(n.Id))
                        }
                        onChange={handleSelectAll}
                        title="Select all networks without containers"
                      />
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
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
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center">
                      <span>ID</span>
                      {sortField === 'id' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
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
                    onClick={() => handleSort('subnet')}
                  >
                    <div className="flex items-center">
                      <span>Subnet</span>
                      {sortField === 'subnet' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('containers')}
                  >
                    <div className="flex items-center">
                      <span>Containers</span>
                      {sortField === 'containers' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNetworks.map((network) => (
                  <tr key={network.Id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {hasWriteAccess && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          checked={selectedNetworks.includes(network.Id)}
                          onChange={() => handleNetworkSelection(network.Id)}
                          disabled={getContainerCount(network) > 0}
                          title={getContainerCount(network) > 0 ? "Cannot delete network with connected containers" : "Select network for deletion"}
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">
                      {network.Name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-300">
                      {network.Id.substring(0, 12)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {network.Driver}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {network.Scope}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {network.IPAM && network.IPAM.Config && network.IPAM.Config.length > 0
                        ? network.IPAM.Config.map((config, index) => (
                          <div key={index}>{config.Subnet || 'N/A'}</div>
                        ))
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {getContainerCount(network)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleInspectNetwork(network.Id)}
                          disabled={inspectLoading}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                          title="Inspect Network"
                        >
                          <FaInfoCircle />
                        </button>
                        {hasWriteAccess && (
                          <button
                            onClick={() => handleDeleteNetwork(network.Id)}
                            disabled={actionInProgress === network.Id || getContainerCount(network) > 0}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            title={getContainerCount(network) > 0 ? 'Cannot delete network with connected containers' : 'Delete Network'}
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredNetworks.length === 0 && (
                  <tr>
                    <td colSpan={hasWriteAccess ? 8 : 7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No networks match your search' : 'No networks found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateForm && (
        <CreateNetworkForm
          onClose={() => setShowCreateForm(false)}
          onNetworkCreated={fetchNetworks}
        />
      )}

      {inspectData && (
        <InspectModal
          title="Network Inspect"
          data={inspectData}
          onClose={closeInspectModal}
        />
      )}
    </div>
  );
}
