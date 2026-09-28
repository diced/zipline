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
import type { ParseKeys } from 'i18next';
import { ComponentType, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ClearTemporaryFilesModal from './actions/ClearTemporaryFilesModal';
import ClearZeroByteFilesModal from './actions/ClearZeroByteFilesModal';
import GenerateThumbnailsModal from './actions/GenerateThumbnailsModal';
import ImportExportModal from './actions/ImportExportModal';
import RequeryFileSizesModal from './actions/RequeryFileSizesModal';

type ServerAction = {
  id: string;
  labelKey: ParseKeys<'serverActions'>;
  descriptionKey: ParseKeys<'serverActions'>;
  icon: TablerIcon;
  Modal: ComponentType<{ opened: boolean; onClose: () => void }>;
  superAdminOnly: boolean;
};

const ACTIONS = [
  {
    id: 'import-export',
    labelKey: 'list.importExport.label',
    descriptionKey: 'list.importExport.description',
    icon: IconDatabasePlus,
    Modal: ImportExportModal,
    superAdminOnly: true,
  },
  {
    id: 'clear-temporary-files',
    labelKey: 'list.clearTemporaryFiles.label',
    descriptionKey: 'list.clearTemporaryFiles.description',
    icon: IconTrashFilled,
    Modal: ClearTemporaryFilesModal,
    superAdminOnly: false,
  },
  {
    id: 'clear-zero-byte-files',
    labelKey: 'list.clearZeroByteFiles.label',
    descriptionKey: 'list.clearZeroByteFiles.description',
    icon: IconTrashFilled,
    Modal: ClearZeroByteFilesModal,
    superAdminOnly: false,
  },
  {
    id: 'requery-file-sizes',
    labelKey: 'list.requeryFileSizes.label',
    descriptionKey: 'list.requeryFileSizes.description',
    icon: IconPlayerPlayFilled,
    Modal: RequeryFileSizesModal,
    superAdminOnly: false,
  },
  {
    id: 'generate-thumbnails',
    labelKey: 'list.generateThumbnails.label',
    descriptionKey: 'list.generateThumbnails.description',
    icon: IconVideoPlusFilled,
    Modal: GenerateThumbnailsModal,
    superAdminOnly: false,
  },
] satisfies ServerAction[];

type ServerActionId = (typeof ACTIONS)[number]['id'];

export default function DashboardServerActions() {
  const { t } = useTranslation('serverActions');
  const user = useUserStore((state) => state.user);
  const [activeAction, setActiveAction] = useState<ServerActionId | null>(null);

  const actions = ACTIONS.filter((action) => !action.superAdminOnly || user?.role === 'SUPERADMIN');
  const links = actions.map(({ id, labelKey, descriptionKey, icon }) => ({
    label: t(labelKey),
    description: t(descriptionKey),
    icon,
    onClick: () => setActiveAction(id),
  }));

  return (
    <>
      {actions.map(({ id, Modal }) => (
        <Modal key={id} opened={activeAction === id} onClose={() => setActiveAction(null)} />
      ))}

      <Group gap='sm'>
        <Title order={1}>{t('page.title')}</Title>
      </Group>
      <Text c='dimmed' mb='xs'>
        {t('page.description')}
      </Text>
      <LinksList links={links} />
    </>
  );
}
