import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { disconnectSocket } from '../../socket/socket.client';
import { UserAvatar } from '../shared/UserAvatar';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const ADMIN_LINKS: { to: string; label: string; icon: React.ReactNode }[] = [
  { to: '/admin/users', label: 'Users', icon: <UsersIcon /> },
  { to: '/admin/settings', label: 'Settings', icon: <SettingsIcon /> },
  { to: '/admin/audit-log', label: 'Audit Log', icon: <AuditIcon /> },
];

const MANAGER_LINKS: { to: string; label: string; icon: React.ReactNode }[] = [
  { to: '/manager/schedule', label: 'Schedule', icon: <CalendarIcon /> },
  { to: '/manager/swap-approvals', label: 'Swap Approvals', icon: <SwapIcon /> },
  { to: '/manager/overtime', label: 'Overtime', icon: <ClockIcon /> },
  { to: '/manager/fairness', label: 'Fairness', icon: <ScaleIcon /> },
  { to: '/manager/on-duty', label: 'On Duty', icon: <UserGroupIcon /> },
];

const STAFF_LINKS: { to: string; label: string; icon: React.ReactNode }[] = [
  { to: '/staff/schedule', label: 'My Schedule', icon: <CalendarIcon /> },
  { to: '/staff/swap-requests', label: 'Swap Requests', icon: <SwapIcon /> },
  { to: '/staff/drops', label: 'Available Drops', icon: <DropsIcon /> },
];

function UsersIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  );
}

function UserGroupIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function DropsIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const role = user?.role ?? 'STAFF';
  const links =
    role === 'ADMIN'
      ? ADMIN_LINKS
      : role === 'MANAGER'
        ? MANAGER_LINKS
        : STAFF_LINKS;

  const handleLogout = () => {
    clearAuth();
    disconnectSocket();
    navigate('/login', { replace: true });
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-30 h-screen w-[260px] bg-slate-800 flex flex-col transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="p-4 border-b border-slate-700">
        <span className="text-white font-bold text-lg">ShiftSync</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700 flex items-center gap-3">
        <UserAvatar fullName={user?.full_name} className="w-9 h-9" />
        <div className="min-w-0 flex-1">
          <p className="text-slate-200 text-sm truncate font-medium">{user?.full_name}</p>
          <p className="text-slate-400 text-xs truncate">{user?.role}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-red-400 hover:text-red-300 text-sm font-medium cursor-pointer"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
