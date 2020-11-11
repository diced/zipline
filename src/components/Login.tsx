import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { UPDATE_USER, LOGIN } from '../reducer';
import { useDispatch } from 'react-redux';

const useStyles = makeStyles({
  field: {
    width: '100%'
  },
  padding: {
    padding: '10px'
  }
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function Login() {
  const classes = useStyles();
  const router = useRouter();
  const dispatch = useDispatch();
  const [error, setError] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [token, setToken] = useState('');
  const [open, setOpen] = useState(false);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleLogin = async () => {
    const d = await (
      await fetch('/api/user/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
    ).json();
    if (!d.error) {
      if (d.mfa) {
        setAuthOpen(true);
      } else {
        const payload = await (
          await fetch('/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          })
        ).json();
        if (!payload.error) {
          dispatch({ type: UPDATE_USER, payload });
          dispatch({ type: LOGIN });
          router.push('/dash');
        }
      }
    } else setOpen(true);
  };

  const tryChecking = async () => {
    const verified = await (
      await fetch(`/api/mfa/verify?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
    ).json();
    if (!verified.passed) setError(true);
    else {
      setError(false);
      setAuthOpen(false);
      dispatch({ type: UPDATE_USER, payload: verified.user });
      dispatch({ type: LOGIN });
      router.push('/dash');
    }
  };

  return (
    <React.Fragment>
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center'
        }}
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
      >
        <Alert severity='error' variant='filled'>
          Could not login!
        </Alert>
      </Snackbar>
      <Dialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        aria-labelledby='enable-mfa'
        aria-describedby='mfa-desc'
      >
        <DialogTitle id='enable-mfa'>2FA</DialogTitle>
        <DialogContent>
          <TextField
            label='Code'
            helperText={error ? 'Incorrect code' : ''}
            value={token}
            className={classes.field}
            onChange={e => setToken(e.target.value)}
            error={error}
          />
        </DialogContent>
        <DialogActions>
          <Button color='primary' autoFocus onClick={tryChecking}>
            Check
          </Button>
        </DialogActions>
      </Dialog>
      <Card>
        <form>
          <CardContent>
            <Typography variant='h4'>Login</Typography>
            <TextField
              label='Username'
              InputLabelProps={{
                htmlFor: 'username'
              }}
              id='username'
              className={classes.field}
              onChange={e => setUsername(e.target.value)}
            />
            <TextField
              label='Password'
              type='password'
              InputLabelProps={{
                htmlFor: 'password'
              }}
              id='password'
              className={classes.field}
              onChange={e => setPassword(e.target.value)}
            />
          </CardContent>
          <CardActions>
            <Button
              color='primary'
              className={classes.field}
              onClick={handleLogin}
            >
              Login
            </Button>
          </CardActions>
        </form>
      </Card>
    </React.Fragment>
  );
}
