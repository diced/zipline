import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card as MuiCard,
  CardHeader,
  Avatar,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

import { useStoreSelector } from 'lib/redux/store';
import Backdrop from 'components/Backdrop';
import Alert from 'components/Alert';
import useFetch from 'hooks/useFetch';
import { useRouter } from 'next/router';
import { useFormik } from 'formik';

function Card({ user, handleDelete }) {
  return (
    <MuiCard sx={{ minWidth: 270 }}>
      <CardHeader 
        avatar={<Avatar>{user.username[0]}</Avatar>}
        action={<IconButton onClick={() => handleDelete(user)}><DeleteIcon /></IconButton>}
        title={<Typography variant='h6'>{user.username}</Typography>}
      />
    </MuiCard>
  );
}

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

function CreateUserDialog({ open, setOpen, updateUsers, setSeverity, setMessage, setLoading, setAlertOpen }) {
  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
      administrator: false,
    },
    onSubmit: async (values) => {
      const cleanUsername = values.username.trim();
      const cleanPassword = values.password.trim();
      if (cleanUsername === '') return formik.setFieldError('username', 'Username can\'t be nothing');
      if (cleanPassword === '') return formik.setFieldError('password', 'Password can\'t be nothing');

      const data = {
        username: cleanUsername,
        password: cleanPassword,
        administrator: values.administrator,
      };

      setOpen(false);
      setLoading(true);
      const res = await useFetch('/api/auth/create', 'POST', data);
      if (res.error) {
        setSeverity('error');
        setMessage('Could\'nt create user: ' + res.error);
        setAlertOpen(true);
      } else {
        setSeverity('success');
        setMessage('Created user ' + res.username);
        setAlertOpen(true);
        updateUsers();
      }
      setLoading(false);
    },
  });
  
  return (
    <div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          elevation: 1,
        }}
      >
        <DialogTitle>
          Create User
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <TextInput id='username' label='Username' formik={formik} />
            <TextInput id='password' label='Password' formik={formik} type='password' />
            <FormControlLabel
              id='administrator'
              name='administrator'
              value={formik.values.administrator}
              onChange={formik.handleChange}
              control={<Switch  />}
              label='Administrator?'
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} color='inherit' autoFocus>Cancel</Button>
            <Button type='submit' color='inherit'>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}

export default function Users() {
  const user = useStoreSelector(state => state.user);
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [severity, setSeverity] = useState('success');
  const [message, setMessage] = useState('Saved');
  const [loading, setLoading] = useState(true);

  const updateUsers = async () => {
    setLoading(true);
    const us = await useFetch('/api/users');
    if (!us.error) {
      setUsers(us);
    } else {
      router.push('/dashboard');
    };
    setLoading(false);
  };

  const handleDelete = async (user) => {
    const res = await useFetch('/api/users', 'DELETE', {
      id: user.id,
    });
    if (res.error) {
      setMessage(`Could not delete ${user.username}`);
      setSeverity('error');
      setOpen(true);
    } else {
      setMessage(`Deleted user ${res.username}`);
      setSeverity('success');
      setOpen(true);
      updateUsers();
    }
  };

  useEffect(() => {
    updateUsers();
  }, []);

  return (
    <>
      <Backdrop open={loading}/>
      <Alert open={open} setOpen={setOpen} message={message} severity={severity} />
      <CreateUserDialog open={createOpen} setOpen={setCreateOpen} setSeverity={setSeverity} setMessage={setMessage} setLoading={setLoading} updateUsers={updateUsers} setAlertOpen={setOpen} />
      <Typography variant='h4' pb={2}>Users <IconButton onClick={() => setCreateOpen(true)}><AddIcon /></IconButton></Typography>
      <Grid container spacing={2}>
        {users.filter(x => x.username !== user.username).map((user, i) => (
          <Grid item xs={12} sm={3} key={i}>
            <Card user={user} handleDelete={handleDelete}/>
          </Grid>
        ))}
      </Grid>
    </>
  );
}