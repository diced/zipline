import { Modal, TextInput, Switch, Group, Button, Title, Select, NumberInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { DeleteIcon, PlusIcon } from 'components/icons';
import useFetch from 'hooks/useFetch';

export function CreateUserModal({ open, setOpen, updateUsers, limit, setLimit }) {
  const form = useForm({
    initialValues: {
      username: '',
      password: '',
      administrator: false,
      limits: limit,
      type_time: 'daily',
      limit_by: 'count',
      limit: 1,
    },
  });

  const onSubmit = async values => {
    const cleanUsername = values.username.trim();
    const cleanPassword = values.password.trim();
    if (cleanUsername === '') return form.setFieldError('username', 'Username can\'t be nothing');
    if (cleanPassword === '') return form.setFieldError('password', 'Password can\'t be nothing');

    const data = {
      username: cleanUsername,
      password: cleanPassword,
      administrator: values.administrator,
      limits: {},
    };
    if (limit) {data.limits['type_time']=values.type_time;data.limits['limit_by']=values.limit_by;data.limits['limit']=values.limit;};
    setOpen(false);
    const res = await useFetch('/api/auth/create', 'POST', data);
    if (res.error) {
      showNotification({
        title: 'Failed to create user',
        message: res.error,
        icon: <DeleteIcon />,
        color: 'red',
      });
    } else {
      showNotification({
        title: 'Created user: ' + cleanUsername,
        message: '',
        icon: <PlusIcon />,
        color: 'green',
      });
    }

    form.reset();

    updateUsers();
  };

  return (
    <Modal
      opened={open}
      onClose={() => setOpen(false)}
      title={<Title>Create User</Title>}
    >
      <form onSubmit={form.onSubmit(v => onSubmit(v))}>
        <TextInput id='username' label='Username' {...form.getInputProps('username')} />
        <TextInput id='password' label='Password' type='password' {...form.getInputProps('password')} />
        <Switch mt={12} id='administrator' label='Administrator' {...form.getInputProps('administrator')} onChange={(v) => limit && v.currentTarget.checked ? setLimit(false) : null } />
        <Switch mt={12} id='limits' label='Limited' {...form.getInputProps('limits')} onChange={(v) => {setLimit(v.currentTarget.checked); form.values.administrator ? form.setFieldValue('administrator', false) : null;}} checked={limit} />
        {
          limit ? (
            <>
              <Select
                label='Limit Every'
                id='type_time'
                {...form.getInputProps('type_time')}
                data={[
                  { value: 'daily', label: 'Day' },
                  { value: 'weekly', label: 'Week' },
                  { value: 'monthly', label: 'Month' },
                  { value: 'yearly', label: 'Year' },
                ]} 
              />
              <Select
                label='Limit By'
                id='limit_by'
                {...form.getInputProps('limit_by')}
                data ={[
                  { value: 'byte', label: 'Byte' },
                  { value: 'count', label: 'Count'},
                ]}
              />
              <NumberInput
                label='Limit Amount'
                id='limit'
                {...form.getInputProps('limit')}
                precision={0}
                min={1}
                stepHoldDelay={200}
                stepHoldInterval={100}
                parser={(v) => v.replace(/[^\d]/g, '')}
              />
            </>
          ) : null
        }


        <Group position='right' mt={22}>
          <Button onClick={() => {setOpen(false); form.reset();}}>Cancel</Button>
          <Button type='submit'>Create</Button>
        </Group>
      </form>
    </Modal>
  );
}