import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { Box } from '@material-ui/core';
import config from 'lib/config';
import prisma from 'lib/prisma';
import getFile from '../../server/static';

export default function EmbeddedImage({ image, title, username, color, normal, embed }) {
  const dataURL = (route: string) => `${route}/${image.file}`;

  const updateImage = () => {
    const imageEl = document.getElementById('image_content') as HTMLImageElement;

    const original = new Image;
    original.src = dataURL('/r');

    if (original.width > innerWidth) imageEl.width = Math.floor(original.width * Math.min((innerHeight / original.height), (innerWidth / original.width)));
    else imageEl.width = original.width;
  };

  if (typeof window !== 'undefined') window.onresize = () => updateImage();
  useEffect(() => updateImage(), []);

  return (
    <>
      <Head>
        {embed && (
          <>
            {title ? (
              <>
                <meta property='og:site_name' content={`${image.file} • ${username}`} />
                <meta property='og:title' content={title} />
              </>
            ) : (
              <meta property='og:title' content={`${image.file} • ${username}`} />
            )}
            <meta property='theme-color' content={color}/>
            <meta property='og:url' content={dataURL(normal)} />
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
      },
    });
    if (!image) return { notFound: true };

    if (!image.embed) {
      const data = await getFile(config.uploader.directory, id);
      if (!data) return { notFound: true };

      context.res.end(data);
      return { props: {} };
    };

    const user = await prisma.user.findFirst({
      select: {
        embedTitle: true,
        embedColor: true,
        username: true,
      },
      where: {
        id: image.userId,
      },
    });
  
    if (!image.mimetype.startsWith('image')) {
      const data = await getFile(config.uploader.directory, id);
      if (!data) return { notFound: true };

      context.res.end(data);
      return { props: {} };
    };

    return {
      props: {
        image,
        title: user.embedTitle,
        color: user.embedColor,
        username: user.username,
        normal: config.uploader.route,
        embed: image.embed,
      },
    };
  }
};
