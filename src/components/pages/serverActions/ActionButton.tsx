import { ActionIcon } from '@mantine/core';
import { IconPlayerPlayFilled } from '@tabler/icons-react';

const ICON_SIZE = '1.75rem';

export default function ActionButton({ onClick, Icon }: { onClick: () => void; Icon?: React.FC<any> }) {
  return (
    <ActionIcon
      onClick={onClick}
      variant='filled'
      color='blue'
      radius='md'
      size='xl'
      className='zip-click-action-button'
    >
      {Icon ? <Icon size={ICON_SIZE} /> : <IconPlayerPlayFilled size={ICON_SIZE} />}
    </ActionIcon>
  );
}
