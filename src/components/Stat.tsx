import { Paper, Group, Title, Text } from '@mantine/core';
import { Icon } from '@tabler/icons-react';

export default function Stat({ title, value, Icon }: { title: string; value: any; Icon: Icon }) {
  return (
    <Paper p='md' radius='md' withBorder>
      <Group position='apart'>
        <Text size='md' color='dimmed'>
          <b>{title}</b>
        </Text>

        <Icon size='1.2rem' />
      </Group>

      <Title order={1} weight={700}>
        {value}
      </Title>
    </Paper>
  );
}
