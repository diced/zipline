import React from 'react';
import { Snackbar, Alert as MuiAlert } from '@mui/material';

export default function Alert({ open, setOpen, severity, message }) {
  return (
    <Snackbar open={open} autoHideDuration={6000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} onClose={() => setOpen(false)}>
      <MuiAlert severity={severity} sx={{ width: '100%' }}>
        {message}
      </MuiAlert>
    </Snackbar>
  );
}