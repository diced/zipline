import {
  Button,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  Switch,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlarm, IconEye, IconFileInfo, IconKey, IconPhotoDown, IconWorld } from '@tabler/icons-react';
import React, { Dispatch, SetStateAction, useReducer, useState } from 'react';

export type UploadOptionsState = {
  expires: string;
  password: string;
  maxViews: number;
  compression: string;
  zeroWidth: boolean;
  embedded: boolean;
  format: string;
  originalName: boolean;
  overrideDomain: string;
};

const DEFAULT_OD_DESC = 'Override the default domain(s). Type in a URL, e.g https://example.com';

export function OptionsModal({
  opened,
  setOpened,
  state,
  setState,
  reset,
}: {
  opened: boolean;
  setOpened: Dispatch<SetStateAction<boolean>>;
  state: UploadOptionsState;
  setState: Dispatch<SetStateAction<any>>;
  reset: () => void;
}) {
  const [odState, setODState] = useReducer((state, newState) => ({ ...state, ...newState }), {
    description: DEFAULT_OD_DESC,
    error: '',
  });

  const handleOD = (e) => {
    setODState({ error: '' });

    if (e.currentTarget.value === '') {
      setODState({ description: DEFAULT_OD_DESC, error: '' });
      setState({ overrideDomain: '' });
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
      });
      setState({ overrideDomain: url.hostname });
    } catch (e) {
      setODState({ error: 'Invalid URL' });
    }
  };

  return (
    <Modal title={<Title>Upload Options</Title>} size='lg' opened={opened} onClose={() => setOpened(false)}>
      <Stack>
        <NumberInput
          label='Max Views'
          description='The maximum number of times this file can be viewed. Leave blank for unlimited views.'
          value={state.maxViews}
          onChange={(e) => setState({ maxViews: e })}
          min={0}
          icon={<IconEye size='1rem' />}
        />
        <Select
          label='Expires'
          description='The date and time this file will expire. Leave blank for never.'
          value={state.expires}
          onChange={(e) => setState({ expires: e })}
          icon={<IconAlarm size='1rem' />}
          data={[
            { value: 'never', label: 'Never' },
            { value: '5min', label: '5 minutes' },
            { value: '10min', label: '10 minutes' },
            { value: '15min', label: '15 minutes' },
            { value: '30min', label: '30 minutes' },
            { value: '1h', label: '1 hour' },
            { value: '2h', label: '2 hours' },
            { value: '3h', label: '3 hours' },
            { value: '4h', label: '4 hours' },
            { value: '5h', label: '5 hours' },
            { value: '6h', label: '6 hours' },
            { value: '8h', label: '8 hours' },
            { value: '12h', label: '12 hours' },
            { value: '1d', label: '1 day' },
            { value: '3d', label: '3 days' },
            { value: '5d', label: '5 days' },
            { value: '7d', label: '7 days' },
            { value: '1w', label: '1 week' },
            { value: '1.5w', label: '1.5 weeks' },
            { value: '2w', label: '2 weeks' },
            { value: '3w', label: '3 weeks' },
            { value: '1m', label: '1 month' },
            { value: '1.5m', label: '1.5 months' },
            { value: '2m', label: '2 months' },
            { value: '3m', label: '3 months' },
            { value: '6m', label: '6 months' },
            { value: '8m', label: '8 months' },
            { value: '1y', label: '1 year' },
            {
              value: null,
              label: 'Need more freedom? Set an exact date and time through the API.',
              disabled: true,
            },
          ]}
        />
        <Select
          label='Compression'
          description='The compression level to use when uploading this file. Leave blank for default.'
          value={state.compression}
          onChange={(e) => setState({ compression: e })}
          icon={<IconPhotoDown size='1rem' />}
          data={[
            { value: 'none', label: 'None' },
            { value: '25', label: 'Low (25%)' },
            { value: '50', label: 'Medium (50%)' },
            { value: '75', label: 'High (75%)' },
            { value: '100', label: 'Maximum (100%)' },
            {
              value: null,
              label: 'Need more freedom? Set a custom compression level through the API.',
              disabled: true,
            },
          ]}
        />
        <Select
          label='Format'
          description="The file name format to use when uploading this file. Leave blank for the server's default."
          value={state.format}
          onChange={(e) => setState({ format: e })}
          icon={<IconFileInfo size='1rem' />}
          data={[
            { value: 'default', label: 'Default' },
            { value: 'random', label: 'Random' },
            { value: 'name', label: 'Original Name' },
            { value: 'date', label: 'Date (format configured by server)' },
            { value: 'uuid', label: 'UUID' },
            { value: 'gfycat', label: 'Gfycat' },
          ]}
        />
        <PasswordInput
          label='Password'
          description='The password required to view this file. Leave blank for no password.'
          value={state.password}
          onChange={(e) => setState({ password: e.currentTarget.value })}
          icon={<IconKey size='1rem' />}
        />
        <TextInput
          label='Override Domain'
          onChange={handleOD}
          icon={<IconWorld size='1rem' />}
          description={odState.description}
          error={odState.error}
        />
        <Group>
          <Switch
            label='Zero Width'
            description='Whether or not to use zero width characters for the file name.'
            checked={state.zeroWidth}
            onChange={(e) => setState({ zeroWidth: e.currentTarget.checked })}
          />

          <Switch
            label='Embedded'
            description='Whether or not to embed with OG tags for this file.'
            checked={state.embedded}
            onChange={(e) => setState({ embedded: e.currentTarget.checked })}
          />

          <Switch
            label='Keep Original Name'
            description='Whether or not to show the original name when downloading this specific file. This will not change the name format in the URL.'
            checked={state.originalName}
            onChange={(e) => setState({ originalName: e.currentTarget.checked })}
          />
        </Group>
        <Group grow>
          <Button onClick={() => reset()} color='red'>
            Reset Options
          </Button>
          <Button onClick={() => setOpened(false)}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function useUploadOptions(): [UploadOptionsState, Dispatch<SetStateAction<boolean>>, any] {
  const [state, setState] = useReducer((state, newState) => ({ ...state, ...newState }), {
    expires: 'never',
    password: '',
    maxViews: 0,
    compression: 'none',
    zeroWidth: false,
    embedded: false,
    format: 'default',
    originalName: false,
    overrideDomain: '',
  } as UploadOptionsState);

  const [opened, setOpened] = useState(false);

  const reset = () => {
    setState({
      expires: 'never',
      password: '',
      maxViews: 0,
      compression: 'none',
      zeroWidth: false,
      embedded: false,
      format: 'default',
      originalName: false,
      overrideDomain: '',
    });
  };

  return [
    state,
    setOpened,
    <OptionsModal
      state={state}
      setState={setState}
      reset={reset}
      opened={opened}
      setOpened={setOpened}
      key={1}
    />,
  ];
}
