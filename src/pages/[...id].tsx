import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { Box } from '@material-ui/core';
import config from 'lib/config';
import prisma from 'lib/prisma';

export default function EmbeddedImage({ image, title, username, color, normal, embed }) {
  console.log(normal, embed);
  const dataURL = (route: string) => `${route}/${image.file}`;

  return (
    <>
      <Head>
        {title ? (
          <>
            <meta property='og:site_name' content={`${image.file} • ${username}`} />
            <meta property='og:title' content={title} />
          </>
        ) : (
          <meta property='og:title' content={`${image.file} • ${username}`} />
        )}
        <meta property='theme-color' content={color}/>
        <meta property='og:url' content={dataURL(embed)} />
        <meta property='og:image' content={dataURL(normal)} />
        <meta property='twitter:card' content='summary_large_image' />
        <title>{image.file}</title>
      </Head>

      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
      >
        <img src={dataURL(normal)} alt={dataURL(normal)}/>
      </Box>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params.id[1];
  const route = context.params.id[0];
  if (route !== config.uploader.embed_route.substr(1)) return {
    notFound: true
  };

  const image = await prisma.image.findFirst({
    where: {
      file: id
    },
    select: {
      file: true,
      mimetype: true,
      userId: true
    }
  });

  const user = await prisma.user.findFirst({
    select: {
      embedTitle: true,
      embedColor: true,
      username: true
    },
    where: {
      id: image.userId
    }
  });

  if (!image) return {
    notFound: true
  };

  if (!image.mimetype.startsWith('image')) return {
    redirect: {
      permanent: true,
      destination: `${config.uploader.route}/${image.file}`,
    }
  };

  return {
    props: {
      image,
      title: user.embedTitle,
      color: user.embedColor,
      username: user.username,
      normal: config.uploader.route,
      embed: config.uploader.embed_route
    }
  };
};