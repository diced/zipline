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
          <Group position='apart'>
            <Group>
              <Avatar
                color={isAdministrator(user.role) ? 'red' : 'gray'}
                size='md'
                radius='md'
                src={user.avatar ?? null}
              >
                {user.username[0].toUpperCase()}
              </Avatar>

              <Stack spacing={1}>
                <Text weight={400}>{user.username}</Text>
                <Text size='xs' color='dimmed'>
                  {user.id}
                </Text>
              </Stack>
            </Group>

            <Menu withinPortal position='bottom-end' shadow='sm'>
              <Group spacing={2}>
                <ActionIcon
                  variant={canInteract(currentUser?.role, user?.role) ? 'subtle' : 'transparent'}
                  component={Link}
                  href={`/dashboard/admin/users/${user.id}/files`}
                  disabled={!canInteract(currentUser?.role, user?.role)}
                >
                  <IconFiles size='1rem' />
                </ActionIcon>

                <Menu.Target>
                  <ActionIcon>
                    <IconDots size='1rem' />
                  </ActionIcon>
                </Menu.Target>
              </Group>

              <Menu.Dropdown>
                <Menu.Item
                  disabled={!canInteract(currentUser?.role, user?.role)}
                  icon={<IconUserEdit size='1rem' />}
                  onClick={() => setOpen(true)}
                >
                  Edit
                </Menu.Item>
                <Menu.Item
                  disabled={!canInteract(currentUser?.role, user?.role)}
                  icon={<IconTrashFilled size='1rem' />}
                  color='red'
                  onClick={() => deleteUser(user)}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card.Section>

        <Card.Section inheritPadding py='xs'>
          <Stack spacing={1}>
            <Text size='xs' color='dimmed'>
              <b>Role:</b> {roleName(user.role)}
            </Text>
            <Text size='xs' color='dimmed'>
              <b>Created:</b> <RelativeDate date={user.createdAt} />
            </Text>
            <Text size='xs' color='dimmed'>
              <b>Updated:</b> <RelativeDate date={user.updatedAt} />
            </Text>
          </Stack>
        </Card.Section>
      </Card>
    </>
  );
}
