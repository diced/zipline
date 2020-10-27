import React from 'react';
import { useRouter } from 'next/router';
import Grid from '@material-ui/core/Grid';
import UIPlaceholder from '../../components/UIPlaceholder';
import Login from '../../components/Login';
import { store } from '../../store';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function LoginPage() {
  const router = useRouter();
  const state = store.getState();

  if (state.loggedIn) router.push('/dash');
  else {
    React.useEffect(() => {
      (async () => {
        const d = await (await fetch('/api/first')).json();

        if (!d.error && d) router.push('/user/setup');
      })();
    }, []);
    return (
      <div>
        <Grid
          container
          spacing={0}
          direction='column'
          alignItems='center'
          justify='center'
          style={{ minHeight: '100vh' }}
        >
          <Grid item xs={6} sm={12}>
            <Login />
          </Grid>
        </Grid>
      </div>
    );
  }
  return <UIPlaceholder />;
}
