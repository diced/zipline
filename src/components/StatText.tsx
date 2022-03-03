import React from 'react';
import { Text } from '@mantine/core';

export default function StatText({ children }) {
  return <Text color='gray' size='xl'>{children}</Text>;
}