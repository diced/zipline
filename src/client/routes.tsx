import Layout from '@/components/Layout';
import { Response as ApiResponse } from '@/lib/api/response';
import { isAdministrator } from '@/lib/role';
import { createBrowserRouter, data, redirect } from 'react-router-dom';
import DashboardErrorBoundary from './error/DashboardErrorBoundary';
import RootErrorBoundary from './error/RootErrorBoundary';
import FourOhFour from './pages/404';
import Login from './pages/auth/login';
import Root from './Root';

const fourOhFourCatchall = {
  path: '*',
  Component: FourOhFour,
};

export async function dashboardLoader() {
  try {
    const res = await fetch('/api/server/settings/web');
    if (!res.ok) {
      return redirect('/auth/login');
    }

    const data = await res.json();
    console.log('Loaded settings:', data);

    return data as ApiResponse['/api/server/settings/web'];
  } catch (error) {
    throw data('Failed to load settings' + (error as any).message, { status: 500 });
  }
}

export const router = createBrowserRouter([
  {
    Component: Root,
    path: '/',
    HydrateFallback: () => null,
    children: [
      {
        ErrorBoundary: RootErrorBoundary,
        children: [
          fourOhFourCatchall,
          {
            children: [
              { path: 'auth/login', Component: Login },
              { path: 'auth/register', lazy: () => import('./pages/auth/register') },
              {
                path: 'auth/setup',
                lazy: () => import('./pages/auth/setup'),
              },
              { path: 'auth/tos', lazy: () => import('./pages/auth/tos') },
            ],
          },
          {
            path: '/dashboard',
            Component: Layout,
            loader: dashboardLoader,
            children: [
              {
                ErrorBoundary: DashboardErrorBoundary,
                children: [
                  { index: true, lazy: () => import('./pages/dashboard/index') },
                  { path: 'metrics', lazy: () => import('./pages/dashboard/metrics') },
                  { path: 'settings', lazy: () => import('./pages/dashboard/settings') },
                  { path: 'files', lazy: () => import('./pages/dashboard/files') },
                  { path: 'folders/*', lazy: () => import('./pages/dashboard/folders') },
                  { path: 'urls', lazy: () => import('./pages/dashboard/urls') },
                  { path: 'upload/file', lazy: () => import('./pages/dashboard/upload/file') },
                  { path: 'upload/text', lazy: () => import('./pages/dashboard/upload/text') },

                  // admin routes
                  {
                    loader: async () => {
                      const res = await fetch('/api/user');
                      if (!res.ok) return redirect('/auth/login');

                      const { user } = await res.json();
                      if (!isAdministrator(user.role)) return redirect('/dashboard');
                    },
                    children: [
                      { path: 'admin', lazy: () => import('./pages/dashboard/admin/index') },
                      { path: 'admin/invites', lazy: () => import('./pages/dashboard/admin/invites') },
                      { path: 'admin/settings/*', lazy: () => import('./pages/dashboard/admin/settings') },
                      { path: 'admin/actions', lazy: () => import('./pages/dashboard/admin/actions') },
                      { path: 'admin/users', lazy: () => import('./pages/dashboard/admin/users') },
                      {
                        path: 'admin/users/:id/files',
                        lazy: () => import('./pages/dashboard/admin/users/[id]/files'),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            path: 'folder/:id',
            children: [
              {
                index: true,
                lazy: () => import('./pages/folder/[id]'),
              },
              {
                path: 'upload',
                lazy: () => import('./pages/folder/[id]/upload'),
              },
            ],
          },
        ],
      },
    ],
  },
]);
