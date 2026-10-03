import RelativeDate from '@/components/RelativeDate';
import { Response } from '@/lib/api/response';
import { IncompleteFileStatus } from '@/lib/db/enums';
import { IncompleteFile } from '@/lib/db/models/incompleteFile';
import { fetchApi } from '@/lib/fetchApi';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconFileDots, IconTrashFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { DashboardFilesModals, DashboardFilesModalsUpdate } from '.';

const badgeMap = {
  PENDING: { color: 'gray', label: 'pending.status.pending' },
  PROCESSING: { color: 'yellow', label: 'pending.status.processing' },
  COMPLETE: { color: 'green', label: 'pending.status.complete' },
  FAILED: { color: 'red', label: 'pending.status.failed' },
} as const satisfies Record<IncompleteFileStatus, { color: string; label: string }>;

export default function PendingFilesModal({
  modals,
  setModals,
}: {
  modals: DashboardFilesModals;
  setModals: DashboardFilesModalsUpdate;
}) {
  const { t } = useTranslation(['files', 'common']);
  const [clearing, setClearing] = useState(false);
  const { data: incompleteFiles, mutate } = useSWR<
    Extract<IncompleteFile[], Response['/api/user/files/incomplete']>
  >('/api/user/files/incomplete');

  const handleDelete = async (incompleteFile?: IncompleteFile) => {
    setClearing(true);
    try {
      const { error } = await fetchApi<Response['/api/user/files/incomplete']>(
        '/api/user/files/incomplete',
        'DELETE',
        incompleteFile ? { id: [incompleteFile.id] } : { completed: true },
      );

      if (error) throw new Error(error.error);

      showNotification({
        message: incompleteFile
          ? t('pending.notifications.clearedOne')
          : t('pending.notifications.clearedCompleted'),
        color: 'green',
        icon: <IconTrashFilled size='1rem' />,
      });
      await mutate();
    } catch (error) {
      showNotification({
        title: t('common:status.error'),
        message: t(
          incompleteFile
            ? 'pending.notifications.clearOneFailed'
            : 'pending.notifications.clearCompletedFailed',
          { error: error instanceof Error ? error.message : t('pending.notifications.unknownError') },
        ),
        color: 'red',
        icon: <IconFileDots size='1rem' />,
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <Modal
      opened={modals.pending}
      onClose={() => setModals({ pending: false })}
      title={t('pending.title')}
      size='md'
    >
      <Stack gap='xs'>
        <Group justify='space-between'>
          <Text size='sm' c='dimmed'>
            {t('pending.count', { count: incompleteFiles?.length ?? 0 })}
          </Text>
          <Button
            size='compact-sm'
            color='red'
            variant='light'
            disabled={clearing || !incompleteFiles?.some((file) => file.status === 'COMPLETE')}
            onClick={() => handleDelete()}
            leftSection={<IconTrashFilled size='1rem' />}
          >
            {t('pending.clearCompleted')}
          </Button>
        </Group>
        {!!incompleteFiles?.length && (
          <ScrollArea.Autosize mah={400} type='auto'>
            <Stack gap='xs'>
              {incompleteFiles.map((inf) => (
                <Group key={inf.id} justify='space-between' wrap='nowrap' gap='sm'>
                  <Stack gap={2} flex={1} miw={0}>
                    <Text size='sm' fw={600} truncate title={inf.metadata.file.filename}>
                      {inf.metadata.file.filename}
                    </Text>

                    <Text size='xs' c='dimmed'>
                      {t('pending.chunks', { complete: inf.chunksComplete, total: inf.chunksTotal })}
                      {inf.status === 'COMPLETE' && (
                        <>
                          , <RelativeDate date={inf.updatedAt} />
                        </>
                      )}
                    </Text>
                  </Stack>

                  <Group gap='xs' wrap='nowrap'>
                    <Badge size='xs' variant='light' color={badgeMap[inf.status].color}>
                      {t(badgeMap[inf.status].label)}
                    </Badge>

                    <Tooltip label={t('pending.clearEntry')}>
                      <ActionIcon
                        color='red'
                        variant='outline'
                        aria-label={t('pending.clearEntryLabel', { name: inf.metadata.file.filename })}
                        disabled={clearing}
                        onClick={() => handleDelete(inf)}
                      >
                        <IconTrashFilled size='1rem' />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}

        {incompleteFiles?.length === 0 && (
          <Paper withBorder px='sm' py='xs'>
            {t('pending.empty')}
          </Paper>
        )}
      </Stack>
    </Modal>
  );
}
