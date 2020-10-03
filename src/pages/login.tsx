import { useState, useEffect } from 'react';
import UI from '../components/UI';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Divider from '@material-ui/core/Divider';
import Container from '@material-ui/core/Container';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core';
import Router from 'next/router';
import { useLogin } from '../lib/hooks';

const useStyles = makeStyles({
  field: {
    width: '100%'
  },
  padding: {
    padding: '10px'
  },
});

export default function Index() {
  const classes = useStyles();
  const { loggedIn, login, logout } = useLogin(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    (async () => {
      const d = await (await fetch('/api/user/login-status')).json();
      d.user ? login() : logout();
    })()
  });
  if (loggedIn) return Router.push('/');
  return (
    <div>
      <Grid container spacing={0} direction="column" alignItems="center" justify="center" style={{ minHeight: '100vh' }}>
        <Grid item xs={6}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="h3" gutterBottom>
                Login
              </Typography>
              <TextField label="Username" className={classes.field} onChange={(e) => setUsername(e.target.value)} />
              <TextField label="Password" className={classes.field} onChange={(e) => setPassword(e.target.value)} />
            </CardContent>
            <CardActions>
              <Button color="primary" variant="contained" className={classes.field}>Login</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </div >
  )
}