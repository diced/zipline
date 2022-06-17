import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers';
import { useDispatch, TypedUseSelectorHook, useSelector } from 'react-redux';

export const store = configureStore({
  reducer: rootReducer,
});

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useStoreDispatch = () => useDispatch<AppDispatch>();
export const useStoreSelector: TypedUseSelectorHook<AppState> = useSelector;