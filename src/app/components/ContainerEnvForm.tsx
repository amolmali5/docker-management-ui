'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaExclamationTriangle } from 'react-icons/fa';
import api from '@/app/utils/api';
import { useRouter } from 'next/navigation';

interface ContainerEnvFormProps {
  containerId: string;
  containerName: string;
  currentEnv: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface EnvVar {
  key: string;
  value: string;
  id: string;
}

export default function ContainerEnvForm({
  containerId,
  containerName,
  currentEnv,
  onSuccess,
  onCancel
}: ContainerEnvFormProps) {
  const router = useRouter();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Parse current environment variables
    const parsedEnv = currentEnv.map((env, index) => {
      const [key, ...valueParts] = env.split('=');
      const value = valueParts.join('='); // Handle values that might contain = characters
      return { key, value, id: `env-${index}` };
    });
    setEnvVars(parsedEnv);
  }, [currentEnv]);

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '', id: `env-${Date.now()}` }]);
  };

  const handleRemoveEnvVar = (id: string) => {
    setEnvVars(envVars.filter(env => env.id !== id));
  };

  const handleEnvVarChange = (id: string, field: 'key' | 'value', value: string) => {
    setEnvVars(
      envVars.map(env => (env.id === id ? { ...env, [field]: value } : env))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate environment variables
    const invalidEnvVars = envVars.filter(env => env.key.trim() === '');
    if (invalidEnvVars.length > 0) {
      setError('All environment variable keys must be filled.');
      return;
    }

    // Format environment variables for API
    const formattedEnvVars = envVars.map(env => `${env.key}=${env.value}`);

    setIsLoading(true);

    try {
      await api.post(`/api/containers/${containerId}/update-env`, { env: formattedEnvVars });

      // Check if container ID changed after update
      const response = await api.get('/api/containers');
      const containers = response.data;

      // Find container with the same name
      const updatedContainer = containers.find((c: any) =>
        c.Names && c.Names[0] && c.Names[0].replace(/^\//, '') === containerName
      );

      if (updatedContainer) {
        if (updatedContainer.Id !== containerId) {
          // Container ID changed, redirect to the new container page
          router.push(`/containers/${updatedContainer.Id}`);
        } else {
          // Container ID stayed the same, just refresh the current page
          onSuccess();
        }
      } else {
        // Container not found, go back to containers list
        router.push('/containers');
      }
    } catch (err: any) {
      console.error('Error updating environment variables:', err);
      // Display more detailed error message if available
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to update environment variables. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Environment Variables</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <FaTimes className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Note: Updating environment variables will restart the container.
          </p>
        </div>

        <div className="space-y-3 mb-6 max-h-96 overflow-y-auto p-2">
          {envVars.map((env) => (
            <div key={env.id} className="flex space-x-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={env.key}
                  onChange={(e) => handleEnvVarChange(env.id, 'key', e.target.value)}
                  placeholder="KEY"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={env.value}
                  onChange={(e) => handleEnvVarChange(env.id, 'value', e.target.value)}
                  placeholder="VALUE"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveEnvVar(env.id)}
                className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={handleAddEnvVar}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FaPlus className="mr-2 h-4 w-4" />
            Add Environment Variable
          </button>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update Environment Variables'}
          </button>
        </div>
      </form>
    </div>
  );
}
