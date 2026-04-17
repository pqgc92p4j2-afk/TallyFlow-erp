import { createSlice } from '@reduxjs/toolkit';

const companySlice = createSlice({
  name: 'company',
  initialState: {
    companies: [],
    activeCompany: JSON.parse(localStorage.getItem('activeCompany') || 'null'),
    loading: false,
  },
  reducers: {
    setCompanies: (state, action) => {
      state.companies = action.payload;
    },
    setActiveCompany: (state, action) => {
      state.activeCompany = action.payload;
      localStorage.setItem('activeCompany', JSON.stringify(action.payload));
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setCompanies, setActiveCompany, setLoading } = companySlice.actions;
export default companySlice.reducer;
