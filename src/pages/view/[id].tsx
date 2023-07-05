import DashboardFileType from '@/components/file/DashboardFileType';
import { isCode } from '@/lib/code';
import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { fileSelect, type File } from '@/lib/db/models/file';
import { fetchApi } from '@/lib/fetchApi';
import {
  Box,
  Button,
  Center,
  Collapse,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Space,
  Text,
  Title,
} from '@mantine/core';
import { IconFileDownload } from '@tabler/icons-react';
import bytes from 'bytes';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function ViewFile({
  file,
  password,
  pw,
  code,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  file.createdAt = new Date(file.createdAt);
  file.updatedAt = new Date(file.updatedAt);
  file.deletesAt = file.deletesAt ? new Date(file.deletesAt) : null;

  const router = useRouter();

  const [passwordValue, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

  const verifyPassword = async () => {
    const { error } = await fetchApi(`/api/user/files/${file.id}/password`, 'POST', {
      password: passwordValue.trim(),
    });

    if (error) {
      setPasswordError('Invalid password');
    } else {
      setPasswordError('');
      router.replace(`/view/${file.name}?pw=${encodeURI(passwordValue.trim())}`);
    }
  };

  return password && !pw ? (
    <Modal
      onClose={() => {}}
      opened={true}
      withCloseButton={false}
      centered
      title={<Title>Password required</Title>}
    >
      <PasswordInput
        description='This file is password protected, enter password to view it'
        required
        mb='sm'
        value={passwordValue}
        onChange={(event) => setPassword(event.currentTarget.value)}
        error={passwordError}
      />

      <Button
        fullWidth
        variant='outline'
        color='gray'
        my='sm'
        onClick={() => verifyPassword()}
        disabled={passwordValue.trim().length === 0}
      >
        Verify
      </Button>
    </Modal>
  ) : code ? (
    <>
      <Paper withBorder>
        <Group position='apart' py={5} px='xs'>
          <Text color='dimmed'>{file.name}</Text>

          <Button compact size='sm' variant='outline' color='gray' onClick={() => setDetailsOpen((o) => !o)}>
            Toggle Details
          </Button>
        </Group>
      </Paper>

      <Collapse in={detailsOpen}>
        <Paper m='md' p='md' withBorder>
          <Text size='sm' color='dimmed'>
            <b>Created at:</b> {file.createdAt.toLocaleString()}
            <Space />
            <b>Updated at:</b> {file.updatedAt.toLocaleString()}
            <Space />
            <b>Size:</b> {bytes(file.size)}
            <Space />
            <b>Views:</b> {file.views.toLocaleString()}
          </Text>
        </Paper>
      </Collapse>

      <Paper m='md' p='md' withBorder>
        <DashboardFileType file={file} password={pw} show />
      </Paper>
    </>
  ) : (
    <Center h='100vh'>
      <Paper p='md' shadow='md' radius='md' withBorder>
        <Group position='apart' mb='sm'>
          <Text size='lg' weight={700} sx={{ display: 'flex' }}>
            {file.name}

            <Text size='sm' color='dimmed' ml='sm' sx={{ alignSelf: 'center' }}>
              {file.type}
            </Text>
          </Text>

          <Button
            ml='sm'
            variant='outline'
            component={Link}
            href={`/raw/${file.name}?download=true${pw ? `&pw=${pw}` : ''}`}
            target='_blank'
            compact
            color='gray'
            leftIcon={<IconFileDownload size='1rem' />}
          >
            Download
          </Button>
        </Group>

        <DashboardFileType file={file} password={pw} show />

        <Text size='sm' color='dimmed' mt='sm'>
          <b>Created at:</b> {file.createdAt.toLocaleString()}
          <Space />
          <b>Updated at:</b> {file.updatedAt.toLocaleString()}
          <Space />
          <b>Size:</b> {bytes(file.size)}
          <Space />
          <b>Views:</b> {file.views.toLocaleString()}
        </Text>
      </Paper>
    </Center>
  );
}

export const getServerSideProps: GetServerSideProps<{
  file: File;
  password?: boolean;
  pw?: string;
  code: boolean;
}> = async (context) => {
  const { id, pw } = context.query;
  if (!id) return { notFound: true };

  const file = await prisma.file.findFirst({
    where: {
      name: id as string,
    },
    select: {
      ...fileSelect,
      password: true,
    },
  });
  if (!file) return { notFound: true };

  // convert date to string dumb nextjs :@
  (file as any).createdAt = file.createdAt.toISOString();
  (file as any).updatedAt = file.updatedAt.toISOString();
  (file as any).deletesAt = file.deletesAt?.toISOString() || null;

  const code = await isCode(file.name);

  if (pw) {
    const verified = await verifyPassword(pw as string, file.password!);

    delete (file as any).password;
    if (verified) return { props: { file, pw: pw as string, code } };
  }

  const password = !!file.password;
  delete (file as any).password;

  return {
    props: {
      file,
      password,
      code,
    },
  };
};
