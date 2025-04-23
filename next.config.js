/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Convert port to string to fix the warning
    NEXT_PORT: process.env.NEXT_PORT ? String(process.env.NEXT_PORT) : '3000',
  },
  // Remove serverOptions as it's not recognized by Next.js
  // Use the experimental.serverComponentsExternalPackages option instead if needed
};

module.exports = nextConfig;
