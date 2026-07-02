import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { useAuthStore } from './stores/auth.store';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MenuPage } from './pages/MenuPage';
import { StockPage } from './pages/StockPage';
import { UsersPage } from './pages/UsersPage';
import { TablesPage } from './pages/TablesPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { BillingPage } from './pages/BillingPage';
import { ConnectMetaPage } from './pages/ConnectMetaPage';
import { ConnectAfipPage } from './pages/ConnectAfipPage';
import { PilotSetupPage } from './pages/PilotSetupPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SettingsPage } from './pages/SettingsPage';
import { OrdersPage } from './pages/OrdersPage';
import { PlatformLoginPage } from './pages/PlatformLoginPage';
import { PlatformDashboardPage } from './pages/PlatformDashboardPage';
import { PlatformTenantDetailPage } from './pages/PlatformTenantDetailPage';
import { PlatformAuditPage } from './pages/PlatformAuditPage';
import { PlatformLayout } from './components/PlatformLayout';
import { usePlatformAuthStore } from './stores/platform-auth.store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  if (!isAuth) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PlatformProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = usePlatformAuthStore((s) => s.isAuthenticated());
  const isImpersonating = useAuthStore((s) => s.isImpersonating());
  if (isImpersonating) return <Navigate to="/" replace />;
  if (!isAuth) return <Navigate to="/platform/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/platform/login" element={<PlatformLoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="/platform"
          element={
            <PlatformProtectedRoute>
              <PlatformLayout />
            </PlatformProtectedRoute>
          }
        >
          <Route index element={<PlatformDashboardPage />} />
          <Route path="audit" element={<PlatformAuditPage />} />
          <Route path="tenants/:tenantId" element={<PlatformTenantDetailPage />} />
        </Route>
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/pilot-setup" element={<PilotSetupPage />} />
          <Route path="/connect-meta" element={<ConnectMetaPage />} />
          <Route path="/connect-afip" element={<ConnectAfipPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
