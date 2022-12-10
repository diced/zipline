import { Prism } from '@mantine/prism';
import { Prism as PrismLib } from 'prism-react-renderer';
import exts, { extToPrismComponent } from 'lib/exts';
import { useEffect } from 'react';

(typeof window === 'undefined' ? global : window).Prism = PrismLib;

export default function PrismCode({ code, ext, ...props }) {
  useEffect(() => {
    (async () => {
      const component = extToPrismComponent[ext];
      if (component && ext !== 'txt') await import(`prismjs/components/prism-${component}`);
    })();
  }, [ext]);

  return (
    <Prism
      sx={(t) => ({ height: '100vh', backgroundColor: t.colors.dark[8] })}
      withLineNumbers
      language={exts[ext]?.toLowerCase()}
      {...props}
    >
      {code}
    </Prism>
  );
}
