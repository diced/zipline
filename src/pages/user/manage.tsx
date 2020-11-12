import React from 'react';
import { useRouter } from 'next/router';
import UI from '../../components/UI';
import UIPlaceholder from '../../components/UIPlaceholder';
import ManageUser from '../../components/ManageUser';
import { store } from '../../store';
import { Configuration } from '../../lib/Config';

export default function Manage({ config }) {
  const router = useRouter();
  const state = store.getState();

  if (typeof window !== 'undefined' && !state.loggedIn) router.push('/user/login');
  else {
    return (
      <UI>
        <ManageUser config={config} />
      </UI>
    );
  }
  return <UIPlaceholder />;
}

export async function getStaticProps() {
  const config = Configuration.readConfig();
  return { props: { config } };
}
