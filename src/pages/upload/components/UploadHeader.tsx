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
} from '@tabler/icons-react';
import Link from 'next/link';

interface UploadHeaderProps {
  isAuthenticated: boolean;
  avatar?: string | null;
  username?: string;
}

export function UploadHeader({ isAuthenticated, avatar, username }: UploadHeaderProps) {
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
          <Group gap='md'>
            <ThemeIcon size={40} radius='md' variant='gradient'>
              <IconCloudUpload size='1.5rem' />
            </ThemeIcon>
            <Text size='xl' fw={700} gradient={{ from: 'blue', to: 'cyan' }}>
              Zipline
            </Text>
          </Group>

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
                <Menu shadow='md' width={200}>
                  <Menu.Target>
                    <Avatar
                      src={avatar}
                      alt={username}
                      radius='xl'
                      style={{ cursor: 'pointer' }}
                    />
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Account</Menu.Label>
                    <Menu.Item
                      leftSection={<IconSettings size='0.9rem' />}
                      component={Link}
                      href='/dashboard/manage'
                    >
                      Settings
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
              </>
            )}
          </Group>
        </Group>
      </Container>
    </Paper>
  );
}
