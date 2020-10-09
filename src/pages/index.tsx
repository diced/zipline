import React from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../lib/store';

const useStyles = makeStyles({
  margin: {
    margin: '5px',
  },
  padding: {
    padding: '10px',
  },
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function IndexPage() {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();


  if (typeof window !== 'undefined' && !state.loggedIn) router.push('/login');
  else {
    return (
      <UI>
        <Card elevation={3} className={classes.padding}>
          <Typography variant='h5'>
            Welcome back, {state.user.username}
          </Typography>
          <Typography color='textSecondary'>
            You have <b>2</b> images
          </Typography>
        </Card>
      </UI>
    );
  }
  return <UIPlaceholder />;
}
