import { createStore } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import { reducer } from './reducer'

const persistedReducer = persistReducer({
  key: 'root',
  storage,
}, reducer);

let store = createStore(persistedReducer)
let persistor = persistStore(store)

export { store, persistor };