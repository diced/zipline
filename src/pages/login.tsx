import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Snackbar from '@material-ui/core/Snackbar';
import Grid from '@material-ui/core/Grid';
import Alert from '@material-ui/lab/Alert';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../store';
import { UPDATE_USER, LOGIN } from '../reducer';
import { useDispatch } from 'react-redux';

const useStyles = makeStyles({
  field: {
    width: '100%',
  },
  padding: {
    padding: '10px',
  },
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function LoginPage() {
  const classes = useStyles();
  const router = useRouter();
  const dispatch = useDispatch();
  const state = store.getState();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [open, setOpen] = useState(false);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleLogin = async () => {
    const d = await (
      await fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
    ).json();
    if (!d.error) {
      dispatch({ type: UPDATE_USER, payload: d });
      dispatch({ type: LOGIN });
      router.push('/');
    } else {
      setOpen(true);
    }
  };

  if (state.loggedIn) router.push('/');
  else
    return (
      <div>
        <Snackbar
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          open={open}
          autoHideDuration={6000}
          onClose={handleClose}
        >
          <Alert severity='error' variant='filled'>
            Could not login!
          </Alert>
        </Snackbar>
        <Grid
          container
          spacing={0}
          direction='column'
          alignItems='center'
          justify='center'
          style={{ minHeight: '100vh' }}
        >
          <Grid item xs={6}>
            <Card>
              <CardContent>
                <Typography color='textSecondary' variant='h3' gutterBottom>
                  Login
                </Typography>
                <TextField
                  label='Username'
                  className={classes.field}
                  onChange={e => setUsername(e.target.value)}
                />
                <TextField
                  label='Password'
                  type='password'
                  className={classes.field}
                  onChange={e => setPassword(e.target.value)}
                />
              </CardContent>
              <CardActions>
                <Button
                  color='primary'
                  variant='contained'
                  className={classes.field}
                  onClick={handleLogin}
                >
                  Login
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </div>
    );
  return <UIPlaceholder />;
}
