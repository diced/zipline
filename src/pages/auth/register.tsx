import { Box, Button, Center, Group, PasswordInput, Stepper, TextInput } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { IconUserPlus, IconUserX } from '@tabler/icons-react';
import PasswordStrength from 'components/PasswordStrength';
import useFetch from 'hooks/useFetch';
import config from 'lib/config';
import prisma from 'lib/prisma';
import { userSelector } from 'lib/recoil/user';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useSetRecoilState } from 'recoil';

export default function Register({ code = undefined, title, user_registration }) {
  const [active, setActive] = useState(0);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyPasswordError, setVerifyPasswordError] = useState('');
  const [strength, setStrength] = useState(0);

  const setUser = useSetRecoilState(userSelector);
  const router = useRouter();

  const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const checkUsername = async () => {
    setUsername(username.trim());

    setUsernameError('');

    const res = await useFetch('/api/user/check', 'POST', { code, username });
    if (res.error) {
      setUsernameError('A user with that username already exists');
    } else {
      setUsernameError('');
    }
  };

  const checkPassword = () => {
    setVerifyPasswordError('');
    setPassword(password.trim());
    setVerifyPassword(verifyPassword.trim());

    if (password !== verifyPassword) setVerifyPasswordError('Passwords do not match');
    else setVerifyPasswordError('');
  };

  const createUser = async () => {
    const res = await useFetch(`/api/auth/${user_registration ? 'register' : 'create'}`, 'POST', {
      code: user_registration ? null : code,
      username,
      password,
    });

    if (res.error) {
      showNotification({
        title: 'Error while creating user',
        message: res.error,
        color: 'red',
        icon: <IconUserX />,
      });
    } else {
      showNotification({
        title: 'User created',
        message: 'You will be logged in shortly...',
        color: 'green',
        icon: <IconUserPlus />,
      });

      setUser(null);
      await useFetch('/api/auth/logout');
      await useFetch('/api/auth/login', 'POST', {
        username,
        password,
      });

      router.push('/dashboard');
    }
  };

  const full_title = `${title} - Invite (${code || 'None'})`;
  return (
    <>
      <Head>
        <title>{full_title}</title>
      </Head>
      <Center sx={{ height: '100vh' }}>
        <Box
          sx={(t) => ({
            backgroundColor: t.colors.dark[6],
            borderRadius: t.radius.sm,
          })}
          p='md'
        >
          <Stepper active={active} onStepClick={setActive} breakpoint='sm'>
            <Stepper.Step label='Welcome' description='Choose a username' allowStepSelect={active > 0}>
              <TextInput
                label='Username'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={usernameError}
                onBlur={() => checkUsername()}
              />
              <Group position='center' mt='xl'>
                <Button disabled={usernameError !== '' || username == ''} onClick={nextStep}>
                  Continue
                </Button>
              </Group>
            </Stepper.Step>
            <Stepper.Step label='Choose a password' allowStepSelect={active > 1 && usernameError === ''}>
              <PasswordStrength value={password} setValue={setPassword} setStrength={setStrength} />
              <Group position='center' mt='xl'>
                <Button variant='default' onClick={prevStep}>
                  Back
                </Button>
                <Button disabled={strength !== 100} onClick={nextStep}>
                  Continue
                </Button>
              </Group>
            </Stepper.Step>
            <Stepper.Step label='Verify your password' allowStepSelect={active > 2}>
              <PasswordInput
                label='Verify password'
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                error={verifyPasswordError}
                onBlur={() => checkPassword()}
              />
              <Group position='center' mt='xl'>
                <Button variant='default' onClick={prevStep}>
                  Back
                </Button>
                <Button disabled={verifyPasswordError !== '' || verifyPassword == ''} onClick={nextStep}>
                  Continue
                </Button>
              </Group>
            </Stepper.Step>
            <Stepper.Completed>
              <Group position='center' mt='xl'>
                <Button variant='default' onClick={() => setActive(0)}>
                  Go back
                </Button>
                <Button onClick={() => createUser()}>Register</Button>
              </Group>
            </Stepper.Completed>
          </Stepper>
        </Box>
      </Center>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { code } = context.query as { code: string };

  const { default: Logger } = await import('lib/logger');
  const logger = Logger.get('pages::register');

  if (code) {
    if (!config.features.invites)
      return {
        notFound: true,
      };

    const invite = await prisma.invite.findUnique({
      where: {
        code,
      },
    });

    logger.debug(`request to access ${JSON.stringify(invite)}`);

    if (!invite) return { notFound: true };
    if (invite.used) return { notFound: true };

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      logger.debug(`restricting access to ${JSON.stringify(invite)} as it has expired`);

      return { notFound: true };
    }

    return {
      props: {
        title: config.website.title,
        code: invite.code,
      },
    };
  } else {
    if (!config.features.user_registration)
      return {
        notFound: true,
      };

    return {
      props: {
        title: config.website.title,
        user_registration: true,
      },
    };
  }
};
