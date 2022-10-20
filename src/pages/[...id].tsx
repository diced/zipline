import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { Box, Button, Modal, PasswordInput } from '@mantine/core';
import config from 'lib/config';
import prisma from 'lib/prisma';
import { parse } from 'lib/utils/client';
import exts from 'lib/exts';

export default function EmbeddedImage({ image, user, pass }) {
  const dataURL = (route: string) => `${route}/${image.file}`;

  const [opened, setOpened] = useState(pass);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // reapply date from workaround
  image.created_at = new Date(image.created_at);

  const check = async () => {
    const res = await fetch(`/api/auth/image?id=${image.id}&password=${password}`);

    if (res.ok) {
      setError('');
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
              <meta property='og:site_name' content={parse(user.embedSiteName, image, user)} />
            )}
            {user.embedTitle && <meta property='og:title' content={parse(user.embedTitle, image, user)} />}
            <meta property='theme-color' content={user.embedColor} />
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
      </Box>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const route = context.params.id[0];
  const serve_on_root = /(^[^\\.]+\.[^\\.]+)/.test(route);

  const id = serve_on_root ? route : context.params.id[1];
  const uploader_route = config.uploader.route.substring(1);

  if (route === config.urls.route.substring(1)) {
    const url = await prisma.url.findFirst({
      where: {
        OR: [{ id }, { vanity: id }, { invisible: { invis: id } }],
      },
      select: {
        destination: true,
      },
    });
    if (!url) return { notFound: true };

    return {
      props: {},
      redirect: {
        destination: url.destination,
      },
    };
  } else if (uploader_route === '' ? /(^[^\\.]+\.[^\\.]+)/.test(route) : route === uploader_route) {
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
        embed: true,
        created_at: true,
        password: true,
      },
    });
    if (!image) return { notFound: true };

    const user = await prisma.user.findFirst({
      select: {
        embedTitle: true,
        embedColor: true,
        embedSiteName: true,
        username: true,
        id: true,
      },
      where: {
        id: image.userId,
      },
    });

    //@ts-ignore workaround because next wont allow date
    image.created_at = image.created_at.toString();

    const prismRender = Object.keys(exts).includes(image.file.split('.').pop());
    if (prismRender)
      return {
        redirect: {
          destination: `/code/${image.file}`,
          permanent: true,
        },
      };

    if (!image.mimetype.startsWith('image') && !image.mimetype.startsWith('video')) {
      const { default: datasource } = await import('lib/datasource');

      const data = await datasource.get(image.file);
      if (!data) return { notFound: true };

      data.pipe(context.res);
      return { props: {} };
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
  } else {
    return { notFound: true };
  }
};
