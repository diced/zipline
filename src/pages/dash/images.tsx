import React from 'react';
import { useRouter } from 'next/router';
import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardMedia from '@material-ui/core/CardMedia';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Popover from '@material-ui/core/Popover';
import Button from '@material-ui/core/Button';
import Pagination from '@material-ui/lab/Pagination';
import DeleteIcon from '@material-ui/icons/Delete';
import AddToPhotosIcon from '@material-ui/icons/AddToPhotos';
import UI from '../../components/UI';
import UIPlaceholder from '../../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../../store';
import { Image } from '../../lib/entities/Image';
import { Configuration } from '../../lib/Config';
import { createURL } from '../../lib/WebUtil';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: '5px'
  },
  padding: {
    border:
      theme.palette.type === 'dark' ? '1px solid #1f1f1f' : '1px solid #e0e0e0',
    padding: '10px'
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff'
  },
  gridList: {
    width: theme.zIndex.drawer + 1,
    height: 450
  }
}));

export default function Images({ config }) {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();

  const [loading, setLoading] = React.useState(true);
  const [showPagination, setShowPagination] = React.useState(true);
  const [chunks, setChunks] = React.useState([]);
  const [images, setImages] = React.useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = React.useState<Image>(null);
  const [anchorEl, setAnchorEl] = React.useState(null);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  if (!state.loggedIn) router.push('/user/login');
  else {
    const getChunkedImages = async () => {
      const c = await (await fetch('/api/images/chunk')).json();
      if (!c.error) {
        setChunks(c);
        console.log(c);
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
      } else if (chunks.length === 0) {
        setLoading(false);
        setShowPagination(false);
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
          method: 'DELETE'
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
            {showPagination ? (
              <>
                <Grid container spacing={2}>
                  {images.map(d => (
                    <Grid
                      item
                      xs={12}
                      sm={4}
                      key={d.id}
                      onClick={e => setImageOpenPopover(e, d)}
                    >
                      <Card>
                        <CardActionArea>
                          <CardMedia
                            component='img'
                            height='140'
                            image={createURL(
                              window.location.href,
                              config ? config.uploader.route : '/u',
                              d.file
                            )}
                          />
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Pagination count={chunks.length} onChange={changePage} />
              </>
            ) : (
              <Grid
                container
                spacing={0}
                direction='column'
                alignItems='center'
                justify='center'
              >
                <Grid item xs>
                  <AddToPhotosIcon style={{ fontSize: 100 }} />
                </Grid>
              </Grid>
            )}
          </Paper>
        ) : null}
        <Popover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'center',
            horizontal: 'center'
          }}
          transformOrigin={{
            vertical: 'center',
            horizontal: 'center'
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

export async function getStaticProps() {
  const config = Configuration.readConfig();
  return { props: { config: config } };
}
