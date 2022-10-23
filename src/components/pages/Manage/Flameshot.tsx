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

    const shell = `#!/bin/bash
flameshot gui -r > /tmp/ss.png;
${curl.join(' ')} | jq -r '.files[0]' | tr -d '\n' | xsel -ib;
`;

    const pseudoElement = document.createElement('a');
    pseudoElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(shell));
    pseudoElement.setAttribute('download', 'lunarx.sh');
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
      desc='To use this script, you need Flameshot, curl, jq, and xsel installed. This script is intended for use on Linux only.'
      onSubmit={onSubmit}
    />
  );
}
