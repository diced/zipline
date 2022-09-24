import { Button, Checkbox, Group, Modal, NumberInput, Select, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import DownloadIcon from 'components/icons/DownloadIcon';
import { useState } from 'react';

export default function ShareX({ user, open, setOpen }) {
  const [config, setConfig] = useState({
    Version: '13.2.1',
    Name: 'Zipline',
    DestinationType: 'ImageUploader, TextUploader',
    RequestMethod: 'POST',
    RequestURL: `${window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '')}/api/upload`,
    Headers: {
      Authorization: user?.token,
    },
    URL: '$json:files[0]$',
    Body: 'MultipartFormData',
    FileFormName: 'file',
  });

  const form = useForm({
    initialValues: {
      format: 'RANDOM',
      imageCompression: 0,
      zeroWidthSpace: false,
      embed: false,
    },
  });

  const download = values => {
    if (values.format !== 'RANDOM') {
      config.Headers['Format'] = values.format;
      setConfig(config);
    } else {
      delete config.Headers['Format'];
      setConfig(config);
    }

    if (values.imageCompression !== 0) {
      config.Headers['Image-Compression-Percent'] = values.imageCompression;
      setConfig(config);
    } else {
      delete config.Headers['Image-Compression-Percent'];
      setConfig(config);
    }

    if (values.zeroWidthSpace) {
      config.Headers['Zws'] = 'true';
      setConfig(config);
    } else {
      delete config.Headers['Zws'];
      setConfig(config);
    }

    if (values.embed) {
      config.Headers['Embed'] = 'true';
      setConfig(config);
    } else {
      delete config.Headers['Embed'];
      setConfig(config);
    }

    const pseudoElement = document.createElement('a');
    pseudoElement.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, '\t')));
    pseudoElement.setAttribute('download', 'zipline.sxcu');
    pseudoElement.style.display = 'none';
    document.body.appendChild(pseudoElement);
    pseudoElement.click();
    pseudoElement.parentNode.removeChild(pseudoElement);
  };

  return (
    <Modal
      opened={open}
      onClose={() => setOpen(false)}
      title={<Title order={3}>ShareX</Title>}
      size='lg'
    >

      <form onSubmit={form.onSubmit(values => download(values))}>
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