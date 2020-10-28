import React from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardMedia from '@material-ui/core/CardMedia';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../store';
import { ConfigUploader, Configuration } from '../lib/Config';

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
  }
}));

export default function Dashboard({ config }: { config: ConfigUploader }) {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();
  const [loading, setLoading] = React.useState(true);
  const [recentImages, setRecentImages] = React.useState([]);
  const [images, setImages] = React.useState([]);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  if (!state.loggedIn) router.push('/user/login');
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
            <Grid container spacing={2}>
              {recentImages.map(d => {
                const t = new URL(window.location.href);
                t.pathname = `${config ? config.route : '/u'}/${d.file}`;
                return (
                  <Grid item key={d.id} xs={12} sm={4}>
                    <Card>
                      <CardActionArea>
                        <CardMedia
                          component='img'
                          height='140'
                          image={t.toString()}
                        />
                      </CardActionArea>
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
  return <UIPlaceholder />;
}