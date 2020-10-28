import React, { useEffect, useState } from 'react';
import Typography from '@material-ui/core/Typography';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import IconButton from '@material-ui/core/IconButton';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import AddIcon from '@material-ui/icons/Add';
import copy from 'copy-to-clipboard';
import UI from '../../components/UI';
import UIPlaceholder from '../../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { URL as URLEntity } from '../../entities/URL';
import { Configuration } from '../../lib/Config';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: '5px'
  },
  padding: {
    border: '1px solid #1f1f1f',
    padding: '10px'
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff'
  },
  field: {
    width: '100%'
  }
}));

export default function Urls({ config }) {
  const classes = useStyles();
  const [urls, setURLS] = useState<URLEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [url, setURL] = useState('');
  const [vanity, setVanity] = useState('');

  if (typeof window === 'undefined') return <UIPlaceholder />;
  else {
    const doUrls = async () => {
      const d = await (await fetch('/api/urls')).json();
      if (!d.error) {
        setURLS(d);
        setLoading(false);
      }
    };

    useEffect(() => {
      (async () => doUrls())();
    }, []);

    const deleteUrl = async (u: URLEntity) => {
      const d = await (
        await fetch('/api/urls/' + u.id, { method: 'DELETE' })
      ).json();
      if (!d.error) doUrls();
    };

    const createURLThenClose = async () => {
      const d = await (
        await fetch('/api/urls', {
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          body: JSON.stringify({
            url,
            vanity: vanity == '' ? null : vanity
          })
        })
      ).json();
      if (!d.error) {
        setCreateOpen(false);
        doUrls();
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
            horizontal: 'center'
          }}
          open={alertOpen}
          autoHideDuration={6000}
          onClose={() => setAlertOpen(false)}
        >
          <Alert severity='success' variant='filled'>
            Deleted URL
          </Alert>
        </Snackbar>
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
                label='URL'
                className={classes.field}
                onChange={e => setURL(e.target.value)}
              />
              <TextField
                label='Vanity'
                className={classes.field}
                onChange={e => setVanity(e.target.value)}
              />
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} color='primary'>
              Cancel
            </Button>
            <Button onClick={createURLThenClose} color='primary' autoFocus>
              Create
            </Button>
          </DialogActions>
        </Dialog>
        {!loading ? (
          <Paper elevation={3} className={classes.padding}>
            <Typography variant='h5'>
              URLs
              <IconButton
                aria-label='Create User'
                onClick={() => setCreateOpen(true)}
              >
                <AddIcon />
              </IconButton>
            </Typography>
            <Grid container spacing={2}>
              {urls.map(u => {
                const url = new URL(window.location.href);
                url.pathname = `${config ? config.urls.route : '/go'}/${u.id}`;
                return (
                  <Grid item xs={12} sm={4} key={u.id}>
                    <Card elevation={3}>
                      <CardHeader
                        action={
                          <div>
                            <IconButton aria-label='Copy URL'>
                              <FileCopyIcon
                                onClick={() => copy(url.toString())}
                              />
                            </IconButton>
                            <IconButton
                              aria-label='Delete Forever'
                              onClick={() => deleteUrl(u)}
                            >
                              <DeleteForeverIcon />
                            </IconButton>
                          </div>
                        }
                        title={u.vanity ? u.vanity : u.id}
                      />
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        ) : null}
      </UI>
    );
  }
}

export async function getStaticProps() {
  const config = Configuration.readConfig();
  return { props: { config } };
}