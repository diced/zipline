import React from 'react';
import { styled, TextField, Box } from '@mui/material';

const CssTextField = styled(TextField)(({ theme }) => ({
  '& label.Mui-focused': {
    color: 'white',
  },
  '& input': {
    color: 'white',
  },
  '& .MuiInput-underline:before': {
    borderBottomColor: '#fff8',
  },
  '&& .MuiInput-underline:hover:before': {
    borderBottomColor: theme.palette.primary.dark,
  },
  '& .MuiInput-underline:after': {
    borderBottomColor: theme.palette.primary.main,
  },
}));


export default function TextInput({ id, label, formik, ...other }) {
  return (
    <Box>
      <CssTextField
        id={id}
        name={id}
        label={label}
        value={formik.values[id]}
        onChange={formik.handleChange}
        error={formik.touched[id] && Boolean(formik.errors[id])}
        helperText={formik.touched[id] && formik.errors[id]}
        // @ts-ignore
        variant='standard'
        sx={{ pb: 0.5 }}
        {...other}
      />
    </Box>
  );
}