import GridTableSwitcher, { GridSizeSwitcher } from '@/components/GridTableSwitcher';
import FolderBookmarksBar from '@/components/folders/FolderBookmarksBar';
import DropUploadOverlay from '@/components/upload/DropUploadOverlay';
import { useViewStore } from '@/lib/client/store/view';
import { ActionIcon, Group, Menu, TextInput, Title, Tooltip } from '@mantine/core';
import {
  IconDots,
  IconFileDots,
  IconFileUpload,
  IconGridPatternFilled,
  IconSearch,
  IconTableOptions,
  IconTags,
  IconX,
} from '@tabler/icons-react';
import { parseAsBoolean, useQueryStates } from 'nuqs';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import PendingFilesModal from './PendingFilesModal';
import TagsModal from './tags/TagsModal';
import FavoriteFiles from './views/FavoriteFiles';
import Files, { type FilesGridViewRef } from './views/FilesGridView';
import FileTable from './views/FilesTableView';

export type DashboardFilesModals = {
  table: boolean;
  idSearch: boolean;
  tags: boolean;
  pending: boolean;
};

export function useModals() {
  return useQueryStates({
    table: parseAsBoolean.withDefault(false),
    idSearch: parseAsBoolean.withDefault(false),
    tags: parseAsBoolean.withDefault(false),
    pending: parseAsBoolean.withDefault(false),
  });
}

export type DashboardFilesModalsUpdate = ReturnType<typeof useModals>[1];

export default function DashboardFiles() {
  const view = useViewStore((state) => state.files);

  const [modals, setModals] = useModals();
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const filesRef = useRef<FilesGridViewRef>(null);

  return (
    <>
      <TagsModal modals={modals} setModals={setModals} />
      <PendingFilesModal modals={modals} setModals={setModals} />
      <DropUploadOverlay folderId={folderId} onUploaded={() => filesRef.current?.refresh()} />

      <Group wrap='nowrap'>
        <Title>Files</Title>

        <Tooltip label='Upload a file'>
          <Link to='/dashboard/upload/file'>
            <ActionIcon variant='outline'>
              <IconFileUpload size='1rem' />
            </ActionIcon>
          </Link>
        </Tooltip>

        {view === 'grid' && (
          <TextInput
            placeholder='Search files by name...'
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size='1rem' />}
            rightSection={
              search ? (
                <ActionIcon variant='subtle' size='xs' onClick={() => setSearch('')}>
                  <IconX size='1rem' />
                </ActionIcon>
              ) : null
            }
            size='sm'
            w={260}
            variant='filled'
          />
        )}

        {view === 'grid' && <FolderBookmarksBar folderId={folderId} onChange={setFolderId} />}

        <Menu>
          <Menu.Target>
            <Tooltip label='More actions'>
              <ActionIcon variant='outline'>
                <IconDots size='1rem' />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconTags size='1rem' />}
              onClick={() => setModals({ tags: !modals.tags })}
            >
              Manage Tags
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileDots size='1rem' />}
              onClick={() => setModals({ pending: !modals.pending })}
            >
              View Pending Files
            </Menu.Item>
            {view === 'table' && (
              <>
                <Menu.Label>Table Options</Menu.Label>
                <Menu.Item
                  leftSection={<IconGridPatternFilled size='1rem' />}
                  onClick={() => setModals({ idSearch: !modals.idSearch })}
                >
                  Search by ID
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTableOptions size='1rem' />}
                  onClick={() => setModals({ table: !modals.table })}
                >
                  Table Options
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>

        {view === 'grid' && <GridSizeSwitcher />}
        <GridTableSwitcher type='files' />
      </Group>

      {view === 'grid' ? (
        <>
          <FavoriteFiles />

          <Files ref={filesRef} search={search} folderId={folderId ?? undefined} infinite />
        </>
      ) : (
        <FileTable modals={modals} setModals={setModals} />
      )}
    </>
  );
}
