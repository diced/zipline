import React from 'react';
import { useLogin } from '../lib/hooks';
import { useRouter } from 'next/router';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Divider from '@material-ui/core/Divider';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core';


const useStyles = makeStyles({
  margin: {
    margin: '5px'
  },
  padding: {
    padding: '10px'
  }
});

export default function IndexPage() {
  const classes = useStyles();
  const router = useRouter();
  const { loggedIn } = useLogin(false);

  if (typeof window !== 'undefined' && !loggedIn) router.push('/login');
  else {
    return (
      <UI>
        <Paper elevation={3} className={classes.padding}>
          <Typography variant="h5">Welcome back, user</Typography>
          <Typography color="textSecondary">You have <b>2</b> images</Typography>
          <div className={classes.margin}>
            <Typography variant="h5">Token</Typography>
            <Button variant="contained" color="primary" className={classes.margin}>
              Copy
              </Button>
            <Button variant="contained" className={classes.margin} style={{ backgroundColor: "#d6381c", color: "white" }}>
              Reset
            </Button>
          </div>
          <Divider />
          <div className={classes.margin}>
            <Typography variant="h5">User</Typography>
            <TextField label="Username" className={classes.margin} fullWidth />
            <TextField label="Password" type="password" className={classes.margin} fullWidth />
          </div>
          <Divider />
          <div className={classes.margin}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button variant="contained" color="primary" fullWidth>Update</Button>
              </Grid>
              <Grid item xs={6}>
                <Button variant="contained" style={{ backgroundColor: "#d6381c", color: "white" }} fullWidth>Logout</Button>
              </Grid>
            </Grid>
          </div>

        </Paper>
      </UI>
    );
  }
  return <UIPlaceholder />;
}