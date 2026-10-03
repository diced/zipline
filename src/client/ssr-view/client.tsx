import '@/lib/i18n';
import '@mantine/charts/styles.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';

import ZiplineSSRProvider from '@/components/ZiplineSSRProvider';
import { ZIPLINE_SSR_PROP } from '@/lib/ssr/constants';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { createRoutes } from './routes';

const router = createBrowserRouter(createRoutes());

const initialData = (window as any)[ZIPLINE_SSR_PROP];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ZiplineSSRProvider ssrData={initialData}>
      <RouterProvider router={router} />
    </ZiplineSSRProvider>
  </StrictMode>,
);
