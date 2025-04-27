'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface RefreshContextType {
  refreshInterval: number;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState(10000); // Default to 10 seconds

  // Update refresh interval when user settings change
  useEffect(() => {
    if (user?.settings?.refreshRate) {
      setRefreshInterval(user.settings.refreshRate);
    }
  }, [user]);

  return (
    <RefreshContext.Provider value={{ refreshInterval }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}

