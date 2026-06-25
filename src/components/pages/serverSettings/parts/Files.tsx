import type { Response } from '@/lib/api/response';
import { Button, LoadingOverlay, NumberInput, Select, Stack, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
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
          label='Assume Mimetypes'
          description='Assume the mimetype of a file for its extension.'
          {...form.getInputProps('filesAssumeMimetypes', { type: 'checkbox' })}
        />

        <TextInput
          label='Disabled Types'
          description='Mimetypes to disable, separated by commas. It is recommended to have the Assume Mimetypes setting enabled if you are disabling mimetypes, as this will also block files with the corresponding extensions.'
          placeholder='text/html, application/javascript'
          {...form.getInputProps('filesDisabledTypes')}
        />

        <TextInput
          label='Default MIME for Disabled Types'
          description='The default MIME type to use for disabled types. Leave blank to completely block disabled types.'
          placeholder='application/octet-stream'
          {...form.getInputProps('filesDisabledTypesDefault')}
        />

        <Switch
          label='Remove GPS Metadata'
          description='Remove GPS metadata from files.'
          {...form.getInputProps('filesRemoveGpsMetadata', { type: 'checkbox' })}
        />

        <Switch
          label='Extensionless URLs'
          description='Allow file links without the extension (e.g. /u/uuid instead of /u/uuid.png). Upload responses still include the extension.'
          {...form.getInputProps('filesExtensionlessUrls', { type: 'checkbox' })}
        />

        <TextInput
          label='Route'
          description='The route to use for file uploads. Requires a server restart.'
          placeholder='/u'
          {...form.getInputProps('filesRoute')}
        />

        <NumberInput
          label='Length'
          description='The length of the file name (for randomly generated names).'
          min={1}
          max={64}
          {...form.getInputProps('filesLength')}
        />

        <Select
          label='Default Format'
          description='The default format to use for file names.'
          placeholder='random'
          data={['random', 'date', 'uuid', 'name', 'gfycat']}
          {...form.getInputProps('filesDefaultFormat')}
        />

        <TextInput
          label='Disabled Extensions'
          description='Extensions to disable, separated by commas.'
          placeholder='exe, bat, sh'
          {...form.getInputProps('filesDisabledExtensions')}
        />

        <TextInput
          label='Max File Size'
          description='The maximum file size allowed.'
          placeholder='100mb'
          {...form.getInputProps('filesMaxFileSize')}
        />

        <TextInput
          label='Default Date Format'
          description='The default date format to use.'
          placeholder='YYYY-MM-DD_HH:mm:ss'
          {...form.getInputProps('filesDefaultDateFormat')}
        />

        <TextInput
          label='Default Expiration'
          description='The default expiration time for files.'
          placeholder='30d'
          {...form.getInputProps('filesDefaultExpiration')}
        />

        <TextInput
          label='Max Expiration'
          description='The maximum expiration time allowed for files.'
          placeholder='365d'
          {...form.getInputProps('filesMaxExpiration')}
        />

        <NumberInput
          label='Random Words Num Adjectives'
          description='The number of adjectives to use for the random-words/gfycat format.'
          min={1}
          max={10}
          {...form.getInputProps('filesRandomWordsNumAdjectives')}
        />

        <TextInput
          label='Random Words Separator'
          description='The separator to use for the random-words/gfycat format.'
          placeholder='-'
          {...form.getInputProps('filesRandomWordsSeparator')}
        />

        <Select
          label='Default Compression Format'
          description='The default image compression format to use when only a compression percent is specified.'
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
          label='Max Files Per Upload'
          description='The maximum number of files allowed per upload. Requires a server restart.'
          min={1}
          {...form.getInputProps('filesMaxFilesPerUpload')}
        />
      </Stack>

      <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
        Save
      </Button>
    </form>
  );
}
