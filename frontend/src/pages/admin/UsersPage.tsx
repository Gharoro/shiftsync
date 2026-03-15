import { useState, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { TableSkeleton } from '../../components/ui/Skeleton';
import * as usersApi from '../../api/users.api';
import * as locationsApi from '../../api/locations.api';
import * as skillsApi from '../../api/skills.api';
import type { UserDetailResponseDto, CreateUserDto } from '../../types/user.types';
import type { LocationOption } from '../../types/location.types';
import type { SkillOption } from '../../types/skill.types';

function UserDetailPanel({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const res = await usersApi.getUser(userId);
      const body = res.data as { data?: UserDetailResponseDto };
      return body?.data ?? null;
    },
    enabled: !!userId,
  });

  if (isLoading || !user) {
    return (
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l shadow-lg z-40 p-6 overflow-y-auto">
        <p className="text-gray-500">Loading…</p>
        <button type="button" onClick={onClose} className="mt-4 text-sm text-blue-600">Close</button>
      </div>
    );
  }

  const skills = user.staff_skills?.map((s) => s.skill_name).join(', ') ?? '—';
  const locs = user.location_certifications?.map((c) => c.location_name).join(', ') ?? '—';
  const managerLocs = user.manager_locations?.map((m) => m.location_name).join(', ') ?? '—';

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l shadow-lg z-40 p-6 overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">User details</h3>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-gray-500">Name</dt>
          <dd className="text-gray-900 font-medium">{user.full_name}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Email</dt>
          <dd className="text-gray-900">{user.email}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Role</dt>
          <dd className="text-gray-900">{user.role}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Active</dt>
          <dd className="text-gray-900">{user.is_active ? 'Yes' : 'No'}</dd>
        </div>
        {user.role === 'STAFF' && (
          <>
            <div>
              <dt className="text-gray-500">Skills</dt>
              <dd className="text-gray-900">{skills}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Location certifications</dt>
              <dd className="text-gray-900">{locs}</dd>
            </div>
            {user.staff_profile?.hourly_rate != null && (
              <div>
                <dt className="text-gray-500">Hourly rate</dt>
                <dd className="text-gray-900">{user.staff_profile.hourly_rate}</dd>
              </div>
            )}
          </>
        )}
        {user.role === 'MANAGER' && (
          <div>
            <dt className="text-gray-500">Assigned locations</dt>
            <dd className="text-gray-900">{managerLocs}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

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

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locations: LocationOption[];
  skills: SkillOption[];
}

function CreateUserModal({ open, onClose, onSuccess, locations, skills }: CreateUserModalProps) {
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'STAFF'>('STAFF');
  const [skill_ids, setSkillIds] = useState<string[]>([]);
  const [location_ids, setLocationIds] = useState<string[]>([]);
  const [hourly_rate, setHourlyRate] = useState<string>('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (dto: CreateUserDto) => usersApi.createUser(dto),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['users'] });
      resetAndClose();
      onSuccess();
    },
  });

  const resetAndClose = () => {
    setFullName('');
    setEmail('');
    setRole('STAFF');
    setSkillIds([]);
    setLocationIds([]);
    setHourlyRate('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dto: CreateUserDto = {
      full_name,
      email,
      role,
    };
    if (role === 'STAFF') {
      if (skill_ids.length) dto.skill_ids = skill_ids;
      if (location_ids.length) dto.location_ids = location_ids;
      const rate = hourly_rate.trim();
      if (rate && !Number.isNaN(Number(rate))) dto.hourly_rate = Number(rate);
    } else if (role === 'MANAGER' && location_ids.length) {
      dto.location_ids = location_ids;
    }
    createMutation.mutate(dto);
  };

  const toggleSkill = (id: string) => {
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleLocation = (id: string) => {
    setLocationIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={resetAndClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create User</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              value={full_name}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'MANAGER' | 'STAFF')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            >
              <option value="MANAGER">MANAGER</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>
          {role === 'STAFF' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly rate</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourly_rate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
                  {skills.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skill_ids.includes(s.id)}
                        onChange={() => toggleSkill(s.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-900">{s.name}</span>
                    </label>
                  ))}
                  {skills.length === 0 && (
                    <p className="text-sm text-gray-500">No skills available</p>
                  )}
                </div>
              </div>
            </>
          )}
          {(role === 'MANAGER' || role === 'STAFF') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Locations</label>
              <div className="max-h-32 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
                {locations.map((loc) => (
                  <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={location_ids.includes(loc.id)}
                      onChange={() => toggleLocation(loc.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-900">{loc.name}</span>
                  </label>
                ))}
                {locations.length === 0 && (
                  <p className="text-sm text-gray-500">No locations available</p>
                )}
              </div>
            </div>
          )}
          {createMutation.isError && (
            <p className="text-sm text-red-600">
              {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create user'}
            </p>
          )}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={resetAndClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UsersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersApi.getUsers();
      const body = res.data as { data?: UserDetailResponseDto[] };
      return body?.data ?? [];
    },
  });

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await locationsApi.getLocations();
      const body = res.data as { data?: LocationOption[] };
      return body?.data ?? [];
    },
    enabled: modalOpen,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await skillsApi.getSkills();
      const body = res.data as { data?: SkillOption[] };
      return body?.data ?? [];
    },
    enabled: modalOpen,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeactivatingId(null);
    },
  });

  const confirmDeactivate = (user: UserDetailResponseDto) => {
    if (window.confirm(`Deactivate ${user.full_name}?`)) {
      setDeactivatingId(user.id);
      deactivateMutation.mutate(user.id);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {toast && (
        <div className="bg-green-600 text-white text-center py-3 px-4 text-sm font-medium">
          {toast.message}
        </div>
      )}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 cursor-pointer disabled:opacity-60"
        >
          Create User
        </button>
      </div>
      <div className="overflow-x-auto">
        {usersLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locations / Skills</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-sm text-gray-900">{user.full_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{user.role}</td>
                <td className="px-4 py-3 text-sm">{user.is_active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={assignedDisplay(user)}>
                  {assignedDisplay(user)}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {user.is_active && (
                    <button
                      type="button"
                      onClick={() => confirmDeactivate(user)}
                      disabled={deactivatingId === user.id}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deactivatingId === user.id ? 'Deactivating…' : 'Deactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      {!usersLoading && users.length === 0 && (
        <p className="text-center text-gray-500 py-8">No users yet.</p>
      )}
      <CreateUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          setToast({ message: 'User created successfully.' });
        }}
        locations={locations}
        skills={skills}
      />
      {selectedUserId && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" aria-hidden onClick={() => setSelectedUserId(null)} />
          <UserDetailPanel userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        </>
      )}
    </div>
  );
}
