import { LinksList } from '@/components/LinksList';
import { useUserStore } from '@/lib/client/store/user';
import { Group, Text, Title } from '@mantine/core';
import {
  IconDatabasePlus,
  IconPlayerPlayFilled,
  IconTrashFilled,
  IconVideoPlusFilled,
  TablerIcon,
} from '@tabler/icons-react';
import { ComponentType, useState } from 'react';
import ClearTemporaryFilesModal from './actions/ClearTemporaryFilesModal';
import ClearZeroByteFilesModal from './actions/ClearZeroByteFilesModal';
import GenerateThumbnailsModal from './actions/GenerateThumbnailsModal';
import ImportExportModal from './actions/ImportExportModal';
import RequeryFileSizesModal from './actions/RequeryFileSizesModal';

type ServerAction = {
  id: string;
  label: string;
  description: string;
  icon: TablerIcon;
  Modal: ComponentType<{ opened: boolean; onClose: () => void }>;
  superAdminOnly: boolean;
};

const ACTIONS = [
  {
    id: 'import-export',
    label: 'Import/Export Data',
    description: 'Allows you to import or export server data and configurations.',
    icon: IconDatabasePlus,
    Modal: ImportExportModal,
    superAdminOnly: true,
  },
  {
    id: 'clear-temporary-files',
    label: 'Clear Temporary Files',
    description: 'Removes all temporary files from the temporary directory.',
    icon: IconTrashFilled,
    Modal: ClearTemporaryFilesModal,
    superAdminOnly: false,
  },
  {
    id: 'clear-zero-byte-files',
    label: 'Clear Zero Byte Files',
    description: 'Deletes all files with zero bytes from the database and/or storage.',
    icon: IconTrashFilled,
    Modal: ClearZeroByteFilesModal,
    superAdminOnly: false,
  },
  {
    id: 'requery-file-sizes',
    label: 'Requery File Sizes',
    description: 'Recalculates and updates the sizes of all files in the database.',
    icon: IconPlayerPlayFilled,
    Modal: RequeryFileSizesModal,
    superAdminOnly: false,
  },
  {
    id: 'generate-thumbnails',
    label: 'Generate Thumbnails',
    description: 'Creates thumbnails for all image and video files that lack them.',
    icon: IconVideoPlusFilled,
    Modal: GenerateThumbnailsModal,
    superAdminOnly: false,
  },
] satisfies ServerAction[];

type ServerActionId = (typeof ACTIONS)[number]['id'];

export default function DashboardServerActions() {
  const user = useUserStore((state) => state.user);
  const [activeAction, setActiveAction] = useState<ServerActionId | null>(null);

  const actions = ACTIONS.filter((action) => !action.superAdminOnly || user?.role === 'SUPERADMIN');
  const links = actions.map(({ id, label, description, icon }) => ({
    label,
    description,
    icon,
    onClick: () => setActiveAction(id),
  }));

  return (
    <>
      {actions.map(({ id, Modal }) => (
        <Modal key={id} opened={activeAction === id} onClose={() => setActiveAction(null)} />
      ))}

      <Group gap='sm'>
        <Title order={1}>Server Actions</Title>
      </Group>
      <Text c='dimmed' mb='xs'>
        Useful tools and scripts for server management.
      </Text>
      <LinksList links={links} />
    </>
  );
}
