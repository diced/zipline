import { Modal, TextInput, Select, Switch, Group, Button, Title, NumberInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { DeleteIcon, PlusIcon } from 'components/icons';
import useFetch from 'hooks/useFetch';


export function EditUserModal({ open, setOpen, updateUsers, user, limit, setLimit }) {
  let form;
  
  if (user) form = useForm({
    initialValues: {
      username: user?.username,
      password: '',
      administrator: user?.administrator,
      limits: limit,
      type_time: user?.limit?.type_time||'daily',
      limit_by: user?.limit?.limit_by||'count',
      limit: user?.limit?.limit||1,
    },
  });

  const resetForm = () => form.setValues({ username: user?.username, password: '', administrator: user?.administrator, type_time: (user?.limit?.type_time||'daily'), limit_by: (user?.limit?.limit_by||'count'), limit: (user?.limit?.limit||1) });

  const onSubmit = async values => {
    const cleanUsername = values.username.trim();
    const cleanPassword = values.password.trim();

    const data = {
      username: null,
      password: null,
      administrator: values.administrator,
      limits: {},
    };

    if (cleanUsername !== '' && cleanUsername !== user.username) data.username = cleanUsername;
    if (cleanPassword !== '') data.password = cleanPassword;
    if (limit) {data.limits['type_time']=values.type_time;data.limits['limit_by']=values.limit_by;data.limits['limit']=values.limit;}
    setOpen(false);
    const res = await useFetch('/api/user/' + user.id, 'PATCH', data);
    if (res.error) {
      showNotification({
        title: 'Failed to edit user',
        message: res.error,
        icon: <DeleteIcon />,
        color: 'red',
      });
    } else {
      showNotification({
        title: 'Edited user: ' + cleanUsername,
        message: '',
        icon: <PlusIcon />,
        color: 'green',
      });
    }

    updateUsers();

    resetForm();
  };

  return (
    <Modal
      opened={open}
      onClose={() => {setOpen(false); resetForm();}}
      title={<Title>Edit User {user?.username}</Title>}
    >
      {user && (
        <form onSubmit={form.onSubmit(v => onSubmit(v))}>
          <TextInput id='username' label='Username' {...form.getInputProps('username')} />
          <TextInput id='password' label='Password' type='password' {...form.getInputProps('password')} />
          <Switch mt={12} id='administrator' label='Administrator' {...form.getInputProps('administrator')} />
          <Switch mt={12} id='limits' label='Limited' {...form.getInputProps('limits')} onChange={(v) => setLimit(v.currentTarget.checked)} checked={limit} />
          {
            limit ? (
              <>
                <Select
                  label='Limit Type Per?'
                  id='type_time'
                  {...form.getInputProps('type_time')}
                  data={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                  ]} 
                />
                <Select
                  label='Limit By Byte or count?'
                  id='limit_by'
                  {...form.getInputProps('limit_by')}
                  data ={[
                    { value: 'byte', label: 'Byte' },
                    { value: 'count', label: 'Count'},
                  ]}
                />
                <NumberInput
                  label='Limit'
                  id='limit'
                  {...form.getInputProps('limit')}
                  precision={0}
                  min={1}
                  stepHoldDelay={200}
                  stepHoldInterval={100}
                  parser={(v:string) => Number(v.replace(/[^\d]/g, ''))}
                />
              </>
            ) : null
          }

          <Group position='right' mt={22}>
            <Button onClick={() => {setOpen(false); resetForm();}}>Cancel</Button>
            <Button type='submit'>Save</Button>
          </Group>
        </form>
      )}
    </Modal>
  );
}
