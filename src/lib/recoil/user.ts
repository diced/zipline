import type { UserExtended } from 'middleware/withZipline';
import { atom, selector } from 'recoil';

export const userState = atom({
  key: 'userState',
  default: null as UserExtended,
});

export const userSelector = selector<UserExtended>({
  key: 'userSelector',
  get: ({ get }) => get(userState),
  set: ({ set }, newValue) => set(userState, newValue),
});
