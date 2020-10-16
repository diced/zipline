import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import { makeStyles } from '@material-ui/core';
import { store } from '../store';

const useStyles = makeStyles(theme => ({
  margin: {
    margin: '5px',
  },
  padding: {
    border: '1px solid #1f1f1f',
    padding: '10px',
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  tableBorder: {
    borderColor: '#130929',
  },
}));

export default function Index() {
  const classes = useStyles();
  const router = useRouter();
  const state = store.getState();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  if (typeof window === 'undefined') return <UIPlaceholder />;
  if (!state.loggedIn) router.push('/login');
  else {
    useEffect(() => {
      (async () => {
        const data = await (await fetch('/api/statistics')).json();
        if (!data.error) {
          setStats(data);
          setLoading(false);
        }
      })();
    }, []);

    return (
      <UI>
        <Backdrop className={classes.backdrop} open={loading}>
          <CircularProgress color='inherit' />
        </Backdrop>
        {!loading ? (
          <Paper elevation={3} className={classes.padding}>
            <Typography variant='h5'>Statistics</Typography>
            {stats ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className={classes.tableBorder}>
                        User
                      </TableCell>
                      <TableCell
                        className={classes.tableBorder}
                        align='right'
                      >
                        Images
                      </TableCell>
                      <TableCell
                        className={classes.tableBorder}
                        align='right'
                      >
                        Views
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.leaderboard.map(data => (
                      <TableRow key={data.username}>
                        <TableCell
                          className={classes.tableBorder}
                          component='th'
                          scope='row'
                        >
                          {data.username}
                        </TableCell>
                        <TableCell
                          className={classes.tableBorder}
                          align='right'
                        >
                          {data.images.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={classes.tableBorder}
                          align='right'
                        >
                          {data.views.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
          </Paper>
        ) : null}
      </UI>
    );
  }
  return <UIPlaceholder />;
}
