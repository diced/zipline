import TagPill from '@/components/pages/files/tags/TagPill';
import { Response } from '@/lib/api/response';
import { Tag } from '@/lib/db/models/tag';
import {
  Button,
  Checkbox,
  Combobox,
  Group,
  Input,
  Modal,
  Pill,
  PillsInput,
  Stack,
  Text,
  useCombobox,
} from '@mantine/core';
import { useState } from 'react';
import useSWR from 'swr';

interface TagSelectModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (tagIds: string[]) => void;
  title?: string;
  confirmText?: string;
  selectedCount?: number;
}

export default function TagSelectModal({
  opened,
  onClose,
  onConfirm,
  title = 'Add Tags',
  confirmText = 'Add Tags',
  selectedCount = 0,
}: TagSelectModalProps) {
  const { data: tags } = useSWR<Extract<Response['/api/user/tags'], Tag[]>>('/api/user/tags');

  const combobox = useCombobox();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleTagSelect = (tagId: string) => {
    setSelectedTags((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags((current) => current.filter((id) => id !== tagId));
  };

  const handleConfirm = () => {
    onConfirm(selectedTags);
    setSelectedTags([]);
    onClose();
  };

  const handleClose = () => {
    setSelectedTags([]);
    onClose();
  };

  const values = selectedTags.map((tagId) => {
    const tag = tags?.find((t) => t.id === tagId);
    return tag ? (
      <TagPill key={tagId} tag={tag} withRemoveButton onRemove={() => handleRemoveTag(tagId)} />
    ) : null;
  });

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={title}
      size='lg'
      styles={{
        body: {
          minHeight: '300px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
        },
        content: {
          maxHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {' '}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '300px' }}>
        {' '}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <Stack gap='lg' style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Text size='sm' c='dimmed'>
              Select tags to add to {selectedCount} selected file{selectedCount === 1 ? '' : 's'}
              {selectedTags.length > 0 && (
                <span style={{ fontWeight: 'bold', color: 'var(--mantine-color-blue-6)' }}>
                  {' • '}
                  {selectedTags.length} tag{selectedTags.length === 1 ? '' : 's'} selected
                </span>
              )}
            </Text>{' '}
            <Combobox store={combobox} onOptionSubmit={handleTagSelect} withinPortal={false}>
              <Combobox.DropdownTarget>
                <PillsInput
                  pointer
                  onClick={() => combobox.toggleDropdown()}
                  rightSection={<Combobox.Chevron />}
                  style={{ minHeight: '0px' }}
                >
                  <Pill.Group>
                    {values.length > 0 ? values : <Input.Placeholder>Select tags to add</Input.Placeholder>}
                    <Combobox.EventsTarget>
                      <PillsInput.Field
                        type='hidden'
                        onBlur={() => combobox.closeDropdown()}
                        onKeyDown={(event) => {
                          if (event.key === 'Backspace' && selectedTags.length > 0) {
                            event.preventDefault();
                            handleRemoveTag(selectedTags[selectedTags.length - 1]);
                          }
                        }}
                      />
                    </Combobox.EventsTarget>
                  </Pill.Group>
                </PillsInput>
              </Combobox.DropdownTarget>{' '}
              <Combobox.Dropdown style={{ zIndex: 1000 }}>
                <Combobox.Options mah={150} style={{ overflowY: 'auto' }}>
                  {tags?.length ? (
                    tags.map((tag) => (
                      <Combobox.Option value={tag.id} key={tag.id} active={selectedTags.includes(tag.id)}>
                        <Group gap='sm'>
                          <Checkbox
                            checked={selectedTags.includes(tag.id)}
                            onChange={() => {}}
                            aria-hidden
                            tabIndex={-1}
                            style={{ pointerEvents: 'none' }}
                          />
                          <TagPill tag={tag} />
                          <Text size='sm' c='dimmed'>
                            {tag.files?.length || 0} file{(tag.files?.length || 0) === 1 ? '' : 's'}
                          </Text>
                        </Group>
                      </Combobox.Option>
                    ))
                  ) : (
                    <Combobox.Option value='no-tags' disabled>
                      No tags found. Create tags first.
                    </Combobox.Option>
                  )}
                </Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          </Stack>
        </div>{' '}
        <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
          <Group justify='flex-end'>
            <Button variant='outline' onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedTags.length === 0}>
              {confirmText}
              {selectedTags.length > 0 ? ` (${selectedTags.length})` : ''}
            </Button>
          </Group>
        </div>
      </div>
    </Modal>
  );
}
