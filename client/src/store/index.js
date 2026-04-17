import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice';
import companySlice from './companySlice';
import uiSlice from './uiSlice';

const store = configureStore({
  reducer: {
    auth: authSlice,
    company: companySlice,
    ui: uiSlice,
  },
});

export default store;
