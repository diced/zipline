import {
  Button,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Title,
} from '@mantine/core';
import { ClockIcon, ImageIcon, KeyIcon, TypeIcon, UserIcon } from 'components/icons';
import React, { Dispatch, SetStateAction, useState } from 'react';

export default function useUploadOptions(): [
  {
    expires: string;
    password: string;
    maxViews: number;
    compression: string;
    zeroWidth: boolean;
    embedded: boolean;
    format: string;
  },
  Dispatch<SetStateAction<boolean>>,
  React.FC
] {
  const [expires, setExpires] = useState('never');
  const [password, setPassword] = useState('');
  const [maxViews, setMaxViews] = useState(0);
  const [compression, setCompression] = useState<string>('none');
  const [zeroWidth, setZeroWidth] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const [format, setFormat] = useState('default');

  const [opened, setOpened] = useState(false);

  const reset = () => {
    setExpires('never');
    setPassword('');
    setMaxViews(0);
    setCompression('none');
    setZeroWidth(false);
    setEmbedded(false);
    setFormat('default');
  };

  const OptionsModal: React.FC = () => (
    <Modal title={<Title>Upload Options</Title>} size='auto' opened={opened} onClose={() => setOpened(false)}>
      <Stack>
        <NumberInput
          label='Max Views'
          description='The maximum number of times this file can be viewed. Leave blank for unlimited views.'
          value={maxViews}
          onChange={setMaxViews}
          min={0}
          icon={<UserIcon />}
        />

        <Select
          label='Expires'
          description='The date and time this file will expire. Leave blank for never.'
          value={expires}
          onChange={(e) => setExpires(e)}
          icon={<ClockIcon size={14} />}
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
          ]}
        />

        <Select
          label='Compression'
          description='The compression level to use when uploading this file. Leave blank for default.'
          value={compression}
          onChange={(e) => setCompression(e)}
          icon={<ImageIcon />}
          data={[
            { value: 'none', label: 'None' },
            { value: '25', label: 'Low (25%)' },
            { value: '50', label: 'Medium (50%)' },
            { value: '75', label: 'High (75%)' },
          ]}
        />

        <Select
          label='Format'
          description="The file name format to use when uploading this file. Leave blank for the server's default."
          value={format}
          onChange={(e) => setFormat(e)}
          icon={<TypeIcon />}
          data={[
            { value: 'default', label: 'Default' },
            { value: 'RANDOM', label: 'Random' },
            { value: 'NAME', label: 'Original Name' },
            { value: 'DATE', label: 'Date (format configured by server)' },
            { value: 'UUID', label: 'UUID' },
          ]}
        />

        <PasswordInput
          label='Password'
          description='The password required to view this file. Leave blank for no password.'
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          icon={<KeyIcon />}
        />

        <Group>
          <Switch
            label='Zero Width'
            description='Whether or not to use zero width characters for the file name.'
            checked={zeroWidth}
            onChange={(e) => setZeroWidth(e.currentTarget.checked)}
          />

          <Switch
            label='Embedded'
            description='Whether or not to embed with OG tags for this file.'
            checked={embedded}
            onChange={(e) => setEmbedded(e.currentTarget.checked)}
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

  return [
    {
      expires,
      password,
      maxViews,
      compression,
      zeroWidth,
      embedded,
      format,
    },
    setOpened,
    OptionsModal,
  ];
}
