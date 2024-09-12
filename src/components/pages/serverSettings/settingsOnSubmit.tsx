import React from 'react';

import { Response } from '@/lib/api/response';
import { fetchApi } from '@/lib/fetchApi';
import { showNotification } from '@mantine/notifications';
import { NextRouter } from 'next/router';
import { mutate } from 'swr';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useForm } from '@mantine/form';

export function settingsOnSubmit(router: NextRouter, form: ReturnType<typeof useForm<any>>) {
  return async (values: unknown) => {
    const { data, error } = await fetchApi<Response['/api/server/settings']>(
      '/api/server/settings',
      'PATCH',
      values,
    );

    if (error) {
      showNotification({
        title: 'Failed to save settings',
        message: error.issues
          ? error.issues.map((x: { message: string }) => x.message).join('\n')
          : error.message,
        color: 'red',
      });

      if (error.issues) {
        for (const issue of error.issues) {
          for (let i = 0; i < issue.path.length; i++) {
            form.setFieldError(issue.path[i], issue.message);
          }
        }
      }
    } else {
      showNotification({
        message: 'Settings saved',
        color: 'green',
        icon: <IconDeviceFloppy size='1rem' />,
      });

      await fetch('/reload');
      mutate('/api/server/settings', data);
      router.replace(router.asPath, undefined, { scroll: false });
    }
  };
}
