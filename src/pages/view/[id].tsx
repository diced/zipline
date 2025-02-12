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
import config from 'lib/config';

export default function EmbeddedFile({
  file,
  user,
  prismRender,
  host,
  mediaType,
}: {
  file: Omit<File, 'password'> & {
    password: boolean;
    mediaProps?: {
      width: number;
      height: number;
    };
    thumbnail?: Pick<Thumbnail, 'name'>;
  };
  user: UserExtended;
  prismRender: boolean;
  host: string;
  mediaType: 'image' | 'video' | 'audio' | 'other';
}) {
  const router = useRouter();
  const {
    password: provPassword,
    compress,
    embed,
  } = router.query as {
    password?: string;
    compress?: string;
    embed?: string;
  };

  const dataURL = (route: string, useThumb?: boolean, withoutHost?: boolean, pass?: string) =>
    `${withoutHost ? '' : host}${route}/${encodeURIComponent(
      (useThumb && !!file.thumbnail && file.thumbnail.name) || file.name,
    )}?compress=${compress?.toLowerCase() === 'true' || false}${
      !!pass ? `&password=${encodeURIComponent(pass)}` : ''
    }`;
  const [opened, setOpened] = useState(file.password);
  const [password, setPassword] = useState(provPassword || '');
  const [error, setError] = useState('');
  const [scale, setScale] = useState(2);

  // reapply date from workaround
  file.createdAt = new Date(file ? file.createdAt : 0);

  const check = async () => {
    const res = await fetch(dataURL('/r'));

    if (res.ok) {
      setError('');
      if (prismRender) return router.push(`/code/${file.name}?password=${encodeURIComponent(password)}`);
      updateMedia(dataURL('/r', false, true, password));
      setOpened(false);
    } else {
      setError('Invalid password');
    }
  };

  const updateMedia: (url?: string) => void = function (url?: string) {
    if (mediaType === 'other') return;

    const mediaContent = document.getElementById(`${mediaType}_content`) as
      | HTMLImageElement
      | HTMLVideoElement
      | HTMLAudioElement;

    if (document.head.getElementsByClassName('dynamic').length === 0) {
      const metas: HTMLMetaElement[][] = [];
      const twType = mediaType === 'video' ? 'player' : 'image';
      const ogType = mediaType === 'video' ? 'video' : 'image';
      for (let i = 0; i !== 2; i++) {
        const metaW = document.createElement('meta');
        const metaH = document.createElement('meta');
        metaW.setAttribute('name', i % 2 ? `twitter:${twType}:width` : `og:${ogType}:width`);
        metaH.setAttribute('name', i % 2 ? `twitter:${twType}:height` : `og:${ogType}:height`);
        metaW.className = 'dynamic';
        metaH.className = 'dynamic';
        metas.push([metaW, metaH]);
      }
      if (mediaType === 'image') {
        const img = new Image();
        img.onload = function () {
          if (document.head.getElementsByClassName('dynamic').length !== 0) return;
          file.mediaProps = {
            width: img.naturalWidth,
            height: img.naturalHeight,
          };
          for (const meta of metas) {
            meta[0].setAttribute('content', file.mediaProps.width.toString());
            meta[1].setAttribute('content', file.mediaProps.height.toString());
            document.head.appendChild(meta[0]);
            document.head.appendChild(meta[1]);
          }
          img.remove();
        };
        img.src = dataURL('/r', false, false, password);
      }
      if (mediaType === 'video') {
        const vid = document.createElement('video');
        vid.onloadedmetadata = function () {
          if (document.head.getElementsByClassName('dynamic').length !== 0) return;
          file.mediaProps = {
            width: vid.videoWidth,
            height: vid.videoHeight,
          };
          for (const meta of metas) {
            meta[0].setAttribute('content', file.mediaProps.width.toString());
            meta[1].setAttribute('content', file.mediaProps.height.toString());
            document.head.appendChild(meta[0]);
            document.head.appendChild(meta[1]);
          }
          vid.remove();
        };
        vid.src = dataURL('/r', false, false, password);
        vid.load();
      }
    }

    if (url) mediaContent.src = url;
  };

  useEffect(() => {
    if (file.password) {
      if (password) check();
      else setOpened(true);
    }

    if (mediaType === 'other') return;
    updateMedia();
    return () => {
      const metas = document.head.getElementsByClassName('dynamic');
      for (const meta of metas) meta.remove();
    };
  }, []);

  return (
    <>
      <Head>
        <meta
          property='og:url'
          content={dataURL(router.asPath.replace(('/' + router.query['id']) as string, ''))}
        />
        {!embed && !file.embed && (
          <link rel='alternate' type='application/json+oembed' href={`${host}/api/oembed/${file.id}`} />
        )}
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
        {embed?.toLowerCase() === 'true' && !file.embed && (
          <>
            <meta name='og:title' content={file.name} />
            <meta property='twitter:title' content={file.name} />
            {mediaType === 'image' && (
              <meta name='twitter:image' content={dataURL('/r', false, false, password)} />
            )}
            {mediaType === 'image' && <meta property='twitter:card' content='summary_large_image' />}
          </>
        )}
        {mediaType === 'image' && (
          <>
            <meta property='og:image' itemProp='image' content={dataURL('/r', false, false, password)} />
            <meta property='og:image:secure_url' content={dataURL('/r', false, false, password)} />
            <meta property='og:image:alt' content={file.name} />
            <meta property='og:image:type' content={file.mimetype} />
          </>
        )}
        {mediaType === 'video' && [
          ...(!!file.thumbnail
            ? [
                <meta
                  property='og:image:url'
                  key='og:image:url'
                  content={dataURL('/r', true, false, password)}
                />,
                <meta
                  property='og:image:secure_url'
                  key='og:image:secure_url'
                  content={dataURL('/r', true)}
                />,
                <meta property='og:image:type' key='og:image:type' content='image/jpeg' />,
                <meta
                  name='twitter:image'
                  key='twitter:image'
                  content={dataURL('/r', true, false, password)}
                />,
              ]
            : []),
          <meta name='twitter:card' key='twitter:card' content='player' />,
          <meta name='twitter:player' key='twitter:player' content={dataURL('/r', false, false, password)} />,
          <meta
            name='twitter:player:stream'
            key='twitter:player:stream'
            content={dataURL('/r', false, false, password)}
          />,
          <meta
            name='twitter:player:stream:content_type'
            key='twitter:player:stream:content_type'
            content={file.mimetype}
          />,
          <meta property='og:type' key='og:type' content='video.other' />,
          <meta property='og:video' key='og:video' content={dataURL('/r', false, false, password)} />,
          <meta
            property='og:video:secure_url'
            key='og:video:secure_url'
            content={dataURL('/r', false, false, password)}
          />,
          <meta property='og:video:type' key='og:video:type' content={file.mimetype} />,
        ]}
        {mediaType === 'audio' && (
          <>
            <meta property='og:type' content='music.song' />
            <meta property='og:audio' content={dataURL('/r', false, false, password)} />
            <meta property='og:audio:secure_url' content={dataURL('/r', false, false, password)} />
            <meta property='og:audio:type' content={file.mimetype} />
          </>
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
          overflow: 'hidden',
        }}
        onMouseDown={(e) => {
          if (mediaType !== 'image' || e.button !== 0) return;
          if (e.button !== 0) return;

          e.preventDefault();
          const imageEl = document.getElementById('image_content') as HTMLImageElement,
            posX = e.pageX - (imageEl.x + imageEl.width / 2),
            posY = e.pageY - (imageEl.y + imageEl.height / 2);

          if (imageEl.style.transform.startsWith('translate')) return;

          imageEl.style.transform = `translate(${posX * -scale}px, ${posY * -scale}px) scale(${scale})`;
          return true;
        }}
        onMouseUp={(e) => {
          if (mediaType !== 'image' || e.button !== 0) return;

          const imageEl = document.getElementById('image_content') as HTMLImageElement;
          if (!imageEl.style.transform.startsWith('translate')) return;
          imageEl.style.transform = 'scale(1)';
          setScale(2);
          return true;
        }}
        onMouseMove={(e) => {
          if (mediaType !== 'image' || e.button !== 0) return;
          if (e.button !== 0) return;

          const imageEl = document.getElementById('image_content') as HTMLImageElement,
            posX = e.pageX - (imageEl.x + imageEl.width / 2),
            posY = e.pageY - (imageEl.y + imageEl.height / 2);

          if (!imageEl.style.transform.startsWith('translate')) return;
          imageEl.style.transform = `translate(${posX * -scale}px, ${posY * -scale}px) scale(${scale})`;
          return true;
        }}
        onWheel={(e) => {
          if (mediaType !== 'image' || e.button !== 0) return;

          const imageEl = document.getElementById('image_content') as HTMLImageElement,
            posX = e.pageX - (imageEl.x + imageEl.width / 2),
            posY = e.pageY - (imageEl.y + imageEl.height / 2);
          if (!imageEl.style.transform.startsWith('translate')) return;
          let newScale = 0;
          if (e.deltaY < 0) newScale = scale + 0.25;
          if (e.deltaY > 0) newScale = scale - 0.25 == 0 ? scale : scale - 0.25;
          setScale(newScale);
          imageEl.style.transform = `translate(${posX * -newScale}px, ${
            posY * -newScale
          }px) scale(${newScale})`;
        }}
      >
        {mediaType === 'image' && (
          <img
            src={dataURL('/r', false, true, password)}
            alt={dataURL('/r', false, true, password)}
            id='image_content'
            style={{
              transition: 'transform 0.25s ease',
              maxHeight: '100vh',
              maxWidth: '100vw',
              objectFit: 'contain',
            }}
          />
        )}

        {mediaType === 'video' && (
          <video
            style={{
              maxHeight: '100vh',
              maxWidth: '100vw',
            }}
            src={dataURL('/r', false, true, password)}
            controls
            autoPlay
            muted
            id='video_content'
          />
        )}

        {mediaType === 'audio' && (
          <audio src={dataURL('/r', false, true)} controls autoPlay muted id='audio_content' />
        )}

        {mediaType === 'other' && (
          <AnchorNext component={Link} href={dataURL('/r', false, true, password)}>
            Can&#39;t preview this file. Click here to download it.
          </AnchorNext>
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
    include: {
      thumbnail: {
        select: {
          name: true,
        },
      },
    },
  });
  let host = context.req.headers.host;
  if (!file) return { notFound: true };

  // @ts-ignore
  file.size = parseInt(file.size);

  const proto = context.req.headers['x-forwarded-proto'];
  try {
    if (
      JSON.parse(context.req.headers['cf-visitor'] as string).scheme === 'https' ||
      proto === 'https' ||
      config.core.return_https
    )
      host = `https://${host}`;
    else host = `http://${host}`;
  } catch (e) {
    if (proto === 'https' || config.core.return_https) host = `https://${host}`;
    else host = `http://${host}`;
  }

  const mediaType: 'image' | 'video' | 'audio' | 'other' =
    (new RegExp(/^(?<type>image|video|audio)/).exec(file.mimetype)?.groups?.type as
      | 'image'
      | 'video'
      | 'audio') || 'other';

  const user = await prisma.user.findFirst({
    where: {
      id: file.userId,
    },
  });
  delete user.password;
  delete user.totpSecret;
  delete user.token;
  delete user.ratelimit;

  // @ts-ignore workaround because next wont allow date
  file.createdAt = file.createdAt.toString();
  // @ts-ignore ditto
  if (file.expiresAt) file.expiresAt = file.createdAt.toString();
  // @ts-ignore
  file.password = !!file.password;

  const prismRender = Object.keys(exts).includes(file.name.split('.').pop());
  if (prismRender && !file.password)
    return {
      redirect: {
        destination: `/code/${file.name}`,
        permanent: true,
      },
    };
  else if (prismRender && file.password)
    return {
      props: {
        file,
        user,
        prismRender: true,
        host,
      },
    };

  return {
    props: {
      file,
      user,
      host,
      mediaType,
    },
  };
};
