import React from 'react';
import { useRouter } from 'next/router';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardMedia from '@material-ui/core/CardMedia';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import CardContent from '@material-ui/core/CardContent';
import Popover from '@material-ui/core/Popover';
import Button from '@material-ui/core/Button';
import Pagination from '@material-ui/lab/Pagination';
import DeleteIcon from '@material-ui/icons/Delete';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../lib/store';
import { Image } from '../entities/Image';
import { ConfigUploader } from '../lib/Config';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: '5px',
  },
  padding: {
    border: '1px solid #1f1f1f',
    padding: '10px'
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  gridList: {
    width: theme.zIndex.drawer + 1,
    height: 450,
  },
}));

export default function Images({ config }: { config: ConfigUploader }) {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();

  const [loading, setLoading] = React.useState(true);
  const [chunks, setChunks] = React.useState([]);
  const [images, setImages] = React.useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = React.useState<Image>(null);
  const [anchorEl, setAnchorEl] = React.useState(null);

  console.log('1', chunks);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  if (!state.loggedIn) router.push('/login');
  else {
    const getChunkedImages = async () => {
      const c = await (await fetch('/api/images/chunk')).json();
      if (!c.error) {
        setChunks(c);
        return c;
      }
      return [];
    };

    React.useEffect(() => {
      (async () => {
        setLoading(true);
        changePage(null, 1);
      })();
    }, []);

    const changePage = async (event, p: number) => {
      const chunks = await getChunkedImages();
      const page = chunks[p - 1];
      if (page) {
        setImages(page);
        setLoading(false);
      }
    };

    const setImageOpenPopover = (e, d: Image) => {
      setAnchorEl(e.currentTarget);
      setSelectedImage(d);
    };

    const handleDeleteImage = async () => {
      setAnchorEl(null);
      if (!selectedImage) return;
      const d = await (
        await fetch(`/api/images/${selectedImage.id}`, {
          method: 'DELETE',
        })
      ).json();
      if (!d.error) {
        getChunkedImages();
        changePage(null, 1);
      }
    };

    return (
      <UI>
        <Backdrop className={classes.backdrop} open={loading}>
          <CircularProgress color='inherit' />
        </Backdrop>
        {!loading ? (
          <Paper elevation={3} className={classes.padding}>
            <Grid container spacing={2}>
              {images.map(d => {
                const t = new URL(window.location.href);
                t.pathname = `${config ? config.route : '/u'}/${d.file}`;
                return (
                  <Grid item xs={12} sm={6} key={d.id} onClick={e => setImageOpenPopover(e, d)}>
                    <Card>
                      <CardActionArea>
                        <CardMedia
                          component="img"
                          height="140"
                          image={t.toString()}
                        />
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
            <Pagination count={chunks.length} onChange={changePage} />
          </Paper>
        ) : null}
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'center',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'center',
            horizontal: 'center',
          }}
          onClose={() => setAnchorEl(null)}
          disableRestoreFocus
        >
          <Button
            variant='contained'
            color='secondary'
            startIcon={<DeleteIcon />}
            onClick={handleDeleteImage}
          >
            Delete
          </Button>
        </Popover>
      </UI>
    );
  }
  return <UIPlaceholder />;
}
