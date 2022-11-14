import { Prism } from '@mantine/prism';
import config from 'lib/config';
import exts from 'lib/exts';
import prisma from 'lib/prisma';
import { checkPassword } from 'lib/util';
import { streamToString } from 'lib/utils/streams';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export default function Code({ code, id, title }) {
  const full_title = `${title} - Code (${id})`;
  return (
    <>
      <Head>
        <title>{full_title}</title>
      </Head>

      <Prism
        sx={(t) => ({ height: '100vh', backgroundColor: t.colors.dark[8] })}
        withLineNumbers
        language={exts[id.split('.').pop()]?.toLowerCase()}
      >
        {code}
      </Prism>
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

  const file = await prisma.image.findFirst({
    where: {
      file: context.params.id as string,
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

  return {
    props: {
      code: await streamToString(data),
      id: context.params.id as string,
      title: config.website.title,
    },
  };
};
