import { Box, Button, Modal, PasswordInput, Title } from '@mantine/core';
import type { File, Thumbnail } from '@prisma/client';
import AnchorNext from 'components/AnchorNext';
import exts from 'lib/exts';
import prisma from 'lib/prisma';
import { parseString } from 'lib/utils/parser';
import type { UserExtended } from 'middleware/withZipline';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import zconfig from 'lib/config';

export default function EmbeddedFile({
  file,
  user,
  pass,
  prismRender,
  host,
  compress,
}: {
  file: File & { imageProps?: HTMLImageElement; thumbnail: Thumbnail };
  user: UserExtended;
  pass: boolean;
  prismRender: boolean;
  host: string;
  compress?: boolean;
}) {
  const dataURL = (route: string, pass?: string) =>
    `${route}/${encodeURIComponent(file.name)}?compress=${compress ?? false}${
      pass ? `&password=${encodeURIComponent(pass)}` : ''
    }`;

  const router = useRouter();
  const [opened, setOpened] = useState(pass || !!file.password);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [downloadWPass, setDownloadWPass] = useState(false);

  // reapply date from workaround
  file.createdAt = new Date(file ? file.createdAt : 0);

  const check = async () => {
    const res = await fetch(`/api/auth/image?id=${file.id}&password=${encodeURIComponent(password)}`);

    if (res.ok) {
      setError('');
      if (prismRender) return router.push(`/code/${file.name}?password=${password}`);
      updateImage(`/api/auth/image?id=${file.id}&password=${password}`);
      setOpened(false);
      setDownloadWPass(true);
    } else {
      setError('Invalid password');
    }
  };

  const updateImage = async (url?: string) => {
    if (!file.mimetype.startsWith('image')) return;

    const imageEl = document.getElementById('image_content') as HTMLImageElement;

    const img = new Image();
    img.addEventListener('load', function () {
      if (this.naturalWidth > innerWidth)
        imageEl.width = Math.floor(
          this.naturalWidth * Math.min(innerHeight / this.naturalHeight, innerWidth / this.naturalWidth),
        );
      else imageEl.width = this.naturalWidth;
    });

    img.src = url || dataURL('/r');
    if (url) {
      imageEl.src = url;
    }
    file.imageProps = img;
  };

  useEffect(() => {
    if (pass) {
      setOpened(true);
    } else {
      updateImage();
    }
  }, []);

  return (
    <>
      <Head>
        {user.embed.title && file.embed && (
          <meta property='og:title' content={parseString(user.embed.title, { file: file, user })} />
        )}

        {user.embed.description && file.embed && (
          <meta
            property='og:description'
            content={parseString(user.embed.description, { file: file, user })}
          />
        )}

        {user.embed.siteName && file.embed && (
          <meta property='og:site_name' content={parseString(user.embed.siteName, { file: file, user })} />
        )}

        {user.embed.color && file.embed && (
          <meta property='theme-color' content={parseString(user.embed.color, { file: file, user })} />
        )}

        {file.mimetype.startsWith('image') && (
          <>
            <meta property='og:type' content='image' />
            <meta property='og:image' itemProp='image' content={`${host}/r/${file.name}`} />
            <meta property='og:url' content={`${host}/r/${file.name}`} />
            <meta property='og:image:width' content={file.imageProps?.naturalWidth.toString()} />
            <meta property='og:image:height' content={file.imageProps?.naturalHeight.toString()} />
            <meta property='twitter:card' content='summary_large_image' />
            <meta property='twitter:image' content={`${host}/r/${file.name}`} />
            <meta property='twitter:title' content={file.name} />
          </>
        )}
        {file.mimetype.startsWith('video') && (
          <>
            <meta name='twitter:card' content='player' />
            <meta name='twitter:player' content={`${host}/r/${file.name}`} />
            <meta name='twitter:player:stream' content={`${host}/r/${file.name}`} />
            <meta name='twitter:player:stream:content_type' content={file.mimetype} />
            <meta name='twitter:title' content={file.name} />

            {file.thumbnail && (
              <>
                <meta name='twitter:image' content={`${host}/r/${file.thumbnail.name}`} />
                <meta property='og:image' content={`${host}/r/${file.thumbnail.name}`} />
              </>
            )}

            <meta property='og:type' content={'video.other'} />
            <meta property='og:url' content={`${host}/r/${file.name}`} />
            <meta property='og:video' content={`${host}/r/${file.name}`} />
            <meta property='og:video:url' content={`${host}/r/${file.name}`} />
            <meta property='og:video:secure_url' content={`${host}/r/${file.name}`} />
            <meta property='og:video:type' content={file.mimetype} />
          </>
        )}
        {file.mimetype.startsWith('audio') && (
          <>
            <meta name='twitter:card' content='player' />
            <meta name='twitter:player' content={`${host}/r/${file.name}`} />
            <meta name='twitter:player:stream' content={`${host}/r/${file.name}`} />
            <meta name='twitter:player:stream:content_type' content={file.mimetype} />
            <meta name='twitter:title' content={file.name} />
            <meta name='twitter:player:width' content='720' />
            <meta name='twitter:player:height' content='480' />

            <meta property='og:type' content='music.song' />
            <meta property='og:url' content={`${host}/r/${file.name}`} />
            <meta property='og:audio' content={`${host}/r/${file.name}`} />
            <meta property='og:audio:secure_url' content={`${host}/r/${file.name}`} />
            <meta property='og:audio:type' content={file.mimetype} />
          </>
        )}
        {!file.mimetype.startsWith('video') && !file.mimetype.startsWith('image') && (
          <meta property='og:url' content={`${host}/r/${file.name}`} />
        )}
        <title>{file.name}</title>
      </Head>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={<Title order={3}>Password Protected</Title>}
        centered={true}
        withCloseButton={false}
        closeOnEscape={false}
        closeOnClickOutside={false}
      >
        <PasswordInput
          placeholder='Password'
          error={error}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button fullWidth onClick={() => check()} mt='md'>
          Submit
        </Button>
      </Modal>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          minHeight: '100vh',
          justifyContent: 'center',
        }}
      >
        {file.mimetype.startsWith('image') && (
          <img src={dataURL('/r')} alt={dataURL('/r')} id='image_content' />
        )}

        {file.mimetype.startsWith('video') && (
          <video src={dataURL('/r')} controls autoPlay muted id='video_content' />
        )}

        {file.mimetype.startsWith('audio') && (
          <audio src={dataURL('/r')} controls autoPlay muted id='audio_content' />
        )}

        {!file.mimetype.startsWith('video') &&
          !file.mimetype.startsWith('image') &&
          !file.mimetype.startsWith('audio') && (
            <AnchorNext component={Link} href={dataURL('/r', downloadWPass ? password : undefined)}>
              Can&#39;t preview this file. Click here to download it.
            </AnchorNext>
          )}
      </Box>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };
  const { compress = null } = context.query as unknown as { compress?: boolean };
  const file = await prisma.file.findFirst({
    where: {
      OR: [{ name: id }, { invisible: { invis: decodeURI(encodeURI(id)) } }],
    },
    include: {
      thumbnail: true,
    },
  });
  let host = context.req.headers.host;
  if (!file) return { notFound: true };

  // @ts-ignore
  file.size = Number(file.size);

  const proto = context.req.headers['x-forwarded-proto'];
  try {
    if (
      JSON.parse(context.req.headers['cf-visitor'] as string).scheme === 'https' ||
      proto === 'https' ||
      zconfig.core.return_https
    )
      host = `https://${host}`;
    else host = `http://${host}`;
  } catch (e) {
    if (proto === 'https' || zconfig.core.return_https) host = `https://${host}`;
    else host = `http://${host}`;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: file.userId,
    },
  });
  delete user.password;
  delete user.totpSecret;
  delete user.token;

  // @ts-ignore workaround because next wont allow date
  file.createdAt = file.createdAt.toString();

  const prismRender = Object.keys(exts).includes(file.name.split('.').pop());
  if (prismRender && !file.password)
    return {
      redirect: {
        destination: `/code/${file.name}`,
        permanent: true,
      },
    };
  else if (prismRender && file.password) {
    const pass = file.password ? true : false;
    // @ts-ignore
    if (file.password) file.password = true;
    return {
      props: {
        file,
        user,
        pass,
        prismRender: true,
        host,
      },
    };
  }

  if (!file.mimetype.startsWith('image') && !file.mimetype.startsWith('video')) {
    const { default: datasource } = await import('lib/datasource');

    const data = await datasource.get(file.name);
    if (!data) return { notFound: true };

    // @ts-ignore
    if (file.password) file.password = true;

    return {
      props: {
        file,
        user,
        host,
      },
    };
  }

  // @ts-ignore
  if (file.password) file.password = true;

  return {
    props: {
      file,
      user,
      pass: file.password ? true : false,
      host,
      compress,
    },
  };
};
