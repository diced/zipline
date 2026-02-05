import { type Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import {
  ActionIcon,
  Anchor,
  Breadcrumbs,
  Card,
  Container,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconFolder, IconUpload } from '@tabler/icons-react';
import { lazy, Suspense } from 'react';
import { Link, Params, useLoaderData, useNavigate } from 'react-router-dom';

const DashboardFile = lazy(() => import('@/components/file/DashboardFile'));

export async function loader({ params }: { params: Params<string> }) {
  const res = await fetch(`/api/server/folder/${params.id}`);
  if (!res.ok) {
    throw new Response('Folder not found', { status: 404 });
  }
  return {
    folder: (await res.json()) as Response['/api/server/folder/[id]'],
  };
}

function PublicFolderCard({ folder }: { folder: Partial<Folder> }) {
  return (
    <Link to={`/folder/${folder.id}`} style={{ textDecoration: 'none' }}>
      <Card withBorder shadow='sm' radius='sm' style={{ cursor: 'pointer' }}>
        <Card.Section withBorder inheritPadding py='xs'>
          <Group gap='xs'>
            <IconFolder size='1.2rem' />
            <Text fw={500}>{folder.name}</Text>
          </Group>
        </Card.Section>
        <Card.Section inheritPadding py='xs'>
          <Stack gap={2}>
            <Text size='xs' c='dimmed'>
              {folder._count?.files ?? 0} files
            </Text>
            {(folder._count?.children ?? 0) > 0 && (
              <Text size='xs' c='dimmed'>
                {folder._count?.children} subfolders
              </Text>
            )}
          </Stack>
        </Card.Section>
      </Card>
    </Link>
  );
}

export function Component() {
  const { folder } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const buildBreadcrumbs = () => {
    const items: { id: string | null; name: string; public: boolean }[] = [];

    let current = folder.parent as Partial<Folder> | undefined;
    while (current && current.public) {
      items.unshift({ id: current.id!, name: current.name!, public: true });
      current = current.parent as Partial<Folder> | undefined;
    }

    items.push({ id: folder.id!, name: folder.name!, public: true });

    return items;
  };

  const breadcrumbs = buildBreadcrumbs();
  const children = (folder.children ?? []) as Partial<Folder>[];

  return (
    <>
      <Container my='lg'>
        {breadcrumbs.length > 1 && (
          <Breadcrumbs mb='md'>
            {breadcrumbs.map((item, index) => (
              <Anchor
                key={item.id}
                onClick={() => navigate(`/folder/${item.id}`)}
                style={{ cursor: 'pointer' }}
                fw={index === breadcrumbs.length - 1 ? 600 : 400}
              >
                {item.name}
              </Anchor>
            ))}
          </Breadcrumbs>
        )}

        <Group>
          <Title order={1}>{folder.name}</Title>

          {folder.allowUploads && (
            <Link to={`/folder/${folder.id}/upload`}>
              <ActionIcon variant='outline'>
                <IconUpload size='1rem' />
              </ActionIcon>
            </Link>
          )}
        </Group>

        {children.length > 0 && (
          <>
            <Title order={3} mt='md' mb='sm'>
              Subfolders
            </Title>
            <SimpleGrid
              cols={{
                base: 1,
                lg: 4,
                md: 3,
                sm: 2,
              }}
              spacing='md'
            >
              {children.map((child) => (
                <PublicFolderCard key={child.id} folder={child} />
              ))}
            </SimpleGrid>
          </>
        )}

        {(folder.files?.length ?? 0) > 0 && (
          <>
            <Title order={3} mt='md' mb='sm'>
              Files
            </Title>
            <SimpleGrid
              cols={{
                base: 1,
                lg: 3,
                md: 2,
              }}
              spacing='md'
            >
              {folder.files?.map((file: any) => (
                <Suspense fallback={<Skeleton height={350} animate />} key={file.id}>
                  <DashboardFile file={file} reduce />
                </Suspense>
              ))}
            </SimpleGrid>
          </>
        )}

        {children.length === 0 && (folder.files?.length ?? 0) === 0 && (
          <Text c='dimmed' mt='md'>
            This folder is empty.
          </Text>
        )}
      </Container>
    </>
  );
}

Component.displayName = 'ViewFolderId';
