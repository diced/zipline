import React from 'react';
import {
  Card as MuiCard,
  CardContent,
  Typography
} from '@material-ui/core';

export default function Card(props) {
  const { name, children, ...other } = props;

  return (
    <MuiCard sx={{ minWidth: '100%' }} {...other}>
      <CardContent>
        <Typography variant='h3'>{name}</Typography>
        {children}
      </CardContent>
    </MuiCard>
  );
}