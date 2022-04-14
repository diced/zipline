import React, { useEffect } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { Box } from '@mantine/core';
import config from 'lib/config';
import prisma from 'lib/prisma';
import { parse } from 'lib/clientUtils';
import * as exts from '../../scripts/exts';

export default function EmbeddedImage({ image, user }) {
  const dataURL = (route: string) => `${route}/${image.file}`;

  // reapply date from workaround
  image.created_at = new Date(image.created_at);

  const updateImage = () => {
    const imageEl = document.getElementById('image_content') as HTMLImageElement;

    const img = new Image();
    img.addEventListener("load", function() {
      if (this.naturalWidth > innerWidth) imageEl.width = Math.floor(this.naturalWidth * Math.min((innerHeight / this.naturalHeight), (innerWidth / this.naturalWidth)));
      else imageEl.width = this.naturalWidth;
    });
    img.src = dataURL('/r');
  };
  
  useEffect(() => updateImage(), []);

  return (
    <>
      <Head>
        {image.embed && (
          <>
            {user.embedSiteName && (<meta property='og:site_name' content={parse(user.embedSiteName, image, user)} />)}
            {user.embedTitle && (<meta property='og:title' content={parse(user.embedTitle, image, user)} />)}
            <meta property='theme-color' content={user.embedColor}/>
          </>
        )}
        <meta property='og:image' content={dataURL('/r')} />
        <meta property='twitter:card' content='summary_large_image' />
        <title>{image.file}</title>
      </Head>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          minHeight: '100vh',
          justifyContent: 'center',
        }}
      >
        <img src={dataURL('/r')} alt={dataURL('/r')} id='image_content' />
      </Box>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params.id[1];
  const route = context.params.id[0];
  const routes = [config.uploader.route.substring(1), config.urls.route.substring(1)];
  if (!routes.includes(route)) return { notFound: true };
  if (route === routes[1]) {
    const url = await prisma.url.findFirst({
      where: {
        OR: [
          { id },
          { vanity: id },
          { invisible: { invis: id } },
        ],
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

  } else {
    const image = await prisma.image.findFirst({
      where: {
        OR: [
          { file: id },
          { invisible: { invis: id } },
        ],
      },
      select: {
        mimetype: true,
        id: true,
        file: true,
        invisible: true,
        userId: true,
        embed: true,
        created_at: true,
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
    if (prismRender) return {
      redirect: {
        destination: `/code/${image.file}`,
        permanent: true,
      },
    };

    if (!image.mimetype.startsWith('image')) {
      const { default: datasource } = await import('lib/ds');

      const data = datasource.get(image.file);
      if (!data) return { notFound: true };

      data.pipe(context.res);
      return { props: {} };
    }

    return {
      props: {
        image,
        user,
      },
    };
  }
};
