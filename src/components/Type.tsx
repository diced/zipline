import { Group, Image, Text } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { useEffect, useState } from 'react';
import { AudioIcon, FileIcon, PlayIcon } from './icons';

function Placeholder({ text, Icon, ...props }) {
  return (
    <Image height={200} withPlaceholder placeholder={
      <Group>
        <Icon size={48} />
        <Text size='md'>{text}</Text>
      </Group>
    } {...props} />
  );
}

export default function Type({ file, popup = false, ...props }){
  const type = (file.type || file.mimetype).split('/')[0];
  const name = (file.name || file.file);

  const media = /^(video|audio|image|text)/.test(type);

  const [text, setText] = useState('');

  if (type === 'text') {
    useEffect(() => {
      (async () => {
        const res = await fetch('/r/' + name);
        const text = await res.text();

        setText(text);
      })();
    }, []);
  }

  return popup ? (media ? {
    'video': <video width='100%' autoPlay controls {...props} />,
    'image': <Image {...props} />,
    'audio': <audio autoPlay controls {...props} style={{ width: '100%' }}/>,
    'text': <Prism withLineNumbers language={name.split('.').pop()} {...props} style={{}} sx={{}}>{text}</Prism>,
  }[type]: <Text>Can&apos;t preview {file.type || file.mimetype}</Text>) : (media ? {
    'video': <Placeholder Icon={PlayIcon} text={`Click to view video (${name})`} {...props} />,
    'image': <Image {...props} />,
    'audio': <Placeholder Icon={AudioIcon} text={`Click to view audio (${name})`} {...props}/>,
    'text':  <Placeholder Icon={FileIcon} text={`Click to view text file (${name})`} {...props}/>,
  }[type] : <Placeholder Icon={FileIcon} text={`Click to view file (${name})`} {...props}/>);
};