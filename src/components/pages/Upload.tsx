import React, { useState } from 'react';
import { Typography, Button, CardActionArea, Paper, Box } from '@material-ui/core';
import { Upload as UploadIcon } from '@material-ui/icons';
import Dropzone from 'react-dropzone';

import useFetch from 'hooks/useFetch';
import Backdrop from 'components/Backdrop';
import Alert from 'components/Alert';
import { useStoreSelector } from 'lib/redux/store';
import CenteredBox from 'components/CenteredBox';

export default function Manage({ route }) {
  const user = useStoreSelector(state => state.user);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState('success');
  const [message, setMessage] = useState('Saved');

  const handleUpload = async () => {
    const body = new FormData();
    body.append('file', file);

    setLoading(true);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': user.token
      },
      body
    });
    const json = await res.json();
    if (res.ok && json.error === undefined) {
      setOpen(true);
      setSeverity('success');
      setMessage(`File uploaded! ${json.url}`);
    } else {
      setOpen(true);
      setSeverity('error');
      setMessage('Could not upload file: ' + json.error);
    }
    setLoading(false);
  };

  return (
    <>
      <Backdrop open={loading}/>
      <Alert open={open} setOpen={setOpen} message={message} severity={severity} />

      <Typography variant='h4' pb={2}>Upload file</Typography>
      <Dropzone onDrop={acceptedFiles => setFile(acceptedFiles[0])}>
        {({getRootProps, getInputProps}) => (
          <CardActionArea>
            <Paper 
              elevation={0}
              variant='outlined'
              sx={{
                justifyContent: 'center',
                alignItems: 'center',
                display: 'block',
                p: 5
              }}
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              <CenteredBox><UploadIcon sx={{ fontSize: 100 }} /></CenteredBox>
              <CenteredBox><Typography variant='h5'>Drag an image or click to upload an image.</Typography></CenteredBox>
              <CenteredBox><Typography variant='h6'>{file && file.name}</Typography></CenteredBox>
            </Paper>
          </CardActionArea>
        )}
      </Dropzone>

      <Box
        display='flex'
        justifyContent='right'
        alignItems='right'
        pt={2}
      >
        <Button
          variant='contained'
          onClick={handleUpload}
        >Upload</Button>
      </Box>
    </>
  );
}
