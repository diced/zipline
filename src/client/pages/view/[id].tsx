import DashboardFileType from '@/components/file/DashboardFileType';
import TagPill from '@/components/pages/files/tags/TagPill';
import PasswordModal from '@/components/pages/view/PasswordModal';
import { useSsrData } from '@/components/ZiplineSSRProvider';
import { useTitle } from '@/lib/client/hooks/useTitle';
import type { ViewFileData } from '@/lib/ssr/viewData';
import { formatRootUrl } from '@/lib/url';
import {
  ActionIcon,
  Anchor,
  Box,
  Center,
  Collapse,
  Group,
  Paper,
  Text,
  Tooltip,
  Typography,
} from '@mantine/core';
import { IconDownload, IconExternalLink, IconInfoCircleFilled } from '@tabler/icons-react';
import * as sanitize from 'isomorphic-dompurify';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function ViewFileId() {
  const { t } = useTranslation('view');
  const data = useSsrData<ViewFileData>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null);

  const originalName = data && !data.requiresPassword ? data.file.originalName : null;
  useTitle(originalName ?? data?.file.name ?? t('file.pageTitle'));

  if (!data) return null;

  if (data.requiresPassword) {
    const { file } = data;

    return (
      <PasswordModal
        type='file'
        id={file.id}
        onUnlock={(token) => window.location.replace(formatRootUrl('/view', file.name, { token }))}
      />
    );
  }

  const { file, code, view, token } = data;
  const content = view.content && (
    <Typography>
      <Text
        mt={code ? undefined : 'sm'}
        ta={view.align}
        dangerouslySetInnerHTML={{
          __html: sanitize.sanitize(view.content, {
            USE_PROFILES: { html: true },
            FORBID_TAGS: code ? ['style', 'script'] : ['script'],
          }),
        }}
      />
    </Typography>
  );

  if (code) {
    return (
      <Box h='100dvh' style={{ display: 'flex', flexDirection: 'column' }}>
        <Paper withBorder radius={0} style={{ borderTop: 0, borderLeft: 0, borderRight: 0, flexShrink: 0 }}>
          <Group justify='space-between' py={5} px='xs'>
            <Text c='dimmed'>{file.originalName ?? file.name}</Text>

            <Group>
              <ActionIcon size='md' variant='outline' onClick={() => setDetailsOpen((o) => !o)}>
                <IconInfoCircleFilled size='1rem' />
              </ActionIcon>

              <ActionIcon
                size='md'
                variant='outline'
                component={Link}
                to={formatRootUrl('/raw', file.name, { download: 'true', token })}
                target='_blank'
              >
                <IconDownload size='1rem' />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>

        <Collapse expanded={detailsOpen} style={{ flexShrink: 0, maxHeight: '50%', overflowY: 'auto' }}>
          <Paper m='md' p='md' withBorder>
            {content}
          </Paper>
        </Collapse>

        <Box ref={setScrollParent} pos='relative' style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <DashboardFileType
            file={file}
            token={token}
            show
            code
            fullscreen
            unframed
            scrollParent={scrollParent}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Center h='100%'>
      <Paper m='md' p='md' shadow='md' radius='md' withBorder>
        <Group justify='space-between' mb='sm'>
          <Group>
            <Text size='lg' fw={700} display='flex'>
              {file.originalName ?? file.name}{' '}
            </Text>
            {file.tags && (
              <Group gap={4}>
                {file.tags.map((tag) => (
                  <TagPill key={tag.id} tag={tag} />
                ))}
              </Group>
            )}
            {file.folder &&
              (file.folder.public ? (
                <Tooltip label={t('file.viewFolder')}>
                  <Anchor
                    component={Link}
                    ml='sm'
                    to={`/folder/${file.folder.id}`}
                    target='_blank'
                    reloadDocument
                  >
                    {file.folder.name}
                  </Anchor>
                </Tooltip>
              ) : (
                <Text ml='sm' size='sm' c='dimmed'>
                  {file.folder.name}
                </Text>
              ))}
            {view.showMimetype && (
              <Text size='sm' c='dimmed' ml='sm' style={{ alignSelf: 'center' }}>
                {file.type}
              </Text>
            )}
          </Group>

          <Group gap='xs'>
            <ActionIcon.Group>
              <Tooltip label={t('file.viewRaw')}>
                <ActionIcon
                  size='md'
                  variant='outline'
                  component={Link}
                  to={formatRootUrl('/raw', file.name, { token })}
                  target='_blank'
                >
                  <IconExternalLink size='1rem' />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('file.download')}>
                <ActionIcon
                  size='md'
                  variant='outline'
                  component={Link}
                  to={formatRootUrl('/raw', file.name, { download: 'true', token })}
                  target='_blank'
                >
                  <IconDownload size='1rem' />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
          </Group>
        </Group>

        <DashboardFileType allowZoom file={file} token={token} show />

        {content}
      </Paper>
    </Center>
  );
}
