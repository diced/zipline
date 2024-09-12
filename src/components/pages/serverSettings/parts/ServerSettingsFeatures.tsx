import { Response } from '@/lib/api/response';
import { Button, NumberInput, Paper, SimpleGrid, Switch, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCpu, IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function ServerSettingsFeatures({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm({
    initialValues: {
      featuresImageCompression: true,
      featuresRobotsTxt: true,
      featuresHealthcheck: true,
      featuresUserRegistration: false,
      featuresOauthRegistration: true,
      featuresDeleteOnMaxViews: true,
      featuresThumbnailsEnabled: true,
      featuresThumbnailsNumberThreads: 4,
      featuresMetricsEnabled: true,
      featuresMetricsAdminOnly: false,
      featuresMetricsShowUserSpecific: true,
    },
  });

  const onSubmit = settingsOnSubmit(router, form);

  useEffect(() => {
    form.setValues({
      featuresImageCompression: data?.featuresImageCompression ?? true,
      featuresRobotsTxt: data?.featuresRobotsTxt ?? true,
      featuresHealthcheck: data?.featuresHealthcheck ?? true,
      featuresUserRegistration: data?.featuresUserRegistration ?? false,
      featuresOauthRegistration: data?.featuresOauthRegistration ?? true,
      featuresDeleteOnMaxViews: data?.featuresDeleteOnMaxViews ?? true,
      featuresThumbnailsEnabled: data?.featuresThumbnailsEnabled ?? true,
      featuresThumbnailsNumberThreads: data?.featuresThumbnailsNumberThreads ?? 4,
      featuresMetricsEnabled: data?.featuresMetricsEnabled ?? true,
      featuresMetricsAdminOnly: data?.featuresMetricsAdminOnly ?? false,
      featuresMetricsShowUserSpecific: data?.featuresMetricsShowUserSpecific ?? true,
    });
  }, [data]);

  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Features</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <Switch
            label='Image Compression'
            description='Automatically compresses images uploaded to the server.'
            {...form.getInputProps('featuresImageCompression', { type: 'checkbox' })}
          />

          <Switch
            label='Robots.txt'
            description='Enables a robots.txt file for search engine optimization. Requires a server restart.'
            {...form.getInputProps('featuresRobotsTxt', { type: 'checkbox' })}
          />

          <Switch
            label='Healthcheck'
            description='Enables a healthcheck route for uptime monitoring. Requires a server restart.'
            {...form.getInputProps('featuresHealthcheck', { type: 'checkbox' })}
          />

          <Switch
            label='User Registration'
            description='Allows users to register an account on the server.'
            {...form.getInputProps('featuresUserRegistration', { type: 'checkbox' })}
          />

          <Switch
            label='OAuth Registration'
            description='Allows users to register an account using OAuth providers.'
            {...form.getInputProps('featuresOauthRegistration', { type: 'checkbox' })}
          />

          <Switch
            label='Delete on Max Views'
            description='Automatically deletes files after they reach the maximum view count.'
            {...form.getInputProps('featuresDeleteOnMaxViews', { type: 'checkbox' })}
          />

          <Switch
            label='Metrics Enabled'
            description='Enables metrics for the server. Requires a server restart.'
            {...form.getInputProps('featuresMetricsEnabled', { type: 'checkbox' })}
          />

          <Switch
            label='Metrics Admin Only'
            description='Requires an administrator to view metrics.'
            {...form.getInputProps('featuresMetricsAdminOnly', { type: 'checkbox' })}
          />

          <Switch
            label='Metrics Show User Specific'
            description='Shows metrics specific to each user, for all users.'
            {...form.getInputProps('featuresMetricsShowUserSpecific', { type: 'checkbox' })}
          />

          <Switch
            label='Thumbnails Enabled'
            description='Enables thumbnail generation for images. Requires a server restart.'
            {...form.getInputProps('featuresThumbnailsEnabled', { type: 'checkbox' })}
          />

          <NumberInput
            label='Thumbnails Number Threads'
            description='Number of threads to use for thumbnail generation, usually the number of CPU threads. Requires a server restart.'
            placeholder='Enter a number...'
            min={1}
            max={16}
            leftSection={<IconCpu size='1rem' />}
            {...form.getInputProps('featuresThumbnailsNumberThreads')}
          />
        </SimpleGrid>

        <Button
          type='submit'
          color='blue'
          mt='md'
          loading={isLoading}
          leftSection={<IconDeviceFloppy size='1rem' />}
        >
          Save
        </Button>
      </form>
    </Paper>
  );
}
