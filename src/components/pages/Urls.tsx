import React, { useEffect, useState } from 'react';
import { Grid, Card, CardHeader, Box, Typography, IconButton, Link, Dialog, DialogContent, DialogActions, Button, DialogTitle, TextField } from '@material-ui/core';
import { ContentCopy as CopyIcon, DeleteForever as DeleteIcon, Add as AddIcon } from '@material-ui/icons';

import Backdrop from 'components/Backdrop';
import useFetch from 'hooks/useFetch';
import Alert from 'components/Alert';
import copy from 'copy-to-clipboard';
import { useFormik } from 'formik';
import { useStoreSelector } from 'lib/redux/store';
import * as yup from 'yup';

function TextInput({ id, label, formik, ...other }) {
  return (
    <TextField
      id={id}
      name={id}
      label={label}
      value={formik.values[id]}
      onChange={formik.handleChange}
      error={formik.touched[id] && Boolean(formik.errors[id])}
      helperText={formik.touched[id] && formik.errors[id]}
      variant='standard'
      fullWidth
      sx={{ pb: 0.5 }}
      {...other}
    />
  );
}

export default function Urls() {
  const user = useStoreSelector(state => state.user);

  const [loading, setLoading] = useState(true);
  const [urls, setURLS] = useState([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [severity, setSeverity] = useState('success');
  const [message, setMessage] = useState('Deleted');

  const updateURLs = async () => {
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

    updateURLs();
  };

  const copyURL = u => {
    copy(`${window.location.protocol}//${window.location.host}${u.url}`);
    setSeverity('success');
    setMessage(`Copied URL: ${window.location.protocol}//${window.location.host}${u.url}`);
    setOpen(true);
  };

  const formik = useFormik({
    initialValues: {
      url: '',
      vanity: '',
    },
    validationSchema: yup.object({
      
    }),
    onSubmit: async (values) => {
      const cleanURL = values.url.trim();
      const cleanVanity = values.vanity.trim();

      if (cleanURL === '') return formik.setFieldError('username', 'Username can\'t be nothing');

      const data = {
        url: cleanURL,
        vanity: cleanVanity === '' ? null : cleanVanity,
      };

      setCreateOpen(false);
      setLoading(true);
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Authorization': user.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.error) {
        setSeverity('error');
        setMessage('Could\'nt create URL: ' + json.error);
        setOpen(true);
      } else {
        setSeverity('success');
        setMessage('Copied URL: ' + json.url);
        copy(json.url);
        setOpen(true);
        setCreateOpen(false);
        updateURLs();
      }
      setLoading(false);
    },
  });

  useEffect(() => {
    updateURLs();
  }, []);

  return (
    <>
      <Backdrop open={loading}/>
      <Alert open={open} setOpen={setOpen} message={message} severity={severity} />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle>Shorten URL</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextInput id='url' label='URL' formik={formik} />
            <TextInput id='vanity' label='Vanity' formik={formik} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} color='inherit' autoFocus>Cancel</Button>
            <Button type='submit' color='inherit'>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {!urls.length ? (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          pt={2}
          pb={3}
        >
          <Typography variant='h4' sx={{ mb: 1 }}>No URLs <IconButton onClick={() => setCreateOpen(true)}><AddIcon/></IconButton></Typography>
        </Box>
      ) : <Typography variant='h4' sx={{ mb: 1 }}>URLs <IconButton onClick={() => setCreateOpen(true)}><AddIcon/></IconButton></Typography>}

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