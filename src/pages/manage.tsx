import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';
import UI from '../components/UI';
import UIPlaceholder from '../components/UIPlaceholder';
import copy from 'copy-to-clipboard';
import { LOGOUT, UPDATE_USER } from '../lib/reducer';
import { makeStyles } from '@material-ui/core';
import { store } from '../lib/store';
import { useDispatch } from 'react-redux';

const useStyles = makeStyles({
    margin: {
        margin: '5px',
    },
    padding: {
        padding: '10px',
    },
    field: {
        width: '100%',
    },
    button: {
        marginLeft: 'auto'
    }
});

export default function Manage() {
    const classes = useStyles();
    const router = useRouter();
    const dispatch = useDispatch();
    const state = store.getState();
    const [alertMessage, setAlertMessage] = useState('Copied token!');
    const [alertOpen, setAlertOpen] = useState(false);
    const [username, setUsername] = useState(state.user.username);
    const [password, setPassword] = useState('');

    if (typeof window !== 'undefined' && !state.loggedIn) router.push('/login');
    else {
        return (
            <UI>
                <Snackbar
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'center',
                    }}
                    open={alertOpen}
                    autoHideDuration={6000}
                    onClose={() => setAlertOpen(false)}
                >
                    <Alert severity='success' variant='filled'>
                        {alertMessage}
                    </Alert>
                </Snackbar>
                <Card>
                    <CardContent>
                        <Typography color='textSecondary' variant='h4' gutterBottom>
                            Manage
            </Typography>
                        <TextField
                            label='Username'
                            className={classes.field}
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label='Password'
                            type='password'
                            value={password}
                            className={classes.field}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </CardContent>
                    <CardActions>
                        <Button variant='contained' className={classes.button} color='primary'>
                            Update
            </Button>
                    </CardActions>
                </Card>
            </UI>
        );
    }
    return <UIPlaceholder />;
}

