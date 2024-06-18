import {
  Icon,
  IconFileText,
  IconFileUnknown,
  IconFileZip,
  IconMusic,
  IconPhoto,
  IconVideo,
} from '@tabler/icons-react';

const icons: Record<string, Icon> = {
  video: IconVideo,
  image: IconPhoto,
  audio: IconMusic,
  text: IconFileText,

  // common compressed files
  'application/zip': IconFileZip,
  'application/x-7z-compressed': IconFileZip,
  'application/x-rar-compressed': IconFileZip,
  'application/x-tar': IconFileZip,
  'application/x-bzip2': IconFileZip,
  'application/x-gzip': IconFileZip,

  // common text/document files that are not detected by the 'text' type
  'application/pdf': IconFileText,
  'application/msword': IconFileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': IconFileText,

  // feel free to PR more icons if you want :D
};

export default function fileIcon(type: string): Icon {
  const icon = icons[type.split('/')[0]] || icons[type] || IconFileUnknown;

  return icon;
}
