import { Response } from '@/lib/api/response';
import {
  Button,
  LoadingOverlay,
  NumberInput,
  Paper,
  Select,
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
import { EnvTooltip } from '..';

export default function ServerSettingsFiles({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const form = useForm<{
    filesRoute: string;
    filesLength: number;
    filesDefaultFormat: string;
    filesDisabledExtensions: string;
    filesMaxFileSize: string;
    filesDefaultExpiration: string | null;
    filesAssumeMimetypes: boolean;
    filesDefaultDateFormat: string;
    filesRemoveGpsMetadata: boolean;
    filesRandomWordsNumAdjectives: number;
    filesRandomWordsSeparator: string;
  }>({
    initialValues: {
      filesRoute: '/u',
      filesLength: 6,
      filesDefaultFormat: 'random',
      filesDisabledExtensions: '',
      filesMaxFileSize: '100mb',
      filesDefaultExpiration: '',
      filesAssumeMimetypes: false,
      filesDefaultDateFormat: 'YYYY-MM-DD_HH:mm:ss',
      filesRemoveGpsMetadata: false,
      filesRandomWordsNumAdjectives: 3,
      filesRandomWordsSeparator: '-',
    },
  });

  const onSubmit = async (values: typeof form.values) => {
    if (values.filesDefaultExpiration?.trim() === '' || !values.filesDefaultExpiration) {
      values.filesDefaultExpiration = null;
    } else {
      values.filesDefaultExpiration = values.filesDefaultExpiration.trim();
    }

    if (!values.filesDisabledExtensions) {
      // @ts-ignore
      values.filesDisabledExtensions = [];
    } else if (
      values.filesDisabledExtensions &&
      typeof values.filesDisabledExtensions === 'string' &&
      values.filesDisabledExtensions.trim() === ''
    ) {
      // @ts-ignore
      values.filesDisabledExtensions = [];
    } else {
      if (!Array.isArray(values.filesDisabledExtensions))
        // @ts-ignore
        values.filesDisabledExtensions = values.filesDisabledExtensions
          .split(',')
          .map((ext) => ext.trim())
          .filter((ext) => ext !== '');
    }

    return settingsOnSubmit(router, form)(values);
  };

  useEffect(() => {
    form.setValues({
      filesRoute: data?.filesRoute ?? '/u',
      filesLength: data?.filesLength ?? 6,
      filesDefaultFormat: data?.filesDefaultFormat ?? 'random',
      filesDisabledExtensions: data?.filesDisabledExtensions.join(', ') ?? '',
      filesMaxFileSize: data?.filesMaxFileSize ?? '100mb',
      filesDefaultExpiration: data?.filesDefaultExpiration ?? '',
      filesAssumeMimetypes: data?.filesAssumeMimetypes ?? false,
      filesDefaultDateFormat: data?.filesDefaultDateFormat ?? 'YYYY-MM-DD_HH:mm:ss',
      filesRemoveGpsMetadata: data?.filesRemoveGpsMetadata ?? false,
      filesRandomWordsNumAdjectives: data?.filesRandomWordsNumAdjectives ?? 3,
      filesRandomWordsSeparator: data?.filesRandomWordsSeparator ?? '-',
    });
  }, [data]);

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>Files</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <EnvTooltip envVar='FILES_ROUTE' data={data} varKey='filesRoute'>
            <TextInput
              label='Route'
              description='The route to use for file uploads. Requires a server restart.'
              placeholder='/u'
              {...form.getInputProps('filesRoute')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FILES_LENGTH' data={data} varKey='filesLength'>
            <NumberInput
              label='Length'
              description='The length of the file name (for randomly generated names).'
              min={1}
              max={64}
              {...form.getInputProps('filesLength')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FILES_ASSUME_MIMETYPES' data={data} varKey='filesAssumeMimetypes'>
            <Switch
              label='Assume Mimetypes'
              description='Assume the mimetype of a file for its extension.'
              {...form.getInputProps('filesAssumeMimetypes', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FILES_REMOVE_GPS_METADATA' data={data} varKey='filesRemoveGpsMetadata'>
            <Switch
              label='Remove GPS Metadata'
              description='Remove GPS metadata from files.'
              {...form.getInputProps('filesRemoveGpsMetadata', { type: 'checkbox' })}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FILES_DEFAULT_FORMAT' data={data} varKey='filesDefaultFormat'>
            <Select
              label='Default Format'
              description='The default format to use for file names.'
              placeholder='random'
              data={['random', 'date', 'uuid', 'name', 'gfycat']}
              {...form.getInputProps('filesDefaultFormat')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FILES_DISABLED_EXTENSIONS' data={data} varKey='filesDisabledExtensions'>
            <TextInput
              label='Disabled Extensions'
              description='Extensions to disable, separated by commas.'
              placeholder='exe, bat, sh'
              {...form.getInputProps('filesDisabledExtensions')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FILES_MAX_FILE_SIZE' data={data} varKey='filesMaxFileSize'>
            <TextInput
              label='Max File Size'
              description='The maximum file size allowed.'
              placeholder='100mb'
              {...form.getInputProps('filesMaxFileSize')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FILES_DEFAULT_EXPIRATION' data={data} varKey='filesDefaultExpiration'>
            <TextInput
              label='Default Expiration'
              description='The default expiration time for files.'
              placeholder='30d'
              {...form.getInputProps('filesDefaultExpiration')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FILES_DEFAULT_DATE_FORMAT' data={data} varKey='filesDefaultDateFormat'>
            <TextInput
              label='Default Date Format'
              description='The default date format to use.'
              placeholder='YYYY-MM-DD_HH:mm:ss'
              {...form.getInputProps('filesDefaultDateFormat')}
            />
          </EnvTooltip>

          <EnvTooltip
            envVar='FILES_RANDOM_WORDS_NUM_ADJECTIVES'
            data={data}
            varKey='filesRandomWordsNumAdjectives'
          >
            <NumberInput
              label='Random Words Num Adjectives'
              description='The number of adjectives to use for the random-words/gfycat format.'
              min={1}
              max={10}
              {...form.getInputProps('filesRandomWordsNumAdjectives')}
            />
          </EnvTooltip>

          <EnvTooltip envVar='FILES_RANDOM_WORDS_SEPARATOR' data={data} varKey='filesRandomWordsSeparator'>
            <TextInput
              label='Random Words Separator'
              description='The separator to use for the random-words/gfycat format.'
              placeholder='-'
              {...form.getInputProps('filesRandomWordsSeparator')}
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
