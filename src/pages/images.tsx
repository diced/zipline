import React from 'react';
import { useRouter } from 'next/router';
import Paper from '@material-ui/core/Paper';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
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

const useStyles = makeStyles({
  margin: {
    margin: '5px',
  },
  padding: {
    padding: '10px',
  },
});

export default function Images({ config }: { config: ConfigUploader }) {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();
  const [chunks, setChunks] = React.useState([]);
  const [images, setImages] = React.useState<Image[]>([]);
  const [selectedImage, setSelectedImage] = React.useState<Image>(null);
  const [anchorEl, setAnchorEl] = React.useState(null);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  if (!state.loggedIn) router.push('/login');
  else {

    const getChunkedImages = async () => {
      const chunks = await (await fetch('/api/images/chunk')).json();
      if (!chunks.error) setChunks(chunks);
    };

    React.useEffect(() => {
      getChunkedImages();
      changePage(null, 1);
    }, []);

    const changePage = (event, p: number) => {
      const page = chunks[p - 1];
      if (page) setImages(page);
    };

    const setImageOpenPopover = (e, d: Image) => {
      setAnchorEl(e.currentTarget);
      setSelectedImage(d);
    };

    const handleDeleteImage = async () => {
      setAnchorEl(null);
      if (!selectedImage) return;
      const d = await (await fetch(`/api/images/${selectedImage.id}`, {
        method: 'DELETE'
      })).json();
      if (!d.error) {
        getChunkedImages();
        changePage(null, 1);
      }
    };

    return (
      <UI>
        <Paper elevation={3} className={classes.padding}>
          <GridList cols={3}>
            {images.map(d => {
              const t = new URL(window.location.href);
              t.pathname = `${config ? config.route : '/u'}/${d.file}`;
              return (
                <GridListTile key={d.id} cols={1}>
                  <img src={t.toString()} onClick={(e) => setImageOpenPopover(e, d)} />
                </GridListTile>
              );
            })}
          </GridList>
          <Pagination count={chunks.length} onChange={changePage} />
        </Paper>
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
            variant="contained"
            color="secondary"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteImage}
          >
            Delete
          </Button>
        </Popover>
      </UI >
    );
  }
  return <UIPlaceholder />;
}