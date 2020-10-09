import React from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import GridListTileBar from '@material-ui/core/GridListTileBar';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../lib/store';
import { Image } from '../entities/Image';
import { ConfigUploader } from '../lib/Config';

const useStyles = makeStyles({
  margin: {
    margin: '5px',
  },
  padding: {
    padding: '10px',
  },
});

export default function Index({ config }: { config: ConfigUploader }) {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();
  const [images, setImages] = React.useState([]);

  if (typeof window !== 'undefined' && !state.loggedIn) router.push('/login');
  else {

    React.useEffect(() => {
      (async () => {
        const images = await (await fetch('/api/images/recent')).json();
        if (!images.error) setImages(images);
      })();
    }, []);

    return (
      <UI>
        <Card elevation={3} className={classes.padding}>
          <Typography variant='h5'>
            Welcome back, {state.user.username}
          </Typography>
          <Typography color='textSecondary'>
            You have <b>2</b> images
          </Typography>
          <Typography variant='h5'>
            Recent Images
          </Typography>
          <GridList cols={3}>
            {images.map(d => {
              const t = new URL(window.location.href);
              t.pathname = `${config ? config.route : '/u'}/${d.file}`;
              return (
                <GridListTile key={d.id} cols={1}>
                  <img src={t.toString()} />
                  <GridListTileBar
                    title={d.id}
                    subtitle={<span>uploaded at x time</span>}
                  />
                </GridListTile>
              );
            })}
          </GridList>
        </Card>
      </UI>
    );
  }
  return <UIPlaceholder />;
}

// Index.getInitialProps = async ({ req }) => {
//   console.log(req);
//   const baseUrl = req ? `http://${req.headers.host}` : '';
//   const images = await (await fetch(baseUrl + '/api/images/recent')).json();
//   const config = await (await fetch(baseUrl + '/api/config/uploader')).json();
//   if (images.error || config.error) return { images: [], config: null };
//   return { images, config };
// };