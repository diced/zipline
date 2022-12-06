import { Prism } from '@mantine/prism';
import { Prism as PrismLib } from 'prism-react-renderer';
import exts, { extToPrismComponent } from 'lib/exts';
import { useEffect } from 'react';

(typeof window === 'undefined' ? global : window).Prism = PrismLib;

export default function PrismCode({ code, ext, ...props }) {
  useEffect(() => {
    (async () => {
      if (ext !== 'txt') await import(`prismjs/components/prism-${extToPrismComponent(ext)}`);
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
