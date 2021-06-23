import React, { useEffect, useState } from 'react';
import { Typography, Box, TextField, Stack, Button } from '@material-ui/core';
import { Color } from '@material-ui/core/Alert/Alert';
import { useRouter } from 'next/router';
import Alert from 'components/Alert';
import Backdrop from 'components/Backdrop';
import useFetch from 'hooks/useFetch';
import { useFormik } from 'formik';


function TextInput({ id, label, formik, ...other }) {
  return (
    <Box>
      <TextField
        id={id}
        name={id}
        label={label}
        value={formik.values[id]}
        onChange={formik.handleChange}
        error={formik.touched[id] && Boolean(formik.errors[id])}
        helperText={formik.touched[id] && formik.errors[id]}
        variant='standard'
        sx={{ pb: 0.5 }}
        {...other}
      />
    </Box>
  );
}

export default function Login() {
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<Color>('success');
  const [message, setMessage] = useState('');
  const [loadingOpen, setLoadingOpen] = useState(false);
  const router = useRouter();

  const formik = useFormik({
    initialValues: {
      username: '',
      password: ''
    },
    onSubmit: async values => {
      const username = values.username.trim();
      const password = values.password.trim();

      if (username === '') return formik.setFieldError('username', 'Username can\'t be nothing');

      setLoadingOpen(true);
      const res = await useFetch('/api/auth/login', 'POST', {
        username, password
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
    }
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