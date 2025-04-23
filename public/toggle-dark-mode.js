// Simple script to toggle dark mode
function toggleDarkMode() {
  const isDark = document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', !isDark);
  console.log('Dark mode toggled to:', !isDark);
  localStorage.setItem('theme', !isDark ? 'dark' : 'light');
}

// Initialize dark mode based on localStorage or system preference
function initDarkMode() {
  const savedTheme = localStorage.getItem('theme');
  const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set initial dark mode
  const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDarkMode);
  document.documentElement.classList.toggle('dark', shouldBeDark);
  console.log('Dark mode initialized to:', shouldBeDark);
}

// Run initialization
initDarkMode();
