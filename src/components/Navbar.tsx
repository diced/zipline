import { Group, Burger, Drawer, Stack, Anchor, Button, Text, Box, Container } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Link } from 'react-router-dom';

interface NavLink {
  href: string;
  label: string;
  active?: boolean;
}

interface NavbarProps {
  brandName?: string;
  navigationLinks?: NavLink[];
  isLoggedIn?: boolean;
}

const defaultNavigationLinks: NavLink[] = [
  { href: '#', label: 'Home', active: true },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#about', label: 'About' },
];

export function Navbar({
  brandName = 'Flux',
  navigationLinks = defaultNavigationLinks,
  isLoggedIn = false,
}: NavbarProps) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <Box
      component='header'
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid #373A40',
        backgroundColor: '#1A1B1E',
        backdropFilter: 'blur(12px)',
        boxShadow: 'none',
      }}
    >
      <Container size='xl'>
        <Group h={64} justify='space-between'>
          {/* Left side - Logo/Brand + Nav Links */}
          <Group gap='lg'>
            {/* Mobile hamburger */}
            {isMobile && <Burger opened={opened} onClick={toggle} size='sm' aria-label='Toggle navigation' />}

            {/* Brand */}
            <Anchor
              component={Link}
              to='/'
              underline='never'
              c='inherit'
              style={{
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.color = '#C1C2C5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.color = 'inherit';
              }}
            >
              <Text fw={700} size='xl'>
                {brandName}
              </Text>
            </Anchor>

            {/* Desktop navigation - DISABLED */}
            {/* {!isMobile && (
              <Group gap='xs'>
                {navigationLinks.map((link, index) => (
                  <Anchor
                    key={index}
                    href={link.href}
                    underline='never'
                    px='md'
                    py='xs'
                    style={{
                      borderRadius: 'var(--mantine-radius-sm)',
                      backgroundColor: link.active
                        ? 'var(--mantine-color-default-hover)'
                        : 'transparent',
                      color: link.active
                        ? 'var(--mantine-color-text)'
                        : 'var(--mantine-color-dimmed)',
                      fontWeight: 500,
                      fontSize: 'var(--mantine-font-size-sm)',
                    }}
                  >
                    {link.label}
                  </Anchor>
                ))}
              </Group>
            )} */}
          </Group>

          {/* Right side - Auth button */}
          <Group gap='sm'>
            {isLoggedIn ? (
              <Button
                component={Link}
                to='/dashboard'
                size='sm'
                style={{
                  background: '#373A40',
                  color: '#ffffff',
                  border: '1px solid #373A40',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#5C5F66';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#373A40';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Dashboard
              </Button>
            ) : (
              <Button
                component={Link}
                to='/auth/login'
                size='sm'
                variant='filled'
                style={{
                  background: '#373A40',
                  color: '#ffffff',
                  border: '1px solid #373A40',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#5C5F66';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#373A40';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Login
              </Button>
            )}
          </Group>
        </Group>
      </Container>

      {/* Mobile drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        size='xs'
        padding='md'
        position='left'
        title={
          <Text fw={700} size='lg'>
            {brandName}
          </Text>
        }
      >
        <Stack gap='xs'>
          {navigationLinks.map((link, index) => (
            <Anchor
              key={index}
              href={link.href}
              onClick={close}
              underline='never'
              px='md'
              py='sm'
              style={{
                borderRadius: 'var(--mantine-radius-sm)',
                backgroundColor: link.active ? 'var(--mantine-color-default-hover)' : 'transparent',
                color: link.active ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)',
                fontWeight: 500,
                display: 'block',
              }}
            >
              {link.label}
            </Anchor>
          ))}
        </Stack>
      </Drawer>
    </Box>
  );
}
