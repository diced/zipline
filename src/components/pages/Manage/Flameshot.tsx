import { Code } from '@mantine/core';
import Link from 'components/Link';
import { GeneratorModal } from './GeneratorModal';

export default function Flameshot({ user, open, setOpen }) {
  const onSubmit = (values) => {
    const curl = [
      'curl',
      '-H',
      `"authorization: ${user?.token}"`,
      `${
        window.location.protocol +
        '//' +
        window.location.hostname +
        (window.location.port ? ':' + window.location.port : '')
      }/api/${values.type === 'upload-file' ? 'upload' : 'shorten'}`,
    ];

    if (values.type === 'upload-file') {
      curl.push('-F', 'file=@/tmp/ss.png');
      curl.push('-H', '"Content-Type: multipart/form-data"');
    } else {
      curl.push('-H', '"Content-Type: application/json"');
    }

    const extraHeaders = {};

    if (values.format !== 'RANDOM' && values.type === 'upload-file') {
      extraHeaders['Format'] = values.format;
    } else {
      delete extraHeaders['Format'];
    }

    if (values.imageCompression !== 0 && values.type === 'upload-file') {
      extraHeaders['Image-Compression-Percent'] = values.imageCompression;
    } else {
      delete extraHeaders['Image-Compression-Percent'];
    }

    if (values.zeroWidthSpace) {
      extraHeaders['Zws'] = 'true';
    } else {
      delete extraHeaders['Zws'];
    }

    if (values.embed && values.type === 'upload-file') {
      extraHeaders['Embed'] = 'true';
    } else {
      delete extraHeaders['Embed'];
    }

    if (values.noJSON) {
      extraHeaders['No-JSON'] = 'true';
    } else {
      delete extraHeaders['No-JSON'];
    }

    for (const [key, value] of Object.entries(extraHeaders)) {
      curl.push('-H');
      curl.push(`"${key}: ${value}"`);
    }

    let shell;
    if (values.type === 'upload-file') {
      shell = `#!/bin/bash${values.wlCompositorNotSupported ? '\nexport XDG_CURRENT_DESKTOP=sway\n' : ''}
flameshot gui -r > /tmp/ss.png;
${curl.join(' ')}${values.noJSON ? '' : " | jq -r '.files[0]'"} | tr -d '\\n' | ${
        values.wlCompatibility ? 'wl-copy' : 'xsel -ib'
      };
`;
    } else if (values.type === 'shorten-url') {
      shell = `#!/bin/bash
arg=$1;
${curl.join(' ')} -d "{\\"url\\": \\"$arg\\"}"${values.noJSON ? '' : " | jq -r '.url'"} | tr -d '\\n' | ${
        values.wlCompatibility ? 'wl-copy' : 'xsel -ib'
      };
`;
    }

    const pseudoElement = document.createElement('a');
    pseudoElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(shell));
    pseudoElement.setAttribute('download', `zipline${values.type === 'upload-file' ? '' : '-url'}.sh`);
    pseudoElement.style.display = 'none';
    document.body.appendChild(pseudoElement);
    pseudoElement.click();
    pseudoElement.parentNode.removeChild(pseudoElement);
  };

  return (
    <GeneratorModal
      opened={open}
      onClose={() => setOpen(false)}
      title='Flameshot'
      desc={
        <>
          To use this script, you need <Link href='https://flameshot.org'>Flameshot</Link>,{' '}
          <Link href='https://curl.se/'>
            <Code>curl</Code>
          </Link>
          ,{' '}
          <Link href='https://github.com/stedolan/jq'>
            <Code>jq</Code>
          </Link>
          , and{' '}
          <Link href='https://github.com/kfish/xsel'>
            <Code>xsel</Code>
          </Link>{' '}
          installed. This script is intended for use on Linux only.
        </>
      }
      onSubmit={onSubmit}
    />
  );
}
