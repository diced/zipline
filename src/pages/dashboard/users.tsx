import React from 'react';
import useLogin from 'hooks/useLogin';
import Layout from 'components/Layout';
import Users from 'components/pages/Users';
import { LoadingOverlay } from '@mantine/core';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function UsersPage(props) {
  const { user, loading } = useLogin();

  if (loading) return <LoadingOverlay visible={loading} />;
  
  return (
    <>
      <Head>
        <title>{props.title} - Users</title>
      </Head>
      <Layout
        user={user}
        props={props}
      >
        <Users />
      </Layout>
    </>
  );
}