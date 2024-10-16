import { getZipline } from '@/lib/db/models/zipline';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export default function Index() {
  return (
    <>
      <Head>
        <title>Zipline</title>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
      </Head>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const { firstSetup } = await getZipline();

  if (firstSetup) {
    return {
      redirect: {
        destination: '/setup',
        permanent: false,
      },
    };
  }

  return {
    redirect: {
      destination: '/dashboard',
      permanent: false,
    },
  };
};
