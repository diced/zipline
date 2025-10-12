import { getZipline } from '@/lib/db/models/zipline';
import { GetServerSideProps } from 'next';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import StandaloneUpload from './upload/index';

export default StandaloneUpload;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { firstSetup } = await getZipline();

  if (firstSetup) {
    return {
      redirect: {
        destination: '/setup',
        permanent: false,
      },
    };
  }

  return withSafeConfig()(ctx);
};
