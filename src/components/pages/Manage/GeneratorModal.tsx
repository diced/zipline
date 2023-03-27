import { Box, Button, Checkbox, Code, Group, Modal, NumberInput, Select, Text, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { DownloadIcon } from 'components/icons';
import Link from 'components/Link';
import MutedText from 'components/MutedText';

export function GeneratorModal({ opened, onClose, title, onSubmit, ...other }) {
  const form = useForm({
    initialValues: {
      format: 'RANDOM',
      imageCompression: 0,
      zeroWidthSpace: false,
      embed: false,
      wlCompatibility: false,
      wlCompositorNotSupported: false,
    },
  });

  return (
    <Modal opened={opened} onClose={onClose} title={<Title order={3}>{title}</Title>} size='lg'>
      {other.desc && (
        <MutedText size='md' mb='md'>
          {other.desc}
        </MutedText>
      )}
      <form onSubmit={form.onSubmit((values) => onSubmit(values))}>
        <Select
          label='Select file name format'
          data={[
            { value: 'RANDOM', label: 'Random (alphanumeric)' },
            { value: 'DATE', label: 'Date' },
            { value: 'UUID', label: 'UUID' },
            { value: 'NAME', label: 'Name (keeps original file name)' },
          ]}
          id='format'
          {...form.getInputProps('format')}
        />

        <NumberInput
          label={"Image Compression (leave at 0 if you don't want to compress)"}
          max={100}
          min={0}
          mt='md'
          id='imageCompression'
          {...form.getInputProps('imageCompression')}
        />

        <Group grow mt='md'>
          <Checkbox
            label='Zero Width Space'
            id='zeroWidthSpace'
            {...form.getInputProps('zeroWidthSpace', { type: 'checkbox' })}
          />
          <Checkbox label='Embed' id='embed' {...form.getInputProps('embed', { type: 'checkbox' })} />
        </Group>

        {title === 'Flameshot' && (
          <>
            <Box mt='md'>
              <Text>Wayland</Text>
              <MutedText size='sm'>
                If using wayland, you can check the boxes below to your liking. This will require{' '}
                <Link href='https://github.com/bugaevc/wl-clipboard'>
                  <Code>wl-clipboard</Code>
                </Link>{' '}
                for the <Code>wl-copy</Code> command.
              </MutedText>
            </Box>

            <Group mt='md'>
              <Checkbox
                label='Enable Wayland Compatibility'
                description={
                  <>
                    Use <Code>wl-copy</Code> instead of <Code>xsel -ib</Code>
                  </>
                }
                id='wlCompatibility'
                {...form.getInputProps('wlCompatibility', { type: 'checkbox' })}
              />

              <Checkbox
                label={
                  <>
                    Using a DE/compositor that <b>isn&apos;t</b> GNOME, KDE or Sway
                  </>
                }
                description={
                  <>
                    If using a compositor such as{' '}
                    <Link href='https://github.com/hyprwm/hyprland'>Hyprland</Link>, this option will set the{' '}
                    <Code>XDG_CURRENT_DESKTOP=sway</Code> to workaround Flameshot&apos;s errors
                  </>
                }
                id='wlCompositorNotSupported'
                {...form.getInputProps('wlCompositorNotSupported', { type: 'checkbox' })}
              />
            </Group>
          </>
        )}

        <Group grow>
          <Button mt='md' onClick={form.reset}>
            Reset
          </Button>

          <Button mt='md' rightIcon={<DownloadIcon />} type='submit'>
            Download
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
