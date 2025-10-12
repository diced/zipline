import {
  Paper,
  Container,
  Group,
  ThemeIcon,
  Text,
  Button,
  Avatar,
  Menu,
} from '@mantine/core';
import {
  IconCloudUpload,
  IconDashboard,
  IconBrandGithub,
  IconBrandDiscord,
  IconSettings,
  IconFiles,
  IconLink,
  IconLogout,
  IconLogin,
} from '@tabler/icons-react';
import Link from 'next/link';

interface UploadHeaderProps {
  isAuthenticated: boolean;
  avatar?: string | null;
  username?: string;
  logoUrl?: string | null;
  titleText?: string;
}

export function UploadHeader({ isAuthenticated, avatar, username, logoUrl, titleText }: UploadHeaderProps) {
  return (
    <Paper
      radius={0}
      p='md'
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Container size='xl'>
        <Group justify='space-between' align='center'>
          {/* Logo */}
          <Link href='/' style={{ textDecoration: 'none', color: 'inherit' }}>
            <Group gap='md'>
              {logoUrl ? (
                <Avatar src={logoUrl} alt='logo' radius='md' size={40} />
              ) : (
                <ThemeIcon size={40} radius='md' variant='gradient'>
                  <IconCloudUpload size='1.5rem' />
                </ThemeIcon>
              )}
              <Text size='xl' fw={700} gradient={{ from: 'blue', to: 'cyan' }}>
                {titleText?.trim() || 'Zipline'}
              </Text>
            </Group>
          </Link>

          {/* Navigation */}
          <Group gap='md'>
            {isAuthenticated ? (
              <>
                <Link href='/dashboard' passHref legacyBehavior>
                  <Button
                    component='a'
                    leftSection={<IconDashboard size='1rem' />}
                    variant='light'
                  >
                    Dashboard
                  </Button>
                </Link>
                <Menu shadow='md' width={220}>
                  <Menu.Target>
                    <Avatar
                      src={avatar}
                      alt={username}
                      radius='xl'
                      style={{ cursor: 'pointer' }}
                    />
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>{username || 'Account'}</Menu.Label>
                    <Menu.Item leftSection={<IconFiles size='0.9rem' />} component={Link} href='/dashboard/files'>
                      Files
                    </Menu.Item>
                    <Menu.Item leftSection={<IconLink size='0.9rem' />} component={Link} href='/dashboard/urls'>
                      URLs
                    </Menu.Item>
                    <Menu.Item leftSection={<IconSettings size='0.9rem' />} component={Link} href='/dashboard/settings'>
                      Settings
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color='red' leftSection={<IconLogout size='0.9rem' />} component={Link} href='/auth/logout'>
                      Logout
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  component='a'
                  href='https://github.com/diced/zipline'
                  target='_blank'
                  leftSection={<IconBrandGithub size='1rem' />}
                  variant='subtle'
                >
                  GitHub
                </Button>
                <Button
                  component='a'
                  href='https://discord.gg/zipline'
                  target='_blank'
                  leftSection={<IconBrandDiscord size='1rem' />}
                  variant='subtle'
                >
                  Discord
                </Button>
                <Link href='/auth/login' passHref legacyBehavior>
                  <Button
                    component='a'
                    leftSection={<IconLogin size='1rem' />}
                    variant='light'
                  >
                    Login
                  </Button>
                </Link>
              </>
            )}
          </Group>
        </Group>
      </Container>
    </Paper>
  );
}
