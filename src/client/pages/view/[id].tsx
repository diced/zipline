import DashboardFileType from '@/components/file/DashboardFileType';
import TagPill from '@/components/pages/files/tags/TagPill';
import { File } from '@/lib/db/models/file';
import { User } from '@/lib/db/models/user';
import { parseString } from '@/lib/parser';
import { type parserMetrics } from '@/lib/parser/metrics';
import { formatRootUrl } from '@/lib/url';
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Center,
  Collapse,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Text,
  Tooltip,
  Typography,
} from '@mantine/core';
import { IconDownload, IconExternalLink, IconInfoCircleFilled } from '@tabler/icons-react';
import * as sanitize from 'isomorphic-dompurify';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSsrData } from '../../../components/ZiplineSSRProvider';
import { getFile } from '../../ssr-view/server';
import { useTitle } from '@/lib/hooks/useTitle';

type SsrData = {
  file: Partial<NonNullable<Awaited<ReturnType<typeof getFile>>>>;
  password?: boolean;
  code: boolean;
  user?: Partial<User>;
  host: string;
  pw?: string | null;
  metrics?: Awaited<ReturnType<typeof parserMetrics>>;
  filesRoute?: string;
};

export default function ViewFileId() {
  const data = useSsrData<SsrData>();
  if (!data) return null;

  const { file, password, code, user, host, metrics, filesRoute, pw } = data;

  // Fix dates that were stringified during SSR
  if (file?.createdAt) (file as any).createdAt = new Date(file.createdAt);
  if (file?.updatedAt) (file as any).updatedAt = new Date(file.updatedAt);
  if (file?.deletesAt) (file as any).deletesAt = new Date(file.deletesAt);
  if (user?.createdAt) (user as any).createdAt = new Date(user.createdAt);
  if (user?.updatedAt) (user as any).updatedAt = new Date(user.updatedAt);

  const [passwordValue, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

  useTitle(file.originalName ?? file.name ?? 'View File');

  return password && !pw ? (
    <Modal onClose={() => {}} opened={true} withCloseButton={false} centered title='Password required'>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          const res = await fetch(`/api/user/files/${file.id}/password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: passwordValue.trim() }),
          });

          if (res.ok) {
            window.location.reload();
          } else {
            setPasswordError('Invalid password');
          }
        }}
      >
        <PasswordInput
          description='This file is password protected, enter password to view it'
          required
          mb='sm'
          value={passwordValue}
          onChange={(event) => setPassword(event.currentTarget.value)}
          error={passwordError}
        />

        <Button
          fullWidth
          variant='outline'
          my='sm'
          type='submit'
          disabled={passwordValue.trim().length === 0}
        >
          Verify
        </Button>
      </form>
    </Modal>
  ) : code ? (
    <>
      <Paper withBorder style={{ borderTop: 0, borderLeft: 0, borderRight: 0 }}>
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
              to={`/raw/${file.name}?download=true${pw ? `&pw=${encodeURIComponent(pw)}` : ''}`}
              target='_blank'
            >
              <IconDownload size='1rem' />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>

      <Collapse in={detailsOpen}>
        <Paper m='md' p='md' withBorder>
          {user?.view!.content && (
            <Typography>
              <Text
                ta={user?.view!.align ?? 'left'}
                dangerouslySetInnerHTML={{
                  __html: sanitize.sanitize(
                    parseString(user.view.content, {
                      file: file as unknown as File,
                      user: user as User,
                      link: {
                        returned: `${host}${formatRootUrl(filesRoute ?? '/u', file.name!)}`,
                        raw: `${host}/raw/${file.name}`,
                      },
                      ...metrics,
                    }) ?? '',
                    {
                      USE_PROFILES: { html: true },
                      FORBID_TAGS: ['style', 'script'],
                    },
                  ),
                }}
              />
            </Typography>
          )}
        </Paper>
      </Collapse>

      {file.name!.endsWith('.md') || file.name!.endsWith('.tex') ? (
        <Paper m='md' p='md' withBorder>
          <DashboardFileType file={file as unknown as File} password={pw} show code={code} />
        </Paper>
      ) : (
        <Box m='sm'>
          <DashboardFileType file={file as unknown as File} password={pw} show code={code} />
        </Box>
      )}
    </>
  ) : (
    <>
      <Center h='100%'>
        <Paper m='md' p='md' shadow='md' radius='md' withBorder>
          <Group justify='space-between' mb='sm'>
            <Group>
              <Text size='lg' fw={700} display='flex'>
                {file.originalName ?? file.name}{' '}
              </Text>
              {user?.view!.showTags && (
                <Group gap={4}>
                  {file.tags?.map((tag) => (
                    <TagPill key={tag.id} tag={tag} />
                  ))}
                </Group>
              )}
              {user?.view!.showFolder &&
                file.Folder &&
                (file.Folder.public ? (
                  <Tooltip label='View folder'>
                    <Anchor
                      component={Link}
                      ml='sm'
                      to={`/folder/${file.Folder.id}`}
                      target='_blank'
                      reloadDocument
                    >
                      {file.Folder.name}
                    </Anchor>
                  </Tooltip>
                ) : (
                  <Text ml='sm' size='sm' c='dimmed'>
                    {file.Folder.name}
                  </Text>
                ))}
              {user?.view!.showMimetype && (
                <Text size='sm' c='dimmed' ml='sm' style={{ alignSelf: 'center' }}>
                  {file.type}
                </Text>
              )}
            </Group>

            <ActionIcon.Group>
              <Tooltip label='View raw file'>
                <ActionIcon
                  size='md'
                  variant='outline'
                  component={Link}
                  to={`/raw/${file.name}${pw ? `?pw=${encodeURIComponent(pw)}` : ''}`}
                  target='_blank'
                >
                  <IconExternalLink size='1rem' />
                </ActionIcon>
              </Tooltip>
              <Tooltip label='Download file'>
                <ActionIcon
                  size='md'
                  variant='outline'
                  component={Link}
                  to={`/raw/${file.name}?download=true${pw ? `&pw=${encodeURIComponent(pw)}` : ''}`}
                  target='_blank'
                >
                  <IconDownload size='1rem' />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
          </Group>

          <DashboardFileType allowZoom file={file as unknown as File} password={pw} show />

          {user?.view!.content && (
            <Typography>
              <Text
                mt='sm'
                ta={user?.view.align ?? 'left'}
                dangerouslySetInnerHTML={{
                  __html: sanitize.sanitize(
                    parseString(user?.view.content, {
                      file: file as unknown as File,
                      link: {
                        returned: `${host}${formatRootUrl(filesRoute ?? '/u', file.name!)}`,
                        raw: `${host}/raw/${file.name}`,
                      },
                      user: user as User,
                      ...metrics,
                    }) ?? '',
                    {
                      USE_PROFILES: { html: true },
                      FORBID_TAGS: ['script'],
                    },
                  ),
                }}
              />
            </Typography>
          )}
        </Paper>
      </Center>
    </>
  );
}
