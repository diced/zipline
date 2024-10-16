import { useConfig } from '@/components/ConfigProvider';
import { Response } from '@/lib/api/response';
import { Folder } from '@/lib/db/models/folder';
import { useUploadOptionsStore } from '@/lib/store/uploadOptions';
import {
  Badge,
  Button,
  Combobox,
  Group,
  InputBase,
  Modal,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  useCombobox,
} from '@mantine/core';
import {
  IconAlarmFilled,
  IconArrowsMinimize,
  IconEyeFilled,
  IconFileInfo,
  IconFolderPlus,
  IconGlobe,
  IconKey,
  IconPercentage,
  IconTrashFilled,
  IconWriting,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import ms from 'ms';

export default function UploadOptionsButton({ numFiles }: { numFiles: number }) {
  const config = useConfig();

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

  const { data: folders } = useSWR<Extract<Response['/api/user/folders'], Folder[]>>(
    '/api/user/folders?noincl=true',
  );
  const combobox = useCombobox();
  const [folderSearch, setFolderSearch] = useState('');

  return (
    <>
      <Modal centered opened={opened} onClose={() => setOpen(false)} title={<Title>Upload Options</Title>}>
        <Text size='sm' c='dimmed'>
          These options will be applied to all files you upload and are saved in your browser.
        </Text>

        <Stack gap='xs' my='sm'>
          <Select
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
              { value: '30d', label: '1 month (30 days)' },
              { value: '45.625d', label: '1.5 months (~45 days)' },
              { value: '60d', label: '2 months (60 days)' },
              { value: '90d', label: '3 months (90 days)' },
              { value: '120d', label: '4 months (120 days)' },
              { value: '0.5 year', label: '6 months (0.5 year)' },
              { value: '1y', label: '1 year' },
              {
                value: '_',
                label: 'Need more freedom? Set an exact date and time through the API.',
                disabled: true,
              },
            ]}
            label={
              <>
                Deletes at{' '}
                {options.deletesAt !== 'never' ? (
                  <Badge variant='outline' size='xs'>
                    saved
                  </Badge>
                ) : null}
              </>
            }
            description={
              <>
                The file will automatically delete itself after this time.{' '}
                {config.files.defaultExpiration ? (
                  <>
                    The default expiration time is <b>{ms(config.files.defaultExpiration)}</b> (you can
                    override this with the below option).
                  </>
                ) : (
                  <>
                    {'You can set a default expiration time in the '}
                    <Link href='/dashboard/admin/settings'>settings</Link>
                    {'.'}
                  </>
                )}
              </>
            }
            leftSection={<IconAlarmFilled size='1rem' />}
            value={options.deletesAt}
            onChange={(value) => setOption('deletesAt', value || 'never')}
            comboboxProps={{
              withinPortal: true,
              portalProps: {
                style: {
                  zIndex: 100000000,
                },
              },
            }}
          />

          <Select
            data={[
              { value: 'default', label: `Default (${config.files.defaultFormat})` },
              { value: 'random', label: 'Random' },
              { value: 'date', label: 'Date' },
              { value: 'uuid', label: 'UUID' },
              { value: 'name', label: 'Use file name' },
              { value: 'gfycat', label: 'Gfycat-style name' },
            ]}
            label={
              <>
                Name Format{' '}
                {options.format !== 'default' ? (
                  <Badge variant='outline' size='xs'>
                    saved
                  </Badge>
                ) : null}
              </>
            }
            description='The file name format to use when upload this file, the "File name" field will override this value.'
            leftSection={<IconWriting size='1rem' />}
            value={options.format}
            onChange={(value) => setOption('format', value || ('default' as any))}
            comboboxProps={{
              withinPortal: true,
              portalProps: {
                style: {
                  zIndex: 100000000,
                },
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
            description='The compression level to use on images (only). Leave blank to disable compression.'
            leftSection={<IconPercentage size='1rem' />}
            max={100}
            min={0}
            value={options.imageCompressionPercent || ''}
            onChange={(value) => setOption('imageCompressionPercent', value === '' ? null : Number(value))}
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
            leftSection={<IconEyeFilled size='1rem' />}
            min={0}
            value={options.maxViews || ''}
            onChange={(value) => setOption('maxViews', value === '' ? null : Number(value))}
          />

          <Combobox
            store={combobox}
            withinPortal={false}
            onOptionSubmit={(value) => {
              setFolderSearch(folders?.find((f) => f.id === value)?.name || '');
              setEphemeral('folderId', value === 'no folder' || value === '' ? null : value);
            }}
          >
            <Combobox.Target>
              <InputBase
                label={<>Add to a Folder</>}
                description='Add this file to a folder. Use the "no folder" option not add the file to a folder. This value is not saved to your browser, and is cleared after uploading.'
                rightSection={<Combobox.Chevron />}
                leftSection={<IconFolderPlus size='1rem' />}
                value={folderSearch}
                onChange={(event) => {
                  combobox.openDropdown();
                  combobox.updateSelectedOptionIndex();
                  setFolderSearch(event.currentTarget.value);
                }}
                onClick={() => combobox.openDropdown()}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => {
                  combobox.closeDropdown();
                  setFolderSearch(folderSearch || '');
                }}
                placeholder='Add to folder...'
                rightSectionPointerEvents='none'
              />
            </Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Options>
                {folders
                  ?.filter((f) => f.name.toLowerCase().includes(folderSearch.toLowerCase().trim()))
                  .map((f) => (
                    <Combobox.Option value={f.id} key={f.id}>
                      {f.name}
                    </Combobox.Option>
                  ))}

                <Combobox.Option defaultChecked={true} value='no folder'>
                  No Folder
                </Combobox.Option>
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>

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
            leftSection={<IconGlobe size='1rem' />}
            value={options.overrides_returnDomain ?? ''}
            onChange={(event) =>
              setOption(
                'overrides_returnDomain',
                event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
              )
            }
          />

          <TextInput
            label='Override File Name'
            description='Override the file name with this value. Leave blank to use the "Name Format" option. This value is ignored if you are uploading more than one file. This value is not saved to your browser, and is cleared after uploading.'
            leftSection={<IconFileInfo size='1rem' />}
            value={ephemeral.filename ?? ''}
            onChange={(event) =>
              setEphemeral(
                'filename',
                event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
              )
            }
            disabled={numFiles > 1}
          />

          <PasswordInput
            label='Password'
            description='Set a password for these files. Leave blank to disable password protection. This value is not saved to your browser, and is cleared after uploading.'
            leftSection={<IconKey size='1rem' />}
            value={ephemeral.password ?? ''}
            autoComplete='off'
            onChange={(event) =>
              setEphemeral(
                'password',
                event.currentTarget.value.trim() === '' ? null : event.currentTarget.value.trim(),
              )
            }
          />

          <Text c='dimmed' size='sm'>
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
            description={
              'Add the original file name, so that the file can be downloaded with the original name. This will still use the "Name Format" option for it\'s file name.'
            }
            checked={options.addOriginalName ?? false}
            onChange={(event) => setOption('addOriginalName', event.currentTarget.checked ?? false)}
          />
        </Stack>

        <Group justify='right' my='sm' gap='sm'>
          <Button
            variant='outline'
            color='red'
            leftSection={<IconTrashFilled size='1rem' />}
            onClick={clearSettings}
            disabled={changes() === 0}
          >
            Clear
          </Button>

          <Button
            variant='outline'
            leftSection={<IconArrowsMinimize size='1rem' />}
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </Group>
      </Modal>

      <Button
        variant={changes() !== 0 ? 'light' : 'outline'}
        rightSection={changes() !== 0 ? <Badge variant='outline'>{changes()}</Badge> : null}
        onClick={() => setOpen(true)}
      >
        Options
      </Button>
    </>
  );
}
