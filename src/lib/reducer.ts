import { REHYDRATE } from "redux-persist";
import { User } from "./Data";

export const LOGIN = "LOGIN";
export const LOGOUT = "LOGOUT";
export const UPDATE_USER = "UPDATE_USER";
export interface State {
  loggedIn: boolean;
  user: User
}


const initialState: State = {
  loggedIn: false,
  user: null
};

export function reducer(state: State = initialState, action) {
  switch (action.type) {
    case LOGIN:
      return { ...state, loggedIn: true };
    case LOGOUT:
      return { ...state, loggedIn: false };
    case UPDATE_USER:
      return { ...state, user: action.payload };
    default:
      return state;
  }
}