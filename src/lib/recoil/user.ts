import { oauth } from '@prisma/client';
import { atom, selector } from 'recoil';

export interface User {
  username: string;
  token: string;
  embedTitle: string;
  embedColor: string;
  embedSiteName: string;
  systemTheme: string;
  domains: string[];
  avatar?: string;
  administrator: boolean;
  superAdmin: boolean;
  oauth: oauth[];
  id: number;
}

export const userState = atom({
  key: 'userState',
  default: null as User,
});

export const userSelector = selector<User>({
  key: 'userSelector',
  get: ({ get }) => get(userState),
  set: ({ set }, newValue) => set(userState, newValue),
});
