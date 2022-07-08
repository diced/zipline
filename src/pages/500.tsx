import React from 'react';
import { Button, Stack, Title } from '@mantine/core';
import Link from 'components/Link';
import MutedText from 'components/MutedText';

export default function FiveHundred() {
  return (
    <Stack
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: '100vh',
        justifyContent: 'center',
        position: 'relative',
      }}
      spacing='sm'
    >
      <Title sx={{ fontSize: 220, fontWeight: 900, lineHeight: .8 }}>500</Title>
      <MutedText sx={{ fontSize: 40, fontWeight: 500 }}>Internal Server Error</MutedText>
      <Button component={Link} href='/dashboard'>Head to the Dashboard</Button>
    </Stack>
  );
}