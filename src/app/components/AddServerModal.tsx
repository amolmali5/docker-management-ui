'use client';

import { useState } from 'react';
import { FaTimes, FaServer, FaLock, FaUnlock } from 'react-icons/fa';
import api from '@/app/utils/api';

interface AddServerModalProps {
  onClose: () => void;
  onServerAdded: () => void;
}

export default function AddServerModal({ onClose, onServerAdded }: AddServerModalProps) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('2375');
  const [protocol, setProtocol] = useState('http');
  const [useTLS, setUseTLS] = useState(false);
  const [ca, setCa] = useState('');
  const [cert, setCert] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testStatus, setTestStatus] = useState<'none' | 'success' | 'failure'>('none');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      const serverData = {
        name,
        host,
        port: parseInt(port),
        protocol,
        ...(useTLS && { ca, cert, key })
      };
      
      await api.post('/api/servers', serverData);
      onServerAdded();
      onClose();
    } catch (err: any) {
      console.error('Error adding server:', err);
      setError(err.response?.data?.error || 'Failed to add server.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      setError('');
      setTestStatus('none');
      
      const serverData = {
        host,
        port: parseInt(port),
        protocol,
        ...(useTLS && { ca, cert, key })
      };
      
      const response = await api.post('/api/servers/test', serverData);
      setTestStatus(response.data.success ? 'success' : 'failure');
      if (!response.data.success) {
        setError(response.data.error || 'Connection test failed.');
      }
    } catch (err: any) {
      console.error('Error testing connection:', err);
      setTestStatus('failure');
      setError(err.response?.data?.error || 'Failed to test connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 md:mx-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Docker Server</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
              <p>{error}</p>
            </div>
          )}
          
          {testStatus === 'success' && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
              <p>Connection successful!</p>
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Server Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Production Server"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="host" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Host
            </label>
            <input
              type="text"
              id="host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="192.168.1.100 or example.com"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="protocol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Protocol
              </label>
              <select
                id="protocol"
                value={protocol}
                onChange={(e) => {
                  setProtocol(e.target.value);
                  if (e.target.value === 'https') {
                    setUseTLS(true);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="port" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port
              </label>
              <input
                type="number"
                id="port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="2375"
                required
              />
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useTLS"
                checked={useTLS}
                onChange={(e) => setUseTLS(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={protocol === 'https'}
              />
              <label htmlFor="useTLS" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Use TLS Authentication {protocol === 'https' && '(Required for HTTPS)'}
              </label>
            </div>
          </div>
          
          {useTLS && (
            <>
              <div className="mb-4">
                <label htmlFor="ca" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CA Certificate (Optional)
                </label>
                <textarea
                  id="ca"
                  value={ca}
                  onChange={(e) => setCa(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="-----BEGIN CERTIFICATE-----"
                  rows={3}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="cert" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Certificate
                </label>
                <textarea
                  id="cert"
                  value={cert}
                  onChange={(e) => setCert(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="-----BEGIN CERTIFICATE-----"
                  rows={3}
                  required={useTLS}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Key
                </label>
                <textarea
                  id="key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="-----BEGIN PRIVATE KEY-----"
                  rows={3}
                  required={useTLS}
                />
              </div>
            </>
          )}
          
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={loading || !host || !port}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Test Connection
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Server'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
