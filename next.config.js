/**
 * @type {import('next').NextConfig}
 **/
module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  images: {
    domains: [
      // For sharex icon in manage user
      'getsharex.com',
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};