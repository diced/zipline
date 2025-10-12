import { Response } from '@/lib/api/response';
import {
  Anchor,
  Button,
  LoadingOverlay,
  NumberInput,
  Paper,
  SimpleGrid,
  Switch,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function Features({
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
      featuresVersionChecking: true,
      featuresVersionAPI: 'https://zipline-version.diced.sh/',
      featuresPublicUpload: false,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data?.tampered?.includes(payload.field) || false,
    }),
  });

  const onSubmit = settingsOnSubmit(router, form);

  useEffect(() => {
    if (!data) return;

    form.setValues({
      featuresImageCompression: data.settings.featuresImageCompression ?? true,
      featuresRobotsTxt: data.settings.featuresRobotsTxt ?? true,
      featuresHealthcheck: data.settings.featuresHealthcheck ?? true,
      featuresUserRegistration: data.settings.featuresUserRegistration ?? false,
      featuresOauthRegistration: data.settings.featuresOauthRegistration ?? true,
      featuresDeleteOnMaxViews: data.settings.featuresDeleteOnMaxViews ?? true,
      featuresThumbnailsEnabled: data.settings.featuresThumbnailsEnabled ?? true,
      featuresThumbnailsNumberThreads: data.settings.featuresThumbnailsNumberThreads ?? 4,
      featuresMetricsEnabled: data.settings.featuresMetricsEnabled ?? true,
      featuresMetricsAdminOnly: data.settings.featuresMetricsAdminOnly ?? false,
      featuresMetricsShowUserSpecific: data.settings.featuresMetricsShowUserSpecific ?? true,
      featuresVersionChecking: data.settings.featuresVersionChecking ?? true,
      featuresVersionAPI: data.settings.featuresVersionAPI ?? 'https://zipline-version.diced.sh/',
      featuresPublicUpload: data.settings.featuresPublicUpload ?? false,
    });
  }, [data]);

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>Features</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <Switch
            label='Enable Public Upload'
            description='Allow unauthenticated users to upload files. Public uploads will be stored under the default user.'
            {...form.getInputProps('featuresPublicUpload', { type: 'checkbox' })}
          />
          <Switch
            label='Image Compression'
            description='Allows the ability for users to compress images.'
            {...form.getInputProps('featuresImageCompression', { type: 'checkbox' })}
          />

          <Switch
            label='/robots.txt'
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
            description='Automatically deletes files/urls after they reach the maximum view count. Requires a server restart.'
            {...form.getInputProps('featuresDeleteOnMaxViews', { type: 'checkbox' })}
          />

          <Switch
            label='Enable Metrics'
            description='Enables metrics for the server. Requires a server restart.'
            {...form.getInputProps('featuresMetricsEnabled', { type: 'checkbox' })}
          />

          <Switch
            label='Admin Only Metrics'
            description='Requires an administrator to view metrics.'
            {...form.getInputProps('featuresMetricsAdminOnly', { type: 'checkbox' })}
          />

          <Switch
            label='Show User Specific Metrics'
            description='Shows metrics specific to each user, for all users.'
            {...form.getInputProps('featuresMetricsShowUserSpecific', { type: 'checkbox' })}
          />
          <div />
          <Switch
            label='Enable Thumbnails'
            description='Enables thumbnail generation for images. Requires a server restart.'
            {...form.getInputProps('featuresThumbnailsEnabled', { type: 'checkbox' })}
          />

          <NumberInput
            label='Thumbnails Number Threads'
            description='Number of threads to use for thumbnail generation, usually the number of CPU threads. Requires a server restart.'
            placeholder='Enter a number...'
            min={1}
            max={16}
            {...form.getInputProps('featuresThumbnailsNumberThreads')}
          />

          <Switch
            label='Version Checking'
            description='Enable version checking for the server. This will check for updates and display the status on the sidebar to all users.'
            {...form.getInputProps('featuresVersionChecking', { type: 'checkbox' })}
          />
          <TextInput
            label='Version API URL'
            description={
              <>
                The URL of the version checking server. The default is{' '}
                <Anchor size='xs' href='zipline-version.diced.sh' target='_blank'>
                  https:
                </Anchor>
                . Visit the{' '}
                <Anchor size='xs' href='https://github.com/diced/zipline-version-worker' target='_blank'>
                  GitHub
                </Anchor>{' '}
                to host your own version checking server.
              </>
            }
            placeholder='https://zipline-version.diced.sh/'
            {...form.getInputProps('featuresVersionAPI')}
          />
        </SimpleGrid>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
