import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import * as usersApi from '../api/users.api';
import type { UserDetailResponseDto } from '../types/user.types';

type RoleFilter = 'ALL' | 'ADMIN' | 'MANAGER' | 'STAFF';

function assignedDisplay(user: UserDetailResponseDto): string {
  if (user.role === 'STAFF') {
    const skills = user.staff_skills?.map((s) => s.skill_name).join(', ') ?? '';
    const locs = user.location_certifications?.map((c) => c.location_name).join(', ') ?? '';
    return [skills, locs].filter(Boolean).join(' · ') || '—';
  }
  if (user.role === 'MANAGER') {
    return user.manager_locations?.map((m) => m.location_name).join(', ') ?? '—';
  }
  return '—';
}

function UserCard({ user }: { user: UserDetailResponseDto }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="font-medium text-gray-900">{user.full_name}</p>
      <p className="text-sm text-gray-600">{user.email}</p>
      <p className="text-sm text-gray-500 mt-1">Role: {user.role}</p>
      <p className="text-sm text-gray-500">
        {user.role === 'MANAGER'
          ? 'Assigned locations: '
          : user.role === 'STAFF'
            ? 'Skills / Certified locations: '
            : ''}
        {assignedDisplay(user)}
      </p>
      <Link
        to={`/login?email=${encodeURIComponent(user.email)}`}
        className="mt-3 inline-block rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Login as this user
      </Link>
    </div>
  );
}

export function TestAccountsPage() {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['test-accounts'],
    queryFn: async () => {
      const res = await usersApi.getTestAccounts();
      const body = res.data as { data?: UserDetailResponseDto[] };
      return body?.data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (roleFilter === 'ALL') return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const admins = useMemo(() => filtered.filter((u) => u.role === 'ADMIN'), [filtered]);
  const managersAndStaff = useMemo(
    () => filtered.filter((u) => u.role === 'MANAGER' || u.role === 'STAFF'),
    [filtered],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Test accounts</h1>
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to login
          </Link>
        </div>

        <div className="mb-6 flex gap-2">
          {(['ALL', 'ADMIN', 'MANAGER', 'STAFF'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                roleFilter === role
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {role === 'ALL' ? 'All' : role.charAt(0) + role.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No test accounts.</p>
        ) : (
          <>
            {admins.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-gray-500 mb-2">Admin</h2>
                <div className="grid grid-cols-3 gap-4">
                  {admins.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              </div>
            )}
            {managersAndStaff.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-2">
                  {roleFilter === 'ALL' ? 'Managers & Staff' : roleFilter === 'MANAGER' ? 'Managers' : 'Staff'}
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {managersAndStaff.map((user) => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
