import React, { useState } from 'react';

import { 
  Card,
  CardMedia,
  CardActionArea,
  Popover,
  Button,
  ButtonGroup
} from '@material-ui/core';
import copy from 'copy-to-clipboard';
import useFetch from '../lib/hooks/useFetch';

export default function Image({ image, updateImages }) {
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleDelete = async () => {
    const res = await useFetch('/api/user/images', 'DELETE', { id: image.id });
    if (!res.error) updateImages(true);
    
    setAnchorEl(null);
  };

  const handleCopy = () => {
    copy(`${window.location.protocol}//${window.location.host}${image.url}`);
    setAnchorEl(null);
  };

  const handleFavorite = async () => {
    const data = await useFetch('/api/user/images', 'PATCH', { id: image.id, favorite: !image.favorite });
    if (!data.error) updateImages(true);
  };

  return (
    <>
      <Card sx={{ maxWidth: '100%' }}>
        <CardActionArea>
          <CardMedia
            sx={{ height: 320 }}
            image={image.url}
            title={image.file}
            onClick={e => setAnchorEl(e.currentTarget)}
          />
        </CardActionArea>
      </Card>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
      >
        <ButtonGroup variant='contained'>
          <Button onClick={handleDelete} color='primary'>Delete</Button>
          <Button onClick={handleCopy} color='primary'>Copy URL</Button>
          <Button onClick={handleFavorite} color='primary'>{image.favorite ? 'Unfavorite' : 'Favorite'}</Button>
        </ButtonGroup>
      </Popover>
    </>
  );
}