import { useConfig } from '@/components/ConfigProvider';
import { Response } from '@/lib/api/response';
import { User } from '@/lib/db/models/user';
import { settingsOnSubmit } from '@/components/pages/serverSettings/settingsOnSubmit';
import {
  Button,
  LoadingOverlay,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSWR from 'swr';

export default function Files({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const config = useConfig();
  const { data: usersData } = useSWR<Response['/api/users']>('/api/users');

  const form = useForm<{
    filesRoute: string;
    filesLength: number;
    filesDefaultFormat: string;
    filesDisabledExtensions: string;
    filesMaxFileSize: string;
    filesDefaultExpiration: string | null;
    filesEnforcedExpirationEnabled: boolean;
    filesEnforcedExpiration: string | null;
    filesEnforcedExpirationBypassAdmins: boolean;
    filesEnforcedExpirationBypassUsers: string[];
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
      filesDefaultExpiration: null,
      filesEnforcedExpirationEnabled: false,
      filesEnforcedExpiration: null,
      filesEnforcedExpirationBypassAdmins: false,
      filesEnforcedExpirationBypassUsers: [],
      filesAssumeMimetypes: false,
      filesDefaultDateFormat: 'YYYY-MM-DD_HH:mm:ss',
      filesRemoveGpsMetadata: false,
      filesRandomWordsNumAdjectives: 3,
      filesRandomWordsSeparator: '-',
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data?.tampered?.includes(payload.field) || false,
    }),
  });

  const onSubmit = async (values: typeof form.values) => {
    if (values.filesDefaultExpiration?.trim() === '' || !values.filesDefaultExpiration) {
      values.filesDefaultExpiration = null;
    } else {
      values.filesDefaultExpiration = values.filesDefaultExpiration.trim();
    }

    if (values.filesEnforcedExpiration?.trim() === '' || !values.filesEnforcedExpiration) {
      values.filesEnforcedExpiration = null;
    } else {
      values.filesEnforcedExpiration = values.filesEnforcedExpiration.trim();
    }

    if (!values.filesDisabledExtensions) {
      // @ts-ignore
      values.filesDisabledExtensions = [];
    } else if (
      values.filesDisabledExtensions &&
      typeof values.filesDisabledExtensions === 'string'
    ) {
      // @ts-ignore
      values.filesDisabledExtensions = values.filesDisabledExtensions
        .split(',')
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
    }

    return settingsOnSubmit(router, form)(values);
  };

  useEffect(() => {
    if (!data) return;

    form.setValues({
      filesRoute: data.settings.filesRoute ?? '/u',
      filesLength: data.settings.filesLength ?? 6,
      filesDefaultFormat: data.settings.filesDefaultFormat ?? 'random',
      filesDisabledExtensions: data.settings.filesDisabledExtensions.join(', ') ?? '',
      filesMaxFileSize: data.settings.filesMaxFileSize ?? '100mb',
      filesDefaultExpiration: data.settings.filesDefaultExpiration ?? null,
      filesEnforcedExpirationEnabled: data.settings.filesEnforcedExpirationEnabled ?? false,
      filesEnforcedExpiration: data.settings.filesEnforcedExpiration ?? null,
      filesEnforcedExpirationBypassAdmins: data.settings.filesEnforcedExpirationBypassAdmins ?? false,
      filesEnforcedExpirationBypassUsers: data.settings.filesEnforcedExpirationBypassUsers ?? [],
      filesAssumeMimetypes: data.settings.filesAssumeMimetypes ?? false,
      filesDefaultDateFormat: data.settings.filesDefaultDateFormat ?? 'YYYY-MM-DD_HH:mm:ss',
      filesRemoveGpsMetadata: data.settings.filesRemoveGpsMetadata ?? false,
      filesRandomWordsNumAdjectives: data.settings.filesRandomWordsNumAdjectives ?? 3,
      filesRandomWordsSeparator: data.settings.filesRandomWordsSeparator ?? '-',
    });
  }, [data]);

  const userOptions = Array.isArray(usersData) 
    ? usersData.map((user: User) => ({
        value: user.id,
        label: `${user.username} (${user.role})`,
      }))
    : [];

  return (
    <Paper withBorder p='sm' pos='relative'>
      <LoadingOverlay visible={isLoading} />

      <Title order={2}>Files</Title>

      <form onSubmit={form.onSubmit(onSubmit)}>
        <SimpleGrid mt='md' cols={{ base: 1, md: 2 }} spacing='lg'>
          <TextInput
            label='Route'
            description='The route to use for file uploads. Requires a server restart.'
            placeholder='/u'
            {...form.getInputProps('filesRoute')}
          />

          <NumberInput
            label='Length'
            description='The length of the file name (for randomly generated names).'
            placeholder='6'
            min={1}
            max={64}
            {...form.getInputProps('filesLength')}
          />

          <Select
            data={[
              { value: 'random', label: 'Random' },
              { value: 'date', label: 'Date' },
              { value: 'uuid', label: 'UUID' },
              { value: 'name', label: 'Use file name' },
              { value: 'gfycat', label: 'Gfycat-style name' },
              { value: 'random-words', label: 'Random words' },
            ]}
            label='Default Format'
            description='The default format to use for file names.'
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
            label='Default Expiration'
            description='The default expiration time for files.'
            placeholder='30d'
            {...form.getInputProps('filesDefaultExpiration')}
          />

          <Switch
            label='Enforced Expiration Enabled'
            description='Enforce a default expiration time for all files. This will override any user-provided expiration.'
            {...form.getInputProps('filesEnforcedExpirationEnabled', { type: 'checkbox' })}
          />

          {form.values.filesEnforcedExpirationEnabled && (
            <>
              <TextInput
                label='Enforced Expiration'
                description='The enforced expiration time for all files (e.g., 30d, 1h, 1y).'
                placeholder='7d'
                {...form.getInputProps('filesEnforcedExpiration')}
              />

              <Switch
                label='Bypass for Administrators'
                description='Allow administrators to bypass enforced expiration.'
                {...form.getInputProps('filesEnforcedExpirationBypassAdmins', { type: 'checkbox' })}
              />

              <Select
                label='Bypass for Specific Users'
                description='Select specific users who can bypass enforced expiration.'
                placeholder='Select users'
                data={userOptions}
                searchable
                multiple
                clearable
                {...form.getInputProps('filesEnforcedExpirationBypassUsers')}
              />
            </>
          )}

          <Switch
            label='Assume Mimetypes'
            description='Assume the mimetype of a file for its extension.'
            {...form.getInputProps('filesAssumeMimetypes', { type: 'checkbox' })}
          />

          <TextInput
            label='Default Date Format'
            description='The default date format to use.'
            placeholder='YYYY-MM-DD_HH:mm:ss'
            {...form.getInputProps('filesDefaultDateFormat')}
          />

          <Switch
            label='Remove GPS Metadata'
            description='Remove GPS metadata from files.'
            {...form.getInputProps('filesRemoveGpsMetadata', { type: 'checkbox' })}
          />

          <NumberInput
            label='Random Words Number of Adjectives'
            description='The number of adjectives to use for the random-words/gfycat format.'
            placeholder='3'
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
        </SimpleGrid>

        <Button type='submit' mt='md' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save
        </Button>
      </form>
    </Paper>
  );
}
