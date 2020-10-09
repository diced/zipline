import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { UPDATE_USER } from '../lib/reducer';
import { store } from '../lib/store';
import { useDispatch } from 'react-redux';

const useStyles = makeStyles({
  margin: {
    margin: '5px',
  },
  padding: {
    padding: '10px',
  },
  field: {
    width: '100%',
  },
  button: {
    marginLeft: 'auto',
  },
});

export default function Manage() {
  const classes = useStyles();
  const dispatch = useDispatch();
  const router = useRouter();
  const state = store.getState();
  const [alertOpen, setAlertOpen] = useState(false);
  const [username, setUsername] = useState(state.user.username);
  const [password, setPassword] = useState('');

  const handleUpdateUser = async () => {
    const d = await (await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })).json();
    if (!d.error) {
      dispatch({ type: UPDATE_USER, payload: d });
      setAlertOpen(true);
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
            Updated <b>{state.user.username}</b>
          </Alert>
        </Snackbar>
        <Card>
          <CardContent>
            <Typography color='textSecondary' variant='h4' gutterBottom>
              Manage
            </Typography>
            <TextField
              label='Username'
              className={classes.field}
              value={username}
              onChange={e => setUsername(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label='Password'
              type='password'
              value={password}
              className={classes.field}
              onChange={e => setPassword(e.target.value)}
            />
          </CardContent>
          <CardActions>
            <Button
              variant='contained'
              className={classes.button}
              color='primary'
              onClick={handleUpdateUser}
            >
              Update
            </Button>
          </CardActions>
        </Card>
      </UI>
    );
  }
  return <UIPlaceholder />;
}
