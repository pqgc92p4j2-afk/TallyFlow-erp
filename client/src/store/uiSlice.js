import { createSlice } from '@reduxjs/toolkit';

const initialTheme = localStorage.getItem('theme') || 'light';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    currentPage: 'dashboard',
    theme: initialTheme,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setCurrentPage: (state, action) => { state.currentPage = action.payload; },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },
  },
});

export const { toggleSidebar, setCurrentPage, toggleTheme } = uiSlice.actions;
export default uiSlice.reducer;
