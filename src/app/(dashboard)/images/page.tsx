'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { FaSearch, FaExclamationTriangle, FaTrash, FaInfoCircle } from 'react-icons/fa';
import InspectModal from '../../components/InspectModal';
import { useAuth } from '../../context/AuthContext';

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

  useEffect(() => {
    fetchImages();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchImages, 30000);
    return () => clearInterval(interval);
  }, [fetchImages]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredImages(images);
    } else {
      const filtered = images.filter(
        image =>
          (image.RepoTags && image.RepoTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
          image.Id.substring(7, 19).includes(searchTerm.toLowerCase())
      );
      setFilteredImages(filtered);
    }
  }, [searchTerm, images]);

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

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Images</h1>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Repository</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tag</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
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
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
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
