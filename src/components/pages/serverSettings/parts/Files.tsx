import { Response } from '@/lib/api/response';
import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconDeviceFloppy,
  IconServer,
  IconX,
  IconPlugConnected,
  IconLoader,
} from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { settingsOnSubmit } from '../settingsOnSubmit';

export default function Files({
  swr: { data, isLoading },
}: {
  swr: { data: Response['/api/server/settings'] | undefined; isLoading: boolean };
}) {
  const router = useRouter();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp: Date;
  } | null>(null);

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
    filesMountType: string;
    filesMountHost: string;
    filesMountPort: number | null;
    filesMountPath: string;
    filesMountUsername: string;
    filesMountPassword: string;
    filesMountDomain: string;
    filesMountEnabled: boolean;
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
      filesMountType: 'local',
      filesMountHost: '',
      filesMountPort: null,
      filesMountPath: '',
      filesMountUsername: '',
      filesMountPassword: '',
      filesMountDomain: '',
      filesMountEnabled: false,
    },
    enhanceGetInputProps: (payload) => ({
      disabled: data?.tampered?.includes(payload.field) || false,
    }),
  });

  // Standalone test connection function
  const testConnection = async () => {
    if (form.values.filesMountType === 'local') {
      notifications.show({
        title: '💡 Local Storage',
        message: "Local storage doesn't require connection testing.",
        color: 'blue',
        icon: <IconCheck size='1rem' />,
      });
      return;
    }

    setIsTestingConnection(true);
    setLastTestResult(null);

    try {
      const response = await fetch('/api/admin/mount-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.values.filesMountType,
          host: form.values.filesMountHost || undefined,
          port: form.values.filesMountPort || undefined,
          path: form.values.filesMountPath || undefined,
          username: form.values.filesMountUsername || undefined,
          password: form.values.filesMountPassword || undefined,
          domain: form.values.filesMountDomain || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Cannot connect to mount';
        const errorDetails = result.details ? `\n\nDetails: ${result.details}` : '';

        setLastTestResult({
          success: false,
          message: `${errorMessage}${errorDetails}`,
          timestamp: new Date(),
        });

        notifications.show({
          title: `❌ Connection Test Failed (${response.status})`,
          message: `${errorMessage}${errorDetails}`,
          color: 'red',
          icon: <IconX size='1rem' />,
          autoClose: 8000,
        });
      } else {
        const successMessage = result.message || 'Connection successful';

        setLastTestResult({
          success: true,
          message: successMessage,
          timestamp: new Date(),
        });

        notifications.show({
          title: '✅ Connection Test Successful',
          message: successMessage,
          color: 'green',
          icon: <IconCheck size='1rem' />,
          autoClose: 4000,
        });
      }
    } catch (error: any) {
      const errorMessage = `Network error: ${error.message || 'Failed to test mount connection'}`;

      setLastTestResult({
        success: false,
        message: errorMessage,
        timestamp: new Date(),
      });

      notifications.show({
        title: '⚠️ Connection Test Error',
        message: errorMessage,
        color: 'red',
        icon: <IconX size='1rem' />,
        autoClose: 8000,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

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

    // Auto-enable mount if not local, disable if local
    if (values.filesMountType !== 'local') {
      values.filesMountEnabled = true;

      // Test mount connection
      try {
        const response = await fetch('/api/admin/mount-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: values.filesMountType,
            host: values.filesMountHost || undefined,
            port: values.filesMountPort || undefined,
            path: values.filesMountPath || undefined,
            username: values.filesMountUsername || undefined,
            password: values.filesMountPassword || undefined,
            domain: values.filesMountDomain || undefined,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          // Log full error details to console for debugging
          console.error('Mount test failed:', {
            status: response.status,
            statusText: response.statusText,
            error: result.error,
            details: result.details,
            fullResponse: result,
          });

          const errorMessage = result.error || 'Cannot connect to mount';
          const errorDetails = result.details ? `\n\nDetails: ${result.details}` : '';

          // Update the test result state
          setLastTestResult({
            success: false,
            message: `${errorMessage}${errorDetails}`,
            timestamp: new Date(),
          });

          notifications.show({
            title: `❌ Mount Test Failed (${response.status})`,
            message: `${errorMessage}${errorDetails}\n\nSettings not saved.`,
            color: 'red',
            icon: <IconX size='1rem' />,
            autoClose: 8000,
          });
          return;
        }

        console.log('✅ Mount test successful, proceeding to save');

        // Update the test result state
        setLastTestResult({
          success: true,
          message: result.message || 'Connection verified. Saving settings...',
          timestamp: new Date(),
        });

        notifications.show({
          title: '✅ Mount Test Successful',
          message: 'Connection verified. Saving settings...',
          color: 'green',
          icon: <IconCheck size='1rem' />,
          autoClose: 3000,
        });
      } catch (error: any) {
        // Log network errors to console
        console.error('Mount test network error:', error);

        const errorMessage = `Network error: ${error.message || 'Failed to test mount connection'}`;

        // Update the test result state
        setLastTestResult({
          success: false,
          message: errorMessage,
          timestamp: new Date(),
        });

        notifications.show({
          title: '⚠️ Mount Test Error',
          message: `${errorMessage}\n\nSettings not saved.`,
          color: 'red',
          icon: <IconX size='1rem' />,
          autoClose: 8000,
        });
        return;
      }
    } else {
      // Disable mount if local storage is selected
      values.filesMountEnabled = false;
    }

    console.log('📤 Saving settings with values:', {
      filesMountType: values.filesMountType,
      filesMountHost: values.filesMountHost,
      filesMountUsername: values.filesMountUsername,
      filesMountEnabled: values.filesMountEnabled,
    });
    return settingsOnSubmit(router, form)(values);
  };

  useEffect(() => {
    if (!data) return;

    console.log('📥 Received data from server:', {
      filesMountType: data.settings.filesMountType,
      filesMountHost: data.settings.filesMountHost,
      filesMountUsername: data.settings.filesMountUsername,
      filesMountEnabled: data.settings.filesMountEnabled,
    });

    form.setValues({
      filesRoute: data.settings.filesRoute ?? '/u',
      filesLength: data.settings.filesLength ?? 6,
      filesDefaultFormat: data.settings.filesDefaultFormat ?? 'random',
      filesDisabledExtensions: data.settings.filesDisabledExtensions.join(', ') ?? '',
      filesMaxFileSize: data.settings.filesMaxFileSize ?? '100mb',
      filesDefaultExpiration: data.settings.filesDefaultExpiration ?? '',
      filesAssumeMimetypes: data.settings.filesAssumeMimetypes ?? false,
      filesDefaultDateFormat: data.settings.filesDefaultDateFormat ?? 'YYYY-MM-DD_HH:mm:ss',
      filesRemoveGpsMetadata: data.settings.filesRemoveGpsMetadata ?? false,
      filesRandomWordsNumAdjectives: data.settings.filesRandomWordsNumAdjectives ?? 3,
      filesRandomWordsSeparator: data.settings.filesRandomWordsSeparator ?? '-',
      filesMountType: data.settings.filesMountType ?? 'local',
      filesMountHost: data.settings.filesMountHost ?? '',
      filesMountPort: data.settings.filesMountPort ?? null,
      filesMountPath: data.settings.filesMountPath ?? '',
      filesMountUsername: data.settings.filesMountUsername ?? '',
      filesMountPassword: data.settings.filesMountPassword ?? '',
      filesMountDomain: data.settings.filesMountDomain ?? '',
      filesMountEnabled: data.settings.filesMountEnabled ?? false,
    });
  }, [data]);

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
            min={1}
            max={64}
            {...form.getInputProps('filesLength')}
          />

          <Switch
            label='Assume Mimetypes'
            description='Assume the mimetype of a file for its extension.'
            {...form.getInputProps('filesAssumeMimetypes', { type: 'checkbox' })}
          />

          <Switch
            label='Remove GPS Metadata'
            description='Remove GPS metadata from files.'
            {...form.getInputProps('filesRemoveGpsMetadata', { type: 'checkbox' })}
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
            label='Default Expiration'
            description='The default expiration time for files.'
            placeholder='30d'
            {...form.getInputProps('filesDefaultExpiration')}
          />

          <TextInput
            label='Default Date Format'
            description='The default date format to use.'
            placeholder='YYYY-MM-DD_HH:mm:ss'
            {...form.getInputProps('filesDefaultDateFormat')}
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
        </SimpleGrid>

        {/* Mount Configuration Section */}
        <Box mt='xl'>
          <Group gap='sm' mb='md' justify='space-between'>
            <Group gap='sm'>
              <IconServer size='1.5rem' />
              <Title order={3}>Storage Configuration</Title>
            </Group>

            {/* Connection Status Indicator */}
            {form.values.filesMountType !== 'local' && lastTestResult && (
              <Group gap='xs'>
                <Text size='xs' c='dimmed'>
                  Status:
                </Text>
                <Text
                  size='xs'
                  c={lastTestResult.success ? 'green' : 'red'}
                  fw={500}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {lastTestResult.success ? '🟢' : '🔴'}
                  {lastTestResult.success ? 'Connected' : 'Failed'}
                </Text>
              </Group>
            )}
          </Group>

          <Stack gap='md'>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing='md'>
              <TextInput
                label='Current Storage System'
                description='Currently configured storage type'
                value={
                  form.values.filesMountType === 'local'
                    ? '📁 Local Storage'
                    : form.values.filesMountType === 'webdav'
                      ? '🌐 WebDAV Server'
                      : '🖧 SMB/CIFS Share'
                }
                readOnly
                styles={{
                  input: {
                    fontWeight: 600,
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  },
                }}
              />

              <Select
                label='Storage Method'
                description='Select storage method to use'
                placeholder='Select method'
                data={[
                  { value: 'local', label: '📁 Local Storage' },
                  { value: 'webdav', label: '🌐 WebDAV Server' },
                  { value: 'smb', label: '🖧 SMB/CIFS Share' },
                ]}
                {...form.getInputProps('filesMountType')}
              />
            </SimpleGrid>

            {form.values.filesMountType === 'webdav' && (
              <>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing='md'>
                  <TextInput
                    label='WebDAV URL'
                    description='WebDAV server URL'
                    placeholder='https://cloud.dragoncode.dev/dav'
                    required
                    {...form.getInputProps('filesMountHost')}
                  />

                  <NumberInput
                    label='Port (Optional)'
                    description='Custom port'
                    placeholder='443'
                    min={1}
                    max={65535}
                    {...form.getInputProps('filesMountPort')}
                  />

                  <TextInput
                    label='Username'
                    description='WebDAV username'
                    placeholder='user@example.com'
                    required
                    {...form.getInputProps('filesMountUsername')}
                  />

                  <PasswordInput
                    label='Password'
                    description='WebDAV password or app token'
                    placeholder='••••••••'
                    required
                    {...form.getInputProps('filesMountPassword')}
                  />
                </SimpleGrid>
              </>
            )}

            {form.values.filesMountType === 'smb' && (
              <>
                <Stack gap='md'>
                  <TextInput
                    label='SMB Server'
                    description='Format: server/share/path (e.g., 192.168.200.30/whitedragon/space)'
                    placeholder='192.168.200.30/whitedragon/space'
                    required
                    {...form.getInputProps('filesMountHost')}
                  />

                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing='md'>
                    <TextInput
                      label='Username'
                      description='SMB username'
                      placeholder='whitedragon'
                      required
                      {...form.getInputProps('filesMountUsername')}
                    />

                    <PasswordInput
                      label='Password'
                      description='SMB password'
                      placeholder='••••••••'
                      required
                      {...form.getInputProps('filesMountPassword')}
                    />
                  </SimpleGrid>

                  <Text size='sm' c='dimmed' mt='xs'>
                    💡 Optional: Port defaults to 445, Domain defaults to WORKGROUP
                  </Text>
                </Stack>
              </>
            )}

            {form.values.filesMountType === 'local' && (
              <TextInput
                label='Local Path (Optional)'
                description='Specify a custom local directory for uploads (leave empty for default)'
                placeholder='/mnt/storage/uploads'
                {...form.getInputProps('filesMountPath')}
              />
            )}

            {/* Test Connection Section */}
            {form.values.filesMountType !== 'local' && (
              <Box mt='md' p='md' style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px' }}>
                <Group justify='space-between' align='flex-start'>
                  <Box flex={1}>
                    <Text size='sm' fw={500} mb='xs'>
                      🔌 Connection Test
                    </Text>
                    <Text size='xs' c='dimmed' mb='md'>
                      Test your mount configuration before saving settings
                    </Text>

                    {lastTestResult && (
                      <Box mb='md'>
                        <Text size='xs' c={lastTestResult.success ? 'green' : 'red'} fw={500}>
                          {lastTestResult.success ? '✅' : '❌'} Last test:{' '}
                          {lastTestResult.success ? 'Success' : 'Failed'}
                        </Text>
                        <Text size='xs' c='dimmed'>
                          {lastTestResult.timestamp.toLocaleString()}
                        </Text>
                        {!lastTestResult.success && (
                          <Text size='xs' c='red' mt='xs' style={{ fontFamily: 'monospace' }}>
                            {lastTestResult.message}
                          </Text>
                        )}
                      </Box>
                    )}
                  </Box>

                  <Button
                    variant='outline'
                    size='sm'
                    loading={isTestingConnection}
                    onClick={testConnection}
                    leftSection={
                      isTestingConnection ? <IconLoader size='1rem' /> : <IconPlugConnected size='1rem' />
                    }
                    disabled={
                      !form.values.filesMountHost ||
                      !form.values.filesMountUsername ||
                      !form.values.filesMountPassword
                    }
                  >
                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                  </Button>
                </Group>
              </Box>
            )}
          </Stack>
        </Box>

        <Button type='submit' mt='xl' loading={isLoading} leftSection={<IconDeviceFloppy size='1rem' />}>
          Save Settings
        </Button>
      </form>
    </Paper>
  );
}
