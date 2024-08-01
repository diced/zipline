import Markdown from '@/components/render/Markdown';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { Container } from '@mantine/core';
import { readFile } from 'fs/promises';
import { InferGetServerSidePropsType } from 'next';

export default function Login({ tos }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Container my='md'>
      <Markdown md={tos!} />
    </Container>
  );
}

export const getServerSideProps = withSafeConfig(async (_, config) => {
  if (!config.website.tos)
    return {
      notFound: true,
    };

  const file = await readFile(config.website.tos, 'utf8');

  return {
    tos: file,
  };
});
