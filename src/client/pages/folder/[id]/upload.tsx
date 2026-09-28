import ConfigProvider from '@/components/ConfigProvider';
import UploadFile from '@/components/pages/upload/File';
import { type Response } from '@/lib/api/response';
import { SafeConfig } from '@/lib/config/safe';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { Anchor, Center, Container, Text } from '@mantine/core';
import { Trans, useTranslation } from 'react-i18next';
import { data, Link, Params, useLoaderData } from 'react-router-dom';
import useSWR from 'swr';

export async function loader({ params }: { params: Params<string> }) {
  const res = await fetch(`/api/server/folder/${params.id}`);
  if (!res.ok) throw data('Folder not found', { status: 404 });

  const d = (await res.json()) as Response['/api/server/folder/[id]'];
  if (!d.folder) throw data('Folder not found', { status: 404 });

  return {
    folder: d.folder,
  };
}

export function Component() {
  const { t } = useTranslation('view');
  const { folder } = useLoaderData<typeof loader>();

  const { data: config } = useSWR<Response['/api/server/public']>('/api/server/public', {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenHidden: false,
    revalidateIfStale: false,
  });

  useTitle(
    folder.name != null
      ? t('folderUpload.pageTitle', { name: folder.name })
      : t('folderUpload.pageTitleFallback'),
  );

  return (
    <>
      <Container my='lg'>
        <ConfigProvider data={{ config: config as unknown as SafeConfig, codeMap: [] }}>
          <UploadFile title={t('folderUpload.title', { name: folder.name })} folder={folder.id} />
          <Center>
            <Text c='dimmed' ta='center'>
              {folder.public ? (
                <Trans
                  t={t}
                  i18nKey='folderUpload.public'
                  components={{
                    link: <Anchor component={Link} to={`/folder/${folder.id}`} reloadDocument />,
                  }}
                />
              ) : (
                t('folderUpload.private')
              )}
            </Text>
          </Center>
        </ConfigProvider>
      </Container>
    </>
  );
}

Component.displayName = 'ViewFolderIdUpload';
