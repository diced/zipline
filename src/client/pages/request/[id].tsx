import ConfigProvider from '@/components/ConfigProvider';
import UploadFile from '@/components/pages/upload/File';
import FileUploadProvider from '@/components/upload/FileUploadProvider';
import { Response } from '@/lib/api/response';
import { bytes } from '@/lib/bytes';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { SafeConfig } from '@/lib/config/safe';
import { fetchApi } from '@/lib/fetchApi';
import {
  Alert,
  Badge,
  Button,
  Center,
  Container,
  Group,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconFileArrowRight, IconLock } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { data, Params, useLoaderData } from 'react-router-dom';

type PublicRequest = Extract<Response['/api/file-request/[id]'], { open: boolean }>;

export async function loader({ params }: { params: Params<string> }) {
  const [requestResponse, configResponse] = await Promise.all([
    fetch(`/api/file-request/${params.id}`),
    fetch('/api/server/public'),
  ]);
  if (!requestResponse.ok) throw data('File request not found', { status: 404 });
  if (!configResponse.ok) throw data('Could not load server settings', { status: 500 });

  return {
    request: (await requestResponse.json()) as PublicRequest,
    config: (await configResponse.json()) as Response['/api/server/public'],
  };
}

export function Component() {
  const { t } = useTranslation('fileRequests');
  const { request, config } = useLoaderData<typeof loader>();
  const [token, setToken] = useState<string>();
  const uploadRequest = useMemo(() => ({ id: request.id, token }), [request.id, token]);
  useTitle(t('public.pageTitle', { name: request.name }));

  const passwordForm = useForm({
    initialValues: { password: '' },
    validate: { password: (value) => (value ? null : t('public.passwordRequired')) },
  });

  const unlock = passwordForm.onSubmit(async ({ password }) => {
    const { data: result, error } = await fetchApi<{ token: string }>(
      `/api/file-request/${request.id}`,
      'POST',
      { password },
    );
    if (!result || error) {
      passwordForm.setFieldError('password', t('public.passwordInvalid'));
      return;
    }
    setToken(result.token);
    passwordForm.reset();
  });

  const unlocked = !request.passwordProtected || !!token;

  return (
    <Container size='md' my={{ base: 'md', sm: 'xl' }}>
      <Stack gap='md'>
        <div>
          <Group gap='xs' mb={4}>
            <IconFileArrowRight size='1.5rem' />
            <Title order={1}>{request.name}</Title>
          </Group>
          {request.description && (
            <Text c='dimmed' style={{ whiteSpace: 'pre-wrap' }}>
              {request.description}
            </Text>
          )}
        </div>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing='sm'>
          <Paper withBorder p='sm'>
            <Text c='dimmed' size='xs'>
              {t('public.filesReceived')}
            </Text>
            <Text fw={700}>
              {request.receivedFiles}
              {request.maxFiles ? ` / ${request.maxFiles}` : ''}
            </Text>
          </Paper>
          <Paper withBorder p='sm'>
            <Text c='dimmed' size='xs'>
              {t('public.sizeReceived')}
            </Text>
            <Text fw={700}>
              {bytes(request.receivedBytes)}
              {request.maxBytes ? ` / ${bytes(request.maxBytes)}` : ''}
            </Text>
          </Paper>
          <Paper withBorder p='sm'>
            <Text c='dimmed' size='xs'>
              {t('public.acceptedTypes')}
            </Text>
            <Group gap={5} mt={4}>
              {request.allowedTypes.length ? (
                request.allowedTypes.map((type) => (
                  <Badge key={type} variant='outline' color='gray'>
                    {type}
                  </Badge>
                ))
              ) : (
                <Text fw={700}>{t('public.anyType')}</Text>
              )}
            </Group>
          </Paper>
        </SimpleGrid>

        {!request.open ? (
          <Alert color='gray' title={t('public.closedTitle')}>
            {t('public.closedDescription')}
          </Alert>
        ) : !unlocked ? (
          <Paper withBorder p='lg'>
            <Center>
              <form onSubmit={unlock} style={{ width: '100%', maxWidth: 420 }}>
                <Stack>
                  <div>
                    <Group gap='xs'>
                      <IconLock size='1.2rem' />
                      <Text fw={700}>{t('public.passwordTitle')}</Text>
                    </Group>
                    <Text c='dimmed' size='sm'>
                      {t('public.passwordDescription')}
                    </Text>
                  </div>
                  <PasswordInput autoFocus {...passwordForm.getInputProps('password')} />
                  <Button type='submit' loading={passwordForm.submitting}>
                    {t('public.unlock')}
                  </Button>
                </Stack>
              </form>
            </Center>
          </Paper>
        ) : (
          <Paper withBorder p={{ base: 'sm', sm: 'md' }}>
            <ConfigProvider data={{ config: config as unknown as SafeConfig, codeMap: [] }}>
              <FileUploadProvider fileRequest={uploadRequest}>
                <UploadFile title={t('public.uploadTitle')} fileRequest />
              </FileUploadProvider>
            </ConfigProvider>
          </Paper>
        )}

        <Text c='dimmed' size='xs' ta='center'>
          {t('public.privacy')}
        </Text>
      </Stack>
    </Container>
  );
}

Component.displayName = 'FileRequest';
