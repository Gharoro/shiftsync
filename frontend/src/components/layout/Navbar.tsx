import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { getPageTitle } from '../../constants/route-titles';
import { NotificationBell } from '../shared/NotificationBell';
import { UserAvatar } from '../shared/UserAvatar';

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const title = getPageTitle(pathname);

  return (
    <header className="fixed top-0 left-0 md:left-[260px] right-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-2 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="text-lg font-semibold text-slate-900 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <NotificationBell />
        <div className="hidden sm:flex items-center gap-3">
          <UserAvatar fullName={user?.full_name} className="w-8 h-8" />
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-slate-900 truncate max-w-[120px]">
              {user?.full_name}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {user?.role}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 sm:hidden">
          <UserAvatar fullName={user?.full_name} className="w-8 h-8" />
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {user?.role}
          </span>
        </span>
      </div>
    </header>
  );
}
