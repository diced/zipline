import {
  IconCursorText,
  IconFiles,
  IconFolders,
  IconGraph,
  IconLink,
  IconServer,
  IconServerCog,
  IconSettings,
  IconSettingsExclamation,
  IconTags,
  IconUpload,
  IconUsers,
} from '@tabler/icons-react';
import { QuickLinkId } from '../quickLinks';

export const QUICK_LINKS_ICONS: Record<QuickLinkId, React.ReactNode> = {
  uploadFile: <IconUpload size='1.5rem' />,
  uploadText: <IconCursorText size='1.5rem' />,
  files: <IconFiles size='1.5rem' />,
  folders: <IconFolders size='1.5rem' />,
  urls: <IconLink size='1.5rem' />,
  metrics: <IconGraph size='1.5rem' />,
  settings: <IconSettings size='1.5rem' />,
  administrator: <IconSettingsExclamation size='1.5rem' />,
  users: <IconUsers size='1.5rem' />,
  invites: <IconTags size='1.5rem' />,
  serverActions: <IconServer size='1.5rem' />,
  serverSettings: <IconServerCog size='1.5rem' />,
};
