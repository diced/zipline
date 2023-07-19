import { defaultUploadOptions, useUploadOptionsStore } from '@/lib/store/uploadOptions';
import {
  Badge,
  Button,
  Center,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconAlarmFilled,
  IconArrowsMinimize,
  IconDeviceFloppy,
  IconEyeFilled,
  IconFileInfo,
  IconGlobe,
  IconKey,
  IconPercentage,
  IconTrashFilled,
  IconWriting,
} from '@tabler/icons-react';
import { useState } from 'react';

export default function UploadOptionsButton({ numFiles }: { numFiles: number }) {
  const [opened, setOpen] = useState(false);
  const [options, ephemeral, setOption, setEphemeral, changes] = useUploadOptionsStore((state) => [
    state.options,
    state.ephemeral,
    state.setOption,
    state.setEphemeral,
    state.changes,
  ]);

  const [clearEphemeral, clearOptions] = useUploadOptionsStore((state) => [
    state.clearEphemeral,
    state.clearOptions,
  ]);

  const clearSettings = () => {
    clearEphemeral();
    clearOptions();
  };

  return (
    <>
      <Modal centered opened={opened} onClose={() => setOpen(false)} title={<Title>Upload Options</Title>}>
        <Text size='sm' color='dimmed'>
          These options will be applied to all files you upload and are saved in your browser.
        </Text>

        <Stack spacing='xs' my='sm'>
          <Select
            data={[
              { value: null as unknown as string, label: 'Never' },
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
              { value: '30d', label: '1 month (30 days)' },
              { value: '45.625d', label: '1.5 months (~45 days)' },
              { value: '60d', label: '2 months (60 days)' },
              { value: '90d', label: '3 months (90 days)' },
              { value: '120d', label: '4 months (120 days)' },
              { value: '0.5 year', label: '6 months (0.5 year)' },
              { value: '1y', label: '1 year' },
              {
                value: null as unknown as string,
                label: 'Need more freedom? Set an exact date and time through the API.',
                disabled: true,
              },
            ]}
            label={
              <>
                Deletes at{' '}
                {options.deletesAt ? (
                  <Badge variant='outline' size='xs'>
                    saved
                  </Badge>
                ) : null}
              </>
            }
            description='The file will automatically delete itself after this time.'
            icon={<IconAlarmFilled size='1rem' />}
            value={options.deletesAt}
            onChange={(value) => setOption('deletesAt', value)}
            withinPortal
            portalProps={{
              style: {
                zIndex: 100000000,
              },
            }}
          />

          <Select
            data={[
              { value: null as unknown as string, label: 'Default' },
              { value: 'random', label: 'Random' },
              { value: 'date', label: 'Date' },
              { value: 'uuid', label: 'UUID' },
              { value: 'name', label: 'Use file name' },
              { value: 'gfycat', label: 'Gfycat-style name' },
            ]}
            label={
              <>
                Name Format{' '}
                {options.format ? (
                  <Badge variant='outline' size='xs'>
                    saved
                  </Badge>
                ) : null}
              </>
            }
            description='The file name format to use when upload this file, the "File name" field will override this value.'
            icon={<IconWriting size='1rem' />}
            value={options.format}
            onChange={(value) => setOption('format', value as any)}
            withinPortal
            portalProps={{
              style: {
                zIndex: 100000000,
              },
            }}
          />

          <NumberInput
            label={
              <>
                Compression{' '}
                {options.imageCompressionPercent ? (
                  <Badge variant='outline' size='xs'>
                    saved
                  </Badge>
                ) : null}
              </>
            }
            description='The compression level to use on image (only). Leave blank to disable compression.'
            icon={<IconPercentage size='1rem' />}
            max={100}
            min={0}
            value={options.imageCompressionPercent || ''}
            onChange={(value) => setOption('imageCompressionPercent', value === '' ? null : value)}
          />

          <NumberInput
            label={
              <>
                Max Views{' '}
                {options.maxViews ? (
                  <Badge variant='outline' size='xs'>
                    saved
                  </Badge>
                ) : null}
              </>
            }
            description='The maximum number of views the files can have before they are deleted. Leave blank to allow as many views as you want.'
            icon={<IconEyeFilled size='1rem' />}
            min={0}
            value={options.maxViews || ''}
            onChange={(value) => setOption('maxViews', value === '' ? null : value)}
          />

          <TextInput
            label={
              <>
                Override Domain{' '}
                {options.overrides_returnDomain ? (
                  <Badge variant='outline' size='xs'>
                    saved
                  </Badge>
                ) : null}
              </>
            }
            description='Override the domain with this value. This will change the domain returned in your uploads. Leave blank to use the default domain.'
            icon={<IconGlobe size='1rem' />}
            value={options.overrides_returnDomain ?? ''}
            onChange={(event) =>
              setOption(
                'overrides_returnDomain',
                event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim()
              )
            }
          />

          <TextInput
            label='Override File Name'
            description='Override the file name with this value. Leave blank to use the "Name Format" option. This value is ignored if you are uploading more than one file. This value is not saved to your browser, and is cleared after uploading.'
            icon={<IconFileInfo size='1rem' />}
            value={ephemeral.filename ?? ''}
            onChange={(event) =>
              setEphemeral(
                'filename',
                event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim()
              )
            }
            disabled={numFiles > 1}
          />

          <PasswordInput
            label='Password'
            description='Set a password for these files. Leave blank to disable password protection. This value is not saved to your browser, and is cleared after uploading.'
            icon={<IconKey size='1rem' />}
            value={ephemeral.password ?? ''}
            onChange={(event) =>
              setEphemeral(
                'password',
                event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim()
              )
            }
          />

          <Text color='dimmed' size='sm'>
            <b>Other Options</b>
          </Text>

          <Switch
            label={
              <>
                Add Original Name{' '}
                {options.addOriginalName ? (
                  <Badge variant='outline' size='xs'>
                    saved
                  </Badge>
                ) : null}
              </>
            }
            description={`Add the original file name, so that the file can be downloaded with the original name. This will still use the "Name Format" option for it's file name.`}
            checked={options.addOriginalName ?? false}
            onChange={(event) => setOption('addOriginalName', event.currentTarget.checked ?? false)}
          />
        </Stack>

        <Group position='right' my='sm' spacing='sm'>
          <Button
            variant='outline'
            color='red'
            leftIcon={<IconTrashFilled size='1rem' />}
            onClick={clearSettings}
            disabled={changes() === 0}
          >
            Clear
          </Button>

          <Button
            variant='outline'
            color='gray'
            leftIcon={<IconArrowsMinimize size='1rem' />}
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </Group>
      </Modal>

      <Button
        variant={changes() !== 0 ? 'filled' : 'outline'}
        rightIcon={
          changes() !== 0 ? (
            <Badge variant='outline' color='gray'>
              {changes()}
            </Badge>
          ) : null
        }
        onClick={() => setOpen(true)}
        color='gray'
      >
        Options
      </Button>
    </>
  );
}
