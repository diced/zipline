import { User } from '@/lib/db/models/user';
import { ActionIcon, Avatar, Card, Group, Menu, Stack, Text } from '@mantine/core';
import { useUserStore } from '@/lib/store/user';
import { IconDots, IconTrashFilled, IconUserEdit } from '@tabler/icons-react';
import EditUserModal from './EditUserModal';
import { useState } from 'react';
import { deleteUser } from './actions';
import RelativeDate from '@/components/RelativeDate';

export default function UserCard({ user }: { user: User }) {
  const currentUser = useUserStore((state) => state.user);

  const [opened, setOpen] = useState(false);

  if (currentUser?.id === user.id) return null;

  return (
    <>
      <EditUserModal user={user} opened={opened} onClose={() => setOpen(false)} />

      <Card withBorder shadow='sm' radius='sm'>
        <Card.Section withBorder inheritPadding py='xs'>
          <Group position='apart'>
            <Group>
              <Avatar
                color={user.administrator ? 'red' : 'gray'}
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
              <Menu.Target>
                <ActionIcon>
                  <IconDots size='1rem' />
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Item
                  disabled={user.administrator}
                  icon={<IconUserEdit size='1rem' />}
                  onClick={() => setOpen(true)}
                >
                  Edit
                </Menu.Item>
                <Menu.Item
                  disabled={user.administrator}
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
              <b>Administrator:</b> {user.administrator ? 'Yes' : 'No'}
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
