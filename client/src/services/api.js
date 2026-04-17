import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api/v1' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
};

// Companies
export const companyAPI = {
  getAll: () => API.get('/companies'),
  getOne: (id) => API.get(`/companies/${id}`),
  create: (data) => API.post('/companies', data),
  update: (id, data) => API.put(`/companies/${id}`, data),
  switch: (id) => API.put(`/companies/${id}/switch`),
};

// Groups
export const groupAPI = {
  getAll: () => API.get('/groups'),
  create: (data) => API.post('/groups', data),
  update: (id, data) => API.put(`/groups/${id}`, data),
  delete: (id) => API.delete(`/groups/${id}`),
};

// Ledgers
export const ledgerAPI = {
  getAll: (params) => API.get('/ledgers', { params }),
  getOne: (id) => API.get(`/ledgers/${id}`),
  create: (data) => API.post('/ledgers', data),
  update: (id, data) => API.put(`/ledgers/${id}`, data),
  delete: (id) => API.delete(`/ledgers/${id}`),
  getOutstanding: (id) => API.get(`/ledgers/${id}/outstanding`),
};

// Vouchers
export const voucherAPI = {
  getAll: (params) => API.get('/vouchers', { params }),
  getOne: (id) => API.get(`/vouchers/${id}`),
  create: (data) => API.post('/vouchers', data),
  update: (id, data) => API.put(`/vouchers/${id}`, data),
  cancel: (id) => API.delete(`/vouchers/${id}`),
};

// Reports
export const reportAPI = {
  getDashboard: () => API.get('/reports/dashboard'),
  getTrialBalance: (params) => API.get('/reports/trial-balance', { params }),
  getBalanceSheet: () => API.get('/reports/balance-sheet'),
  getProfitLoss: (params) => API.get('/reports/profit-loss', { params }),
  getDayBook: (params) => API.get('/reports/day-book', { params }),
  getLedgerReport: (id, params) => API.get(`/reports/ledger/${id}`, { params }),
  getActivityHistory: (params) => API.get('/reports/activity-history', { params }),
};

// Customers
export const customerAPI = {
  getAll: (params) => API.get('/customers', { params }),
  getOne: (id) => API.get(`/customers/${id}`),
  create: (data) => API.post('/customers', data),
  update: (id, data) => API.put(`/customers/${id}`, data),
  delete: (id) => API.delete(`/customers/${id}`),
  getStatement: (id) => API.get(`/customers/${id}/statement`),
};

// Invoices
export const invoiceAPI = {
  getAll: (params) => API.get('/invoices', { params }),
  getOne: (id) => API.get(`/invoices/${id}`),
  create: (data) => API.post('/invoices', data),
  update: (id, data) => API.put(`/invoices/${id}`, data),
  updateStatus: (id, data) => API.put(`/invoices/${id}/status`, data),
  getStats: () => API.get('/invoices/stats'),
  getCustomerInvoices: (customerId) => API.get(`/invoices/customer/${customerId}`),
};

// Products
export const productAPI = {
  getAll: (params) => API.get('/products', { params }),
  getOne: (id) => API.get(`/products/${id}`),
  create: (data) => API.post('/products', data),
  update: (id, data) => API.put(`/products/${id}`, data),
  delete: (id) => API.delete(`/products/${id}`),
};

export default API;
