import React, { useEffect } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { Box } from '@mui/material';
import config from 'lib/config';
import prisma from 'lib/prisma';
import { getFile } from '../../server/util';
import { parse } from 'lib/clientUtils';

export default function EmbeddedImage({ image, user, normal }) {
  const dataURL = (route: string) => `${route}/${image.file}`;

  // reapply date from workaround
  image.created_at = new Date(image.created_at);

  const updateImage = () => {
    const imageEl = document.getElementById('image_content') as HTMLImageElement;

    const original = new Image;
    original.src = dataURL('/r');

    if (original.width > innerWidth) imageEl.width = Math.floor(original.width * Math.min((innerHeight / original.height), (innerWidth / original.width)));
    else imageEl.width = original.width;
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
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
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
  
    if (!image.mimetype.startsWith('image')) {
      const data = await getFile(config.uploader.directory, id);
      if (!data) return { notFound: true };

      context.res.end(data);
      return { props: {} };
    };

    return {
      props: {
        image,
        user,
        normal: config.uploader.route,
      },
    };
  }
};
