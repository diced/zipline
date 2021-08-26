import React, { useEffect, useState } from 'react';
import { Grid, Pagination, Box, Typography } from '@material-ui/core';

import Backdrop from 'components/Backdrop';
import ZiplineImage from 'components/Image';
import useFetch from 'hooks/useFetch';

export default function Upload() {
  const [pages, setPages] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const updatePages = async () => {
    setLoading(true);
    const pages = await useFetch('/api/user/images?paged=true&filter=image');
    setPages(pages);
    setLoading(false);
  };

  useEffect(() => {
    updatePages();
  }, []);

  return (
    <>
      <Backdrop open={loading}/>
      {!pages.length && (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          pt={2}
          pb={3}
        >
          <Typography variant='h4'>No Images</Typography>
        </Box>
      )}
      <Grid container spacing={2}>
        {pages.length ? pages[(page - 1) ?? 0].map(image => (
          <Grid item xs={12} sm={3} key={image.id}>
            <ZiplineImage image={image} updateImages={updatePages} />
          </Grid>
        )) : null}
      </Grid>
      
      {pages.length ? (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          pt={2}
        >
          <Pagination count={pages.length} page={page} onChange={(_, v) => setPage(v)}/>
        </Box>
      ) : null}
    </>
  );
}