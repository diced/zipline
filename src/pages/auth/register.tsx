import { Button, Center, TextInput, Title, PasswordInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import Link from 'next/link';
import useFetch from 'hooks/useFetch';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import GitHubIcon from 'components/icons/GitHubIcon';
import DiscordIcon from 'components/icons/DiscordIcon';
export { getServerSideProps } from 'middleware/getServerSideProps';

export default function Login({ oauth_registration, oauth_providers: unparsed }) {
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
  };

  useEffect(() => {
    (async () => {
      const a = await fetch('/api/user');
      if (a.ok) await router.push('/dashboard');
    })();
  }, []);

  return (
    <>
      <Center sx={{ height: '100vh' }}>
        <div>
          {oauth_providers.map(({ url, name, Icon }, i) => (
            <Link key={i} href={url} passHref>
              <Button size='lg' fullWidth mt={12} leftIcon={<Icon />} component='a'>Sign in with {name}</Button>
            </Link>
          ))}
        </div>
      </Center>
    </>
  );
}