import { useState, useEffect } from 'react';
import Typography from '@material-ui/core/Typography';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core';
import { useDispatch } from 'react-redux';
import Router from 'next/router';
import { store, persistor } from '../lib/store';
import { UPDATE_USER, LOGIN } from '../lib/reducer';
import UIPlaceholder from '../components/UIPlaceholder';

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
  const dispatch = useDispatch();
  const state = store.getState();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const d = await (await fetch('/api/user/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })).json()
    if (!d.error) {
      dispatch({ type: UPDATE_USER, payload: d });
      dispatch({ type: LOGIN })
      Router.push('/');
    }
  }

  if (state.loggedIn) Router.push('/');
  else return (
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
              <Button color="primary" variant="contained" className={classes.field} onClick={handleLogin}>Login</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </div >
  )
  return <UIPlaceholder />
}