import { Text } from '@mantine/core';

export default function MutedText({ children, ...props }) {
  return <Text color='gray' size='xl' {...props}>{children}</Text>;
}