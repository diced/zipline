import type { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, NumberInput, Select, Stack, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { checkCommaArray, settingsOnSubmit } from '../settingsOnSubmit';
import useServerSettings from '../useServerSettings';

export default function Files() {
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
      filesRoute: data.settings.filesRoute,
      filesLength: data.settings.filesLength,
      filesDefaultFormat: data.settings.filesDefaultFormat,
      filesDisabledTypes: data.settings.filesDisabledTypes.join(', '),
      filesDisabledTypesDefault: data.settings.filesDisabledTypesDefault,
      filesDisabledExtensions: data.settings.filesDisabledExtensions.join(', '),
      filesMaxFileSize: data.settings.filesMaxFileSize,
      filesDefaultExpiration: data.settings.filesDefaultExpiration,
      filesMaxExpiration: data.settings.filesMaxExpiration,
      filesAssumeMimetypes: data.settings.filesAssumeMimetypes,
      filesDefaultDateFormat: data.settings.filesDefaultDateFormat,
      filesRemoveGpsMetadata: data.settings.filesRemoveGpsMetadata,
      filesRandomWordsNumAdjectives: data.settings.filesRandomWordsNumAdjectives,
      filesRandomWordsSeparator: data.settings.filesRandomWordsSeparator,
      filesDefaultCompressionFormat: data.settings.filesDefaultCompressionFormat,
      filesMaxFilesPerUpload: data.settings.filesMaxFilesPerUpload,
      filesExtensionlessUrls: data.settings.filesExtensionlessUrls,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data.tampered.includes(payload.field) || false,
    }),
  });

  const onSubmit = async (values: typeof form.values) => {
    if (values.filesDefaultExpiration?.trim() === '' || !values.filesDefaultExpiration) {
      values.filesDefaultExpiration = null;
    } else {
      values.filesDefaultExpiration = values.filesDefaultExpiration.trim();
    }

    if (values.filesMaxExpiration?.trim() === '' || !values.filesMaxExpiration) {
      values.filesMaxExpiration = null;
    } else {
      values.filesMaxExpiration = values.filesMaxExpiration.trim();
    }

    if (values.filesDisabledTypesDefault?.trim() === '' || !values.filesDisabledTypesDefault) {
      values.filesDisabledTypesDefault = null;
    } else {
      values.filesDisabledTypesDefault = values.filesDisabledTypesDefault.trim();
    }

    // @ts-ignore
    values.filesDisabledExtensions = checkCommaArray(values.filesDisabledExtensions);
    // @ts-ignore
    values.filesDisabledTypes = checkCommaArray(values.filesDisabledTypes);

    return settingsOnSubmit(navigate, form)(values);
  };

  return (
    <form onSubmit={form.onSubmit(onSubmit)}>
      <Stack gap='lg'>
        <Switch
          label={t('files.assumeMimetypes.label')}
          description={t('files.assumeMimetypes.description')}
          {...form.getInputProps('filesAssumeMimetypes', { type: 'checkbox' })}
        />

        <TextInput
          label={t('files.disabledTypes.label')}
          description={t('files.disabledTypes.description')}
          placeholder='text/html, application/javascript'
          {...form.getInputProps('filesDisabledTypes')}
        />

        <TextInput
          label={t('files.disabledTypesDefault.label')}
          description={t('files.disabledTypesDefault.description')}
          placeholder='application/octet-stream'
          {...form.getInputProps('filesDisabledTypesDefault')}
        />

        <Switch
          label={t('files.removeGpsMetadata.label')}
          description={t('files.removeGpsMetadata.description')}
          {...form.getInputProps('filesRemoveGpsMetadata', { type: 'checkbox' })}
        />

        <Switch
          label={t('files.extensionlessUrls.label')}
          description={t('files.extensionlessUrls.description')}
          {...form.getInputProps('filesExtensionlessUrls', { type: 'checkbox' })}
        />

        <TextInput
          label={t('files.route.label')}
          description={t('files.route.description')}
          placeholder='/u'
          {...form.getInputProps('filesRoute')}
        />

        <NumberInput
          label={t('files.length.label')}
          description={t('files.length.description')}
          min={1}
          max={64}
          {...form.getInputProps('filesLength')}
        />

        <Select
          label={t('files.defaultFormat.label')}
          description={t('files.defaultFormat.description')}
          placeholder='random'
          data={['random', 'date', 'uuid', 'name', 'gfycat']}
          {...form.getInputProps('filesDefaultFormat')}
        />

        <TextInput
          label={t('files.disabledExtensions.label')}
          description={t('files.disabledExtensions.description')}
          placeholder='exe, bat, sh'
          {...form.getInputProps('filesDisabledExtensions')}
        />

        <TextInput
          label={t('files.maxFileSize.label')}
          description={t('files.maxFileSize.description')}
          placeholder='100mb'
          {...form.getInputProps('filesMaxFileSize')}
        />

        <TextInput
          label={t('files.defaultDateFormat.label')}
          description={t('files.defaultDateFormat.description')}
          placeholder='YYYY-MM-DD_HH:mm:ss'
          {...form.getInputProps('filesDefaultDateFormat')}
        />

        <TextInput
          label={t('files.defaultExpiration.label')}
          description={t('files.defaultExpiration.description')}
          placeholder='30d'
          {...form.getInputProps('filesDefaultExpiration')}
        />

        <TextInput
          label={t('files.maxExpiration.label')}
          description={t('files.maxExpiration.description')}
          placeholder='365d'
          {...form.getInputProps('filesMaxExpiration')}
        />

        <NumberInput
          label={t('files.randomWordsNumAdjectives.label')}
          description={t('files.randomWordsNumAdjectives.description')}
          min={1}
          max={10}
          {...form.getInputProps('filesRandomWordsNumAdjectives')}
        />

        <TextInput
          label={t('files.randomWordsSeparator.label')}
          description={t('files.randomWordsSeparator.description')}
          placeholder='-'
          {...form.getInputProps('filesRandomWordsSeparator')}
        />

        <Select
          label={t('files.defaultCompressionFormat.label')}
          description={t('files.defaultCompressionFormat.description')}
          placeholder='jpg'
          data={[
            { value: 'jpg', label: '.jpg' },
            { value: 'png', label: '.png' },
            { value: 'webp', label: '.webp' },
            { value: 'jxl', label: '.jxl' },
          ]}
          {...form.getInputProps('filesDefaultCompressionFormat')}
        />

        <NumberInput
          label={t('files.maxFilesPerUpload.label')}
          description={t('files.maxFilesPerUpload.description')}
          min={1}
          {...form.getInputProps('filesMaxFilesPerUpload')}
        />
      </Stack>

      <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
        {t('common:actions.save')}
      </Button>
    </form>
  );
}
