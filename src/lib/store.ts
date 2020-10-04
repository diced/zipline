import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage';

import { reducer } from './reducer'

const persistedReducer = persistReducer({
  key: 'root',
  storage,
}, reducer);

let store = createStore(persistedReducer, composeWithDevTools(applyMiddleware(thunk)))
let persistor = persistStore(store)

export { store, persistor };