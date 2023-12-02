import { User } from '@/lib/db/models/user';
import { ActionIcon, Avatar, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { useUserStore } from '@/lib/store/user';
import { IconDots, IconFiles, IconTrashFilled, IconUserEdit } from '@tabler/icons-react';
import EditUserModal from './EditUserModal';
import { useState } from 'react';
import { deleteUser } from './actions';
import RelativeDate from '@/components/RelativeDate';
import { canInteract, isAdministrator, roleName } from '@/lib/role';
import Link from 'next/link';

export default function UserCard({ user }: { user: User }) {
  const currentUser = useUserStore((state) => state.user);

  const [opened, setOpen] = useState(false);

  return (
    <>
      <EditUserModal user={user} opened={opened} onClose={() => setOpen(false)} />

      <Card withBorder shadow='sm' radius='sm'>
        <Card.Section withBorder inheritPadding py='xs'>
          <Group justify='space-between'>
            <Group>
              <Avatar
                color={isAdministrator(user.role) ? 'red' : 'gray'}
                size='md'
                radius='sm'
                src={user.avatar ?? null}
              >
                {user.username[0].toUpperCase()}
              </Avatar>

              <Stack gap={1}>
                <Text fw={400}>{user.username}</Text>
                <Text size='xs' c='dimmed'>
                  {user.id}
                </Text>
              </Stack>
            </Group>

            <Group gap='xs'>
              <ActionIcon
                variant={canInteract(currentUser?.role, user?.role) ? 'subtle' : 'transparent'}
                component={Link}
                href={`/dashboard/admin/users/${user.id}/files`}
                disabled={!canInteract(currentUser?.role, user?.role)}
              >
                <IconFiles size='1rem' />
              </ActionIcon>
              <Menu withinPortal position='bottom-end' shadow='sm'>
                <Menu.Target>
                  <ActionIcon variant='transparent'>
                    <IconDots size='1rem' />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    disabled={!canInteract(currentUser?.role, user?.role)}
                    leftSection={<IconUserEdit size='1rem' />}
                    onClick={() => setOpen(true)}
                  >
                    Edit
                  </Menu.Item>
                  <Menu.Item
                    disabled={!canInteract(currentUser?.role, user?.role)}
                    leftSection={<IconTrashFilled size='1rem' />}
                    color='red'
                    onClick={() => deleteUser(user)}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </Card.Section>

        <Card.Section inheritPadding py='xs'>
          <Stack gap={1}>
            <Text size='xs' c='dimmed'>
              <b>Role:</b> {roleName(user.role)}
            </Text>
            <Text size='xs' c='dimmed'>
              <b>Created:</b> <RelativeDate date={user.createdAt} />
            </Text>
            <Text size='xs' c='dimmed'>
              <b>Updated:</b> <RelativeDate date={user.updatedAt} />
            </Text>
          </Stack>
        </Card.Section>
      </Card>
    </>
  );
}
