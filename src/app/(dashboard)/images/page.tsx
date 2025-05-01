'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { FaSearch, FaExclamationTriangle, FaTrash, FaInfoCircle, FaSort, FaSortUp, FaSortDown, FaSyncAlt } from 'react-icons/fa';
import InspectModal from '../../components/InspectModal';
import { useAuth } from '../../context/AuthContext';
import { useRefresh } from '../../context/RefreshContext';

interface DockerImage {
  Id: string;
  ParentId: string;
  RepoTags: string[];
  RepoDigests: string[];
  Created: number;
  Size: number;
  SharedSize: number;
  VirtualSize: number;
  Labels: Record<string, string>;
  Containers: number;
}

export default function ImagesPage() {
  const { user } = useAuth();
  const [images, setImages] = useState<DockerImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<DockerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Sorting
  type SortField = 'repository' | 'tag' | 'id' | 'created' | 'size';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('repository');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Multi-select for batch operations
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [batchActionInProgress, setBatchActionInProgress] = useState(false);

  // Check if user has write or admin access
  const hasWriteAccess = user && (user.role === 'write' || user.role === 'admin');

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/images');
      setImages(response.data);
      setFilteredImages(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to fetch images. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get the refresh interval from context
  const { refreshInterval } = useRefresh();

  useEffect(() => {
    fetchImages();
    // Set up polling using the user's refresh rate setting
    const interval = setInterval(fetchImages, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchImages, refreshInterval]); // Add refreshInterval as a dependency

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

  // Apply sorting to images
  const sortImages = (images: DockerImage[]) => {
    return [...images].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'repository':
          // Sort by repository name (first repo tag)
          const repoA = a.RepoTags && a.RepoTags.length > 0 ? a.RepoTags[0].split(':')[0] : '';
          const repoB = b.RepoTags && b.RepoTags.length > 0 ? b.RepoTags[0].split(':')[0] : '';
          comparison = repoA.localeCompare(repoB);
          break;
        case 'tag':
          // Sort by tag name (first repo tag)
          const tagA = a.RepoTags && a.RepoTags.length > 0 ? a.RepoTags[0].split(':')[1] || '' : '';
          const tagB = b.RepoTags && b.RepoTags.length > 0 ? b.RepoTags[0].split(':')[1] || '' : '';
          comparison = tagA.localeCompare(tagB);
          break;
        case 'id':
          comparison = a.Id.localeCompare(b.Id);
          break;
        case 'created':
          // Sort by creation date (timestamp)
          comparison = a.Created - b.Created;
          break;
        case 'size':
          // Sort by size
          comparison = a.Size - b.Size;
          break;
        default:
          comparison = 0;
      }

      // Reverse the comparison if sorting in descending order
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  useEffect(() => {
    let filtered = images;

    // Apply search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(
        image =>
          (image.RepoTags && image.RepoTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
          image.Id.substring(7, 19).includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered = sortImages(filtered);

    setFilteredImages(filtered);
  }, [searchTerm, images, sortField, sortDirection]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const handleDeleteImage = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      setActionInProgress(id);
      await api.delete(`/api/images/${id}?force=true`);
      // Wait a moment for the action to complete before refreshing
      setTimeout(fetchImages, 1000);
    } catch (err) {
      console.error(`Error deleting image:`, err);
      setError(`Failed to delete image. ${err}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleInspectImage = async (id: string) => {
    try {
      setInspectLoading(true);
      const response = await api.get(`/api/images/${id}`);
      setInspectData(response.data);
    } catch (err) {
      console.error(`Error inspecting image:`, err);
      setError(`Failed to inspect image. ${err}`);
    } finally {
      setInspectLoading(false);
    }
  };

  const closeInspectModal = () => {
    setInspectData(null);
  };

  // Handle checkbox selection
  const handleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
  };

  // Handle "Select All" checkbox
  const handleSelectAll = () => {
    if (selectedImages.length === filteredImages.length) {
      // If all are selected, unselect all
      setSelectedImages([]);
    } else {
      // Otherwise, select all images
      const imageIds = filteredImages.map(image => image.Id);
      setSelectedImages(imageIds);
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedImages.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedImages.length} selected image(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setBatchActionInProgress(true);

      // Delete images one by one
      for (const imageId of selectedImages) {
        try {
          await api.delete(`/api/images/${imageId}?force=true`);
        } catch (err) {
          console.error(`Error deleting image ${imageId}:`, err);
          setError(prev => prev + `\nFailed to delete image ${imageId}.`);
        }
      }

      // Clear selection
      setSelectedImages([]);

      // Refresh the images list
      setTimeout(fetchImages, 1000);
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
        <h1 className="text-2xl font-bold dark:text-gray-500">Images</h1>
        <div className="flex items-center space-x-4">
          {hasWriteAccess && selectedImages.length > 0 && (
            <button
              onClick={handleBatchDelete}
              disabled={batchActionInProgress}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <FaTrash className="mr-2" />
              Delete Selected ({selectedImages.length})
            </button>
          )}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={fetchImages}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            title="Refresh images"
          >
            <FaSyncAlt className={`${loading ? 'animate-spin' : ''}`} />
          </button>
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

      {loading && images.length === 0 ? (
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
                        checked={selectedImages.length > 0 && selectedImages.length === filteredImages.length}
                        onChange={handleSelectAll}
                        title="Select all images"
                      />
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('repository')}
                  >
                    <div className="flex items-center">
                      <span>Repository</span>
                      {sortField === 'repository' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('tag')}
                  >
                    <div className="flex items-center">
                      <span>Tag</span>
                      {sortField === 'tag' ? (
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
                      <span>Image ID</span>
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
                    onClick={() => handleSort('created')}
                  >
                    <div className="flex items-center">
                      <span>Created</span>
                      {sortField === 'created' ? (
                        sortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                      ) : (
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('size')}
                  >
                    <div className="flex items-center">
                      <span>Size</span>
                      {sortField === 'size' ? (
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
                {filteredImages.map((image) => {
                  // Handle images with no repo tags (dangling images)
                  const repoTags = image.RepoTags && image.RepoTags.length > 0 && image.RepoTags[0] !== '<none>:<none>'
                    ? image.RepoTags
                    : ['<none>:<none>'];

                  return repoTags.map((tag, tagIndex) => {
                    const [repo, tagName] = tag.split(':');
                    return (
                      <tr key={`${image.Id}-${tagIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        {hasWriteAccess && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={selectedImages.includes(image.Id)}
                              onChange={() => handleImageSelection(image.Id)}
                              title="Select image for deletion"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {repo !== '<none>' ? repo : <span className="text-gray-500 dark:text-gray-400">None</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {tagName !== '<none>' ? tagName : <span className="text-gray-500 dark:text-gray-400">None</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-300">
                          {image.Id.substring(7, 19)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(image.Created)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatBytes(image.Size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleInspectImage(image.Id)}
                              disabled={inspectLoading}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                              title="Inspect Image"
                            >
                              <FaInfoCircle />
                            </button>
                            {hasWriteAccess && (
                              <button
                                onClick={() => handleDeleteImage(image.Id)}
                                disabled={actionInProgress === image.Id}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                title="Delete Image"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                }).flat()}
                {filteredImages.length === 0 && (
                  <tr>
                    <td colSpan={hasWriteAccess ? 7 : 6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No images match your search' : 'No images found'}
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
          title="Image Inspect"
          data={inspectData}
          onClose={closeInspectModal}
        />
      )}
    </div>
  );
}
