import { Prism } from '@mantine/prism';
import { Prism as PrismLib } from 'prism-react-renderer';
import exts from 'lib/exts';

(typeof window === 'undefined' ? global : window).Prism = PrismLib;

require('prismjs/components/prism-markdown');
require('prismjs/components/prism-css');
require('prismjs/components/prism-javascript');
require('prismjs/components/prism-typescript');
require('prismjs/components/prism-java');
require('prismjs/components/prism-python');
require('prismjs/components/prism-ruby');
require('prismjs/components/prism-bash');
require('prismjs/components/prism-php');
require('prismjs/components/prism-perl');
require('prismjs/components/prism-sql');
require('prismjs/components/prism-xml-doc');
require('prismjs/components/prism-yaml');
require('prismjs/components/prism-c');
require('prismjs/components/prism-cpp');
require('prismjs/components/prism-csharp');
require('prismjs/components/prism-go');
require('prismjs/components/prism-docker');
require('prismjs/components/prism-toml');
require('prismjs/components/prism-ini');
require('prismjs/components/prism-batch');
require('prismjs/components/prism-latex');
require('prismjs/components/prism-r');
require('prismjs/components/prism-lua');
require('prismjs/components/prism-powershell');
require('prismjs/components/prism-rust');
require('prismjs/components/prism-swift');
require('prismjs/components/prism-scss');
require('prismjs/components/prism-json');
require('prismjs/components/prism-less');
require('prismjs/components/prism-scala');
require('prismjs/components/prism-kotlin');
require('prismjs/components/prism-visual-basic');
require('prismjs/components/prism-vim');

export default function PrismCode({ code, ext, ...props }) {
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
