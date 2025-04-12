import ConfigProvider from '@/components/ConfigProvider';
import UploadFile from '@/components/pages/upload/File';
import { prisma } from '@/lib/db';
import { Folder, cleanFolder } from '@/lib/db/models/folder';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { Alert, Center, Container, Image, Stepper, Text, Title } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { InferGetServerSidePropsType } from 'next';
import Head from 'next/head';

export default function UploadToFolderId({
  folder,
  config,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!folder) return null;

  return (
    <>
      <div className='memories-logo-container'>
        <Container>
          <Image
            className='memories-logo'
            src='/3D-Memories-Logo.png'
            alt='3D Memories Logo'
            width={100}
            height={100}
          />
        </Container>
      </div>
      <Head>
        <title>{`${config.website.title ?? '3D Memories'} – Upload to ${folder.name}`}</title>
      </Head>

      <Container mt='lg'>
        <ConfigProvider config={config}>
          <Title order={1}>{`Hey ${folder.name}`}!</Title>
          <br />
          <Text>
            <strong>Upload your files for your 3D Model here!</strong>
            <br />
            Please make sure to upload as many pictures as possible, so we can create the best 3D-Print for
            you!
          </Text>

          <br />
          <br />
          <br />

          <Stepper active={1} color='#d1cbb7'>
            <Stepper.Step label='Step 1' description='Purchase your custom 3D Print' />
            <Stepper.Step label='Step 2' description='Upload as many pictures as possible' />
            <Stepper.Step label='Step 3' description='Receive 3D-Print' />
          </Stepper>

          <br />
          <br />

          <UploadFile title='' folder={folder.id} />
          <Alert variant='outline' title='Public Folder' color='yellow' icon={<IconInfoCircle />}>
            Please make sure to not share this link with anyone else. This folder is public, and anyone with
            the link can view its contents and upload files.
          </Alert>
          <Center>
            <Text c='dimmed' ta='center'>
              {/* {folder.public ? (
                <>
                  This folder is{' '}
                  <Anchor component={Link} href={`/folder/${folder.id}`}>
                    public
                  </Anchor>
                  . Anyone with the link can view its contents and upload files.
                </>
              ) : (
                "Only the owner can view this folder's contents. However, anyone can upload files, and they can still access their uploaded files if they have the link to the specific file."
              )} */}
            </Text>
          </Center>
        </ConfigProvider>
      </Container>
    </>
  );
}

export const getServerSideProps = withSafeConfig<{
  folder?: Partial<Folder>;
}>(async (ctx) => {
  const { id } = ctx.query;
  if (!id) return { notFound: true };

  const folder = await prisma.folder.findUnique({
    where: {
      id: id as string,
    },
    select: {
      id: true,
      name: true,
      allowUploads: true,
      public: true,
    },
  });

  if (!folder) return { notFound: true };
  if (!folder.allowUploads) return { notFound: true };

  return {
    folder: cleanFolder(folder, true),
  };
});
