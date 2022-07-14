// https://mantine.dev/core/password-input/

import { useState } from 'react';
import { PasswordInput, Progress, Text, Popover, Box } from '@mantine/core';
import { CheckIcon, CrossIcon } from './icons';

function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
  return (
    <Text
      color={meets ? 'teal' : 'red'}
      sx={{ display: 'flex', alignItems: 'center' }}
      mt='sm'
      size='sm'
    >
      {meets ? <CheckIcon /> : <CrossIcon />} <Box ml='md'>{label}</Box>
    </Text>
  );
}

const requirements = [
  { re: /[0-9]/, label: 'Includes number' },
  { re: /[a-z]/, label: 'Includes lowercase letter' },
  { re: /[A-Z]/, label: 'Includes uppercase letter' },
  { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: 'Includes special symbol' },
];

function getStrength(password: string) {
  let multiplier = password.length > 7 ? 0 : 1;

  requirements.forEach((requirement) => {
    if (!requirement.re.test(password)) {
      multiplier += 1;
    }
  });

  return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
}

export default function PasswordStrength({ value, setValue, setStrength, ...props }) {
  const [popoverOpened, setPopoverOpened] = useState(false);
  const checks = requirements.map((requirement, index) => (
    <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(value)} />
  ));

  const strength = getStrength(value);
  setStrength(strength);
  const color = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';

  return (
    <Popover
      opened={popoverOpened}
      position='bottom'
      placement='start'
      withArrow
      trapFocus={false}
      transition='pop-top-left'
      onFocusCapture={() => setPopoverOpened(true)}
      onBlurCapture={() => setPopoverOpened(false)}
      styles={{ root: { width: '100%' } }}
      target={
        <PasswordInput
          label='Password'
          description='Strong password should include letters in lower and uppercase, at least 1 number, at least 1 special symbol'
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          {...props}
        />
      }
    >
      <Progress color={color} value={strength} size={7} mb='md' />
      <PasswordRequirement label='Includes at least 8 characters' meets={value.length > 7} />
      {checks}
    </Popover>
  );
}
