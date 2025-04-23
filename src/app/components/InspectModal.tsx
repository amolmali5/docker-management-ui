'use client';

import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';

interface InspectModalProps {
  title: string;
  data: any;
  onClose: () => void;
}

export default function InspectModal({ title, data, onClose }: InspectModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <button
            onClick={handleCopyToClipboard}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
        
        <div className="flex-grow overflow-auto">
          <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-md h-full">
            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
