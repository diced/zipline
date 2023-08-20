import { Anchor, Code, Group, Paper, Text, Title } from '@mantine/core';
import { IconPrompt } from '@tabler/icons-react';
import Image from 'next/image';
import GeneratorButton from '../generators/GeneratorButton';
import Link from 'next/link';

export default function SettingsGenerators() {
  return (
    <Paper withBorder p='sm'>
      <Title order={2}>Generate Uploaders</Title>
      <Text size='sm' color='dimmed' mt={3}>
        Generate scripts for upload tools. The Flameshot and Shell Script generators are supported on only
        Linux and macOS.
      </Text>

      <Group mt='xs'>
        <GeneratorButton
          name='ShareX'
          icon={
            <Image width={24} height={24} alt='sharex logo' src='https://getsharex.com/img/ShareX_Logo.svg' />
          }
        />
        <GeneratorButton
          name='Flameshot'
          icon={
            <Image
              width={24}
              height={24}
              alt='flameshot logo'
              src='https://flameshot.org/flameshot-icon.svg'
            />
          }
          desc={
            <>
              To use this script, you need{' '}
              <Anchor component={Link} href='https://flameshot.org'>
                Flameshot
              </Anchor>
              ,{' '}
              <Anchor component={Link} href='https://curl.se/'>
                <Code>curl</Code>
              </Anchor>
              ,{' '}
              <Anchor component={Link} href='https://github.com/stedolan/jq'>
                <Code>jq</Code>
              </Anchor>
              , and{' '}
              <Anchor component={Link} href='https://github.com/astrand/xclip'>
                <Code>xclip</Code> (linux only)
              </Anchor>{' '}
              installed. This script is intended for use on Linux and macOS only (see options below).
            </>
          }
        />
        <GeneratorButton
          name='Shell Script'
          icon={<IconPrompt size={24} />}
          desc={
            <>
              To use this script, you need <Code>bash</Code>,{' '}
              <Anchor component={Link} href='https://curl.se/'>
                <Code>curl</Code>
              </Anchor>
              ,{' '}
              <Anchor component={Link} href='https://github.com/stedolan/jq'>
                <Code>jq</Code>
              </Anchor>
              , and{' '}
              <Anchor component={Link} href='https://github.com/astrand/xclip'>
                <Code>xclip</Code> (linux only)
              </Anchor>{' '}
              installed. This script is intended for use on Linux and macOS only (see options below).
            </>
          }
        />
      </Group>
    </Paper>
  );
}
