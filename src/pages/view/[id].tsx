import { Box, Button, Modal, PasswordInput } from '@mantine/core';
import type { Image } from '@prisma/client';
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
  image,
  user,
  pass,
  prismRender,
}: {
  image: Image;
  user: UserExtended;
  pass: boolean;
  prismRender: boolean;
}) {
  const dataURL = (route: string) => `${route}/${image.file}`;

  const router = useRouter();
  const [opened, setOpened] = useState(pass);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // reapply date from workaround
  image.created_at = new Date(image ? image.created_at : 0);

  const check = async () => {
    const res = await fetch(`/api/auth/image?id=${image.id}&password=${password}`);

    if (res.ok) {
      setError('');
      if (prismRender) return router.push(`/code/${image.file}?password=${password}`);
      updateImage(`/api/auth/image?id=${image.id}&password=${password}`);
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
        {image.embed && (
          <>
            {user.embedSiteName && (
              <meta
                property='og:site_name'
                content={parseString(user.embedSiteName, { file: image, user })}
              />
            )}
            {user.embedTitle && (
              <meta property='og:title' content={parseString(user.embedTitle, { file: image, user })} />
            )}
            <meta property='theme-color' content={user.embedColor ?? '#2f3136'} />
          </>
        )}
        {image.mimetype.startsWith('image') && (
          <>
            <meta property='og:image' content={`/r/${image.file}`} />
            <meta property='twitter:card' content='summary_large_image' />
          </>
        )}
        {image.mimetype.startsWith('video') && (
          <>
            <meta name='twitter:card' content='player' />
            <meta name='twitter:player:stream' content={`/r/${image.file}`} />
            <meta name='twitter:player:width' content='720' />
            <meta name='twitter:player:height' content='480' />
            <meta name='twitter:player:stream:content_type' content={image.mimetype} />
            <meta name='twitter:title' content={image.file} />

            <meta property='og:url' content={`/r/${image.file}`} />
            <meta property='og:video' content={`/r/${image.file}`} />
            <meta property='og:video:url' content={`/r/${image.file}`} />
            <meta property='og:video:secure_url' content={`/r/${image.file}`} />
            <meta property='og:video:type' content={image.mimetype} />
            <meta property='og:video:width' content='720' />
            <meta property='og:video:height' content='480' />
          </>
        )}
        {!image.mimetype.startsWith('video') && !image.mimetype.startsWith('image') && (
          <meta property='og:url' content={`/r/${image.file}`} />
        )}
        <title>{image.file}</title>
      </Head>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title='Password Protected'
        centered={true}
        withCloseButton={true}
        closeOnEscape={false}
        closeOnClickOutside={false}
        overlayBlur={3}
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
        {image.mimetype.startsWith('image') && (
          <img src={dataURL('/r')} alt={dataURL('/r')} id='image_content' />
        )}

        {image.mimetype.startsWith('video') && (
          <video src={dataURL('/r')} controls={true} autoPlay={true} id='image_content' />
        )}

        {!image.mimetype.startsWith('video') && !image.mimetype.startsWith('image') && (
          <Link href={dataURL('/r')}>Can&#39;t preview this file. Click here to download it.</Link>
        )}
      </Box>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };

  const image = await prisma.image.findFirst({
    where: {
      OR: [{ file: id }, { invisible: { invis: id } }],
    },
    select: {
      mimetype: true,
      id: true,
      file: true,
      invisible: true,
      userId: true,
      created_at: true,
      password: true,
    },
  });
  if (!image) return { notFound: true };

  const user = await prisma.user.findFirst({
    select: {
      username: true,
      id: true,
    },
    where: {
      id: image.userId,
    },
  });

  // @ts-ignore workaround because next wont allow date
  image.created_at = image.created_at.toString();

  const prismRender = Object.keys(exts).includes(image.file.split('.').pop());
  if (prismRender && !image.password)
    return {
      redirect: {
        destination: `/code/${image.file}`,
        permanent: true,
      },
    };
  else if (prismRender && image.password) {
    const pass = image.password ? true : false;
    delete image.password;
    return {
      props: {
        image,
        user,
        pass,
        prismRender: true,
      },
    };
  }

  if (!image.mimetype.startsWith('image') && !image.mimetype.startsWith('video')) {
    const { default: datasource } = await import('lib/datasource');

    const data = await datasource.get(image.file);
    if (!data) return { notFound: true };

    return {
      props: {
        image,
        user,
      },
    };
  }
  const pass = image.password ? true : false;
  delete image.password;
  return {
    props: {
      image,
      user,
      pass,
    },
  };
};
