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
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';

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
  const [urls, setURLS] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertOpen, setAlertOpen] = useState(false);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  else {
    useEffect(() => {
      (async () => {
        const d = await (await fetch('/api/urls')).json();
        if (!d.error) { setURLS(d); setLoading(false); }
      })();
    }, []);

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
            Deleted URL
          </Alert>
        </Snackbar>
        {!loading ? (
          <Paper elevation={3} className={classes.padding}>
            <Typography variant='h5'>
              URLs
            </Typography>
            <Grid container spacing={2}>
              {urls.map(u => (
                <Grid item xs={12} sm={4} key={u.id} >
                  <Card elevation={3}>
                    <CardHeader
                      action={
                        <div>
                          <IconButton aria-label="Copy URL">
                            <FileCopyIcon />
                          </IconButton>
                          <IconButton aria-label="Delete Forever">
                            <DeleteForeverIcon />
                          </IconButton>
                        </div>
                      }
                      title={u.vanity ? u.vanity : u.id}
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