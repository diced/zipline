import { Response } from '@/lib/api/response';
import type { Url } from '@/lib/db/models/url';
import { Center, Group, Paper, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import EditUrlModal from '../EditUrlModal';
import UrlCard from '../UrlCard';
import QRCodeModal from '@/components/QRCodeModal';
import { formatRootUrl } from '@/lib/url';
import { useConfig } from '@/components/ConfigProvider';

export default function UrlGridView() {
  const { t } = useTranslation('urls');
  const config = useConfig();
  const { data: urls, isLoading } = useSWR<Extract<Response['/api/user/urls'], Url[]>>('/api/user/urls');
  const [selectedUrl, setSelectedUrl] = useState<Url | null>(null);
  const [qrOpen, setQrOpen] = useState<Url | null>(null);

  return (
    <>
      <EditUrlModal url={selectedUrl} onClose={() => setSelectedUrl(null)} />
      <QRCodeModal
        url={qrOpen ? formatRootUrl(config.urls.route, qrOpen.vanity ?? qrOpen.code) : ''}
        opened={!!qrOpen}
        onClose={() => setQrOpen(null)}
      />

      {isLoading ? (
        <SimpleGrid
          my='sm'
          spacing='md'
          cols={{
            base: 1,
            md: 2,
            lg: 4,
          }}
          pos='relative'
        >
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height={120} animate />
          ))}
        </SimpleGrid>
      ) : (urls?.length ?? 0 !== 0) ? (
        <SimpleGrid
          my='sm'
          spacing='md'
          cols={{
            base: 1,
            md: 2,
            lg: 4,
          }}
          pos='relative'
        >
          {urls?.map((url) => (
            <UrlCard setSelectedUrl={setSelectedUrl} setQrOpen={setQrOpen} key={url.id} url={url} />
          ))}
        </SimpleGrid>
      ) : (
        <Paper withBorder p='sm' my='sm'>
          <Center>
            <Stack>
              <Group>
                <IconLink size='2rem' />
                <Title order={2}>{t('empty.title')}</Title>
              </Group>
              <Text size='sm' c='dimmed'>
                {t('empty.description')}
              </Text>
            </Stack>
          </Center>
        </Paper>
      )}
    </>
  );
}
