import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Snackbar from '@material-ui/core/Snackbar';
import Grid from '@material-ui/core/Grid';
import Alert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core';
import { UPDATE_USER } from '../reducer';
import { store } from '../store';
import { useDispatch } from 'react-redux';
import { Config } from '../lib/Config';

const useStyles = makeStyles({
  margin: {
    margin: '5px'
  },
  padding: {
    padding: '10px'
  },
  field: {
    width: '100%'
  },
  button: {
    marginLeft: 'auto'
  }
});

export default function ManageUser({ config }: { config: Config }) {
  const classes = useStyles();
  const dispatch = useDispatch();

  const state = store.getState();
  const [alertOpen, setAlertOpen] = useState(false);
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [qrcode, setQRCode] = useState(null);
  const [username, setUsername] = useState(state.user.username);
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(false);

  const handleUpdateUser = async () => {
    const d = await (
      await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password: password.trim() === '' ? null : password,
          email
        })
      })
    ).json();

    if (!d.error) {
      dispatch({ type: UPDATE_USER, payload: d });
      setAlertOpen(true);
    }
  };

  const disableMFA = async () => {
    await fetch('/api/mfa/disable');
    const d = await (await fetch('/api/user')).json();

    if (!d.error) {
      dispatch({ type: UPDATE_USER, payload: d });
      setAlertOpen(true);
    }
  };
  const enableMFA = async () => {
    setMfaDialogOpen(true);
    const { dataURL } = await (await fetch('/api/mfa/qrcode')).json();
    setQRCode(dataURL);
  };
  const tryEnablingMfa = async () => {
    const verified = await (
      await fetch(`/api/mfa/verify?token=${mfaToken}`)
    ).json();
    if (!verified) setError(true);
    else {
      setError(false);
      setMfaDialogOpen(false);
      setAlertOpen(true);
      const d = await (await fetch('/api/user')).json();

      if (!d.error) {
        dispatch({ type: UPDATE_USER, payload: d });
        setAlertOpen(true);
      }
    }
  };

  const disableMfaAndClose = async () => {
    const d = await (await fetch('/api/mfa/disable')).json();

    if (!d.error) setMfaDialogOpen(false);
  };

  return (
    <React.Fragment>
      <Snackbar
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center'
        }}
        open={alertOpen}
        autoHideDuration={6000}
        onClose={() => setAlertOpen(false)}
      >
        <Alert severity='success' variant='filled'>
          Updated <b>{state.user.username}</b>
        </Alert>
      </Snackbar>
      <Dialog
        open={mfaDialogOpen}
        onClose={disableMfaAndClose}
        aria-labelledby='enable-mfa'
        aria-describedby='mfa-desc'
      >
        <DialogTitle id='enable-mfa'>Enable 2FA</DialogTitle>
        <DialogContent>
          <DialogContentText id='mfa-desc'>
            When enabling 2FA/MFA you can use <b>Authy</b> or{' '}
            <b>Google Authenticator</b> to authenticate before logging into
            Zipline.
          </DialogContentText>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <img src={qrcode} />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label='Code'
                helperText='After scanning the QRCode, enter the authentication code here'
                value={mfaToken}
                className={classes.field}
                onChange={e => setMfaToken(e.target.value)}
                error={error}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button color='primary' autoFocus onClick={disableMfaAndClose}>
            Disable
          </Button>
          <Button color='primary' autoFocus onClick={tryEnablingMfa}>
            Enable
          </Button>
        </DialogActions>
      </Dialog>
      <Paper>
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
          <TextField
            label='Email'
            type='email'
            helperText='Used for a Gravatar Avatar'
            value={email}
            className={classes.field}
            onChange={e => setEmail(e.target.value)}
          />
        </CardContent>
        <CardActions>
          <Button
            className={classes.button}
            color='primary'
            onClick={handleUpdateUser}
          >
            Update
          </Button>
          {config.core.mfa ? (
            <Button
              className={classes.button}
              color='primary'
              onClick={state.user.secretMfaKey ? disableMFA : enableMFA}
            >
              {state.user.secretMfaKey ? 'Disable MFA' : 'Enable MFA'}
            </Button>
          ) : null}
        </CardActions>
      </Paper>
    </React.Fragment>
  );
}
