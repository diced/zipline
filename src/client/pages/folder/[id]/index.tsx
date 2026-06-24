import { useApiPagination } from '@/components/pages/files/useApiPagination';
import { type Response } from '@/lib/api/response';
import { useTitle } from '@/lib/client/hooks/useTitle';
import { useFileNavStore } from '@/lib/client/store/fileNav';
import { Folder } from '@/lib/db/models/folder';
import { FolderBreadcrumb } from '@/lib/folderHierarchy';
import {
  ActionIcon,
  Anchor,
  Breadcrumbs,
  Card,
  Container,
  Group,
  Pagination,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconFolder, IconUpload } from '@tabler/icons-react';
import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Link, Params, useLoaderData, useNavigate, useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { useQueryState, parseAsInteger } from 'nuqs';

const DashboardFile = lazy(() => import('@/components/file/DashboardFile'));
const DashboardFileModal = lazy(() => import('@/components/file/DashboardFile/DashboardFileModal'));

export async function loader({ params, request }: { params: Params<string>; request: Request }) {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') ?? '1';
  const perpage = url.searchParams.get('perpage') ?? '15';

  const res = await fetch(
    `/api/server/folder/${params.id}?page=${encodeURIComponent(page)}&perpage=${encodeURIComponent(perpage)}`,
  );
  if (!res.ok) {
    throw new Response('Folder not found', { status: 404 });
  }
  return {
    initial: (await res.json()) as Response['/api/server/folder/[id]'],
  };
}

function PublicFolderCard({ folder }: { folder: Partial<Folder> }) {
  return (
    <Link to={`/folder/${folder.id}`} style={{ textDecoration: 'none' }}>
      <Card withBorder shadow='sm' style={{ cursor: 'pointer' }}>
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

const PER_PAGE_OPTIONS = [9, 12, 15, 30, 45];

export function Component() {
  const { initial } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [, setSearchParams] = useSearchParams();
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [perpage] = useQueryState('perpage', parseAsInteger.withDefault(15));

  const { data, isLoading } = useApiPagination<Response['/api/server/folder/[id]']>(
    {
      route: `/api/server/folder/${initial.folder.id}`,
      page,
      perpage,
      sort: 'createdAt',
      order: 'desc',
    },
    { fallbackData: initial, keepPreviousData: true, revalidateOnFocus: false },
  );

  const folder = data?.folder ?? initial.folder;
  const files = data?.page ?? [];
  const totalRecords = data?.total ?? 0;
  const cachedPages = data?.pages ?? 0;

  useTitle(folder.name ?? 'Folder');

  const buildBreadcrumbs = () => {
    const items: FolderBreadcrumb[] = [];

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
  const from = totalRecords === 0 ? 0 : (page - 1) * perpage + 1;
  const to = Math.min(page * perpage, totalRecords);

  const [current, setCurrent, setFiles] = useFileNavStore(
    useShallow((state) => [state.current, state.setCurrent, state.setFiles]),
  );
  const currentFile = current ? (files.find((file) => file.id === current) ?? null) : null;
  const ids = useMemo(() => files.map((file) => file.id), [files]);

  useEffect(() => {
    setFiles(ids);
  }, [ids]);

  return (
    <>
      <Container my='lg'>
        <DashboardFileModal
          open={!!currentFile}
          setOpen={(open) => setCurrent(open ? (currentFile?.id ?? null) : null)}
          file={currentFile}
          reduce
          sequenced
        />

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
            <Link to={`/folder/${folder.id}/upload`} reloadDocument>
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

        {(files.length ?? 0) > 0 && (
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
              {files.map((file: any) => (
                <Suspense fallback={<Skeleton height={350} animate />} key={file.id}>
                  <DashboardFile file={file} reduce onOpen={(fileId) => setCurrent(fileId)} />
                </Suspense>
              ))}
            </SimpleGrid>
          </>
        )}

        {children.length === 0 && totalRecords === 0 && (
          <Text c='dimmed' mt='md'>
            This folder is empty.
          </Text>
        )}

        <Group justify='space-between' align='center' mt='md'>
          <Text size='sm'>{`${from} - ${to} / ${totalRecords} files`}</Text>

          <Group gap='sm'>
            <Select
              value={perpage.toString()}
              data={PER_PAGE_OPTIONS.map((val) => ({ value: val.toString(), label: `${val}` }))}
              onChange={(value) => {
                setSearchParams((prev) => {
                  prev.set('perpage', value ?? '15');
                  prev.set('page', '1');
                  return prev;
                });
              }}
              w={80}
              size='xs'
              variant='filled'
              disabled={isLoading}
            />

            <Pagination
              value={page}
              onChange={setPage}
              total={cachedPages}
              size='sm'
              withControls
              withEdges
              disabled={isLoading}
            />
          </Group>
        </Group>
      </Container>
    </>
  );
}

Component.displayName = 'ViewFolderId';
