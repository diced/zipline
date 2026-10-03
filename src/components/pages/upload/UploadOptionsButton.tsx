import { useConfig } from '@/components/ConfigProvider';
import DomainSelect from '@/components/DomainSelect';
import FolderComboboxOptions from '@/components/folders/FolderComboboxOptions';
import { Response } from '@/lib/api/response';
import { buildFolderHierarchy } from '@/lib/folderHierarchy';
import { useFolders } from '@/lib/client/hooks/useFolders';
import { useUploadOptionsStore } from '@/lib/client/store/uploadOptions';
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
  useCombobox,
} from '@mantine/core';
import {
  IconAlarmFilled,
  IconArrowsMinimize,
  IconEyeFilled,
  IconFileInfo,
  IconFolderPlus,
  IconKey,
  IconPercentage,
  IconSettings,
  IconTrashFilled,
  IconWriting,
} from '@tabler/icons-react';

import ms from 'ms';
import { useEffect, useMemo, useState } from 'react';
import i18n from '@/lib/i18n';
import { useTranslation } from 'react-i18next';
import SafeTrans from '@/components/SafeTrans';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { useShallow } from 'zustand/shallow';

export default function UploadOptionsButton({ folder, numFiles }: { folder?: string; numFiles: number }) {
  const { t } = useTranslation(['upload', 'common']);
  const config = useConfig();

  const [opened, setOpen] = useState(false);
  const [options, ephemeral, setOption, setEphemeral, changes, clearEphemeral, clearOptions] =
    useUploadOptionsStore(
      useShallow((state) => [
        state.options,
        state.ephemeral,
        state.setOption,
        state.setEphemeral,
        state.changes,
        state.clearEphemeral,
        state.clearOptions,
      ]),
    );

  const clearSettings = () => {
    clearEphemeral();
    clearOptions();
    setFolderSearch('');
  };

  const { data: folders } = useFolders();
  const { data: settingsData } = useSWR<Response['/api/server/public']>('/api/server/public');

  const combobox = useCombobox();
  const [folderSearch, setFolderSearch] = useState('');

  const folderOptions = useMemo(() => {
    if (!folders) return [];
    return buildFolderHierarchy(folders);
  }, [folders]);

  const expirations = useMemo(() => {
    const opts = [
      {
        value: 'default',
        label: t('options.default', { value: config.files.defaultExpiration ?? t('options.never') }),
      },
      { value: 'never', label: t('options.expirations.never') },
      { value: '5min', label: t('options.expirations.minutes5') },
      { value: '10min', label: t('options.expirations.minutes10') },
      { value: '15min', label: t('options.expirations.minutes15') },
      { value: '30min', label: t('options.expirations.minutes30') },
      { value: '1h', label: t('options.expirations.hour1') },
      { value: '2h', label: t('options.expirations.hours2') },
      { value: '3h', label: t('options.expirations.hours3') },
      { value: '4h', label: t('options.expirations.hours4') },
      { value: '5h', label: t('options.expirations.hours5') },
      { value: '6h', label: t('options.expirations.hours6') },
      { value: '8h', label: t('options.expirations.hours8') },
      { value: '12h', label: t('options.expirations.hours12') },
      { value: '1d', label: t('options.expirations.day1') },
      { value: '3d', label: t('options.expirations.days3') },
      { value: '5d', label: t('options.expirations.days5') },
      { value: '7d', label: t('options.expirations.days7') },
      { value: '1w', label: t('options.expirations.week1') },
      { value: '1.5w', label: t('options.expirations.weeksOneAndHalf') },
      { value: '2w', label: t('options.expirations.weeks2') },
      { value: '3w', label: t('options.expirations.weeks3') },
      { value: '30d', label: t('options.expirations.month1') },
      { value: '45.625d', label: t('options.expirations.monthsOneAndHalf') },
      { value: '60d', label: t('options.expirations.months2') },
      { value: '90d', label: t('options.expirations.months3') },
      { value: '120d', label: t('options.expirations.months4') },
      { value: '0.5 year', label: t('options.expirations.months6') },
      { value: '1y', label: t('options.expirations.year1') },
      {
        value: '_',
        label: t('options.expirations.custom'),
        disabled: true,
      },
    ];

    try {
      const maxExp = settingsData?.files?.maxExpiration ?? null;
      if (!maxExp) return opts;

      const maxMs = ms(String(maxExp) as any);
      if (!maxMs || isNaN(Number(maxMs))) return opts;

      return opts.filter((o) => {
        if (o.value === 'never') return false;
        if (o.value === 'default' || o.value === '_') return true;
        const val = String(o.value);
        const parsed = (ms as unknown as (v: string) => number)(val);

        if (!parsed || isNaN(Number(parsed))) return true;
        return parsed <= Number(maxMs);
      });
    } catch {
      return opts;
    }
  }, [settingsData, config.files.defaultExpiration, t]);

  useEffect(() => {
    if (folder) return;

    // Set initial value
    if (ephemeral.folderId === null) {
      setFolderSearch(i18n.t('upload:options.folder.root'));
    }

    useUploadOptionsStore.subscribe(
      (state) => state.ephemeral,
      (current) => (current.folderId === null ? setFolderSearch(i18n.t('upload:options.folder.root')) : null),
    );
  }, []);

  return (
    <>
      <Modal centered opened={opened} onClose={() => setOpen(false)} title={t('options.title')}>
        <Text size='sm' c='dimmed'>
          {t('options.description')}
        </Text>

        <Stack gap='xs' my='sm'>
          <Select
            data={expirations}
            label={
              <>
                {t('options.deletesAt.label')}{' '}
                {options.deletesAt !== 'default' ? (
                  <Badge variant='outline' size='xs'>
                    {t('options.saved')}
                  </Badge>
                ) : null}
              </>
            }
            description={
              <>
                {t('options.deletesAt.description')}{' '}
                {config.files.defaultExpiration ? (
                  <SafeTrans
                    t={t}
                    i18nKey='options.deletesAt.defaultExpiration'
                    values={{ value: config.files.defaultExpiration }}
                    components={{ b: <b /> }}
                  />
                ) : (
                  <SafeTrans
                    t={t}
                    i18nKey='options.deletesAt.setDefault'
                    components={{ anchor: <Link to='/dashboard/admin/settings' /> }}
                  />
                )}
                {settingsData?.files?.maxExpiration ? (
                  <div style={{ marginTop: 6, color: 'var(--mantine-color-dimmed)' }}>
                    <SafeTrans
                      t={t}
                      i18nKey='options.deletesAt.maxExpiration'
                      values={{ value: settingsData.files.maxExpiration }}
                      components={{ b: <b /> }}
                    />
                  </div>
                ) : null}
              </>
            }
            leftSection={<IconAlarmFilled size='1rem' />}
            value={options.deletesAt}
            onChange={(value) => setOption('deletesAt', value || 'default')}
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
              { value: 'default', label: t('options.default', { value: config.files.defaultFormat }) },
              { value: 'random', label: t('options.format.random') },
              { value: 'date', label: t('options.format.date') },
              { value: 'uuid', label: 'UUID' },
              { value: 'name', label: t('options.format.name') },
              { value: 'gfycat', label: t('options.format.gfycat') },
            ]}
            label={
              <>
                {t('options.format.label')}{' '}
                {options.format !== 'default' ? (
                  <Badge variant='outline' size='xs'>
                    {t('options.saved')}
                  </Badge>
                ) : null}
              </>
            }
            description={t('options.format.description')}
            leftSection={<IconWriting size='1rem' />}
            value={options.format}
            onChange={(value) => setOption('format', (value as any) || 'default')}
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
              {
                value: 'default',
                label: t('options.default', { value: `.${config.files.defaultCompressionFormat ?? 'jpg'}` }),
              },
              { value: 'jpg', label: '.jpg' },
              { value: 'png', label: '.png' },
              { value: 'webp', label: '.webp' },
              { value: 'jxl', label: '.jxl' },
            ]}
            label={
              <>
                {t('options.compressionFormat.label')}{' '}
                {options.imageCompressionFormat !== 'default' ? (
                  <Badge variant='outline' size='xs'>
                    {t('options.saved')}
                  </Badge>
                ) : null}
              </>
            }
            description={
              <SafeTrans t={t} i18nKey='options.compressionFormat.description' components={{ b: <b /> }} />
            }
            leftSection={<IconFileInfo size='1rem' />}
            value={options.imageCompressionFormat || 'default'}
            onChange={(value) => setOption('imageCompressionFormat', (value as any) || 'default')}
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
                {t('options.compression.label')}{' '}
                {options.imageCompressionPercent ? (
                  <Badge variant='outline' size='xs'>
                    {t('options.saved')}
                  </Badge>
                ) : null}
              </>
            }
            description={t('options.compression.description')}
            leftSection={<IconPercentage size='1rem' />}
            max={100}
            min={0}
            value={options.imageCompressionPercent || ''}
            onChange={(value) => setOption('imageCompressionPercent', value === '' ? null : Number(value))}
          />

          <NumberInput
            label={
              <>
                {t('options.maxViews.label')}{' '}
                {options.maxViews ? (
                  <Badge variant='outline' size='xs'>
                    {t('options.saved')}
                  </Badge>
                ) : null}
              </>
            }
            description={t('options.maxViews.description')}
            leftSection={<IconEyeFilled size='1rem' />}
            min={0}
            value={options.maxViews || ''}
            onChange={(value) => setOption('maxViews', value === '' ? null : Number(value))}
          />

          <Combobox
            store={combobox}
            withinPortal={false}
            onOptionSubmit={(value) => {
              if (value === '__root__') {
                setFolderSearch(i18n.t('upload:options.folder.root'));
                setEphemeral('folderId', null);
              } else {
                const selected = folderOptions.find((f) => f.id === value);
                setFolderSearch(selected?.path || '');
                setEphemeral('folderId', value);
              }
              combobox.closeDropdown();
            }}
            disabled={!!folder}
          >
            <Combobox.Target>
              <InputBase
                label={t('options.folder.label')}
                description={t('options.folder.description')}
                rightSection={<Combobox.Chevron />}
                leftSection={<IconFolderPlus size='1rem' />}
                value={folderSearch}
                onChange={(event) => {
                  combobox.openDropdown();
                  combobox.updateSelectedOptionIndex();
                  setFolderSearch(event.currentTarget.value);
                }}
                onClick={() => {
                  combobox.openDropdown();
                  setFolderSearch('');
                }}
                onFocus={() => {
                  combobox.openDropdown();
                  setFolderSearch('');
                }}
                onBlur={() => {
                  combobox.closeDropdown();
                  // Restore the selected folder path when closing
                  if (ephemeral.folderId === null) {
                    setFolderSearch(i18n.t('upload:options.folder.root'));
                  } else {
                    const selectedFolder = folderOptions.find((f) => f.id === ephemeral.folderId);
                    setFolderSearch(selectedFolder?.path || '');
                  }
                }}
                placeholder={t('options.folder.placeholder')}
                rightSectionPointerEvents='none'
              />
            </Combobox.Target>

            <Combobox.Dropdown>
              <FolderComboboxOptions
                folderOptions={folderOptions}
                searchValue={folderSearch}
                additionalOptions={
                  <Combobox.Option value='__root__'>{t('options.folder.root')}</Combobox.Option>
                }
              />
            </Combobox.Dropdown>
          </Combobox>

          <DomainSelect
            label={
              <>
                {t('options.domain.label')}{' '}
                {options.overrides_returnDomain ? (
                  <Badge variant='outline' size='xs'>
                    {t('options.saved')}
                  </Badge>
                ) : null}
              </>
            }
            value={options.overrides_returnDomain ?? ''}
            onChange={(value) => setOption('overrides_returnDomain', (value as string) || null)}
            comboboxProps={{
              withinPortal: true,
              portalProps: {
                style: {
                  zIndex: 100000000,
                },
              },
            }}
          />

          <TextInput
            label={t('options.filename.label')}
            description={t('options.filename.description')}
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
            label={t('options.password.label')}
            description={t('options.password.description')}
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
            <b>{t('options.other')}</b>
          </Text>

          <Switch
            label={
              <>
                {t('options.originalName.label')}{' '}
                {options.addOriginalName ? (
                  <Badge variant='outline' size='xs'>
                    {t('options.saved')}
                  </Badge>
                ) : null}
              </>
            }
            description={t('options.originalName.description')}
            checked={options.addOriginalName ?? false}
            onChange={(event) => setOption('addOriginalName', event.currentTarget.checked ?? false)}
          />

          {config.files.extensionlessUrls ? (
            <Switch
              label={
                <>
                  {t('options.extensionless.label')}{' '}
                  {options.extensionless ? (
                    <Badge variant='outline' size='xs'>
                      {t('options.saved')}
                    </Badge>
                  ) : null}
                </>
              }
              description={t('options.extensionless.description')}
              checked={options.extensionless ?? false}
              onChange={(event) => setOption('extensionless', event.currentTarget.checked ?? false)}
              disabled={!config.files.extensionlessUrls}
            />
          ) : null}
        </Stack>

        <Group justify='right' my='sm' gap='sm'>
          <Button
            variant='outline'
            color='red'
            leftSection={<IconTrashFilled size='1rem' />}
            onClick={clearSettings}
            disabled={changes() === 0}
          >
            {t('options.clear')}
          </Button>

          <Button
            variant='outline'
            leftSection={<IconArrowsMinimize size='1rem' />}
            onClick={() => setOpen(false)}
          >
            {t('common:actions.close')}
          </Button>
        </Group>
      </Modal>

      <Button
        variant={changes() !== 0 ? 'light' : 'outline'}
        rightSection={changes() !== 0 ? <Badge variant='outline'>{changes()}</Badge> : null}
        onClick={() => setOpen(true)}
        leftSection={<IconSettings size='1rem' />}
      >
        {t('options.button')}
      </Button>
    </>
  );
}
