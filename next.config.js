/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  rewrites: async () => [
    {
      source: '/invite/:code',
      destination: '/auth/register?code=:code',
    },
  ],
  redirects: async () => [
    {
      source: '/r/:id',
      destination: '/raw/:id',
      permanent: true,
    },
  ],
  webpack: (config) => {
    config.resolve.fallback = { worker_threads: false };

    return config;
  },
};

module.exports = nextConfig;
