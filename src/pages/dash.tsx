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
import { Configuration } from '../lib/Config';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: '5px'
  },
  padding: {
    border: theme.palette.type === 'dark' ? '1px solid #1f1f1f' : '1px solid #e0e0e0',
    padding: '10px'
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff'
  }
}));

export default function Dashboard({ config }) {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<{totalViews:number, averageViews:number, images: number}>(null);
  const [recentImages, setRecentImages] = React.useState([]);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  if (!state.loggedIn) router.push('/user/login');
  else {
    React.useEffect(() => {
      (async () => {
        const recentImages = await (await fetch('/api/images/recent')).json();
        if (!recentImages.error) setRecentImages(recentImages);

        const stats = await (await fetch('/api/user/stats')).json();
        if (!stats.error) {
          setStats(stats);
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
            <Typography variant='h4'>
              Welcome back, {state.user.username} 
            </Typography>
            <Typography color='textSecondary'>
              You have <b>{stats.images}</b> images, with <b>{stats.totalViews}</b> ({Math.round(stats.averageViews)}) collectively.
            </Typography>
            <Typography variant='h5'>Recent Images</Typography>
            <Grid container spacing={2}>
              {recentImages.map(d => {
                const t = new URL(window.location.href);
                t.pathname = `${config ? config.uploader.route : '/u'}/${d.file}`;
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

export async function getStaticProps() {
  const config = Configuration.readConfig();
  return { props: { config: config } };
}