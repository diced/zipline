// https://github.com/mikecao/umami/blob/master/redux/store.js
import { useMemo } from 'react';
import { Action, CombinedState, configureStore, EnhancedStore } from '@reduxjs/toolkit';
import thunk, { ThunkAction } from 'redux-thunk';
import rootReducer from './reducers';
import { User } from './reducers/user';
import { useDispatch, TypedUseSelectorHook, useSelector } from 'react-redux';

let store: EnhancedStore<CombinedState<{
  user: User;
}>>;

export function getStore(preloadedState) {
  return configureStore({
    reducer: rootReducer,
    middleware: [thunk],
    preloadedState,
  });
}

export const initializeStore = preloadedState => {
  let _store = store ?? getStore(preloadedState);

  if (preloadedState && store) {
    _store = getStore({
      ...store.getState(),
      ...preloadedState,
    });
    store = undefined;
  }

  if (typeof window === 'undefined') return _store;
  if (!store) store = _store;

  return _store;
};

export function useStore(initialState?: User) {
  return useMemo(() => initializeStore(initialState), [initialState]);
}

export type AppState = ReturnType<typeof store.getState>

export type AppDispatch = typeof store.dispatch

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  AppState,
  unknown,
  Action<User>
>

export const useStoreDispatch = () => useDispatch<AppDispatch>();
export const useStoreSelector: TypedUseSelectorHook<AppState> = useSelector;