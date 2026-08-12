import { ActionIcon, Anchor, Group, Paper, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { TablerIcon } from '@tabler/icons-react';
import { MouseEventHandler } from 'react';
import { Link } from 'react-router-dom';

type LinksListItemBase = {
  label: string;
  description: string;
  icon: TablerIcon;
  hidden?: boolean;
};

type LinksListLink = LinksListItemBase & {
  href: string;
  onClick?: never;
};

type LinksListAction = LinksListItemBase & {
  href?: never;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

type LinksListItem = LinksListLink | LinksListAction;

export function LinksList({ links }: { links: LinksListItem[] }) {
  const visibleLinks = links.filter((link) => !link.hidden);

  return (
    <Stack gap='md'>
      {visibleLinks.map((link) => {
        const { label, description, icon: Icon } = link;
        const content = (
          <Paper withBorder p='sm'>
            <Group gap='md'>
              <ActionIcon component='span' variant='filled' radius='md' size='xl'>
                <Icon size='1.75rem' />
              </ActionIcon>

              <div>
                <Title order={4}>{label}</Title>
                <Text c='dimmed'>{description}</Text>
              </div>
            </Group>
          </Paper>
        );

        if (link.href !== undefined) {
          return (
            <Anchor key={link.href} component={Link} to={link.href} style={{ textDecoration: 'none' }}>
              {content}
            </Anchor>
          );
        }

        return (
          <UnstyledButton key={label} onClick={link.onClick} w='100%' ta='left'>
            {content}
          </UnstyledButton>
        );
      })}
    </Stack>
  );
}
