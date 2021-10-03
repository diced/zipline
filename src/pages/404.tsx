import React from 'react';
import { Box, Typography } from '@mui/material';

export default function FourOhFour() {
  return (
    <>
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        minHeight='100vh'
      >
        <Typography variant='h2'>404 - Not Found</Typography>
      </Box>
    </>
  );
}