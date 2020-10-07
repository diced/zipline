import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import UI from "../components/UI";
import UIPlaceholder from "../components/UIPlaceholder";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import Divider from "@material-ui/core/Divider";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Alert from "@material-ui/lab/Alert";
import Snackbar from "@material-ui/core/Snackbar";
import copy from "copy-to-clipboard";
import { LOGOUT, UPDATE_USER } from "../lib/reducer";
import { makeStyles } from "@material-ui/core";
import { store } from "../lib/store";
import { useDispatch } from "react-redux";

const useStyles = makeStyles({
  margin: {
    margin: "5px",
  },
  padding: {
    padding: "10px",
  },
});

export default function IndexPage() {
  const classes = useStyles();
  const router = useRouter();
  const dispatch = useDispatch();
  const state = store.getState();
  const [alertMessage, setAlertMessage] = useState("Copied token!");
  const [tokenOpen, setTokenOpen] = useState(false);
  const [resetToken, setResetToken] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const handleCopyTokenThenClose = async () => {
    const data = await (await fetch("/api/user/current")).json();
    if (!data.error) {
      copy(data.token);
      setAlertMessage("Copied token!");
      setTokenOpen(false);
      setAlertOpen(true);
    }
  };

  const handleResetTokenThenClose = async () => {
    const data = await (
      await fetch("/api/user/reset-token", { method: "POST" })
    ).json();
    if (!data.error && data.updated) {
      setAlertMessage("Reset token!");
      setResetToken(false);
      setAlertOpen(true);
    }
  };

  const handleLogout = async () => {
    const data = await (
      await fetch("/api/user/logout", { method: "POST" })
    ).json();
    if (!data.error && data.clearStore) {
      dispatch({ type: LOGOUT });
      dispatch({ type: UPDATE_USER, payload: null });
      setAlertMessage("Logged out!");
      setAlertOpen(true);
      router.push("/login");
    }
  };

  if (typeof window !== "undefined" && !state.loggedIn) router.push("/login");
  else {
    return (
      <UI>
        <Snackbar
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          open={alertOpen}
          autoHideDuration={6000}
          onClose={() => setAlertOpen(false)}
        >
          <Alert severity="success" variant="filled">
            {alertMessage}
          </Alert>
        </Snackbar>
        <Paper elevation={3} className={classes.padding}>
          <Typography variant="h5">
            Welcome back, {state.user.username}
          </Typography>
          <Typography color="textSecondary">
            You have <b>2</b> images
          </Typography>
          <div className={classes.margin}>
            <Typography variant="h5">Token</Typography>
            <Button
              variant="contained"
              color="primary"
              className={classes.margin}
              onClick={() => setTokenOpen(true)}
            >
              Copy
            </Button>
            <Dialog
              open={tokenOpen}
              onClose={() => setTokenOpen(true)}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="alert-dialog-title">Are you sure?</DialogTitle>
              <DialogContent>
                <DialogContentText id="alert-dialog-description">
                  This token is used to upload images to Zipline, and should not
                  be shared!
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setTokenOpen(true)} color="primary">
                  Close
                </Button>
                <Button
                  onClick={handleCopyTokenThenClose}
                  color="primary"
                  autoFocus
                >
                  Yes, copy!
                </Button>
              </DialogActions>
            </Dialog>
            <Button
              variant="contained"
              className={classes.margin}
              onClick={() => setResetToken(true)}
              style={{ backgroundColor: "#d6381c", color: "white" }}
            >
              Reset
            </Button>
            <Dialog
              open={resetToken}
              onClose={() => setResetToken(true)}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="alert-dialog-title">Are you sure?</DialogTitle>
              <DialogContent>
                <DialogContentText id="alert-dialog-description">
                  This token is used to upload images to Zipline, resetting your
                  token will cause any uploading actions to not work until you
                  update them your self.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setResetToken(true)} color="primary">
                  Close
                </Button>
                <Button
                  onClick={handleResetTokenThenClose}
                  color="primary"
                  autoFocus
                >
                  Yes, reset!
                </Button>
              </DialogActions>
            </Dialog>
          </div>
          <Divider />
          <div className={classes.margin}>
            <Typography variant="h5">User</Typography>
            <TextField label="Username" className={classes.margin} fullWidth />
            <TextField
              label="Password"
              type="password"
              className={classes.margin}
              fullWidth
            />
          </div>
          <Divider />
          <div className={classes.margin}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button variant="contained" color="primary" fullWidth>
                  Update
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button
                  variant="contained"
                  style={{ backgroundColor: "#d6381c", color: "white" }}
                  fullWidth
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </Grid>
            </Grid>
          </div>
        </Paper>
      </UI>
    );
  }
  return <UIPlaceholder />;
}
