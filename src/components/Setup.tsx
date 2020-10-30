import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [open, setOpen] = useState(false);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleLogin = async () => {
    const d = await (
      await fetch('/api/user/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          administrator: true
        })
      })
    ).json();
    if (!d.error) {
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
      } else setOpen(true);
    } else setOpen(true);
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
          Could not create!
        </Alert>
      </Snackbar>
      <Card>
        <CardContent>
          <Typography variant='h4'>Setup</Typography>
          <Typography color='textSecondary'>Create your first user!</Typography>
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
            className={classes.field}
            onClick={handleLogin}
          >
            Create
          </Button>
        </CardActions>
      </Card>
    </React.Fragment>
  );
}
