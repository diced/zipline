import React, { useEffect } from 'react';
import Head from 'next/head';
import Typography from '@material-ui/core/Typography';
import CssBaseline from '@material-ui/core/CssBaseline';
import Grid from '@material-ui/core/Grid';
import { ThemeProvider } from '@material-ui/core/styles';
import dark from '../lib/themes/dark';

export default function NotFound() {
  useEffect(() => {
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) jssStyles.parentElement.removeChild(jssStyles);
  }, []);

  const faces = ['◉_◉', 'ರ_ರ'];

  return (
    <React.Fragment>
      <Head>
        <title>Not Found</title>
        <meta
          name='viewport'
          content='minimum-scale=1, initial-scale=1, width=device-width'
        />
        <link
          rel='icon'
          type='image/png'
          href='https://twemoji.maxcdn.com/v/13.0.1/72x72/1f621.png'
        />
      </Head>

      <ThemeProvider theme={dark}>
        <CssBaseline />
        <Grid
          container
          spacing={0}
          direction='column'
          alignItems='center'
          justify='center'
          style={{ minHeight: '100vh' }}
        >
          <Grid item xs={6}>
            <Typography variant='h2'>
              <b>{faces[Math.floor(Math.random() * faces.length)]}</b>
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant='h4'>
              <b>Looks like you&apos;ve hit a dead end...</b>
            </Typography>
          </Grid>
        </Grid>
      </ThemeProvider>
    </React.Fragment>
  );
}
