import React from 'react';
import { useRouter } from 'next/router';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import ManageUser from '../components/ManageUser';
import { store } from '../store';

export default function Manage() {
  const router = useRouter();
  const state = store.getState();

  if (typeof window !== 'undefined' && !state.loggedIn) router.push('/login');
  else {
    return (
      <UI>
        <ManageUser />
      </UI>
    );
  }
  return <UIPlaceholder />;
}
