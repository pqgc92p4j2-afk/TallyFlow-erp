import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import GroupsPage from './pages/GroupsPage';
import LedgersPage from './pages/LedgersPage';
import VouchersPage from './pages/VouchersPage';
import VoucherForm from './pages/VoucherForm';
import TrialBalance from './pages/TrialBalance';
import BalanceSheet from './pages/BalanceSheet';
import ProfitLoss from './pages/ProfitLoss';
import DayBook from './pages/DayBook';
import LedgerReport from './pages/LedgerReport';
import CompanySetup from './pages/CompanySetup';
import TaxInvoice from './pages/TaxInvoice';
import CustomersPage from './pages/CustomersPage';
import ProductsPage from './pages/ProductsPage';
import InvoiceHistory from './pages/InvoiceHistory';
import AdminPanel from './pages/AdminPanel';
import CustomerStatement from './pages/CustomerStatement';
import History from './pages/History';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { activeCompany } = useSelector((state) => state.company);
  const { theme } = useSelector((state) => state.ui);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    } else {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    }
  }, [theme]);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
      <Route path="/setup-company" element={
        <ProtectedRoute><CompanySetup /></ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          {!activeCompany ? <Navigate to="/setup-company" /> : <MainLayout />}
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="ledgers" element={<LedgersPage />} />
        <Route path="vouchers" element={<VouchersPage />} />
        <Route path="vouchers/new/:type" element={<VoucherForm />} />
        <Route path="vouchers/edit/:id" element={<VoucherForm />} />
        <Route path="history" element={<History />} />
        <Route path="reports/trial-balance" element={<TrialBalance />} />
        <Route path="reports/balance-sheet" element={<BalanceSheet />} />
        <Route path="reports/profit-loss" element={<ProfitLoss />} />
        <Route path="reports/day-book" element={<DayBook />} />
        <Route path="reports/ledger/:id" element={<LedgerReport />} />
        <Route path="tax-invoice" element={<TaxInvoice />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="statement" element={<CustomerStatement />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="invoice-history" element={<InvoiceHistory />} />
        <Route path="admin" element={<AdminPanel />} />
        <Route path="company" element={<CompanySetup />} />
      </Route>
    </Routes>
  );
}

export default App;
