import { Paper, Group, Title, Text } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import type { ReactNode } from 'react';

export default function Stat({ title, value, Icon }: { title: string; value: ReactNode; Icon: Icon }) {
  return (
    <Paper p='md' radius='md' withBorder>
      <Group justify='space-between'>
        <Text size='md' c='dimmed'>
          <b>{title}</b>
        </Text>

        <Icon size='1.2rem' />
      </Group>

      <Title order={1} fw={700}>
        {value}
      </Title>
    </Paper>
  );
}
