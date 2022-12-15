import { Code } from '@mantine/core';
import Link from 'components/Link';
import { GeneratorModal } from './GeneratorModal';

export default function Flameshot({ user, open, setOpen }) {
  const onSubmit = (values) => {
    const curl = [
      'curl',
      '-H',
      '"Content-Type: multipart/form-data"',
      '-H',
      `"authorization: ${user?.token}"`,
      '-F',
      'file=@/tmp/ss.png',
      `${
        window.location.protocol +
        '//' +
        window.location.hostname +
        (window.location.port ? ':' + window.location.port : '')
      }/api/upload`,
    ];

    const extraHeaders = {};

    if (values.format !== 'RANDOM') {
      extraHeaders['Format'] = values.format;
    } else {
      delete extraHeaders['Format'];
    }

    if (values.imageCompression !== 0) {
      extraHeaders['Image-Compression-Percent'] = values.imageCompression;
    } else {
      delete extraHeaders['Image-Compression-Percent'];
    }

    if (values.zeroWidthSpace) {
      extraHeaders['Zws'] = 'true';
    } else {
      delete extraHeaders['Zws'];
    }

    if (values.embed) {
      extraHeaders['Embed'] = 'true';
    } else {
      delete extraHeaders['Embed'];
    }

    for (const [key, value] of Object.entries(extraHeaders)) {
      curl.push('-H');
      curl.push(`"${key}: ${value}"`);
    }

    const shell = `#!/bin/bash${values.wlCompositorNotSupported ? '\nexport XDG_CURRENT_DESKTOP=sway\n' : ''}
flameshot gui -p /tmp/ss.png;
${curl.join(' ')} | jq -r '.files[0]' | tr -d '\\n' | ${values.wlCompatibility ? 'wl-copy' : 'xsel -ib'};
`;

    const pseudoElement = document.createElement('a');
    pseudoElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(shell));
    pseudoElement.setAttribute('download', 'zipline.sh');
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
