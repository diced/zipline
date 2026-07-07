import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isSSR = mode.startsWith('ssr');

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
        output: {
          format: 'esm',
          entryFileNames: isSSR ? `${mode}.js` : 'assets/[name]-[hash].js',
        },
      },
      target: 'esnext',
    },

    server: {
      host: true,
      middlewareMode: true,
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
