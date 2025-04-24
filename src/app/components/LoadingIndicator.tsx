'use client';

import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { usePathname } from 'next/navigation';

const LoadingIndicator: React.FC = () => {
  const { isNavigating, currentSection } = useNavigation();
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  // Extract current section from pathname
  const currentPathSection = pathname?.split('/').filter(Boolean)[0] || 'dashboard';

  // Only show loading indicator for the current section
  const shouldShow = isNavigating && (currentSection === currentPathSection || !currentSection);

  useEffect(() => {
    let hideTimer: NodeJS.Timeout;

    if (shouldShow) {
      setVisible(true);
    } else {
      // Add a small delay before hiding the bar to ensure smooth transition
      hideTimer = setTimeout(() => {
        setVisible(false);
      }, 300);
    }

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [shouldShow]);

  if (!visible && !shouldShow) return null;

  return (
    // Top loading bar - only loader we need
    <div className={`fixed top-0 left-0 right-0 z-50 h-1.5 bg-blue-500 transition-opacity duration-300 ${shouldShow ? 'opacity-100' : 'opacity-0'}`}>
      <div className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 animate-loading-bar"></div>
    </div>
  );
};

export default LoadingIndicator;
