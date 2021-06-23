import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@material-ui/core';

import { useFormik } from 'formik';
import * as yup from 'yup';
import useFetch from 'hooks/useFetch';
import Backdrop from 'components/Backdrop';
import Alert from 'components/Alert';
import { useStoreDispatch, useStoreSelector } from 'lib/redux/store';
import { updateUser } from 'lib/redux/reducers/user';

const validationSchema = yup.object({
  username: yup
    .string()
    .required('Username is required')
});

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

export default function Manage() {
  const user = useStoreSelector(state => state.user);
  const dispatch = useStoreDispatch();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState('success');
  const [message, setMessage] = useState('Saved');

  const formik = useFormik({
    initialValues: {
      username: user.username,
      password: '',
      embedTitle: user.embedTitle ?? '',
      embedColor: user.embedColor
    },
    validationSchema,
    onSubmit: async values => {
      const cleanUsername = values.username.trim();
      const cleanPassword = values.password.trim();
      const cleanEmbedTitle = values.embedTitle.trim();
      const cleanEmbedColor = values.embedColor.trim();

      if (cleanUsername === '') return formik.setFieldError('username', 'Username can\'t be nothing');

      setLoading(true);

      const data = {
        username: cleanUsername,
        password: cleanPassword === '' ? null : cleanPassword,
        embedTitle: cleanEmbedTitle === '' ? null : cleanEmbedTitle,
        embedColor: cleanEmbedColor === '' ? null : cleanEmbedColor
      };

      const newUser = await useFetch('/api/user', 'PATCH', data);

      if (newUser.error) {
        setLoading(false);
        setMessage('An error occured');
        setSeverity('error');
        setOpen(true);
      } else {
        dispatch(updateUser(newUser));
        setLoading(false);
        setMessage('Saved user');
        setSeverity('success');
        setOpen(true);
      }
    }
  });

  return (
    <>
      <Backdrop open={loading}/>
      <Alert open={open} setOpen={setOpen} message={message} severity={severity} />

      <Typography variant='h4' pb={2}>Manage User</Typography>
      <form onSubmit={formik.handleSubmit}>
        <TextInput id='username' label='Username' formik={formik} />
        <TextInput id='password' label='Password' formik={formik} type='password' />
        <TextInput id='embedTitle' label='Embed Title' formik={formik} />
        <TextInput id='embedColor' label='Embed Color' formik={formik} />
        <Box
          display='flex'
          justifyContent='right'
          alignItems='right'
          pt={2}
        >
          <Button
            variant='contained'
            type='submit'
          >Save</Button>
        </Box>
      </form>
    </>
  );
}