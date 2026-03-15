import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PlaceholderPage } from './components/layout/PlaceholderPage';
import { LoginPage } from './pages/auth/LoginPage';
import { TestAccountsPage } from './pages/TestAccountsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { UsersPage } from './pages/admin/UsersPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { SchedulePage } from './pages/manager/SchedulePage';
import { SwapApprovalsPage } from './pages/manager/SwapApprovalsPage';
import { MySchedulePage } from './pages/staff/MySchedulePage';
import { SwapRequestsPage } from './pages/staff/SwapRequestsPage';
import { AvailableDropsPage } from './pages/staff/AvailableDropsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/test-accounts" element={<TestAccountsPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route index element={<PlaceholderPage title="Admin" />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
      </Route>
      <Route path="/manager" element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
        <Route index element={<PlaceholderPage title="Manager" />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="swap-approvals" element={<SwapApprovalsPage />} />
        <Route path="overtime" element={<PlaceholderPage title="Overtime" />} />
        <Route path="fairness" element={<PlaceholderPage title="Fairness" />} />
        <Route path="on-duty" element={<PlaceholderPage title="On Duty" />} />
      </Route>
      <Route path="/staff" element={<ProtectedRoute allowedRoles={['STAFF']} />}>
        <Route index element={<PlaceholderPage title="Staff" />} />
        <Route path="schedule" element={<MySchedulePage />} />
        <Route path="swap-requests" element={<SwapRequestsPage />} />
        <Route path="drops" element={<AvailableDropsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
