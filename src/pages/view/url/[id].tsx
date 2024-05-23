import { verifyPassword } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { fetchApi } from '@/lib/fetchApi';
import { Button, Modal, PasswordInput, Title } from '@mantine/core';
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function ViewUrl({ url, password }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();

  const [passwordValue, setPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  const verifyPassword = async () => {
    const { error } = await fetchApi(`/api/user/urls/${url.id}/password`, 'POST', {
      password: passwordValue.trim(),
    });

    if (error) {
      setPasswordError('Invalid password');
    } else {
      setPasswordError('');
      router.replace(`/view/url/${url.id}?pw=${encodeURI(passwordValue.trim())}`);
    }
  };

  return password ? (
    <Modal
      onClose={() => {}}
      opened={true}
      withCloseButton={false}
      centered
      title={<Title>Password required</Title>}
    >
      <PasswordInput
        description='This link is password protected, enter password to view it'
        required
        mb='sm'
        value={passwordValue}
        onChange={(event) => setPassword(event.currentTarget.value)}
        error={passwordError}
      />

      <Button
        fullWidth
        variant='outline'
        my='sm'
        onClick={() => verifyPassword()}
        disabled={passwordValue.trim().length === 0}
      >
        Verify
      </Button>
    </Modal>
  ) : null;
}

export const getServerSideProps: GetServerSideProps<{
  url: { id: string };
  password?: boolean;
}> = async (context) => {
  const { id, pw } = context.query as { id: string; pw: string };
  if (!id) return { notFound: true };

  const url = await prisma.url.findFirst({
    where: {
      OR: [{ vanity: id }, { code: id }, { id }],
    },
    select: {
      id: true,
      password: true,
      destination: true,
    },
  });
  if (!url) return { notFound: true };

  if (pw) {
    const verified = await verifyPassword(pw, url.password!);
    // @ts-ignore
    delete url.password;

    if (!verified) {
      // @ts-ignore
      delete url.destination;

      return {
        props: {
          url,
          password: true,
        },
      };
    }

    return {
      redirect: {
        destination: url.destination,
        permanent: true,
      },
    };
  }

  const password = url.password ? true : false;
  // @ts-ignore
  delete url.password;
  // @ts-ignore
  delete url.destination;

  return {
    props: {
      url,
      password,
    },
  };
};
