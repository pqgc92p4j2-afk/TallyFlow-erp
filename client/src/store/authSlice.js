import { createSlice } from '@reduxjs/toolkit';

const user = JSON.parse(localStorage.getItem('user') || 'null');
const token = localStorage.getItem('token');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: user,
    token: token,
    isAuthenticated: !!token,
    isAdminMode: localStorage.getItem('isAdminMode') === 'true',
    loading: false,
  },
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isAdminMode = action.payload.isAdminMode || false;
      state.loading = false;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('isAdminMode', action.payload.isAdminMode ? 'true' : 'false');
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isAdminMode = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isAdminMode');
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setAdminMode: (state, action) => {
      state.isAdminMode = action.payload;
      localStorage.setItem('isAdminMode', action.payload ? 'true' : 'false');
    },
  },
});

export const { loginSuccess, logout, updateUser, setLoading, setAdminMode } = authSlice.actions;
export default authSlice.reducer;
