import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import Snackbar from '@material-ui/core/Snackbar';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Alert from '@material-ui/lab/Alert';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Switch from '@material-ui/core/Switch';
import IconButton from '@material-ui/core/IconButton';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import AddIcon from '@material-ui/icons/Add';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: '5px',
  },
  padding: {
    border: '1px solid #1f1f1f',
    padding: '10px',
  },
  field: {
    width: '100%',
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
}));

export default function Index() {
  const classes = useStyles();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [administrator, setAdministrator] = useState(false);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  else {
    const doUsers = async () => {
      const us = await (await fetch('/api/users')).json();
      if (!us.error) {
        setUsers(us);
        setLoading(false);
      }
    };

    useEffect(() => {
      (async () => {
        const d = await (await fetch('/api/user')).json();
        if (!d.error) {
          if (!d.administrator) router.push('/');
          doUsers();
        }
      })();
    }, []);

    const handleDeleteUser = () => {
      setDeleteOpen(true);
      setUser(d);
    };

    const deleteUserThenClose = () => {
      setDeleteOpen(false);
      setAlertOpen(true);
      setAlertMessage(`Deleted ${user ? user.username : ''}`);
    };

    const createUserThenClose = async () => {
      const d = await (await fetch('/api/user/create', {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({
          username, password, administrator
        })
      })).json();
      if (!d.error) {
        setCreateOpen(false);
        setAlertOpen(true);
        doUsers();
        setAlertMessage(`Created ${username}`);
      }
    };

    return (
      <UI>
        <Backdrop className={classes.backdrop} open={loading}>
          <CircularProgress color='inherit' />
        </Backdrop>
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
        <Dialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          aria-labelledby='are-you-sure'
          aria-describedby='deleted-forever'
        >
          <DialogTitle id='are-you-sure'>Are you sure?</DialogTitle>
          <DialogContent>
            <DialogContentText id='deleted-forever'>
              This user will be deleted <b>forever</b>.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)} color='primary'>
              I changed my mind
            </Button>
            <Button onClick={deleteUserThenClose} color='primary' autoFocus>
              Yes, delete!
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          aria-labelledby='create-user-title'
          aria-describedby='create-user-desc'
        >
          <DialogTitle id='create-user-title'>Create User</DialogTitle>
          <DialogContent>
            <DialogContentText id='create-user-desc'>
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
              <FormControlLabel
                control={<Switch checked={administrator} onChange={() => setAdministrator(!administrator)} name="admin" />}
                label="Administrator"
              />
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} color='primary'>
              Cancel
            </Button>
            <Button onClick={createUserThenClose} color='primary' autoFocus>
              Create
            </Button>
          </DialogActions>
        </Dialog>
        {!loading ? (
          <Paper elevation={3} className={classes.padding}>
            <Typography variant='h5'>
              User
              <IconButton aria-label='Create User' onClick={() => setCreateOpen(true)}>
                <AddIcon />
              </IconButton>
            </Typography>
            <Grid container spacing={2}>
              {users.map(u => (
                <Grid item xs={12} sm={4} key={u.id}>
                  <Card elevation={3}>
                    <CardHeader
                      action={
                        <IconButton
                          aria-label='Delete Forever'
                          onClick={() => handleDeleteUser(u)}
                        >
                          <DeleteForeverIcon />
                        </IconButton>
                      }
                      title={`${u.username} (${u.id})`}
                      subheader={`${u.administrator ? 'Administrator' : 'User'
                        }`}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        ) : null}
      </UI>
    );
  }
  return <UIPlaceholder />;
}
