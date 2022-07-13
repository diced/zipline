import React from 'react';
import { Button, Stack, Title } from '@mantine/core';
import Link from 'components/Link';
import MutedText from 'components/MutedText';

export default function FourOhFour() {
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
      <Title sx={{ fontSize: 220, fontWeight: 900, lineHeight: .8 }}>404</Title>
      <MutedText sx={{ fontSize: 40, fontWeight: 500 }}>This page does not exist!</MutedText>
      <Button component={Link} href='/dashboard'>Head to the Dashboard</Button>
    </Stack>
  );
}

FourOhFour.title = 'Zipline - 404';