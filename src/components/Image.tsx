import React, { useState } from 'react';

import { 
  Card,
  CardMedia,
  CardActionArea,
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@material-ui/core';
import AudioIcon from '@material-ui/icons/Audiotrack';
import copy from 'copy-to-clipboard';
import useFetch from 'hooks/useFetch';

export default function Image({ image, updateImages }) {
  const [open, setOpen] = useState(false);
  const [t] = useState(image.mimetype.split('/')[0]);
  
  const handleDelete = async () => {
    const res = await useFetch('/api/user/files', 'DELETE', { id: image.id });
    if (!res.error) updateImages(true);
    
    setOpen(false);
  };

  const handleCopy = () => {
    copy(`${window.location.protocol}//${window.location.host}${image.url}`);
    setOpen(false);
  };

  const handleFavorite = async () => {
    const data = await useFetch('/api/user/files', 'PATCH', { id: image.id, favorite: !image.favorite });
    if (!data.error) updateImages(true);
  };

  const Type = (props) => {
    return {
      'video': <video controls {...props} />,
      // eslint-disable-next-line jsx-a11y/alt-text
      'image': <img {...props} />,
      'audio': <audio controls {...props} />,
    }[t];
  };

  return (
    <>
      <Card sx={{ maxWidth: '100%' }}>
        <CardActionArea sx={t === 'audio' ? { justifyContent: 'center', display: 'flex', alignItems: 'center' } : {}}>
          <CardMedia
            sx={{ height: 320, fontSize: 70, width: '100%' }}
            image={image.url}
            title={image.file}
            component={t === 'audio' ? AudioIcon : t} // this is done because audio without controls is hidden
            onClick={() => setOpen(true)}
          />
        </CardActionArea>
      </Card>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
      >
        <DialogTitle id='alert-dialog-title'>
          {image.file}
          
        </DialogTitle>
        <DialogContent>
          <Type
            style={{ width: '100%' }}
            src={image.url}
            alt={image.url}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDelete} color='inherit'>Delete</Button>
          <Button onClick={handleCopy} color='inherit'>Copy URL</Button>
          <Button onClick={handleFavorite} color='inherit'>{image.favorite ? 'Unfavorite' : 'Favorite'}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}