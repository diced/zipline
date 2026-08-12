import { Divider, Group, Modal } from '@mantine/core';
import ExportButton from './ImportExport/ExportButton';
import ImportV3Button from './ImportExport/ImportV3Button';
import ImportV4Button from './ImportExport/ImportV4Button';

export default function ImportExportModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  return (
    <Modal opened={opened} onClose={onClose} size='lg' title='Import / Export Data'>
      <Group gap='sm' grow>
        <ImportV3Button />
        <ImportV4Button />
      </Group>

      <Divider my='md' />

      <ExportButton />
    </Modal>
  );
}
