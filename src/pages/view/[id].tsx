import DashboardFileType from '@/components/file/DashboardFileType';
import { prisma } from '@/lib/db';
import { fileSelect, type File } from '@/lib/db/models/file';
import { Button, Center, Group, Paper, Space, Text } from '@mantine/core';
import { IconFileDownload } from '@tabler/icons-react';
import bytes from 'bytes';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';

export default function ViewFile({ file }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  file.createdAt = new Date(file.createdAt);
  file.updatedAt = new Date(file.updatedAt);
  file.deletesAt = file.deletesAt ? new Date(file.deletesAt) : null;

  return (
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
            href={`/raw/${file.name}?download=true`}
            target='_blank'
            compact
            color='gray'
            leftIcon={<IconFileDownload size='1rem' />}
          >
            Download
          </Button>
        </Group>

        <DashboardFileType file={file} show />

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

export const getServerSideProps: GetServerSideProps<{ file: File }> = async (context) => {
  const { id } = context.query;
  if (!id) return { notFound: true };

  const file = await prisma.file.findFirst({
    where: {
      name: id as string,
    },
    select: fileSelect,
  });
  if (!file) return { notFound: true };

  // convert date to string dumb nextjs :@
  (file as any).createdAt = file.createdAt.toISOString();
  (file as any).updatedAt = file.updatedAt.toISOString();
  (file as any).deletesAt = file.deletesAt?.toISOString() || null;

  return {
    props: {
      file,
    },
  };
};
