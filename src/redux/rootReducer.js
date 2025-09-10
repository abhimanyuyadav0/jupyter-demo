import { combineReducers } from '@reduxjs/toolkit';
import jupyterReducer from './slices/jupyterSlice';

const rootReducer = combineReducers({
  jupyter: jupyterReducer,
});

export default rootReducer;
