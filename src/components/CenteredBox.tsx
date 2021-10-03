import React from 'react';
import { Box } from '@mui/material';

export default function CenteredBox({ children, ...other }) {
  return (
    <Box
      justifyContent='center'
      display='flex'
      alignItems='center'
      {...other}
    >
      {children}
    </Box>
  );
}