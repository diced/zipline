/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import React from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Box from '@material-ui/core/Box';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import { DropzoneArea } from 'material-ui-dropzone';
import UI from '../../components/UI';
import UIPlaceholder from '../../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../../store';

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

export default function Upload() {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();
  const [files, setFiles] = React.useState<File[]>([]);
  const [alertOpen, setAlertOpen] = React.useState<boolean>(false);
  const [alertSev, setAlertSev] = React.useState('success');
  const [alertMsg, setAlertMsg] = React.useState('Uploaded Image!');

  const handleFileUpload = async () => {
    const file = files[0];
    const body = new FormData();
    body.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'authorization': state.user.token
      },
      body
    });

    if (res.ok) {
      setAlertOpen(true);
      setAlertMsg('Uploaded Image!');
      setAlertSev('success');
    } else {
      const d = await res.json();
      setAlertOpen(true);
      setAlertMsg(`Couldn't upload: ${d.error}`);
      setAlertSev('error');
    }
  };

  const snack = (
    <Snackbar
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center'
      }}
      open={alertOpen}
      autoHideDuration={6000}
      onClose={() => setAlertOpen(false)}
    >
      <Alert severity={alertSev} variant='filled'>
        {alertMsg}
      </Alert>
    </Snackbar>
  );

  if (typeof window === 'undefined') return <UIPlaceholder />;
  if (!state.loggedIn) router.push('/user/login');
  else {
    return (
      <UI>
        <>
          {snack}
          <Paper elevation={3} className={classes.padding}>
            <Typography variant='h5'>
              Upload
            </Typography>
            <Box m={1}>
              <DropzoneArea
                acceptedFiles={['image/*', 'video/*']}
                dropzoneText={'Drag an image or click to upload an image.'}
                onChange={f => setFiles(f)}
                filesLimit={1}
                maxFileSize={1073741824} // 1gb in byte
              />
            </Box>
            <Button onClick={handleFileUpload}>Upload</Button>
          </Paper>
        </>
      </UI>
    );
  }
  return <UIPlaceholder />;
}
