import React from 'react';
import {
  Card as MCard,
  Title,
} from '@mantine/core';

export default function Card(props) {
  const { name, children, ...other } = props;

  return (
    <MCard padding='md' shadow='sm' {...other}>
      <Title order={2}>{name}</Title>
      {children}
    </MCard>
  );
}