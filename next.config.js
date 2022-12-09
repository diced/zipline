/**
 * @type {import('next').NextConfig}
 **/
module.exports = {
  images: {
    domains: [
      // For sharex icon in manage user
      'getsharex.com',
      // For flameshot icon, and maybe in the future other stuff from github
      'raw.githubusercontent.com',
      // Google Icon
      'madeby.google.com',
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};
