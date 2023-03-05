import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import type { SpotlightAction } from '@mantine/spotlight';
import {
  FileIcon,
  FolderIcon,
  HomeIcon,
  ActivityIcon,
  LinkIcon,
  UserIcon,
  LogoutIcon,
  CopyIcon,
  SearchIcon,
} from 'components/icons';
import { NextRouter } from 'next/router';
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
    icon: any
  ): SpotlightAction => {
    return actionDo(group, title, description, icon, () => linkTo(link));
  };

  const actionDo = (
    group: string,
    title: string,
    description: string,
    icon: any,
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
    actionLink('Navigation', 'Home', 'Go to the home page', '/dashboard', <HomeIcon />),
    actionLink('Navigation', 'Files', 'View your files', '/dashboard/files', <FileIcon />),
    actionLink('Navigation', 'URLs', 'View your URLs', '/dashboard/urls', <LinkIcon />),
    actionLink('Navigation', 'Folders', 'View your folders', '/dashboard/folders', <FolderIcon />),
    actionLink('Navigation', 'Statistics', 'View your statistics', '/dashboard/stats', <ActivityIcon />),
    actionLink(
      'Navigation',
      'Manage Account',
      'Manage your account settings',
      '/dashboard/manage',
      <UserIcon />
    ),

    // Actions
    actionLink('Actions', 'Logout', 'Logout of your account', '/auth/logout', <LogoutIcon />),
    actionLink('Actions', 'Upload Files', 'Upload files of any kind', '/dashboard/upload/file', <FileIcon />),
    actionLink(
      'Actions',
      'Upload Text',
      'Upload code, or any other kind of text file',
      '/dashboard/upload/text',
      <FileIcon />
    ),
    actionDo('Actions', 'Copy Token', 'Copy your API token to your clipboard', <CopyIcon />, () => {
      clipboard.copy(user.token);
      showNotification({
        title: 'Copied to clipboard',
        message: '',
        color: 'green',
        icon: <CopyIcon />,
      });
    }),

    actionLink(
      'Help',
      'Documentation',
      'View the documentation',
      'https://zipline.diced.tech',
      <SearchIcon />
    ),

    // the list of actions here is very incomplete, and will be expanded in the future
  ];
};
