import { Card as MCard, Title } from '@mantine/core';


export default function Card({ name, children, ...other }) {
  return (
    <MCard p='md' shadow='sm' {...other}>
      {name && <Title order={2}>{name}</Title>}
      {children}
    </MCard>
  );
}