import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../db/models/user';

type UserStore = {
  user: User | null;
  token: string | null;
  setUser: (user?: User | null) => void;
  setToken: (token?: string | null) => void;
};

export const useUserStore = create<UserStore>()((set) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
}));
