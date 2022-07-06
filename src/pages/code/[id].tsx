import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import exts from 'lib/exts';
import { Prism } from '@mantine/prism';

export default function Code() {
  const [prismRenderCode, setPrismRenderCode] = React.useState('');
  const router = useRouter();
  const { id } = router.query as { id: string };

  useEffect(() => {
    (async () => {
      const res = await fetch('/r/' + id);
      if (id && !res.ok) await router.push('/404');
      const data = await res.text();
      if (id) setPrismRenderCode(data);
    })();
  }, [id]);
  
  return id && prismRenderCode ? (
    <Prism sx={t => ({ height: '100vh', backgroundColor: t.colors.dark[8] })} withLineNumbers language={exts[id.split('.').pop()]}>{prismRenderCode}</Prism>
  ) : null;
}