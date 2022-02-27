import React from 'react';
import { Box, Text } from '@mantine/core';

export default function FourOhFour() {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          minHeight: '100vh',
          justifyContent: 'center',
        }}
      >
        <Text size='xl'>404 - Not Found</Text>
      </Box>
    </>
  );
}