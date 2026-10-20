import { useState } from 'react';

export type UploadProgress = {
  percent: number;
  remaining: number;
  speed: number;
};

export const initialState: UploadProgress = {
  percent: 0,
  remaining: 0,
  speed: 0,
};

export function useProgress() {
  return useState<UploadProgress>(initialState);
}
