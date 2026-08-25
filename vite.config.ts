import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import transformImports from '@rolldown/plugin-transform-imports';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputs = {
  main: path.resolve(__dirname, 'src/client/index.html'),
  'ssr-view': path.resolve(__dirname, 'src/client/ssr-view/index.html'),
  'ssr-view-url': path.resolve(__dirname, 'src/client/ssr-view-url/index.html'),
};

export default defineConfig(({ mode }) => {
  const isSSR = mode.startsWith('ssr');

  const input = isSSR
    ? {
        [mode]: inputs[mode as keyof typeof inputs],
      }
    : inputs;

  return {
    plugins: [
      react(),
      transformImports({
        '@tabler/icons-react': {
          transform: '@tabler/icons-react/dist/esm/icons/{{member}}.mjs',
        },
      }),
    ],

    root: './src/client',

    build: {
      outDir: '../../build/client',

      emptyOutDir: !isSSR,
      copyPublicDir: !isSSR,

      reportCompressedSize: false,

      target: 'esnext',

      rolldownOptions: {
        input,

        output: {
          format: 'esm',
          entryFileNames: isSSR ? `${mode}.js` : 'assets/[name]-[hash].js',
        },
      },
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
