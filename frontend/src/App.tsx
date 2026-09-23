import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireRole } from './components/Guards';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { VentePage } from './pages/VentePage';
import { ReceptionPage } from './pages/ReceptionPage';
import { ReapproPage } from './pages/ReapproPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/vente" element={<VentePage />} />
        <Route path="/clients" element={<CustomersPage />} />
        <Route
          path="/reception"
          element={
            <RequireRole min="ADMIN">
              <ReceptionPage />
            </RequireRole>
          }
        />
        <Route
          path="/reappro"
          element={
            <RequireRole min="ADMIN">
              <ReapproPage />
            </RequireRole>
          }
        />
        <Route
          path="/produits"
          element={
            <RequireRole min="ADMIN">
              <ProductsPage />
            </RequireRole>
          }
        />
        <Route
          path="/alertes"
          element={
            <RequireRole min="ADMIN">
              <AlertsPage />
            </RequireRole>
          }
        />
        <Route
          path="/rapports"
          element={
            <RequireRole min="ADMIN">
              <ReportsPage />
            </RequireRole>
          }
        />
        <Route
          path="/utilisateurs"
          element={
            <RequireRole min="SUPERVISOR">
              <UsersPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
