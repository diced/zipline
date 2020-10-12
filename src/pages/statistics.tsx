import React from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Grid from '@material-ui/core/Grid';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../lib/store';

const useStyles = makeStyles({
  margin: {
    margin: '5px',
  },
  padding: {
    padding: '10px',
  },
  tableBorder: {
    borderColor: '#130929'
  }
});

export default function Index() {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();
  const [stats, setStats] = React.useState(null);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  if (!state.loggedIn) router.push('/login');
  else {
    React.useEffect(() => {
      (async () => {
        const data = await (await fetch('/api/statistics')).json();
        if (!data.error) setStats(data);
      })();
    }, []);

    return (
      <UI>
        <Paper elevation={3} className={classes.padding}>
          <Typography variant='h5'>
            Statistics
          </Typography>
          {stats ? (
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <TableContainer>
                  <Table style={{ border: 'none' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell className={classes.tableBorder}>User</TableCell>
                        <TableCell className={classes.tableBorder} align="right">Images</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.leaderboardImages.map((data) => (
                        <TableRow key={data.username}>
                          <TableCell className={classes.tableBorder} component="th" scope="row">
                            {data.username}
                          </TableCell>
                          <TableCell className={classes.tableBorder} align="right">{data.images.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
              <Grid item xs={6}>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell className={classes.tableBorder}>User</TableCell>
                        <TableCell className={classes.tableBorder} align="right">Views</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.leaderboardViews.map((data) => (
                        <TableRow key={data.username}>
                          <TableCell className={classes.tableBorder} component="th" scope="row">
                            {data.username}
                          </TableCell>
                          <TableCell className={classes.tableBorder} align="right">{data.views.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          ) : null}
        </Paper>
      </UI>
    );
  }
  return <UIPlaceholder />;
}