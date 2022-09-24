import { Modal, Select, NumberInput, Group, Checkbox, Button, Title, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { DownloadIcon } from 'components/icons';

export function GeneratorModal({ opened, onClose, title, onSubmit, ...other }) {
  const form = useForm({
    initialValues: {
      format: 'RANDOM',
      imageCompression: 0,
      zeroWidthSpace: false,
      embed: false,
    },
  });
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={3}>{title}</Title>}
      size='lg'
    >
      {other.desc && <Text>{other.desc}</Text>}
      <form onSubmit={form.onSubmit(values => onSubmit(values))}>
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
          label={'Image Compression (leave at 0 if you don\'t want to compress)'}
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
          <Checkbox
            label='Embed'
            id='embed'
            {...form.getInputProps('embed', { type: 'checkbox' })}
          />
        </Group>

        <Group grow>
          <Button
            mt='md'
            onClick={form.reset}
          >
            Reset
          </Button>

          <Button
            mt='md'
            rightIcon={<DownloadIcon />}
            type='submit'
          >
            Download
          </Button>
        </Group>
      </form>
    </Modal>
  );
}