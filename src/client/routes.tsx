import Layout from '@/components/Layout';
import { Response as ApiResponse } from '@/lib/api/response';
import { isAdministrator } from '@/lib/role';
import { createBrowserRouter, data, redirect } from 'react-router-dom';
import DashboardErrorBoundary from './error/DashboardErrorBoundary';
import RootErrorBoundary from './error/RootErrorBoundary';
import FourOhFour from './pages/404';
import Login from './pages/auth/login';
import Logout from './pages/auth/logout';
import Root from './Root';

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
    children: [
      {
        ErrorBoundary: RootErrorBoundary,
        children: [
          { path: '*', Component: FourOhFour },
          {
            path: '/auth',
            children: [
              { path: 'login', Component: Login },
              { path: 'logout', Component: Logout },
              { path: 'register', lazy: () => import('./pages/auth/register') },
              {
                path: 'setup',
                lazy: () => import('./pages/auth/setup'),
              },
              { path: 'tos', lazy: () => import('./pages/auth/tos') },
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
                  { path: 'folders', lazy: () => import('./pages/dashboard/folders') },
                  { path: 'urls', lazy: () => import('./pages/dashboard/urls') },
                  {
                    path: 'upload',
                    children: [
                      { path: 'file', lazy: () => import('./pages/dashboard/upload/file') },
                      { path: 'text', lazy: () => import('./pages/dashboard/upload/text') },
                    ],
                  },
                  {
                    path: 'admin',
                    loader: async () => {
                      const res = await fetch('/api/user');
                      if (!res.ok) {
                        return redirect('/auth/login');
                      }

                      const { user } = await res.json();
                      if (!isAdministrator(user.role)) return redirect('/dashboard');
                    },
                    children: [
                      { path: 'invites', lazy: () => import('./pages/dashboard/admin/invites') },
                      { path: 'settings', lazy: () => import('./pages/dashboard/admin/settings') },
                      { path: 'actions', lazy: () => import('./pages/dashboard/admin/actions') },
                      {
                        path: 'users',
                        children: [
                          { index: true, lazy: () => import('./pages/dashboard/admin/users') },
                          {
                            path: ':id/files',
                            lazy: () => import('./pages/dashboard/admin/users/[id]/files'),
                          },
                        ],
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
