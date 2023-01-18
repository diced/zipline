// https://developers.google.com/identity/branding-guidelines

import Image from 'next/image';

export default function GoogleIcon({ colorScheme, ...props }) {
  return (
    <Image
      alt='google'
      src='https://madeby.google.com/static/images/google_g_logo.svg'
      width={24}
      height={24}
      {...props}
    />
  );
}
