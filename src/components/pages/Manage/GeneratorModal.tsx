import {
  Box,
  Button,
  Checkbox,
  Code,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconFileDownload, IconWorld } from '@tabler/icons-react';
import Link from 'components/Link';
import MutedText from 'components/MutedText';
import { useReducer, useState } from 'react';

const DEFAULT_OD_DESC = 'Override the default domain(s). Type in a URL, e.g https://example.com';

export function GeneratorModal({ opened, onClose, title, onSubmit, ...other }) {
  const form = useForm({
    initialValues: {
      type: 'upload-file',
      format: 'RANDOM',
      imageCompression: 0,
      zeroWidthSpace: false,
      embed: false,
      wlCompatibility: false,
      wlCompositorNotSupported: false,
      noJSON: false,
      originalName: false,
      overrideDomain: null,
    },
  });

  const [isUploadFile, setIsUploadFile] = useState(true);

  const onChangeType = (value) => {
    setIsUploadFile(value === 'upload-file');
    form.setFieldValue('type', value);
  };

  const [odState, setODState] = useReducer((state, newState) => ({ ...state, ...newState }), {
    description: DEFAULT_OD_DESC,
    error: '',
    domain: '',
  });

  const handleOD = (e) => {
    setODState({ error: '' });

    if (e.currentTarget.value === '') {
      setODState({ description: DEFAULT_OD_DESC, error: '', domain: null });
      form.setFieldValue('overrideDomain', null);
      return;
    }

    try {
      const url = new URL(e.currentTarget.value);
      setODState({
        description: (
          <>
            {DEFAULT_OD_DESC}
            <br />
            <br />
            Using domain &quot;<b>{url.hostname}</b>&quot;
          </>
        ),
        error: '',
        domain: url.hostname,
      });
      form.setFieldValue('overrideDomain', url.hostname);
    } catch (e) {
      setODState({ error: 'Invalid URL', domain: '' });
      form.setFieldValue('overrideDomain', null);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={<Title order={3}>{title}</Title>} size='lg'>
      {other.desc && (
        <MutedText size='md' mb='md'>
          {other.desc}
        </MutedText>
      )}
      <form onSubmit={form.onSubmit((values) => onSubmit(values))}>
        <Select
          label='Type'
          data={[
            { value: 'upload-file', label: 'Upload file' },
            { value: 'shorten-url', label: 'Shorten URLs' },
          ]}
          id='type'
          my='sm'
          {...form.getInputProps('type')}
          onChange={onChangeType}
        />

        <Select
          label='Select file name format'
          data={[
            { value: 'RANDOM', label: 'Random (alphanumeric)' },
            { value: 'DATE', label: 'Date' },
            { value: 'UUID', label: 'UUID' },
            { value: 'NAME', label: 'Name (keeps original file name)' },
          ]}
          id='format'
          my='sm'
          disabled={!isUploadFile}
          {...form.getInputProps('format')}
        />

        <NumberInput
          label='Image Compression'
          description='Set the image compression level (0-100). 0 is no compression, 100 is maximum compression.'
          max={100}
          min={0}
          my='sm'
          id='imageCompression'
          disabled={!isUploadFile}
          {...form.getInputProps('imageCompression')}
        />

        <TextInput
          label='Override Domain'
          onChange={handleOD}
          icon={<IconWorld size='1rem' />}
          description={odState.description}
          error={odState.error}
        />

        <Stack my='md'>
          <Switch
            label='Zero Width Space'
            description='Use zero width spaces as the file name'
            id='zeroWidthSpace'
            {...form.getInputProps('zeroWidthSpace', { type: 'checkbox' })}
          />
          <Switch
            description='Return response as plain text instead of JSON'
            label='No JSON'
            id='noJSON'
            {...form.getInputProps('noJSON', { type: 'checkbox' })}
          />
          <Switch
            description='Image will display with embedded metadata'
            label='Embed'
            id='embed'
            disabled={!isUploadFile}
            {...form.getInputProps('embed', { type: 'checkbox' })}
          />
          <Switch
            description='Whether or not to show the original name when downloading this specific file. This will not change the name format in the URL.'
            label='Original Name'
            id='originalName'
            disabled={!isUploadFile}
            {...form.getInputProps('originalName', { type: 'checkbox' })}
          />
        </Stack>

        {title === 'Flameshot' && (
          <>
            <Box my='md'>
              <Text>Wayland</Text>
              <MutedText size='sm'>
                If using wayland, you can check the boxes below to your liking. This will require{' '}
                <Link href='https://github.com/bugaevc/wl-clipboard'>
                  <Code>wl-clipboard</Code>
                </Link>{' '}
                for the <Code>wl-copy</Code> command.
              </MutedText>
            </Box>

            <Group my='md'>
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
                disabled={!isUploadFile}
                id='wlCompositorNotSupported'
                {...form.getInputProps('wlCompositorNotSupported', { type: 'checkbox' })}
              />
            </Group>
          </>
        )}

        <Group grow my='md'>
          <Button onClick={form.reset}>Reset</Button>

          <Button rightIcon={<IconFileDownload size='1rem' />} type='submit'>
            Download
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
