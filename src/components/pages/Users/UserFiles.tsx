import { ActionIcon, Button, Center, Group, SimpleGrid, Title } from '@mantine/core';
import { File } from '@prisma/client';
import { IconArrowLeft, IconFile } from '@tabler/icons-react';
import FileComponent from 'components/File';
import MutedText from 'components/MutedText';
import useFetch from 'hooks/useFetch';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type UserFiles = {
  id: number;
  username: string;
  files?: File[];
  error?: unknown;
};

export default function UserFiles({ userId, disableMediaPreview, exifEnabled, compress }) {
  const [currentUser, setUser] = useState<UserFiles>({ id: 0, username: 'user' });

  const { push } = useRouter();

  useEffect(() => {
    (async () => {
      const user: UserFiles = await useFetch(`/api/user/${userId}`);
      if (!user.error) {
        setUser(user);
      } else {
        push('/dashboard');
      }
    })();
  }, [userId]);

  if (!currentUser.files || currentUser.files.length === 0) {
    return (
      <Center sx={{ flexDirection: 'column' }}>
        <Group>
          <div>
            <IconFile size={48} />
          </div>
          <div>
            <Title>Nothing here</Title>
            <MutedText size='md'>
              {currentUser.username} seems to have not uploaded any files... yet
            </MutedText>
          </div>
          <Button size='md' onClick={() => push('/dashboard/users')}>
            Head back?
          </Button>
        </Group>
      </Center>
    );
  }

  return (
    <>
      <Group mb='md'>
        <ActionIcon size='lg' onClick={() => push('/dashboard/users')} color='primary'>
          <IconArrowLeft />
        </ActionIcon>
        <Title>{currentUser.username}&apos;s Files</Title>
      </Group>

      <SimpleGrid cols={3} spacing='lg' breakpoints={[{ maxWidth: 'sm', cols: 1, spacing: 'sm' }]}>
        {currentUser.files.map((file) => (
          <div key={file.id}>
            <FileComponent
              image={file}
              disableMediaPreview={disableMediaPreview}
              exifEnabled={exifEnabled}
              onDash={compress}
              otherUser={true}
            />
          </div>
        ))}
      </SimpleGrid>
    </>
  );
}
