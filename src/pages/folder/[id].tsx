import DashboardFile from '@/components/file/DashboardFile';
import DashboardFileType from '@/components/file/DashboardFileType';
import { isCode } from '@/lib/code';
import { config as zConfig } from '@/lib/config';
import { SafeConfig, safeConfig } from '@/lib/config/safe';
import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { fileSelect, type File } from '@/lib/db/models/file';
import { Folder, cleanFolder } from '@/lib/db/models/folder';
import { User, userSelect } from '@/lib/db/models/user';
import { fetchApi } from '@/lib/fetchApi';
import { withSafeConfig } from '@/lib/middleware/next/withSafeConfig';
import { parseString } from '@/lib/parser';
import { formatRootUrl } from '@/lib/url';
import {
  Button,
  Center,
  Collapse,
  Container,
  Group,
  Modal,
  Paper,
  PasswordInput,
  SimpleGrid,
  Text,
  Title,
  TypographyStylesProvider,
} from '@mantine/core';
import { IconFileDownload } from '@tabler/icons-react';
import { sanitize } from 'isomorphic-dompurify';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function ViewFolder({ folder }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!folder) return null;

  return (
    <>
      <Container>
        <Title order={1}>{folder.name}</Title>

        <SimpleGrid my='sm' cols={3} spacing='md' breakpoints={[{ maxWidth: 'sm', cols: 1 }, { maxWidth: 'md', cols: 2 }]}>
          {folder.files?.map((file) => (
            <DashboardFile key={file.id} file={file} reduce />
          ))}
        </SimpleGrid>
      </Container>
    </>
  )
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
