/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  rewrites: async () => [
    {
      source: '/invite/:code',
      destination: '/auth/register?code=:code',
    },
  ],
};

module.exports = nextConfig;
