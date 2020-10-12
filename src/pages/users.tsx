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
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../lib/store';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: '5px',
  },
  padding: {
    padding: '10px',
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
}));

export default function Index() {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  else {
    useEffect(() => {
      (async () => {
        const d = await (await fetch('/api/user')).json();
        if (!d.error) {
          if (!d.administrator) router.push('/');
          const us = await (await fetch('/api/users')).json();
          if (!us.error) {
            setUsers(us);
            setLoading(false);
          }
        }
      })();
    }, []);

    const handleDeleteUser = (d) => {
      setDeleteOpen(true);
      setUser(d);
    };

    const deleteUserThenClose = () => {
      setDeleteOpen(false);
      setAlertOpen(true);
    }

    return (
      <UI>
        <Backdrop className={classes.backdrop} open={loading}>
          <CircularProgress color="inherit" />
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
            Deleted <b>{user ? user.username : ''}</b>
          </Alert>
        </Snackbar>
        <Dialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          aria-labelledby='alert-dialog-title'
          aria-describedby='alert-dialog-description'
        >
          <DialogTitle id='alert-dialog-title'>Are you sure?</DialogTitle>
          <DialogContent>
            <DialogContentText id='alert-dialog-description'>
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
        <Paper elevation={3} className={classes.padding}>
          <Typography variant='h5'>
            Users
          </Typography>
          <Grid container spacing={2}>
            {users.map(u => (
              <Grid item xs={4} key={u.id}>
                <Card elevation={3}>
                  <CardHeader
                    action={
                      <IconButton aria-label="Delete Forever" onClick={() => handleDeleteUser(u)}>
                        <DeleteForeverIcon />
                      </IconButton>
                    }
                    title={`${u.username} (${u.id})`}
                    subheader={`${u.administrator ? 'Administrator' : 'User'}`}
                  />
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </UI>
    );
  }
  return <UIPlaceholder />;
}