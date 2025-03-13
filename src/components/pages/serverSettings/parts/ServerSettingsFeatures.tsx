import { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, NumberInput, Paper, SimpleGrid, Switch, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';
import { EnvTooltip } from '..';

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
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>Features</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <EnvTooltip envVar='FEATURES_IMAGE_COMPRESSION' data={data} varKey='featuresImageCompression'>
            <Switch
              label='Image Compression'
              description='Allows the ability for users to compress images.'
              {...form.getInputProps('featuresImageCompression', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FEATURES_ROBOTS_TXT' data={data} varKey='featuresRobotsTxt'>
            <Switch
              label='/robots.txt'
              description='Enables a robots.txt file for search engine optimization. Requires a server restart.'
              {...form.getInputProps('featuresRobotsTxt', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FEATURES_HEALTHCHECK' data={data} varKey='featuresHealthcheck'>
            <Switch
              label='Healthcheck'
              description='Enables a healthcheck route for uptime monitoring. Requires a server restart.'
              {...form.getInputProps('featuresHealthcheck', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FEATURES_USER_REGISTRATION' data={data} varKey='featuresUserRegistration'>
            <Switch
              label='User Registration'
              description='Allows users to register an account on the server.'
              {...form.getInputProps('featuresUserRegistration', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FEATURES_OAUTH_REGISTRATION' data={data} varKey='featuresOauthRegistration'>
            <Switch
              label='OAuth Registration'
              description='Allows users to register an account using OAuth providers.'
              {...form.getInputProps('featuresOauthRegistration', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FEATURES_DELETE_ON_MAX_VIEWS' data={data} varKey='featuresDeleteOnMaxViews'>
            <Switch
              label='Delete on Max Views'
              description='Automatically deletes files/urls after they reach the maximum view count. Requires a server restart.'
              {...form.getInputProps('featuresDeleteOnMaxViews', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FEATURES_METRICS_ENABLED' data={data} varKey='featuresMetricsEnabled'>
            <Switch
              label='Enable Metrics'
              description='Enables metrics for the server. Requires a server restart.'
              {...form.getInputProps('featuresMetricsEnabled', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FEATURES_METRICS_ADMIN_ONLY' data={data} varKey='featuresMetricsAdminOnly'>
            <Switch
              label='Admin Only Metrics'
              description='Requires an administrator to view metrics.'
              {...form.getInputProps('featuresMetricsAdminOnly', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip
            envVar='FEATURES_METRICS_SHOW_USER_SPECIFIC'
            data={data}
            varKey='featuresMetricsShowUserSpecific'
          >
            <Switch
              label='Show User Specific Metrics'
              description='Shows metrics specific to each user, for all users.'
              {...form.getInputProps('featuresMetricsShowUserSpecific', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FEATURES_THUMBNAILS_ENABLED' data={data} varKey='featuresThumbnailsEnabled'>
            <Switch
              label='Enable Thumbnails'
              description='Enables thumbnail generation for images. Requires a server restart.'
              {...form.getInputProps('featuresThumbnailsEnabled', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip
            envVar='FEATURES_THUMBNAILS_NUMBER_THREADS'
            data={data}
            varKey='featuresThumbnailsNumberThreads'
          >
            <NumberInput
              label='Thumbnails Number Threads'
              description='Number of threads to use for thumbnail generation, usually the number of CPU threads. Requires a server restart.'
              placeholder='Enter a number...'
              min={1}
              max={16}
              {...form.getInputProps('featuresThumbnailsNumberThreads')}
            />
          </EnvTooltip>
        </SimpleGrid>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
