import { Box, Button, Card, Container } from '@mantine/core';
import KaTeX from 'components/render/KaTeX';
import Markdown from 'components/render/Markdown';
import PrismCode from 'components/render/PrismCode';
import config from 'lib/config';
import prisma from 'lib/prisma';
import { checkPassword } from 'lib/util';
import { streamToString } from 'lib/utils/streams';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useState } from 'react';

export default function Code({ code, id, title, render, renderType }) {
  const full_title = `${title} - Code (${id})`;

  const [overrideRender, setOverrideRender] = useState(false);

  return (
    <>
      <Head>
        <title>{full_title}</title>
      </Head>
      {render && (
        <Box
          sx={(t) => ({
            backgroundColor: t.colorScheme === 'dark' ? t.colors.dark[6] : t.colors.gray[0],
          })}
          py={5}
          px='md'
        >
          {renderType === 'markdown' && (
            <span>
              You are {overrideRender ? 'not' : 'now'} viewing a rendered version of the markdown file.
            </span>
          )}
          {renderType === 'tex' && (
            <span>You are {overrideRender ? 'not' : 'now'} viewing a KaTeX rendering of the tex file.</span>
          )}
          <Button mx='md' onClick={() => setOverrideRender(!overrideRender)} compact variant='light'>
            View {overrideRender ? 'rendered' : 'raw'}
          </Button>
        </Box>
      )}

      {renderType === 'markdown' && !overrideRender && (
        <Container p='md'>
          <Markdown code={code} />
        </Container>
      )}

      {renderType === 'tex' && !overrideRender && (
        <Container p='md'>
          <Card p={2}>
            <KaTeX code={code} />
          </Card>
        </Container>
      )}

      {!render && (
        <PrismCode
          sx={(t) => ({ height: '100vh', backgroundColor: t.colors.dark[8] })}
          code={code}
          ext={id.split('.').pop()}
        />
      )}

      {render && overrideRender && (
        <PrismCode
          sx={(t) => ({ height: '100vh', backgroundColor: t.colors.dark[8] })}
          code={code}
          ext={id.split('.').pop()}
        />
      )}
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  if (process.env.ZIPLINE_DOCKER_BUILD) return { props: { code: '', id: '' } };

  const { default: datasource } = await import('lib/datasource');

  const data = await datasource.get(context.params.id as string);
  if (!data)
    return {
      notFound: true,
    };

  const file = await prisma.file.findFirst({
    where: {
      name: context.params.id as string,
    },
  });
  if (!file) return { notFound: true };

  if (file.password && !context.query.password)
    return {
      notFound: true,
    };

  if (file.password && context.query.password) {
    const valid = await checkPassword(context.query.password as string, file.password);
    if (!valid) return { notFound: true };
  }

  context.res.setHeader('Cache-Control', 'public, max-age=2628000, stale-while-revalidate=86400');

  let renderType;

  if (file.name.endsWith('.md')) {
    renderType = 'markdown';
  } else if (file.name.endsWith('.tex')) {
    renderType = 'tex';
  } else {
    renderType = null;
  }

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
      code: await streamToString(data),
      id: context.params.id as string,
      title: config.website.title,
      render: file.name.endsWith('.md') || file.name.endsWith('.tex'),
      renderType,
    },
  };
};
