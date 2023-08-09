import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import type { SpotlightAction } from '@mantine/spotlight';
import {
  IconClipboardCopy,
  IconFiles,
  IconFileText,
  IconFileUpload,
  IconFolders,
  IconGraph,
  IconHelp,
  IconHome,
  IconLink,
  IconLogout,
  IconUser,
} from '@tabler/icons-react';
import { NextRouter } from 'next/router';
import { ReactNode } from 'react';
import { useRecoilValue } from 'recoil';
import { userSelector } from './recoil/user';

export const createSpotlightActions = (router: NextRouter): SpotlightAction[] => {
  const user = useRecoilValue(userSelector);
  const clipboard = useClipboard();

  if (!user) {
    return [];
  }

  const linkTo = (url: string) => {
    router.push(url);
  };

  const actionLink = (
    group: string,
    title: string,
    description: string,
    link: string,
    icon: ReactNode
  ): SpotlightAction => {
    return actionDo(group, title, description, icon, () => linkTo(link));
  };

  const actionDo = (
    group: string,
    title: string,
    description: string,
    icon: ReactNode,
    action: () => void
  ): SpotlightAction => {
    return {
      group,
      title,
      description,
      closeOnTrigger: true,
      icon,
      onTrigger: action,
    };
  };

  return [
    // Navigation
    actionLink('Navigation', 'Home', 'Go to the home page', '/dashboard', <IconHome />),
    actionLink('Navigation', 'Files', 'View your files', '/dashboard/files', <IconFiles />),
    actionLink('Navigation', 'URLs', 'View your URLs', '/dashboard/urls', <IconLink />),
    actionLink('Navigation', 'Folders', 'View your folders', '/dashboard/folders', <IconFolders />),
    actionLink('Navigation', 'Statistics', 'View your statistics', '/dashboard/stats', <IconGraph />),
    actionLink(
      'Navigation',
      'Manage Account',
      'Manage your account settings',
      '/dashboard/manage',
      <IconUser />
    ),

    // Actions
    actionLink('Actions', 'Logout', 'Logout of your account', '/auth/logout', <IconLogout />),
    actionLink(
      'Actions',
      'Upload Files',
      'Upload files of any kind',
      '/dashboard/upload/file',
      <IconFileUpload />
    ),
    actionLink(
      'Actions',
      'Upload Text',
      'Upload code, or any other kind of text file',
      '/dashboard/upload/text',
      <IconFileText />
    ),
    actionDo('Actions', 'Copy Token', 'Copy your API token to your clipboard', <IconClipboardCopy />, () => {
      clipboard.copy(user.token);
      showNotification({
        title: 'Copied to clipboard',
        message: '',
        color: 'green',
        icon: <IconClipboardCopy size='1rem' />,
      });
    }),

    actionLink('Help', 'Documentation', 'View the documentation', 'https://zipline.diced.sh', <IconHelp />),

    // the list of actions here is very incomplete, and will be expanded in the future
  ];
};
