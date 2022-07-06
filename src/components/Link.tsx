/// https://github.com/mui-org/material-ui/blob/next/examples/nextjs/src/Link.js
/* eslint-disable jsx-a11y/anchor-has-content */
import { Text } from '@mantine/core';
import clsx from 'clsx';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { forwardRef } from 'react';

export const NextLinkComposed = forwardRef(function NextLinkComposed(props: any, ref) {
  const { to, linkAs, href, replace, scroll, passHref, shallow, prefetch, locale, ...other } =
    props;

  return (
    <NextLink
      href={to}
      prefetch={prefetch}
      as={linkAs}
      replace={replace}
      scroll={scroll}
      shallow={shallow}
      passHref={passHref}
      locale={locale}
    >
      <a ref={ref} {...other} />
    </NextLink>
  );
});

// A styled version of the Next.js Link component:
// https://nextjs.org/docs/#with-link
const Link = forwardRef(function Link(props: any, ref) {
  const {
    activeClassName = 'active',
    as: linkAs,
    className: classNameProps,
    href,
    noLinkStyle,
    role, // Link don't have roles.
    ...other
  } = props;

  const router = useRouter();
  const pathname = typeof href === 'string' ? href : href.pathname;
  const className = clsx(classNameProps, {
    [activeClassName]: router.pathname === pathname && activeClassName,
  });

  const isExternal =
    typeof href === 'string' && (href.indexOf('http') === 0 || href.indexOf('mailto:') === 0);

  if (isExternal) {
    if (noLinkStyle) {
      return <Text variant='link' component='a' className={className} href={href} ref={ref} {...other} />;
    }

    return <Text component='a' variant='link' href={href} ref={ref} {...other} />;
  }

  if (noLinkStyle) {
    return <NextLinkComposed className={className} ref={ref} to={href} {...other} />;
  }

  return (
    <Text
      component={NextLinkComposed}
      variant='link'
      linkAs={linkAs}
      className={className}
      ref={ref}
      to={href}
      {...other}
    />
  );
});

export default Link;