import DashboardFile from '@/components/file/DashboardFile';
import { prisma } from '@/lib/db';
import { fileSelect } from '@/lib/db/models/file';
import { Folder, cleanFolder } from '@/lib/db/models/folder';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { Container, SimpleGrid, Title } from '@mantine/core';
import { InferGetServerSidePropsType } from 'next';

export default function ViewFolder({ folder }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!folder) return null;

  return (
    <>
      <Container>
        <Title order={1}>{folder.name}</Title>

        <SimpleGrid
          my='sm'
          cols={{
            base: 1,
            lg: 3,
            md: 2,
          }}
          spacing='md'
        >
          {folder.files?.map((file) => <DashboardFile key={file.id} file={file} reduce />)}
        </SimpleGrid>
      </Container>
    </>
  );
}

export const getServerSideProps = withSafeConfig<{
  folder?: Folder;
}>(async (ctx) => {
  const { id } = ctx.query;
  if (!id) return { notFound: true };

  const folder = await prisma.folder.findUnique({
    where: {
      id: id as string,
    },
    include: {
      files: {
        select: {
          ...fileSelect,
          password: true,
        },
      },
    },
  });
  if (!folder) return { notFound: true };
  if (!folder.public) return { notFound: true };

  return {
    folder: cleanFolder(folder, true),
  };
});
