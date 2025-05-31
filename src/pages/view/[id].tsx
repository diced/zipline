import DashboardFileType from '@/components/file/DashboardFileType';
import TagPill from '@/components/pages/files/tags/TagPill';
import { isCode } from '@/lib/code';
import { config as zConfig } from '@/lib/config';
import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { fileSelect, type File } from '@/lib/db/models/file';
import { User, userSelect } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { parseString } from '@/lib/parser';
import { parserMetrics } from '@/lib/parser/metrics';
import { ZiplineTheme } from '@/lib/theme';
import { readThemes } from '@/lib/theme/file';
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
  TypographyStylesProvider,
} from '@mantine/core';
import { IconDownload, IconExternalLink, IconInfoCircleFilled } from '@tabler/icons-react';
import { sanitize } from 'isomorphic-dompurify';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ViewFileId({
  file,
  password,
  pw,
  code,
  user,
  host,
  metrics,
  filesRoute,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  file.createdAt = new Date(file.createdAt!);
  file.updatedAt = new Date(file.updatedAt!);
  file.deletesAt = file.deletesAt ? new Date(file.deletesAt) : null;

  if (user) {
    user.createdAt = new Date(user.createdAt!);
    user.updatedAt = new Date(user.updatedAt!);
  }

  const router = useRouter();

  const [passwordValue, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

  const verifyPassword = async () => {
    const { error } = await fetchApi(`/api/user/files/${file.id}/password`, 'POST', {
      password: passwordValue.trim(),
    });

    if (error) {
      setPasswordError('Invalid password');
    } else {
      setPasswordError('');
      router.replace(`/view/${file.name}?pw=${encodeURI(passwordValue.trim())}`);
    }
  };

  const meta = (
    <Head>
      {user?.view!.embedTitle && user?.view.embed && (
        <meta
          property='og:title'
          content={
            parseString(user.view.embedTitle, {
              file: file as unknown as File,
              user: user as User,
              ...metrics,
            }) ?? ''
          }
        />
      )}
      {user?.view!.embedDescription && user?.view.embed && (
        <meta
          property='og:description'
          content={
            parseString(user.view.embedDescription, {
              file: file as unknown as File,
              user: user as User,
              ...metrics,
            }) ?? ''
          }
        />
      )}
      {user?.view!.embedSiteName && user?.view.embed && (
        <meta
          property='og:site_name'
          content={
            parseString(user.view.embedSiteName, {
              file: file as unknown as File,
              user: user as User,
              ...metrics,
            }) ?? ''
          }
        />
      )}
      {user?.view!.embedColor && user?.view.embed && (
        <meta
          property='theme-color'
          content={
            parseString(user.view.embedColor, {
              file: file as unknown as File,
              user: user as User,
              ...metrics,
            }) ?? ''
          }
        />
      )}

      {file.type!.startsWith('image') && (
        <>
          <meta property='og:type' content='image' />
          <meta property='og:image' itemProp='image' content={`${host}/raw/${file.name}`} />
          <meta property='og:url' content={`${host}/raw/${file.name}`} />
          <meta property='twitter:card' content='summary_large_image' />
          <meta property='twitter:image' content={`${host}/raw/${file.name}`} />
          <meta property='twitter:title' content={file.name} />
        </>
      )}

      {file.type!.startsWith('video') && (
        <>
          {file.thumbnail && <meta property='og:image' content={`${host}/raw/${file.thumbnail.path}`} />}

          <meta property='og:type' content='video.other' />
          <meta property='og:video:url' content={`${host}/raw/${file.name}`} />
          <meta property='og:video:width' content='1920' />
          <meta property='og:video:height' content='1080' />
        </>
      )}

      {file.type!.startsWith('audio') && (
        <>
          <meta name='twitter:card' content='player' />
          <meta name='twitter:player' content={`${host}/raw/${file.name}`} />
          <meta name='twitter:player:stream' content={`${host}/raw/${file.name}`} />
          <meta name='twitter:player:stream:content_type' content={file.type} />
          <meta name='twitter:title' content={file.name} />
          <meta name='twitter:player:width' content='720' />
          <meta name='twitter:player:height' content='480' />

          <meta property='og:type' content='music.song' />
          <meta property='og:url' content={`${host}/raw/${file.name}`} />
          <meta property='og:audio' content={`${host}/raw/${file.name}`} />
          <meta property='og:audio:secure_url' content={`${host}/raw/${file.name}`} />
          <meta property='og:audio:type' content={file.type} />
        </>
      )}

      {!file.type!.startsWith('video') && !file.type!.startsWith('image') && (
        <meta property='og:url' content={`${host}/raw/${file.name}`} />
      )}

      <title>{file.name}</title>
    </Head>
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return password && !pw ? (
    <Modal onClose={() => {}} opened={true} withCloseButton={false} centered title='Password required'>
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
        onClick={() => verifyPassword()}
        disabled={passwordValue.trim().length === 0}
      >
        Verify
      </Button>
    </Modal>
  ) : code ? (
    <>
      {meta}
      <Paper withBorder style={{ borderTop: 0, borderLeft: 0, borderRight: 0 }}>
        <Group justify='space-between' py={5} px='xs'>
          <Text c='dimmed'>{file.name}</Text>

          <Group>
            <ActionIcon size='md' variant='outline' onClick={() => setDetailsOpen((o) => !o)}>
              <IconInfoCircleFilled size='1rem' />
            </ActionIcon>

            <ActionIcon
              size='md'
              variant='outline'
              component={Link}
              href={`/raw/${file.name}?download=true${pw ? `&pw=${pw}` : ''}`}
              target='_blank'
            >
              <IconDownload size='1rem' />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>

      <Collapse in={detailsOpen}>
        <Paper m='md' p='md' withBorder>
          {mounted && user?.view!.content && (
            <TypographyStylesProvider>
              <Text
                ta={user?.view!.align ?? 'left'}
                dangerouslySetInnerHTML={{
                  __html: sanitize(
                    parseString(user.view.content, {
                      file: file as unknown as File,
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
            </TypographyStylesProvider>
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
      {meta}
      <Center h='100%'>
        <Paper m='md' p='md' shadow='md' radius='md' withBorder>
          <Group justify='space-between' mb='sm'>
            <Group>
              <Text size='lg' fw={700} display='flex'>
                {file.name}{' '}
              </Text>
              {user?.view!.showTags && (
                <Group gap={4}>{file.tags?.map((tag) => <TagPill key={tag.id} tag={tag} />)}</Group>
              )}
              {user?.view!.showFolder &&
                file.Folder &&
                (file.Folder.public ? (
                  <Tooltip label='View folder'>
                    <Anchor component={Link} ml='sm' href={`/folder/${file.Folder.id}`}>
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
                  href={`/raw/${file.name}${pw ? `?pw=${pw}` : ''}`}
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
                  href={`/raw/${file.name}?download=true${pw ? `&pw=${pw}` : ''}`}
                  target='_blank'
                >
                  <IconDownload size='1rem' />
                </ActionIcon>
              </Tooltip>
            </ActionIcon.Group>
          </Group>

          <DashboardFileType allowZoom file={file as unknown as File} password={pw} show />

          {mounted && user?.view!.content && (
            <TypographyStylesProvider>
              <Text
                mt='sm'
                ta={user?.view.align ?? 'left'}
                dangerouslySetInnerHTML={{
                  __html: sanitize(
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
            </TypographyStylesProvider>
          )}
        </Paper>
      </Center>
    </>
  );
}

const getFile = async (id: string) =>
  prisma.file.findFirst({
    where: {
      name: id as string,
    },
    select: {
      ...fileSelect,
      password: true,
      userId: true,
      thumbnail: {
        select: {
          path: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },

      Folder: {
        select: {
          id: true,
          public: true,
          name: true,
        },
      },
    },
  });

export const getServerSideProps: GetServerSideProps<{
  file: Partial<NonNullable<Awaited<ReturnType<typeof getFile>>>>;
  password?: boolean;
  pw?: string;
  code: boolean;
  user?: Partial<User>;
  host: string;
  themes: ZiplineTheme[];
  metrics?: Awaited<ReturnType<typeof parserMetrics>>;
  filesRoute?: string;
}> = async (context) => {
  const { id, pw } = context.query;
  if (!id) return { notFound: true };

  const { config: libConfig, reloadSettings } = await import('@/lib/config');
  if (!libConfig) await reloadSettings();

  const file = await getFile(id as string);
  if (!file || !file.userId) return { notFound: true };

  if (file.maxViews && file.views >= file.maxViews) return { notFound: true };
  if (file.deletesAt && file.deletesAt <= new Date()) return { notFound: true };

  const user = await prisma.user.findFirst({
    where: {
      id: file.userId,
    },
    select: {
      ...userSelect,
      oauthProviders: false,
      passkeys: false,
      sessions: false,
      totpSecret: false,
      quota: false,
    },
  });
  if (!user) return { notFound: true };

  let host = context.req.headers.host;

  const proto = context.req.headers['x-forwarded-proto'];
  try {
    if (
      JSON.parse(context.req.headers['cf-visitor'] as string).scheme === 'https' ||
      proto === 'https' ||
      zConfig.core.returnHttpsUrls
    )
      host = `https://${host}`;
    else host = `http://${host}`;
  } catch {
    if (proto === 'https' || zConfig.core.returnHttpsUrls) host = `https://${host}`;
    else host = `http://${host}`;
  }

  // convert date to string dumb nextjs :@
  (file as any).createdAt = file.createdAt.toISOString();
  (file as any).updatedAt = file.updatedAt.toISOString();
  (file as any).deletesAt = file.deletesAt?.toISOString() || null;

  (user as any).createdAt = user.createdAt.toISOString();
  (user as any).updatedAt = user.updatedAt.toISOString();

  const code = await isCode(file.name);
  const themes = await readThemes();
  const metrics = await parserMetrics(user.id);

  if (pw && file.password) {
    const verified = await verifyPassword(pw as string, file.password);
    if (!verified) return { notFound: true };

    delete (file as any).password;

    return {
      props: {
        config: {
          website: {
            theme: zConfig.website.theme,
          },
        },
        file,
        pw: pw as string,
        user,
        code,
        host,
        themes,
        metrics,
        filesRoute: zConfig.files.route,
      },
    };
  } else if (file.password && !pw) {
    delete (file as any).password;

    return {
      props: {
        file: {
          name: file.name,
          type: file.type,
          id: file.id,
        },
        password: true,
        code,
        user,
        host,
        themes,
        metrics,
        config: {
          website: {
            theme: zConfig.website.theme,
          },
        },
      },
    };
  }

  const password = !!file.password;
  delete (file as any).password;

  await prisma.file.update({
    where: {
      id: file.id,
    },
    data: {
      views: {
        increment: 1,
      },
    },
  });

  return {
    props: {
      file,
      password,
      code,
      user,
      host,
      themes,
      metrics,
      filesRoute: zConfig.files.route,
      config: {
        website: {
          theme: zConfig.website.theme,
        },
      },
    },
  };
};
