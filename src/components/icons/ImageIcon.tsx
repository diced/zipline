import { Image as FeatherImage } from 'react-feather';

export default function ImageIcon({ ...props }) {
  return <FeatherImage size={15} {...props} />;
}