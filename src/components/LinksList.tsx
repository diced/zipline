import { ActionIcon, Anchor, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

export function LinksList({
  links,
}: {
  links: {
    label: string;
    description: string;
    href: string;
    icon: any;
    hidden?: boolean;
  }[];
}) {
  const visibleLinks = links.filter((link) => !link.hidden);

  return (
    <Stack gap='md'>
      {visibleLinks.map(({ label, description, href, icon: Icon }) => (
        <Anchor key={href} component={Link} to={href} style={{ textDecoration: 'none' }}>
          <Paper withBorder p='sm'>
            <Group gap='md'>
              <ActionIcon variant='filled' radius='md' size='xl'>
                <Icon size='1.75rem' />
              </ActionIcon>

              <div>
                <Title order={4}>{label}</Title>
                <Text c='dimmed'>{description}</Text>
              </div>
            </Group>
          </Paper>
        </Anchor>
      ))}
    </Stack>
  );
}
