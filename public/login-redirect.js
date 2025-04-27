// This script handles login redirect to ensure the dashboard loads properly
(function () {
  // Check if we're on the dashboard page
  const isDashboardPage = window.location.pathname.startsWith('/dashboard');

  // If we're on the dashboard page, ensure the page is fully loaded
  if (isDashboardPage) {
    console.log('On dashboard page');

    // Check if we've already tried to refresh this page
    const hasRefreshed = sessionStorage.getItem('dashboardRefreshed');

    // Only attempt to refresh once per session
    if (!hasRefreshed) {
      // Force a refresh if the page seems to be stuck (no sidebar visible after 2 seconds)
      setTimeout(() => {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) {
          console.log('Dashboard appears to be stuck, refreshing once...');
          // Mark that we've refreshed
          sessionStorage.setItem('dashboardRefreshed', 'true');
          window.location.reload();
        } else {
          // Sidebar is visible, mark as loaded successfully
          sessionStorage.setItem('dashboardRefreshed', 'true');
        }
      }, 2000);
    } else {
      console.log('Dashboard already refreshed once, not refreshing again');
    }
  }
})();
