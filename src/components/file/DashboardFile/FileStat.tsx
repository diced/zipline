import { Group, Stack, Text, Title } from '@mantine/core';
import { Icon } from '@tabler/icons-react';

export default function FileStat({
  Icon,
  title,
  value,
}: {
  Icon: Icon;
  title: string;
  value: string | number;
}) {
  return (
    <Group>
      <Icon size='2rem' />

      <Stack spacing={1}>
        <Title order={5} weight={700}>
          {title}
        </Title>

        <Text size='sm' color='dimmed'>
          {value}
        </Text>
      </Stack>
    </Group>
  );
}
