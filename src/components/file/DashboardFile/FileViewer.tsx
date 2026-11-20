import { bytes } from '@/lib/bytes';
import { useFileNavStore } from '@/lib/client/store/fileNav';
import { useSettingsStore } from '@/lib/client/store/settings';
import { File } from '@/lib/db/models/file';
import {
  ActionIcon,
  ActionIconProps,
  Box,
  Drawer,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  Icon,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardTypography,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconInfoCircle,
  IconPencil,
  IconStar,
  IconStarFilled,
  IconTrashFilled,
  IconX,
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
    <Tooltip label={tooltip} zIndex='200'>
      <ActionIcon
        size='xl'
        variant='subtle'
        bd='1px solid var(--mantine-color-dark-4)'
        color={color ?? 'gray'}
        onClick={onClick}
        {...props}
      >
        <Icon size='1.15rem' />
      </ActionIcon>
    </Tooltip>
  );
}

export default function FileViewer({
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

  const tagsEditor = useFileTags(file, open, user);

  const [editFileOpen, setEditFileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null);

  const [goPrev, goNext, hasPrev, hasNext] = useFileNavStore(
    useShallow((state) => {
      if (!state.current) return [state.goPrev, state.goNext, false, false];

      const idx = state.ids.indexOf(state.current);
      return [state.goPrev, state.goNext, idx > 0, idx >= 0 && idx < state.ids.length - 1];
    }),
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (!sequenced) return;
      if (event.key === 'ArrowLeft' && hasPrev) {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, sequenced, hasPrev, hasNext, goPrev, goNext, setOpen]);

  const headerActionGroup = file ? (
    <ActionIcon.Group>
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
        Icon={IconInfoCircle}
        onClick={() => setInfoOpen((v) => !v)}
        tooltip={infoOpen ? t('actions.hideDetails') : t('actions.showDetails')}
        color={infoOpen ? 'cyan' : 'gray'}
      />
      <ActionButton
        Icon={IconExternalLink}
        onClick={() => viewFile(file)}
        tooltip={t('actions.openInNewTab')}
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
        tooltip={t('common:actions.download')}
      />
    </ActionIcon.Group>
  ) : null;

  return (
    <>
      {file && (
        <EditFileDetailsModal open={editFileOpen} onClose={() => setEditFileOpen(false)} file={file} />
      )}

      <Drawer
        opened={infoOpen}
        onClose={() => setInfoOpen(false)}
        position='right'
        title={<Title order={2}>{t('details.title')}</Title>}
        radius='md'
        offset={20}
        overlayProps={{ blur: 6 }}
      >
        {file && (
          <Stack gap='md'>
            <FileStats file={file} reduce={reduce} />
            {!reduce && (
              <>
                <FileTags editor={tagsEditor} />
                <FileFolderPicker file={file} user={user} />
              </>
            )}
          </Stack>
        )}
      </Drawer>

      <Box
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(calc(0.375rem * var(--mantine-scale)))',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 220ms cubic-bezier(0.33, 1, 0.68, 1)',
          willChange: 'opacity',
        }}
      >
        <Paper m={0} p={0} withBorder bdrs={0} style={{ borderTop: 0, borderLeft: 0, borderRight: 0 }}>
          <Stack gap='sm' px='lg' py='sm' onClick={(e) => e.stopPropagation()}>
            <Group justify='space-between' align='center' gap='sm' wrap='nowrap' visibleFrom='sm'>
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text size='lg' fw={600} lineClamp={1} c='white'>
                  {file?.name ?? ''}
                </Text>
                {file && (
                  <Text size='sm' c='dimmed' lineClamp={1}>
                    {file.type} ({bytes(file.size)})
                  </Text>
                )}
              </Box>
              <Group gap='sm' wrap='nowrap' style={{ flexShrink: 0 }}>
                {headerActionGroup}
                <ActionButton
                  Icon={IconX}
                  tooltip={t('common:actions.close')}
                  onClick={() => setOpen(false)}
                />
              </Group>
            </Group>

            <Stack gap='sm' hiddenFrom='sm'>
              <Group justify='space-between' align='flex-start' gap='sm' wrap='nowrap'>
                <Box style={{ minWidth: 0, flex: 1 }}>
                  <Text size='lg' fw={600} lineClamp={1} c='white'>
                    {file?.name ?? ''}
                  </Text>
                  {file && (
                    <Text size='sm' c='dimmed' lineClamp={1}>
                      {file.type} ({bytes(file.size)})
                    </Text>
                  )}
                </Box>
                <ActionButton
                  Icon={IconX}
                  tooltip={t('common:actions.close')}
                  onClick={() => setOpen(false)}
                  style={{ flexShrink: 0 }}
                />
              </Group>

              <Group gap={0} wrap='nowrap'>
                {headerActionGroup}
              </Group>
            </Stack>
          </Stack>
        </Paper>

        <Box
          ref={setScrollParent}
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            paddingTop: '1rem',
            paddingBottom: '1rem',
            marginLeft: '1rem',
            marginRight: '1rem',
            overflow: 'auto',
            position: 'relative',
            overscrollBehavior: 'contain',
          }}
        >
          {open && file ? (
            <Box
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setOpen(false);
                } else {
                  event.stopPropagation();
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                alignSelf: 'stretch',
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                width: '100%',
                overflow: 'visible',
                paddingLeft: '4rem',
                paddingRight: '4rem',
              }}
            >
              <DashboardFileType
                key={file.id}
                file={file}
                show
                fullscreen
                allowZoom={false}
                scrollParent={scrollParent}
                onFullscreenBackdropClick={() => setOpen(false)}
              />

              {sequenced && fileNavButtons && file && (
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
                      top: 'calc(env(safe-area-inset-top, 0px) + 10rem)',
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
                      top: 'calc(env(safe-area-inset-top, 0px) + 10rem)',
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
                    variant='filled'
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
                    variant='filled'
                  />
                </>
              )}
            </Box>
          ) : null}
        </Box>
      </Box>
    </>
  );
}
