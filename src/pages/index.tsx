import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { InferGetServerSidePropsType } from 'next';
import Head from 'next/head';

export default function Home({ config, test }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Zipline</title>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
      </Head>
      <main>
        <pre>{JSON.stringify(config, null, 2)}</pre>
        <pre>{JSON.stringify(test, null, 2)}</pre>
      </main>
    </>
  );
}

export const getServerSideProps = withSafeConfig(async () => {
  return {
    test: 'hi',
  };
});
