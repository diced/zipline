import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import TextField from '@material-ui/core/TextField';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import copy from 'copy-to-clipboard';
import { LOGOUT, UPDATE_USER } from '../lib/reducer';
import { makeStyles } from '@material-ui/core';
import { store } from '../lib/store';
import { useDispatch } from 'react-redux';

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
  const dispatch = useDispatch();
  const state = store.getState();
  const [alertMessage, setAlertMessage] = useState('Copied token!');
  const [tokenOpen, setTokenOpen] = useState(false);
  const [resetToken, setResetToken] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const handleCopyTokenThenClose = async () => {
    const data = await (await fetch('/api/user/current')).json();
    if (!data.error) {
      copy(data.token);
      setAlertMessage('Copied token!');
      setTokenOpen(false);
      setAlertOpen(true);
    }
  };

  const handleResetTokenThenClose = async () => {
    const data = await (
      await fetch('/api/user/reset-token', { method: 'POST' })
    ).json();
    if (!data.error && data.updated) {
      setAlertMessage('Reset token!');
      setResetToken(false);
      setAlertOpen(true);
    }
  };

  const handleLogout = async () => {
    const data = await (
      await fetch('/api/user/logout', { method: 'POST' })
    ).json();
    if (!data.error && data.clearStore) {
      dispatch({ type: LOGOUT });
      dispatch({ type: UPDATE_USER, payload: null });
      setAlertMessage('Logged out!');
      setAlertOpen(true);
      router.push('/login');
    }
  };

  if (typeof window !== 'undefined' && !state.loggedIn) router.push('/login');
  else {
    return (
      <UI>
        <Snackbar
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          open={alertOpen}
          autoHideDuration={6000}
          onClose={() => setAlertOpen(false)}
        >
          <Alert severity='success' variant='filled'>
            {alertMessage}
          </Alert>
        </Snackbar>
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
