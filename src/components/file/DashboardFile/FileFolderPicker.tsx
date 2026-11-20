import FolderComboboxOptions from '@/components/folders/FolderComboboxOptions';
import { useFolders } from '@/lib/client/hooks/useFolders';
import type { File } from '@/lib/db/models/file';
import { buildFolderHierarchy } from '@/lib/folderHierarchy';
import { Box, Button, Combobox, InputBase, Title, type TitleProps, useCombobox } from '@mantine/core';
import { IconFolderMinus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addToFolder, createFolderAndAdd, removeFromFolder } from '../actions';

export default function FileFolderPicker({
  file,
  user,
  mt,
}: {
  file: File;
  user?: string;
  mt?: TitleProps['mt'];
}) {
  const { t } = useTranslation('file');
  const { data: folders } = useFolders(user);

  const folderOptions = useMemo(() => {
    if (!folders) return [];
    return buildFolderHierarchy(folders);
  }, [folders]);

  const folderCombobox = useCombobox();
  const [search, setSearch] = useState('');

  const handleAdd = async (value: string) => {
    if (value === '$create') {
      await createFolderAndAdd(file, search.trim());
    } else {
      await addToFolder(file, value);
    }
  };

  return (
    <Box>
      <Title order={4} mt={mt} mb='xs'>
        {t('details.folder.title')}
      </Title>
      {file.folderId ? (
        <Button
          color='red'
          leftSection={<IconFolderMinus size='1rem' />}
          onClick={() => removeFromFolder(file)}
          fullWidth
        >
          {t('details.folder.remove', {
            name: folders?.find((f) => f.id === file.folderId)?.name ?? '',
          })}
        </Button>
      ) : (
        <Combobox zIndex={90000} store={folderCombobox} onOptionSubmit={(value) => handleAdd(value)}>
          <Combobox.Target>
            <InputBase
              rightSection={<Combobox.Chevron />}
              value={search}
              onChange={(event) => {
                folderCombobox.openDropdown();
                folderCombobox.updateSelectedOptionIndex();
                setSearch(event.currentTarget.value);
              }}
              onClick={() => {
                folderCombobox.openDropdown();
                setSearch('');
              }}
              onFocus={() => {
                folderCombobox.openDropdown();
                setSearch('');
              }}
              onBlur={() => {
                folderCombobox.closeDropdown();
                setSearch('');
              }}
              placeholder={t('details.folder.placeholder')}
              rightSectionPointerEvents='none'
            />
          </Combobox.Target>

          <Combobox.Dropdown>
            {folders?.length === 0 && <Combobox.Empty>{t('details.folder.empty')}</Combobox.Empty>}

            <FolderComboboxOptions
              folderOptions={folderOptions}
              searchValue={search}
              additionalOptions={
                !folders?.some((f) => f.name === search) && search.trim().length > 0 ? (
                  <Combobox.Option value='$create'>
                    {t('details.folder.create', { name: search })}
                  </Combobox.Option>
                ) : null
              }
            />
          </Combobox.Dropdown>
        </Combobox>
      )}
    </Box>
  );
}
