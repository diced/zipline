import { Divider, Group, Modal } from '@mantine/core';
import { useState } from 'react';
import ImportV3Button from './ImportV3Button';
import ImportV4Button from './ImportV4Button';
import ExportButton from './ExportButton';
import ActionButton from '../../ActionButton';
import { IconDatabasePlus } from '@tabler/icons-react';

export default function ImportExport() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Modal opened={open} onClose={() => setOpen(false)} size='lg' title='Import / Export Data'>
        <Group gap='sm' grow>
          <ImportV3Button />
          <ImportV4Button />
        </Group>

        <Divider my='md' />

        <ExportButton />
      </Modal>

      <ActionButton onClick={() => setOpen(true)} Icon={IconDatabasePlus} />
    </>
  );
}
