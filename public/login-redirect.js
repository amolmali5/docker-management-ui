// This script handles login redirect to ensure the dashboard loads properly
(function () {
  // Clear any existing tokens to force re-authentication
  // localStorage.removeItem('token');

  // Check if we're on the login page
  // const isLoginPage = window.location.pathname === '/login';
  const isDashboardPage = window.location.pathname.startsWith('/dashboard');

  // console.log('Login redirect script running:', {
  //   isLoginPage,
  //   isDashboardPage,
  //   pathname: window.location.pathname
  // });

  // If we're not on the login page and not on the root page, redirect to login
  // if (!isLoginPage && window.location.pathname !== '/') {
  //   console.log('Redirecting to login page');
  //   window.location.href = '/login';
  // }

  // If we're on the dashboard page, ensure the page is fully loaded
  if (isDashboardPage) {
    console.log('On dashboard page with token');
    // Force a refresh if the page seems to be stuck (no sidebar visible after 2 seconds)
    setTimeout(() => {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) {
        console.log('Dashboard appears to be stuck, refreshing...');
        window.location.reload();
      }
    }, 2000);
  }
})();
