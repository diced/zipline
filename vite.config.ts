// @ts-ignore
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'development')
    return {
      plugins: [react()],
      root: './src/client',
      build: {
        outDir: '../../build/client',
      },
      server: {
        middlewareMode: true,
        // not safe in production, but fine in dev
        allowedHosts: true,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
    };

  return {
    plugins: [react()],
    root: './src/client',
    build: {
      outDir: '../../build/client',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/client/index.html'),
          'ssr-view': path.resolve(__dirname, 'src/client/ssr-view/index.html'),
          'ssr-view-url': path.resolve(__dirname, 'src/client/ssr-view-url/index.html'),
        },
        ...(mode.startsWith('ssr') && {
          output: {
            entryFileNames: mode + '.js',
            format: 'cjs',
          },
          plugins: [],
        }),
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
