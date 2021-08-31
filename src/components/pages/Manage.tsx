import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Select, MenuItem } from '@material-ui/core';
import Download from '@material-ui/icons/Download';

import { useFormik } from 'formik';
import * as yup from 'yup';
import useFetch from 'hooks/useFetch';
import Backdrop from 'components/Backdrop';
import Alert from 'components/Alert';
import { useStoreDispatch, useStoreSelector } from 'lib/redux/store';
import { updateUser } from 'lib/redux/reducers/user';
import { useRouter } from 'next/router';

const validationSchema = yup.object({
  username: yup
    .string()
    .required('Username is required')
});

const themeValidationSchema = yup.object({
  type: yup
    .string()
    .required('Type (dark, light) is required is required'),
  primary: yup
    .string()
    .required('Primary color is required')
    .matches(/\#[0-9A-Fa-f]{6}/g, { message: 'Not a valid hex color' }),
  secondary: yup
    .string()
    .required('Secondary color is required')
    .matches(/\#[0-9A-Fa-f]{6}/g, { message: 'Not a valid hex color' }),
  error: yup
    .string()
    .required('Error color is required')
    .matches(/\#[0-9A-Fa-f]{6}/g, { message: 'Not a valid hex color' }),
  warning: yup
    .string()
    .required('Warning color is required')
    .matches(/\#[0-9A-Fa-f]{6}/g, { message: 'Not a valid hex color' }),
  info: yup
    .string()
    .required('Info color is required')
    .matches(/\#[0-9A-Fa-f]{6}/g, { message: 'Not a valid hex color' }),
  border: yup
    .string()
    .required('Border color is required')
    .matches(/\#[0-9A-Fa-f]{6}/g, { message: 'Not a valid hex color' }),
  mainBackground: yup
    .string()
    .required('Main Background is required')
    .matches(/\#[0-9A-Fa-f]{6}/g, { message: 'Not a valid hex color' }),
  paperBackground: yup
    .string()
    .required('Paper Background is required')
    .matches(/\#[0-9A-Fa-f]{6}/g, { message: 'Not a valid hex color' }),

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
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState('success');
  const [message, setMessage] = useState('Saved');

  const genShareX = (withEmbed: boolean = false, withZws: boolean = false) => {
    const config = {
      Version: '13.2.1',
      Name: 'Zipline',
      DestinationType: 'ImageUploader, TextUploader',
      RequestMethod: 'POST',
      RequestURL: `${window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '')}/api/upload`,
      Headers: {
        Authorization: user?.token,
        ...(withEmbed && {Embed: 'true'}),
        ...(withZws && {ZWS: 'true'})
      },
      URL: '$json:url$',
      Body: 'MultipartFormData',
      FileFormName: 'file'
    };

    const pseudoElement = document.createElement('a');
    pseudoElement.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, '\t')));
    pseudoElement.setAttribute('download', `zipline${withEmbed ? '_embed' : ''}${withZws ? '_zws' : ''}.sxcu`);
    pseudoElement.style.display = 'none';
    document.body.appendChild(pseudoElement);
    pseudoElement.click();
    pseudoElement.parentNode.removeChild(pseudoElement);
  };

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

  const customThemeFormik = useFormik({
    initialValues: {
      type: user.customTheme?.type || 'dark',
      primary: user.customTheme?.primary || '',
      secondary: user.customTheme?.secondary || '',
      error: user.customTheme?.error || '',
      warning: user.customTheme?.warning || '',
      info: user.customTheme?.info || '',
      border: user.customTheme?.border || '',
      mainBackground: user.customTheme?.mainBackground || '',
      paperBackground: user.customTheme?.paperBackground || '',
    },
    validationSchema: themeValidationSchema,
    onSubmit: async values => {
      setLoading(true);

      const newUser = await useFetch('/api/user', 'PATCH', { customTheme: values });

      if (newUser.error) {
        setLoading(false);
        setMessage('An error occured');
        setSeverity('error');
        setOpen(true);
      } else {
        dispatch(updateUser(newUser));
        router.replace(router.pathname);
        setLoading(false);
        setMessage('Saved theme');
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
          >Save User</Button>
        </Box>
      </form>
      <Typography variant='h4' py={2}>Manage Theme</Typography>
      <form onSubmit={customThemeFormik.handleSubmit}>
        <Select
          id='type'
          name='type'
          label='Type'
          value={customThemeFormik.values['type']}
          onChange={customThemeFormik.handleChange}
          error={customThemeFormik.touched['type'] && Boolean(customThemeFormik.errors['type'])}
          variant='standard'
          fullWidth
        >
          <MenuItem value='dark'>Dark Theme</MenuItem>
          <MenuItem value='light'>Light Theme</MenuItem>
        </Select>
        <TextInput id='primary' label='Primary Color' formik={customThemeFormik} />
        <TextInput id='secondary' label='Secondary Color' formik={customThemeFormik} />
        <TextInput id='error' label='Error Color' formik={customThemeFormik} />
        <TextInput id='warning' label='Warning Color' formik={customThemeFormik} />
        <TextInput id='info' label='Info Color' formik={customThemeFormik} />
        <TextInput id='border' label='Border Color' formik={customThemeFormik} />
        <TextInput id='mainBackground' label='Main Background' formik={customThemeFormik} />
        <TextInput id='paperBackground' label='Paper Background' formik={customThemeFormik} />
        <Box
          display='flex'
          justifyContent='right'
          alignItems='right'
          pt={2}
        >
          <Button
            variant='contained'
            type='submit'
          >Save Theme</Button>
        </Box>
      </form>
      <Typography variant='h4' py={2}>ShareX Config</Typography>
      <Button variant='contained' onClick={() => genShareX(false)} startIcon={<Download />}>ShareX Config</Button>
      <Button variant='contained' sx={{ marginLeft: 1 }} onClick={() => genShareX(true)} startIcon={<Download />}>ShareX Config with Embed</Button>
      <Button variant='contained' sx={{ marginLeft: 1 }} onClick={() => genShareX(false, true)} startIcon={<Download />}>ShareX Config with ZWS</Button>
    </>
  );
}
