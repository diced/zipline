import React, { useEffect, useState } from 'react';
import { Grid, Card, CardHeader, Box, Typography, IconButton, Link } from '@material-ui/core';
import { ContentCopy as CopyIcon, DeleteForever as DeleteIcon } from '@material-ui/icons';

import Backdrop from 'components/Backdrop';
import useFetch from 'hooks/useFetch';
import Alert from 'components/Alert';
import copy from 'copy-to-clipboard';

export default function Urls() {
  const [loading, setLoading] = useState(true);
  const [urls, setURLS] = useState([]);
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState('success');
  const [message, setMessage] = useState('Deleted');

  const updatePages = async () => {
    setLoading(true);
    const urls = await useFetch('/api/user/urls');

    setURLS(urls);
    setLoading(false);
  };

  const deleteURL = async u => {
    const url = await useFetch('/api/user/urls', 'DELETE', { id: u.id });
    if (url.error) {
      setSeverity('error');
      setMessage('Error: ' + url.error);
      setOpen(true);
    } else {
      setSeverity('success');
      setMessage(`Deleted ${u.vanity ?? u.id}`);
      setOpen(true);
    }

    updatePages();
  };

  const copyURL = u => {
    copy(`${window.location.protocol}//${window.location.host}${u.url}`);
    setSeverity('success');
    setMessage(`Copied URL: ${window.location.protocol}//${window.location.host}${u.url}`);
    setOpen(true);
  };

  useEffect(() => {
    updatePages();
  }, []);

  return (
    <>
      <Backdrop open={loading}/>
      <Alert open={open} setOpen={setOpen} message={message} severity={severity} />

      {!urls.length ? (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          pt={2}
          pb={3}
        >
          <Typography variant='h4'>No URLs</Typography>
        </Box>
      ) : <Typography variant='h4'>URLs</Typography>}

      <Grid container spacing={2}>
        {urls.length ? urls.map(url => (
          <Grid item xs={12} sm={3} key={url.id}>
            <Card sx={{ maxWidth: '100%' }}>
              <CardHeader
                action={
                  <>
                    <IconButton aria-label='copy' onClick={() => copyURL(url)}>
                      <CopyIcon />
                    </IconButton>
                    <IconButton aria-label='delete' onClick={() => deleteURL(url)}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
                title={url.vanity ?? url.id}
                subheader={<Link href={url.destination}>{url.destination}</Link>}
              />
            </Card>
          </Grid>
        )) : null}
      </Grid>
    </>
  );
}