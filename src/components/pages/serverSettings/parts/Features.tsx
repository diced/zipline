import type { Response } from '@/lib/api/response';
import {
  Button,
  Divider,
  LoadingOverlay,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function Features() {
  const { data, isLoading } = useServerSettings();

  return (
    <>
      <LoadingOverlay visible={isLoading} />
      {data ? <Form data={data} isLoading={isLoading} /> : null}
    </>
  );
}

function Form({ data, isLoading }: { data: Response['/api/server/settings']; isLoading: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation(['serverSettings', 'common']);

  const form = useForm({
    initialValues: {
      featuresImageCompression: data.settings.featuresImageCompression,
      featuresRobotsTxt: data.settings.featuresRobotsTxt,
      featuresHealthcheck: data.settings.featuresHealthcheck,
      featuresUserRegistration: data.settings.featuresUserRegistration,
      featuresOauthRegistration: data.settings.featuresOauthRegistration,
      featuresDeleteOnMaxViews: data.settings.featuresDeleteOnMaxViews,

      featuresThumbnailsEnabled: data.settings.featuresThumbnailsEnabled,
      featuresThumbnailsNumberThreads: data.settings.featuresThumbnailsNumberThreads,
      featuresThumbnailsFormat: data.settings.featuresThumbnailsFormat,
      featuresThumbnailsInstantaneous: data.settings.featuresThumbnailsInstantaneous,

      featuresMetricsEnabled: data.settings.featuresMetricsEnabled,
      featuresMetricsAdminOnly: data.settings.featuresMetricsAdminOnly,
      featuresMetricsShowUserSpecific: data.settings.featuresMetricsShowUserSpecific,

      featuresVersionChecking: data.settings.featuresVersionChecking,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data.tampered.includes(payload.field) || false,
    }),
  });

  const onSubmit = settingsOnSubmit(navigate, form);

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap='lg'>
        <Switch
          label={t('features.imageCompression.label')}
          description={t('features.imageCompression.description')}
          {...form.getInputProps('featuresImageCompression', { type: 'checkbox' })}
        />

        <Switch
          label='/robots.txt'
          description={t('features.robotsTxt.description')}
          {...form.getInputProps('featuresRobotsTxt', { type: 'checkbox' })}
        />

        <Switch
          label={t('features.healthcheck.label')}
          description={t('features.healthcheck.description')}
          {...form.getInputProps('featuresHealthcheck', { type: 'checkbox' })}
        />

        <Switch
          label={t('features.userRegistration.label')}
          description={t('features.userRegistration.description')}
          {...form.getInputProps('featuresUserRegistration', { type: 'checkbox' })}
        />

        <Switch
          label={t('features.oauthRegistration.label')}
          description={t('features.oauthRegistration.description')}
          {...form.getInputProps('featuresOauthRegistration', { type: 'checkbox' })}
        />

        <Switch
          label={t('features.deleteOnMaxViews.label')}
          description={t('features.deleteOnMaxViews.description')}
          {...form.getInputProps('featuresDeleteOnMaxViews', { type: 'checkbox' })}
        />

        <Switch
          label={t('features.metricsEnabled.label')}
          description={t('features.metricsEnabled.description')}
          {...form.getInputProps('featuresMetricsEnabled', { type: 'checkbox' })}
        />

        <Switch
          label={t('features.metricsAdminOnly.label')}
          description={t('features.metricsAdminOnly.description')}
          {...form.getInputProps('featuresMetricsAdminOnly', { type: 'checkbox' })}
        />

        <Switch
          label={t('features.metricsShowUserSpecific.label')}
          description={t('features.metricsShowUserSpecific.description')}
          {...form.getInputProps('featuresMetricsShowUserSpecific', { type: 'checkbox' })}
        />

        <Divider label={t('features.dividers.thumbnails')} />

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing='lg'>
          <Switch
            label={t('features.thumbnailsEnabled.label')}
            description={t('features.thumbnailsEnabled.description')}
            {...form.getInputProps('featuresThumbnailsEnabled', { type: 'checkbox' })}
          />
          <Switch
            label={t('features.thumbnailsInstantaneous.label')}
            description={t('features.thumbnailsInstantaneous.description')}
            {...form.getInputProps('featuresThumbnailsInstantaneous', { type: 'checkbox' })}
          />
        </SimpleGrid>

        <NumberInput
          label={t('features.thumbnailsNumberThreads.label')}
          description={t('features.thumbnailsNumberThreads.description')}
          placeholder={t('features.thumbnailsNumberThreads.placeholder')}
          min={1}
          max={16}
          {...form.getInputProps('featuresThumbnailsNumberThreads')}
        />

        <Select
          label={t('features.thumbnailsFormat.label')}
          description={t('features.thumbnailsFormat.description')}
          data={[
            { value: 'jpg', label: '.jpg' },
            { value: 'png', label: '.png' },
            { value: 'webp', label: '.webp' },
          ]}
          {...form.getInputProps('featuresThumbnailsFormat')}
        />

        <Divider label={t('features.dividers.versionChecking')} />

        <Switch
          label={t('features.versionChecking.label')}
          description={t('features.versionChecking.description')}
          {...form.getInputProps('featuresVersionChecking', { type: 'checkbox' })}
        />
      </Stack>

      <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
