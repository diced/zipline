import { LoadingOverlay } from '@mantine/core';
import Layout from 'components/Layout';
import UserFiles from 'components/pages/Users/UserFiles';
import useLogin from 'hooks/useLogin';
import Head from 'next/head';
import { getServerSideProps as middlewareProps } from 'middleware/getServerSideProps';
import { GetServerSideProps } from 'next';

export default function UsersId(props) {
  const { loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;

  const title = `${props.title} - User - ${props.userId}`;
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Layout props={props}>
        <UserFiles
          userId={props.userId}
          disableMediaPreview={props.disable_media_preview}
          exifEnabled={props.exif_enabled}
          compress={props.compress}
        />
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };
  // @ts-ignore
  const { props } = await middlewareProps(context);
  return {
    props: {
      userId: id,
      ...props,
    },
  };
};
