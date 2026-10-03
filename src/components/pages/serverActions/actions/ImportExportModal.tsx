import { Divider, Group, Modal } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import ExportButton from './ImportExport/ExportButton';
import ImportV3Button from './ImportExport/ImportV3Button';
import ImportV4Button from './ImportExport/ImportV4Button';

export default function ImportExportModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation('serverActions');

  return (
    <Modal opened={opened} onClose={onClose} size='lg' title={t('importExport.title')}>
      <Group gap='sm' grow>
        <ImportV3Button />
        <ImportV4Button />
      </Group>

      <Divider my='md' />

      <ExportButton />
    </Modal>
  );
}
