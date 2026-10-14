import Markdown from '@/components/render/Markdown';
import { Response } from '@/lib/api/response';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { Container, LoadingOverlay } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import GenericError from '../../error/GenericError';

export function Component() {
  const { t } = useTranslation('auth');
  useTitle(t('tos.pageTitle'));

  const {
    data: config,
    error,
    isLoading,
  } = useSWR<Response['/api/server/public']>('/api/server/public', {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenHidden: false,
    revalidateIfStale: false,
  });

  if (isLoading) return <LoadingOverlay visible />;

  if (error)
    return <GenericError title={t('tos.error.title')} message={t('tos.error.message')} details={error} />;

  return (
    <>
      <Container my='lg'>
        <Markdown md={config?.tos || ''} />
      </Container>
    </>
  );
}

Component.displayName = 'Tos';
