import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  username: string;
  token: string;
  embedTitle: string;
  embedColor: string;
}

const initialState: User = null;

const user = createSlice({
  name: 'user',
  initialState,
  reducers: {
    updateUser(state, action: PayloadAction<User>) {
      state = action.payload;
      return state;
    },
  },
});

export const { updateUser } = user.actions;

export default user.reducer;