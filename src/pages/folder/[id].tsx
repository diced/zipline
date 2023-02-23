import { Container, SimpleGrid, Title } from '@mantine/core';
import File from 'components/File';
import prisma from 'lib/prisma';
import { formatRootUrl } from 'lib/utils/urls';
import { GetServerSideProps } from 'next';

type LimitedFolder = {
  files: {
    id: number;
    name: string;
    createdAt: Date | string;
    mimetype: string;
    views: number;
  }[];
  user: {
    username: string;
  };
  name: string;
  public: boolean;
  url?: string;
};

type Props = {
  folder: LimitedFolder;
  uploadRoute: string;
};

export default function EmbeddedFile({ folder }: Props) {
  return (
    <Container size='lg'>
      <Title align='center' my='lg'>
        Viewing folder: {folder.name}
      </Title>
      <SimpleGrid
        my='md'
        cols={3}
        breakpoints={[
          { maxWidth: 600, cols: 1 },
          { maxWidth: 900, cols: 2 },
          { maxWidth: 1200, cols: 3 },
        ]}
      >
        {folder.files.map((file, i) => (
          <File
            key={i}
            image={file}
            disableMediaPreview={false}
            exifEnabled={false}
            refreshImages={null}
            reducedActions={true}
          />
        ))}
      </SimpleGrid>
    </Container>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { id } = context.params as { id: string };

  if (isNaN(Number(id))) return { notFound: true };

  const folder = await prisma.folder.findFirst({
    where: {
      id: Number(id),
    },
    select: {
      files: {
        select: {
          name: true,
          mimetype: true,
          id: true,
          views: true,
          createdAt: true,
        },
      },
      user: {
        select: {
          username: true,
        },
      },
      name: true,
      public: true,
    },
  });

  if (!folder) return { notFound: true };
  if (!folder.public) return { notFound: true };

  for (let j = 0; j !== folder.files.length; ++j) {
    (folder.files[j] as unknown as { url: string }).url = formatRootUrl(
      config.uploader.route,
      folder.files[j].name
    );

    (folder.files[j].createdAt as unknown) = folder.files[j].createdAt.toString();
  }

  return {
    props: {
      folder,
      uploadRoute: config.uploader.route,
    },
  };
};
