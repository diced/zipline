import { Box, Button, Modal, PasswordInput } from '@mantine/core';
import type { File } from '@prisma/client';
import Link from 'components/Link';
import exts from 'lib/exts';
import prisma from 'lib/prisma';
import { parseString } from 'lib/utils/parser';
import type { UserExtended } from 'middleware/withZipline';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function EmbeddedFile({
  file,
  user,
  pass,
  prismRender,
}: {
  file: File;
  user: UserExtended;
  pass: boolean;
  prismRender: boolean;
}) {
  const dataURL = (route: string) => `${route}/${encodeURI(file.name)}`;

  const router = useRouter();
  const [opened, setOpened] = useState(pass);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // reapply date from workaround
  file.createdAt = new Date(file ? file.createdAt : 0);

  const check = async () => {
    const res = await fetch(`/api/auth/image?id=${file.id}&password=${encodeURIComponent(password)}`);

    if (res.ok) {
      setError('');
      if (prismRender) return router.push(`/code/${file.name}?password=${password}`);
      updateImage(`/api/auth/image?id=${file.id}&password=${password}`);
      setOpened(false);
    } else {
      setError('Invalid password');
    }
  };

  const updateImage = async (url?: string) => {
    const imageEl = document.getElementById('image_content') as HTMLImageElement;

    const img = new Image();
    img.addEventListener('load', function () {
      if (this.naturalWidth > innerWidth)
        imageEl.width = Math.floor(
          this.naturalWidth * Math.min(innerHeight / this.naturalHeight, innerWidth / this.naturalWidth)
        );
      else imageEl.width = this.naturalWidth;
    });

    img.src = url || dataURL('/r');
    if (url) {
      imageEl.src = url;
    }
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
            <meta property='og:image' content={`/r/${file.name}`} />
            <meta property='twitter:card' content='summary_large_image' />
          </>
        )}
        {file.mimetype.startsWith('video') && (
          <>
            <meta name='twitter:card' content='player' />
            <meta name='twitter:player:stream' content={`/r/${file.name}`} />
            <meta name='twitter:player:width' content='720' />
            <meta name='twitter:player:height' content='480' />
            <meta name='twitter:player:stream:content_type' content={file.mimetype} />
            <meta name='twitter:title' content={file.name} />

            <meta property='og:url' content={`/r/${file.name}`} />
            <meta property='og:video' content={`/r/${file.name}`} />
            <meta property='og:video:url' content={`/r/${file.name}`} />
            <meta property='og:video:secure_url' content={`/r/${file.name}`} />
            <meta property='og:video:type' content={file.mimetype} />
            <meta property='og:video:width' content='720' />
            <meta property='og:video:height' content='480' />
          </>
        )}
        {!file.mimetype.startsWith('video') && !file.mimetype.startsWith('image') && (
          <meta property='og:url' content={`/r/${file.name}`} />
        )}
        <title>{file.name}</title>
      </Head>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title='Password Protected'
        centered={true}
        withCloseButton={true}
        closeOnEscape={false}
        closeOnClickOutside={false}
        overlayProps={{ blur: 3 }}
      >
        <PasswordInput
          label='Password'
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
            <Link href={dataURL('/r')}>Can&#39;t preview this file. Click here to download it.</Link>
          )}
      </Box>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  const file = await prisma.file.findFirst({
    where: {
      OR: [{ name: id }, { invisible: { invis: decodeURI(encodeURI(id)) } }],
    },
  });
  if (!file) return { notFound: true };

  const user = await prisma.user.findFirst({
    where: {
      id: file.userId,
    },
  });
  delete user.password;
  delete user.totpSecret;

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
        image: file,
        user,
        pass,
        prismRender: true,
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
    },
  };
};
