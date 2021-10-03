import React, { useEffect, useState } from 'react';
import { Typography, Box, TextField, Stack, Button, styled } from '@mui/material';
import { useRouter } from 'next/router';
import Alert from 'components/Alert';
import Backdrop from 'components/Backdrop';
import TextInput from 'components/input/TextInput';
import useFetch from 'hooks/useFetch';
import { useFormik } from 'formik';

export default function Login() {
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState('success');
  const [message, setMessage] = useState('');
  const [loadingOpen, setLoadingOpen] = useState(false);
  const router = useRouter();

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    onSubmit: async values => {
      const username = values.username.trim();
      const password = values.password.trim();

      if (username === '') return formik.setFieldError('username', 'Username can\'t be nothing');

      setLoadingOpen(true);
      const res = await useFetch('/api/auth/login', 'POST', {
        username, password,
      });
  
      if (res.error) {
        setOpen(true);
        setSeverity('error');
        setMessage(res.error);
        setLoadingOpen(false);
      } else {
        setOpen(true);
        setSeverity('success');
        setMessage('Logged in');
        router.push('/dashboard');
      }
    },
  });

  useEffect(() => {
    (async () => {
      const a = await fetch('/api/user');
      if (a.ok) router.push('/dashboard'); 
    })();
  }, []);

  return (
    <>
      <Alert open={open} setOpen={setOpen} severity={severity} message={message} />
      <Backdrop open={loadingOpen} />
      <Box
        display='flex'
        height='screen'
        alignItems='center'
        justifyContent='center'
        sx={{ height: '24rem' }}
      >
        <Stack>
          <Typography variant='h3' textAlign='center'>
            Zipline
          </Typography>

          <form onSubmit={formik.handleSubmit}>
            <TextInput formik={formik} id='username' label='Username' />
            <TextInput formik={formik} id='password' label='Password' type='password' />
            <Box my={2}>
              <Button variant='contained' fullWidth type='submit'>
                Login
              </Button>
            </Box>
          </form>
        </Stack>
      </Box>
    </>
  );
}

Login.title = 'Zipline - Login';