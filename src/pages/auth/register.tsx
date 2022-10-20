import { Button, Center } from '@mantine/core';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import GitHubIcon from 'components/icons/GitHubIcon';
import DiscordIcon from 'components/icons/DiscordIcon';
import Head from 'next/head';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function Login({ title, oauth_registration, oauth_providers: unparsed }) {
  const oauth_providers = JSON.parse(unparsed);

  const icons = {
    GitHub: GitHubIcon,
    Discord: DiscordIcon,
  };

  for (const provider of oauth_providers) {
    provider.Icon = icons[provider.name];
  }

  const router = useRouter();
  if (!oauth_registration) {
    router.push('/auth/login');
    return null;
  }

  useEffect(() => {
    (async () => {
      const a = await fetch('/api/user');
      if (a.ok) await router.push('/dashboard');
    })();
  }, []);

  return (
    <>
      <Head>
        <title>{title} - Login</title>
      </Head>
      <Center sx={{ height: '100vh' }}>
        <div>
          <Link href='/auth/login' passHref>
            <Button size='lg' fullWidth variant='outline' component='a'>
              Go Back to Login
            </Button>
          </Link>
          {oauth_providers.map(({ url, name, Icon }, i) => (
            <Link key={i} href={url} passHref>
              <Button size='lg' fullWidth mt={12} leftIcon={<Icon />} component='a'>
                Sign in with {name}
              </Button>
            </Link>
          ))}
        </div>
      </Center>
    </>
  );
}
