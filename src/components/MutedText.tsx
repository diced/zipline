import { Text } from '@mantine/core';

export default function MutedText({ children, ...props }) {
  return <Text color='dimmed' size='xl' {...props}>{children}</Text>;
}