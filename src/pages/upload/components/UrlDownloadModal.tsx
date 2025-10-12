import { Modal, TextInput, Button, Group, Stack, Text } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';

interface UrlDownloadModalProps {
  opened: boolean;
  onClose: () => void;
  uploading: boolean;
  downloadUrl: string;
  onDownloadUrlChange: (url: string) => void;
  onSubmit: () => void;
}

export function UrlDownloadModal({
  opened,
  onClose,
  uploading,
  downloadUrl,
  onDownloadUrlChange,
  onSubmit,
}: UrlDownloadModalProps) {
  const handleSubmit = () => {
    if (downloadUrl.trim()) {
      onSubmit();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Download from URL"
      centered
      styles={{
        content: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
        },
        header: {
          backgroundColor: 'transparent',
        },
        body: {
          padding: '1.5rem',
        },
      }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Enter a URL to download the file and upload it to Zipline
        </Text>
        <TextInput
          placeholder="https://example.com/file.pdf"
          value={downloadUrl}
          onChange={(e) => onDownloadUrlChange(e.currentTarget.value)}
          disabled={uploading}
          leftSection={<IconLink size="1rem" />}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && downloadUrl.trim()) {
              handleSubmit();
            }
          }}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading || !downloadUrl.trim()} loading={uploading}>
            Download
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
