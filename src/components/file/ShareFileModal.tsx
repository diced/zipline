import { Share, createFileShare, listFileShares, revokeFileShare } from '@/lib/api/fileShare';
import { File } from '@/lib/db/models/file';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

export default function ShareFileModal({
  file,
  open,
  onClose,
}: {
  file: File;
  open: boolean;
  onClose: () => void;
}) {
  const clipboard = useClipboard();

  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);

  const [expiresEnabled, setExpiresEnabled] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [maxViews, setMaxViews] = useState<number | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [newShareUrl, setNewShareUrl] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listFileShares(file)
      .then((data) => {
        if (cancelled) return;
        setShares(data.shares);
      })
      .catch((err) => {
        if (cancelled) return;
        notifications.show({ title: 'Error', message: err.message, color: 'red' });
      });
    return () => {
      cancelled = true;
    };
  }, [open, file]);

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setNewShareUrl(''), 200);
    return () => clearTimeout(t);
  }, [open]);

  const createShare = async () => {
    setLoading(true);
    try {
      const options = {
        expiresAt: expiresEnabled ? expiresAt || null : null,
        maxViews: maxViews ?? null,
        password: password || null,
      };
      const data = await createFileShare(file, options);
      setNewShareUrl(data.url);
      setShares((prev) => [
        {
          id: data.share.id,
          token: data.share.token,
          expiresAt: data.share.expiresAt,
          maxViews: data.share.maxViews,
          views: data.share.views,
          createdAt: data.share.createdAt,
        },
        ...prev,
      ]);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async (shareId: string) => {
    try {
      await revokeFileShare(file, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    }
  };

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title={<Title order={3}>Share {file.name}</Title>}
      size='lg'
      centered
    >
      <Stack gap='md'>
        {newShareUrl && (
          <Group wrap='nowrap'>
            <TextInput
              label='Share link'
              value={newShareUrl}
              readOnly
              style={{ flex: 1 }}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Tooltip label='Copy'>
              <Button
                variant='light'
                px='sm'
                onClick={() => {
                  clipboard.copy(newShareUrl);
                  notifications.show({ title: 'Copied', message: 'Share link copied', color: 'green' });
                }}
              >
                <IconCopy size='1rem' />
              </Button>
            </Tooltip>
          </Group>
        )}

        <Group align='flex-end'>
          <Switch
            label='Set expiration'
            checked={expiresEnabled}
            onChange={(e) => setExpiresEnabled(e.currentTarget.checked)}
          />
          <TextInput
            type='datetime-local'
            label='Expires at'
            disabled={!expiresEnabled}
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
        </Group>

        <NumberInput
          label='Max views'
          placeholder='Unlimited'
          min={1}
          value={maxViews}
          onChange={(val) => setMaxViews(typeof val === 'number' ? val : undefined)}
        />

        <PasswordInput
          label='Password (optional)'
          placeholder='No password'
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />

        <Button onClick={createShare} loading={loading} disabled={expiresEnabled && !expiresAt}>
          Create share link
        </Button>

        {shares.length > 0 && (
          <Stack gap='xs'>
            <Text fw={600}>Active shares</Text>
            {shares.map((share) => (
              <Group key={share.id} justify='space-between' wrap='nowrap'>
                <Text size='sm' c='dimmed' style={{ fontFamily: 'monospace' }}>
                  {share.token.slice(0, 8)}…
                </Text>
                <Group gap='xs'>
                  {share.maxViews && (
                    <Text size='xs' c='dimmed'>
                      {share.views}/{share.maxViews} views
                    </Text>
                  )}
                  {share.expiresAt && (
                    <Text size='xs' c='dimmed'>
                      until {new Date(share.expiresAt).toLocaleString()}
                    </Text>
                  )}
                  <Tooltip label='Revoke'>
                    <ActionIcon color='red' variant='light' onClick={() => revokeShare(share.id)}>
                      <IconTrash size='1rem' />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
