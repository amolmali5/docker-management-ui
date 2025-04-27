'use client';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useServer } from '../context/ServerContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ChangePasswordForm from '../components/ChangePasswordForm';
import ContentLoader from '../components/ContentLoader';
import ContentBlocker from '../components/ContentBlocker';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { switchingServer } = useServer();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }

    // Check if user needs to change password (first login)
    if (user && user.firstLogin) {
      setShowPasswordForm(true);
    }
  }, [isAuthenticated, isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // If user needs to change password, show the form
  if (showPasswordForm) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <ChangePasswordForm
          onSuccess={() => setShowPasswordForm(false)}
          isFirstLogin={user?.firstLogin}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <div className="relative flex-1 overflow-hidden">
          {/* Main content area with ContentBlocker */}
          <main className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div id="main-content-area" className="p-4 h-full overflow-y-auto">
              <ContentBlocker>
                {children}
              </ContentBlocker>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

