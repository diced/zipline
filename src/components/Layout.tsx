import type { Response } from '@/lib/api/response';
import useLogin from '@/lib/hooks/useLogin';
import {
  AppShell,
  Burger,
  Header,
  MediaQuery,
  NavLink,
  Navbar,
  Paper,
  Text,
  useMantineTheme,
} from '@mantine/core';
import {
  IconChevronRight,
  IconFileText,
  IconFileUpload,
  IconFiles,
  IconHome,
  IconLink,
  IconShieldLockFilled,
  IconUpload,
  IconUsersGroup,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

type NavLinks = {
  label: string;
  icon: React.ReactNode;
  active: (path: string) => boolean;
  href?: string;
  description?: string;
  links?: NavLinks[];
  if?: (user: Response['/api/user']['user']) => boolean;
};

const navLinks: NavLinks[] = [
  {
    label: 'Home',
    icon: <IconHome size='1rem' />,
    active: (path: string) => path === '/dashbaord',
    href: '/dashboard',
    description: 'View recent files and your statistics',
  },
  {
    label: 'Files',
    icon: <IconFiles size='1rem' />,
    active: (path: string) => path === '/dashboard/files',
    href: '/dashboard/files',
    description: 'View your files',
  },
  {
    label: 'Upload',
    icon: <IconUpload size='1rem' />,
    active: (path: string) => path.startsWith('/dashboard/upload'),
    links: [
      {
        label: 'File',
        icon: <IconFileUpload size='1rem' />,
        active: (path: string) => path === '/dashboard/upload/file',
        href: '/dashboard/upload/file',
        description: 'Upload a file',
      },
      {
        label: 'Text',
        icon: <IconFileText size='1rem' />,
        active: (path: string) => path === '/dashboard/upload/text',
        href: '/dashboard/upload/text',
        description: 'Upload text, code, etc.',
      },
    ],
  },
  {
    label: 'URLs',
    icon: <IconLink size='1rem' />,
    active: (path: string) => path === '/dashboard/urls',
    href: '/dashboard/urls',
    description: 'View your URLs',
  },
  {
    label: 'Administrator',
    icon: <IconShieldLockFilled size='1rem' />,
    if: (user) => user?.administrator || false,
    active: (path: string) => path.startsWith('/dashboard/admin'),
    links: [
      {
        label: 'Users',
        icon: <IconUsersGroup size='1rem' />,
        active: (path: string) => path === '/dashboard/admin/users',
        href: '/dashboard/admin/users',
        description: 'View all users',
      },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);
  const router = useRouter();

  const { user, token } = useLogin();

  return (
    <AppShell
      styles={{
        main: {
          background: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
        },
      }}
      navbarOffsetBreakpoint='sm'
      asideOffsetBreakpoint='sm'
      navbar={
        <Navbar hiddenBreakpoint='sm' hidden={!opened} width={{ sm: 200, lg: 300 }}>
          {navLinks
            .filter((link) => !link.if || link.if(user as Response['/api/user']['user']))
            .map((link) => {
              if (!link.links) {
                return (
                  <NavLink
                    key={link.label}
                    label={link.label}
                    icon={link.icon}
                    variant='light'
                    rightSection={<IconChevronRight size='0.7rem' />}
                    active={router.pathname === link.href}
                    component={Link}
                    href={link.href || ''}
                    description={link.description}
                  />
                );
              } else {
                return (
                  <NavLink
                    key={link.label}
                    label={link.label}
                    icon={link.icon}
                    variant='light'
                    rightSection={<IconChevronRight size='0.7rem' />}
                    active={router.pathname === link.href}
                    description={link.description}
                    defaultOpened={link.active(router.pathname)}
                  >
                    {link.links.map((sublink) => (
                      <NavLink
                        key={sublink.label}
                        label={sublink.label}
                        icon={sublink.icon}
                        rightSection={<IconChevronRight size='0.7rem' />}
                        variant='light'
                        active={router.pathname === link.href}
                        component={Link}
                        href={sublink.href || ''}
                        description={sublink.description}
                      />
                    ))}
                  </NavLink>
                );
              }
            })}
        </Navbar>
      }
      header={
        <Header height={{ base: 50, md: 70 }} p='md'>
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <MediaQuery largerThan='sm' styles={{ display: 'none' }}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size='sm'
                color={theme.colors.gray[6]}
                mr='xl'
              />
            </MediaQuery>

            <Text size={30} weight={700}>
              Zipline
            </Text>
          </div>
        </Header>
      }
    >
      <Paper m={2} withBorder p={'xs'}>
        {children}
      </Paper>
    </AppShell>
  );
}
