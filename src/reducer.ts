/* eslint-disable indent */
import { User } from './entities/User';

export const LOGIN = 'LOGIN';
export const LOGOUT = 'LOGOUT';
export const UPDATE_USER = 'UPDATE_USER';
export const STOP_LOADING = 'STOP_LOADING';
export const START_LOADING = 'START_LOADING';

export interface State {
  loggedIn: boolean;
  user: User;
  loading: boolean;
}

const initialState: State = {
  loggedIn: false,
  user: null,
  loading: true
};

export function reducer(state: State = initialState, action) {
  switch (action.type) {
    case LOGIN:
      return { ...state, loggedIn: true };
    case LOGOUT:
      return { ...state, loggedIn: false };
    case UPDATE_USER:
      return { ...state, user: action.payload };
    case START_LOADING:
      return { ...state, loading: true };
    case STOP_LOADING:
      return { ...state, loading: false };
    default:
      return state;
  }
}
