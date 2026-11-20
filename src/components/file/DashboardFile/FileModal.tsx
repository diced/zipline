import { useFileNavStore } from '@/lib/client/store/fileNav';
import { useSettingsStore } from '@/lib/client/store/settings';
import { File } from '@/lib/db/models/file';
import { ActionIcon, ActionIconProps, Group, Modal, SimpleGrid, Text, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  Icon,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardTypography,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconPencil,
  IconStar,
  IconStarFilled,
  IconTrashFilled,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/shallow';

import DashboardFileType from '../DashboardFileType';
import { copyFile, deleteFile, downloadFile, favoriteFile, viewFile } from '../actions';
import EditFileDetailsModal from './EditFileDetailsModal';
import FileFolderPicker from './FileFolderPicker';
import FileStats from './FileStats';
import FileTags, { useFileTags } from './FileTags';

function ActionButton({
  Icon,
  onClick,
  tooltip,
  color,
  ...props
}: {
  Icon: Icon;
  onClick: () => void;
  tooltip: string;
  color?: string;
} & ActionIconProps) {
  return (
    <Tooltip label={tooltip}>
      <ActionIcon variant='filled' color={color ?? 'gray'} onClick={onClick} {...props}>
        <Icon size='1rem' />
      </ActionIcon>
    </Tooltip>
  );
}

export default function FileModal({
  open,
  setOpen,
  file,
  reduce,
  user,
  sequenced,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  file?: File | null;
  reduce?: boolean;
  user?: string;
  sequenced?: boolean;
}) {
  const { t } = useTranslation(['file', 'common']);
  const clipboard = useClipboard();
  const warnDeletion = useSettingsStore((state) => state.settings.warnDeletion);
  const fileNavButtons = useSettingsStore((state) => state.settings.fileNavButtons);

  const [editFileOpen, setEditFileOpen] = useState(false);

  const tagsEditor = useFileTags(file, open, user);

  const [goPrev, goNext, hasPrev, hasNext] = useFileNavStore(
    useShallow((state) => {
      if (!state.current) {
        return [state.goPrev, state.goNext, false, false];
      }

      const idx = state.ids.indexOf(state.current);
      return [state.goPrev, state.goNext, idx > 0, idx >= 0 && idx < state.ids.length - 1];
    }),
  );

  useEffect(() => {
    if (!open || !sequenced) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasPrev) {
        goPrev();
      } else if (event.key === 'ArrowRight' && hasNext) {
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, sequenced, hasPrev, hasNext, goPrev, goNext]);

  return (
    <>
      <EditFileDetailsModal open={editFileOpen} onClose={() => setEditFileOpen(false)} file={file!} />

      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title={
          <Text size='xl' fw={700}>
            {file?.name ?? ''}
          </Text>
        }
        size='auto'
        maw='90vw'
        centered
        zIndex={200}
      >
        {file ? (
          <>
            {open && <DashboardFileType file={file} show />}

            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing='md' my='xs'>
              <FileStats file={file} reduce={reduce} />
            </SimpleGrid>

            {!reduce && (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing='md' my='xs'>
                <FileTags editor={tagsEditor} mt='lg' />
                <FileFolderPicker file={file} user={user} mt='lg' />
              </SimpleGrid>
            )}

            <Group justify='space-between' mt='sm'>
              <Group>
                {!reduce && (
                  <Text size='sm' c='dimmed'>
                    {file.id}
                  </Text>
                )}
              </Group>

              <Group>
                {!reduce && (
                  <>
                    <ActionButton
                      Icon={IconPencil}
                      onClick={() => setEditFileOpen(true)}
                      tooltip={t('actions.editDetails')}
                      color='orange'
                    />
                    <ActionButton
                      Icon={IconTrashFilled}
                      onClick={() => deleteFile(warnDeletion, file, setOpen)}
                      tooltip={t('actions.delete')}
                      color='red'
                    />
                    <ActionButton
                      Icon={file.favorite ? IconStarFilled : IconStar}
                      onClick={() => favoriteFile(file)}
                      tooltip={file.favorite ? t('actions.unfavorite') : t('actions.favorite')}
                      color={file.favorite ? 'gray' : 'yellow'}
                    />
                  </>
                )}
                <ActionButton
                  Icon={IconExternalLink}
                  onClick={() => viewFile(file)}
                  tooltip={t('actions.viewInNewTab')}
                  color='blue'
                />
                <ActionButton
                  Icon={IconClipboardTypography}
                  onClick={() => copyFile(file, clipboard, true)}
                  tooltip={t('actions.copyRawLink')}
                />
                <ActionButton
                  Icon={IconCopy}
                  onClick={() => copyFile(file, clipboard)}
                  tooltip={t('actions.copyLink')}
                />
                <ActionButton
                  Icon={IconDownload}
                  onClick={() => downloadFile(file)}
                  tooltip={t('actions.download')}
                />
              </Group>
            </Group>
          </>
        ) : (
          <></>
        )}
      </Modal>

      {open && sequenced && fileNavButtons && (
        <>
          <ActionButton
            Icon={IconChevronLeft}
            tooltip={t('actions.previous')}
            onClick={() => goPrev()}
            disabled={!hasPrev}
            hiddenFrom='sm'
            style={{
              position: 'fixed',
              left: '0.75rem',
              top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
              zIndex: 1000,
            }}
            size='md'
          />

          <ActionButton
            Icon={IconChevronRight}
            tooltip={t('actions.next')}
            onClick={() => goNext()}
            disabled={!hasNext}
            hiddenFrom='sm'
            style={{
              position: 'fixed',
              right: '0.75rem',
              top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
              zIndex: 1000,
            }}
            size='md'
          />

          <ActionButton
            Icon={IconChevronLeft}
            tooltip={t('actions.previous')}
            onClick={() => goPrev()}
            disabled={!hasPrev}
            visibleFrom='sm'
            style={{
              position: 'fixed',
              left: '1rem',
              top: '50%',
              zIndex: 1000,
            }}
            size='lg'
          />

          <ActionButton
            Icon={IconChevronRight}
            tooltip={t('actions.next')}
            onClick={() => goNext()}
            disabled={!hasNext}
            visibleFrom='sm'
            style={{
              position: 'fixed',
              right: '1rem',
              top: '50%',
              zIndex: 1000,
            }}
            size='lg'
          />
        </>
      )}
    </>
  );
}
