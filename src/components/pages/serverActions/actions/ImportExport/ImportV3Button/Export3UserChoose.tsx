import { Export3 } from '@/lib/import/version3/validateExport';
import { Avatar, Box, Group, Radio, Stack, Text } from '@mantine/core';

export default function Export3UserChoose({
  export3,
  setImportFrom,
  importFrom,
}: {
  export3: Export3;
  setImportFrom: (importFrom: string) => void;
  importFrom: string;
}) {
  const users = Object.entries(export3.users);

  return (
    <Box my='lg'>
      <Text size='md'>Select a user to import data from into the current user.</Text>
      <Text size='sm' c='dimmed'>
        This option allows you to import data from a user in your export into the currently logged-in user,
        even if both have the same username. Normally, the system skips importing users with usernames that
        already exist in the database. However, if you&apos;ve just set up your instance and reused the same
        username as your old instance, this option enables you to merge data from that user into your
        logged-in account without needing to delete or replace it.{' '}
        <b>It is recommended to select a user with super-administrator permissions for this operation.</b>
      </Text>

      <Radio.Group value={importFrom} onChange={(value) => setImportFrom(value)} name='importFrom'>
        {users.map(([id, user]) => (
          <Radio.Card key={id} value={id} my='sm'>
            <Group wrap='nowrap' align='flex-start'>
              <Radio.Indicator m='md' />
              {user.avatar && <Avatar my='md' src={user.avatar} alt={user.username} radius='sm' />}
              <Stack gap={0}>
                <Text my='sm'>{user.username}</Text>{' '}
                {user.super_administrator && (
                  <Text c='red' size='xs' mb='xs'>
                    Super Administrator
                  </Text>
                )}
              </Stack>
            </Group>
          </Radio.Card>
        ))}

        <Radio.Card value='' my='sm'>
          <Group wrap='nowrap' align='flex-start'>
            <Radio.Indicator m='md' />
            <Stack gap={0}>
              <Text my='sm'>Do not merge data</Text>{' '}
              <Text c='dimmed' size='xs' mb='xs'>
                Select this option if you do not want to merge data from any user into the current user.
              </Text>
            </Stack>
          </Group>
        </Radio.Card>
      </Radio.Group>
    </Box>
  );
}
