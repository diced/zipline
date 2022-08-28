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
  id: string
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
    notFound: true
  }

  // resolve stream to a string and send it off to the component
  return {
    props: {
      code: await streamToString(data),
      id: context.params.id as string
    }
  }
};