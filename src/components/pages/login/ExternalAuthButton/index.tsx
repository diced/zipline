import { darken } from '@/lib/theme/color';
import { Button, useMantineTheme } from '@mantine/core';
import Link from 'next/link';

import styles from './index.module.css';

export default function ExternalAuthButton({
  provider,
  alpha,
  leftSection,
}: {
  provider: string;
  alpha: number;
  leftSection: JSX.Element;
}) {
  const theme = useMantineTheme();
  const colorHover = darken(`${provider.toLowerCase()}.0`, alpha, theme);

  return (
    <Button
      size='md'
      fullWidth
      color={`${provider.toLowerCase()}.0`}
      component={Link}
      href={`/api/auth/oauth/${provider.toLowerCase()}`}
      leftSection={leftSection}
      style={{
        '--z-bp-hover': colorHover,
      }}
      className={styles.button}
    >
      Sign in with {provider}
    </Button>
  );
}
