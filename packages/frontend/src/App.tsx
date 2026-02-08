import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { syncManager } from './utils/syncManager';
import { ToastProvider } from './components/Toast';
import { DialogProvider } from './components/ui/DialogProvider';
import Layout from './components/Layout';
import Login from './pages/Login';
import POS from './pages/POS';
import KitchenBoard from './pages/kitchen/KitchenBoard';
import KitchenLayout from './pages/kitchen/KitchenLayout';
import KitchenHistory from './pages/kitchen/KitchenHistory';
import CustomerOrder from './pages/CustomerOrder';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import InvoiceHistory from './pages/InvoiceHistory';
import MenuManager from './pages/admin/MenuManager';
import StaffManager from './pages/admin/StaffManager';
import SettingsV3 from './pages/admin/SettingsV3';
import AuditLog from './pages/admin/AuditLog';
import CashManagement from './pages/admin/CashManagement';
import TableManager from './pages/admin/TableManager';
import AreaManager from './pages/admin/AreaManager';
import QRManager from './pages/admin/QRManager';
// import CustomerMenu from './pages/CustomerMenu';
import CustomerMenuV2 from './pages/CustomerMenuV2';
import CustomerMenuV3 from './pages/CustomerMenuV3';
import Reports from './pages/Reports';
import CustomerSettings from './pages/admin/CustomerSettings';
import LoyaltySettings from './pages/admin/LoyaltySettings';
import ScheduleCalendar from './pages/admin/ScheduleCalendar';
import TimeClock from './pages/admin/TimeClock';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPWA from './components/InstallPWA';
import type { ReactNode } from 'react';

function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'kitchen') {
      return <Navigate to="/kitchen" replace />;
    }
    return <Navigate to="/pos" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/pos" /> : <Login />} />

      <Route
        path="/pos"
        element={
          <ProtectedRoute roles={['owner', 'cashier']}>
            <POS />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kitchen/*"
        element={
          <ProtectedRoute roles={['owner', 'kitchen']}>
            <KitchenLayout>
              <Routes>
                <Route index element={<KitchenBoard />} />
                <Route path="history" element={<KitchenHistory />} />
              </Routes>
            </KitchenLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders"
        element={
          <ProtectedRoute roles={['owner', 'cashier']}>
            <Layout>
              <Orders />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/history"
        element={
          <ProtectedRoute roles={['owner', 'cashier']}>
            <Layout>
              <InvoiceHistory />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* PUBLIC: Customer self-order (no auth) - Using V3 as default */}
      <Route path="/customer/:tableId" element={<CustomerMenuV3 />} />
      {/* Legacy V2 fallback only */}
      <Route path="/menu-v2/:tableId" element={<CustomerMenuV2 />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/menu"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <MenuManager />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/staff"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <StaffManager />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/tables"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <TableManager />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/areas"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <AreaManager />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/reports"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/qr-codes"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <QRManager />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/cash"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <CashManagement />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/audit"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <AuditLog />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/settings"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <SettingsV3 />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/settings/customer"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <CustomerSettings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/loyalty"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <LoyaltySettings />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/analytics"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <AnalyticsDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/schedule"
        element={
          <ProtectedRoute roles={['owner']}>
            <Layout>
              <ScheduleCalendar />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/admin/timeclock"
        element={
          <ProtectedRoute>
            <Layout>
              <TimeClock />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Customer Order - Public route for QR scanning */}
      <Route path="/order" element={<CustomerOrder />} />

      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    // Start the sync manager when the app mounts
    syncManager.start();
    return () => syncManager.stop();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <DialogProvider>
            <AppRoutes />
            <OfflineIndicator />
            <InstallPWA />
          </DialogProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

