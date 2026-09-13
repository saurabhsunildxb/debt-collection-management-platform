import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Activities from './pages/Activities';
import CustomerDetail from './pages/CustomerDetail';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import LoanDetail from './pages/LoanDetail';
import Loans from './pages/Loans';
import Login from './pages/Login';
import Repayments from './pages/Repayments';

import UserManagement from './pages/UserManagement';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/loans/:id" element={<LoanDetail />} />
              <Route path="/repayments" element={<Repayments />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
