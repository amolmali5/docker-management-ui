'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '../context/NavigationContext';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({
  href,
  children,
  className = '',
  activeClassName = 'bg-gray-100 dark:bg-gray-600',
  onClick
}) => {
  const pathname = usePathname();
  const { isNavigating, currentSection, startNavigation } = useNavigation();

  // Extract section from href (e.g., /containers -> containers)
  const section = href.split('/').filter(Boolean)[0] || 'dashboard';

  const isActive = pathname === href ||
    (href !== '/' && pathname?.startsWith(href));

  // Only show loading indicator for this specific section
  const showLoadingIndicator = isNavigating && currentSection === section && !isActive;

  const handleClick = () => {
    // Only start navigation if we're navigating to a different page
    if (!isActive) {
      startNavigation(section);
    }

    if (onClick) onClick();
  };

  return (
    <Link
      href={href}
      className={`${className} ${isActive ? activeClassName : ''} relative`}
      onClick={handleClick}
    >
      {children}
      {showLoadingIndicator && (
        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
      )}
    </Link>
  );
};

export default NavLink;
