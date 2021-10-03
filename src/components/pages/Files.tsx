import React, { useEffect, useState } from 'react';
import { Grid, Pagination, Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

import Backdrop from 'components/Backdrop';
import ZiplineImage from 'components/Image';
import useFetch from 'hooks/useFetch';

export default function Files() {
  const [pages, setPages] = useState([]);
  const [page, setPage] = useState(1);
  const [favoritePages, setFavoritePages] = useState([]);
  const [favoritePage, setFavoritePage] = useState(1);
  const [loading, setLoading] = useState(true);

  const updatePages = async favorite => {
    setLoading(true);
    const pages = await useFetch('/api/user/files?paged=true&filter=media');
    if (favorite) {
      const fPages = await useFetch('/api/user/files?paged=true&favorite=media');
      setFavoritePages(fPages);
    } 
    setPages(pages);
    setLoading(false);
  };

  useEffect(() => {
    updatePages(true);
  }, []);

  return (
    <>
      <Backdrop open={loading}/>
      {!pages.length ? (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          pt={2}
          pb={3}
        >
          <Typography variant='h4'>No Files</Typography>
        </Box>
      ) : <Typography variant='h4'>Files</Typography>}
      {favoritePages.length ? (
        <Accordion sx={{ my: 2, border: 1, borderColor: t => t.palette.divider }} elevation={0}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant='h4'>Favorite Files</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {favoritePages.length ? favoritePages[(favoritePage - 1) ?? 0].map(image => (
                <Grid item xs={12} sm={3} key={image.id}>
                  <ZiplineImage image={image} updateImages={() => updatePages(true)} />
                </Grid>
              )) : null}
            </Grid>
            {favoritePages.length ? (
              <Box
                display='flex'
                justifyContent='center'
                alignItems='center'
                pt={2}
              >
                <Pagination count={favoritePages.length} page={favoritePage} onChange={(_, v) => setFavoritePage(v)}/>
              </Box>
            ) : null}
          </AccordionDetails>
        </Accordion>
      ) : null}
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