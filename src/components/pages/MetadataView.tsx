import { Button, Center, Group, Skeleton, Table, TextInput, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { showNotification } from '@mantine/notifications';
import { IconClipboardCopy } from '@tabler/icons-react';
import useFetch from 'hooks/useFetch';
import { useEffect, useState } from 'react';

export default function MetadataView({ fileId }) {
  const clipboard = useClipboard();

  const [metadata, setMetadata] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);

  const getMetadata = async () => {
    const data = await useFetch(`/api/exif?id=${fileId}`);
    if (!data.error) {
      const arr = [];
      for (const key in data) {
        arr.push({ name: key, value: data[key] });
      }
      setMetadata(arr);
    } else {
      setMetadata([]);
    }
  };

  const copy = (value) => {
    clipboard.copy(value);
    if (!navigator.clipboard)
      showNotification({
        title: 'Unable to copy to clipboard',
        message: 'Zipline is unable to copy to clipboard due to security reasons.',
        color: 'red',
      });
    else
      showNotification({
        title: 'Copied to clipboard',
        message: value,
        icon: <IconClipboardCopy size='1rem' />,
      });
  };

  const searchValue = (value) => {
    setSearch(value);

    const filtered = metadata.filter((item) => {
      return (
        item.name.toLowerCase().includes(value.toLowerCase()) ||
        item.value.toString().toLowerCase().includes(value.toLowerCase())
      );
    });

    if (filtered.length > 0) {
      setFiltered(filtered);
    } else {
      setFiltered(null);
    }
  };

  const clearSearch = () => {
    setSearch('');
    setFiltered([]);
  };

  useEffect(() => {
    getMetadata();
  }, []);

  const rows = (filtered?.length ? filtered : metadata).map((element) => (
    <tr key={element.name}>
      <td>{element.name}</td>
      <td>{element.value}</td>
      <td>
        <Button.Group>
          <Button variant='light' onClick={() => copy(element.value)}>
            Copy Value
          </Button>
          <Button variant='light' onClick={() => copy(element.name)}>
            Copy Name
          </Button>
        </Button.Group>
      </td>
    </tr>
  ));

  return (
    <>
      <Group mb='md'>
        <Title>Metadata for {fileId}</Title>
      </Group>

      {metadata ? (
        <>
          <TextInput
            my='md'
            label='Search'
            labelProps={{
              size: 'xl',
            }}
            placeholder='Search for a metadata value'
            value={search}
            onChange={(e) => searchValue(e.currentTarget.value)}
          />

          {filtered === null ? (
            <Center>
              <Group spacing='md'>
                <Title>No results found</Title>
                <Button variant='outline' color='red' onClick={clearSearch}>
                  Clear search
                </Button>
              </Group>
            </Center>
          ) : (
            <Table highlightOnHover>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </Table>
          )}
        </>
      ) : (
        <Skeleton height={300} />
      )}
    </>
  );
}
