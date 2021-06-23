import React from 'react';
import {
  Backdrop as MuiBackdrop,
  CircularProgress
} from '@material-ui/core';

export default function Backdrop({ open }) {
  return (
    <MuiBackdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={open}
    >
      <CircularProgress color='inherit' />
    </MuiBackdrop>
  );
}