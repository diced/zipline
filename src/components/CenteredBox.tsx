import React from 'react';
import { Box } from '@material-ui/core';

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