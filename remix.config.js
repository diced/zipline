const { createRoutesFromFolders } = require('@remix-run/v1-route-convention');

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  appDirectory: 'src/app',
  // assetsBuildDirectory: 'public/build',
  // serverBuildPath: 'build/index.js',
  serverModuleFormat: 'cjs',
  future: {
    unstable_dev: true,
    v2_routeConvention: true,
    v2_errorBoundary: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_headers: true,
  },
  publicPath: '/modules/',
  // use directory structure.
  routes(defineRoutes) {
    return createRoutesFromFolders(defineRoutes, {
      appDirectory: 'src/app',
    });
  },
};
