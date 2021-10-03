import React from 'react';
import { styled, Select as MuiSelect, Input } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useTheme } from '@mui/system';

const CssInput = styled(Input)(({ theme }) => ({
  '& label.Mui-focused': {
    color: 'white',
  },
  '&': {
    color: 'white',
  },
  '&:before': {
    borderBottomColor: '#fff8',
  },
  '&&:hover:before': {
    borderBottomColor: theme.palette.primary.dark,
  },
  '&:after': {
    borderBottomColor: theme.palette.primary.main,
  },
}));

export default function Select({ ...other }) {
  return (
    <MuiSelect input={<CssInput />} {...other}/>
  );
}