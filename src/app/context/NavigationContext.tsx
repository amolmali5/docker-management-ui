'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NavigationContextType {
  isNavigating: boolean;
  currentSection: string | null;
  startNavigation: (targetSection: string) => void;
  endNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startNavigation = (targetSection: string) => {
    setIsNavigating(true);
    setCurrentSection(targetSection);

    // Safety timeout to ensure loading state doesn't get stuck
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Shorter timeout for better user experience
    navigationTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
      setCurrentSection(null);
    }, 3000); // 3 second safety timeout
  };

  const endNavigation = () => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
    setIsNavigating(false);
    setCurrentSection(null);
  };

  // Reset loading state when pathname or search params change
  // This ensures the loading state is cleared when navigation completes
  useEffect(() => {
    endNavigation();
  }, [pathname, searchParams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation, endNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
