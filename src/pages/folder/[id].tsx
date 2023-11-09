import { Container, SimpleGrid, Title } from '@mantine/core';
import File from 'components/File';
import prisma from 'lib/prisma';
import { formatRootUrl } from 'lib/utils/urls';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

type LimitedFolder = {
  files: {
    id: number;
    name: string;
    createdAt: Date | string;
    mimetype: string;
    views: number;
    size: bigint;
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
  title: string;
  compress: boolean;
};

export default function Folder({ title, folder, compress }: Props) {
  const full_title = `${title} - ${folder.name}`;
  return (
    <>
      <Head>
        <title>{full_title}</title>
      </Head>
      <Container size='lg'>
        <Title size={50} align='center' my='lg'>
          {folder.name}
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
              onDash={compress}
            />
          ))}
        </SimpleGrid>
      </Container>
    </>
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
          password: true,
          size: true,
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

    // @ts-ignore
    if (folder.files[j].password) folder.files[j].password = true;

    (folder.files[j].createdAt as unknown) = folder.files[j].createdAt.toString();
  }

  return {
    props: {
      folder,
      uploadRoute: config.uploader.route,
      title: config.website.title,
      compress: config.core.compression.on_dashboard,
    },
  };
};
