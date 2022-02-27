import React from 'react';
import { LoadingOverlay } from '@mantine/core';

export default function Backdrop({ open }) {
  return (
    <LoadingOverlay visible={open} />
  );
}