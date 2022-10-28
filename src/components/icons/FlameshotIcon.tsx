// https://github.com/flameshot-org/flameshot/blob/master/data/img/app/flameshot.svg

import Image from 'next/image';

export default function FlameshotIcon({ ...props }) {
  return (
    <Image
      alt='flameshot'
      src='https://raw.githubusercontent.com/flameshot-org/flameshot/master/data/img/app/flameshot.svg'
      width={24}
      height={24}
      {...props}
    />
  );
}
