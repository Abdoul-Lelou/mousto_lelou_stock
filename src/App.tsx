import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Sales } from './pages/Sales';
import { Reports } from './pages/Reports';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { ActivityLogs } from './pages/ActivityLogs';
import { ProfilePage } from './pages/Profile';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (All authenticated users) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Shell><Dashboard /></Shell>} path="/" />
            <Route element={<Shell><Inventory /></Shell>} path="/inventory" />
            <Route element={<Shell><Sales /></Shell>} path="/sales" />
            <Route element={<Shell><Reports /></Shell>} path="/reports" />
            <Route element={<Shell><ProfilePage /></Shell>} path="/profile" /> {/* Added ProfilePage route */}
          </Route>

          {/* Admin Routes (Only 'admin' role) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<Shell><Admin /></Shell>} path="/admin" />
            <Route element={<Shell><ActivityLogs /></Shell>} path="/logs" />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}