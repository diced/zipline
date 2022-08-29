import React from 'react';
import exts from 'lib/exts';
import { Prism } from '@mantine/prism';
import { GetServerSideProps } from 'next';
import datasource from 'lib/datasource';
import { streamToString } from 'lib/utils/streams';

// the props that will be returned by getServerSideProps
// and will be inputted into Code component 
type CodeProps = {
  code: string,
  id: string,
}

// Code component
export default function Code(
  { code, id }: CodeProps
) {
  return (
    <Prism 
      sx={t => ({ height: '100vh', backgroundColor: t.colors.dark[8] })}
      withLineNumbers 
      language={exts[id.split('.').pop()]?.toLowerCase()}
    >
      {code}
    </Prism>
  );
}

// handle server-side rendering
export const getServerSideProps: GetServerSideProps<CodeProps> = async (context) => {
  // get the data from the datasource
  const data = await datasource.get(context.params.id as string);
  
  // return notFound if no data
  if(!data) return {
    notFound: true,
  };

  // set cache header to prevent re-rendering when not needed
  // this should only be done on 200 responses
  context.res.setHeader(
    'Cache-Control',
    'public, max-age=2628000, stale-while-revalidate=86400'
    // public -> browsers/whatever are allowed to use shared cache
    // max-age: 1 month -> will cache for one month (uploads shouldn't change)
    // stale-while-revalidate: 1 week -> this tells browsers to check the cache in the background after 1 week (instead of on-request)
  );

  // resolve stream to a string and send it off to the component
  return {
    props: {
      code: await streamToString(data),
      id: context.params.id as string,
    },
  };
};