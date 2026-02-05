import { FolderHierarchyItem } from '@/lib/folderHierarchy';
import { Combobox, Text } from '@mantine/core';

interface FolderComboboxOptionsProps {
  folderOptions: FolderHierarchyItem[];
  searchValue: string;
  additionalOptions?: React.ReactNode;
}

/**
 * Renders folder options in a Combobox dropdown with proper indentation and tree symbols.
 * Filters folders by search value (case-insensitive path match).
 */
export default function FolderComboboxOptions({
  folderOptions,
  searchValue,
  additionalOptions,
}: FolderComboboxOptionsProps) {
  return (
    <Combobox.Options>
      {additionalOptions}
      {folderOptions
        .filter((f) => f.path.toLowerCase().includes(searchValue.toLowerCase().trim()))
        .map((f) => (
          <Combobox.Option value={f.id} key={f.id}>
            <Text size='sm' style={{ paddingLeft: f.depth * 12 }}>
              {f.depth > 0 ? '└ ' : ''}
              {f.name}
            </Text>
          </Combobox.Option>
        ))}
    </Combobox.Options>
  );
}
