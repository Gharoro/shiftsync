import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { connectSocket } from '../../socket/socket.client';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

type Role = 'ADMIN' | 'MANAGER' | 'STAFF';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { token, user } = useAuthStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (token) {
      connectSocket(token);
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:ml-[260px]">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="mt-16 p-6 bg-slate-50 min-h-screen">
          <Outlet />
        </main>
      </div>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-black/50 md:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
