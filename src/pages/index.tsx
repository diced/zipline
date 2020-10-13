import React from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import Paper from '@material-ui/core/Paper';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../lib/store';
import { ConfigUploader } from '../lib/Config';

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

export default function Index({ config }: { config: ConfigUploader }) {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();
  const [loading, setLoading] = React.useState(true);
  const [recentImages, setRecentImages] = React.useState([]);
  const [images, setImages] = React.useState([]);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  if (!state.loggedIn) router.push('/login');
  else {
    React.useEffect(() => {
      (async () => {
        const recentImages = await (await fetch('/api/images/recent')).json();
        if (!recentImages.error) setRecentImages(recentImages);

        const allImages = await (await fetch('/api/images')).json();
        if (!allImages.error) {
          setImages(allImages);
          setLoading(false);
        }
      })();
    }, []);

    return (
      <UI>
        <Backdrop className={classes.backdrop} open={loading}>
          <CircularProgress color='inherit' />
        </Backdrop>
        {!loading ? (
          <Paper elevation={3} className={classes.padding}>
            <Typography variant='h5'>
              Welcome back, {state.user.username}
            </Typography>
            <Typography color='textSecondary'>
              You have <b>{images.length}</b> images
            </Typography>
            <Typography variant='h5'>Recent Images</Typography>
            <GridList cols={3}>
              {recentImages.map(d => {
                const t = new URL(window.location.href);
                t.pathname = `${config ? config.route : '/u'}/${d.file}`;
                return (
                  <GridListTile key={d.id} cols={1}>
                    <img src={t.toString()} />
                  </GridListTile>
                );
              })}
            </GridList>
          </Paper>
        ) : null}
      </UI>
    );
  }
  return <UIPlaceholder />;
}
