import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { syncManager } from './utils/syncManager';
import { ToastProvider } from './components/Toast';
import { DialogProvider } from './components/ui/DialogProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPWA from './components/InstallPWA';
import type { ReactNode } from 'react';

// Lazy Load Components
const Login = lazy(() => import('./pages/Login'));
const POS = lazy(() => import('./pages/POS'));
const KitchenBoard = lazy(() => import('./pages/kitchen/KitchenBoard'));
const KitchenLayout = lazy(() => import('./pages/kitchen/KitchenLayout'));
const KitchenHistory = lazy(() => import('./pages/kitchen/KitchenHistory'));
const CustomerOrder = lazy(() => import('./pages/CustomerOrder'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const InvoiceHistory = lazy(() => import('./pages/InvoiceHistory'));
const MenuManager = lazy(() => import('./pages/admin/MenuManager'));
const StaffManager = lazy(() => import('./pages/admin/StaffManager'));
const SettingsV3 = lazy(() => import('./pages/admin/SettingsV3'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const CashManagement = lazy(() => import('./pages/admin/CashManagement'));
const TableManager = lazy(() => import('./pages/admin/TableManager'));
const AreaManager = lazy(() => import('./pages/admin/AreaManager'));
const QRManager = lazy(() => import('./pages/admin/QRManager'));
const CustomerMenuV2 = lazy(() => import('./pages/CustomerMenuV2'));
const CustomerMenuV3 = lazy(() => import('./pages/CustomerMenuV3'));
const Reports = lazy(() => import('./pages/Reports'));
const CustomerSettings = lazy(() => import('./pages/admin/CustomerSettings'));
const LoyaltySettings = lazy(() => import('./pages/admin/LoyaltySettings'));
const ScheduleCalendar = lazy(() => import('./pages/admin/ScheduleCalendar'));
const TimeClock = lazy(() => import('./pages/admin/TimeClock'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );
}

function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
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
    <Suspense fallback={<LoadingFallback />}>
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

        {/* PUBLIC: Customer self-order (no auth) */}
        <Route path="/customer/:tableId" element={<CustomerMenuV3 />} />
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
    </Suspense>
  );
}

export default function App() {
  useEffect(() => {
    syncManager.start();
    return () => syncManager.stop();
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider>
              <DialogProvider>
                <AppRoutes />
                <OfflineIndicator />
                <InstallPWA />
              </DialogProvider>
            </ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
