import { useState, useMemo } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';
import * as swapRequestsApi from '../../api/swap-requests.api';
import * as shiftsApi from '../../api/shifts.api';
import * as usersApi from '../../api/users.api';
import { useAuthStore } from '../../store/auth.store';
import { formatInTimezone } from '../../utils/timezone.utils';
import type { SwapRequestResponseDto } from '../../types/swap-request.types';
import type { ShiftResponseDto } from '../../types/shift.types';
import type { UserDetailResponseDto } from '../../types/user.types';

const WEEK_START = 1;

function getNextTwoWeeksRange(): { start: string; end: string } {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: WEEK_START });
  const end = endOfWeek(addWeeks(now, 1), { weekStartsOn: WEEK_START });
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
}

export function SwapRequestsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [formType, setFormType] = useState<'SWAP' | 'DROP'>('SWAP');
  const [shiftId, setShiftId] = useState('');
  const [targetShiftId, setTargetShiftId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['swap-requests', 'pending'],
    queryFn: async () => {
      const res = await swapRequestsApi.getPendingRequests();
      const body = res.data as { data?: SwapRequestResponseDto[] };
      return body?.data ?? [];
    },
  });

  const { data: userDetail } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await usersApi.getUser(user.id);
      const body = res.data as { data?: UserDetailResponseDto };
      return body?.data ?? null;
    },
    enabled: !!user?.id,
  });

  const locationIds = useMemo(
    () => userDetail?.location_certifications?.map((c) => c.location_id).filter(Boolean) ?? [],
    [userDetail]
  );

  const { start, end } = useMemo(() => getNextTwoWeeksRange(), []);

  const { data: allShifts = [] } = useQuery({
    queryKey: ['shifts', 'staff-form', locationIds.join(','), start, end],
    queryFn: async () => {
      if (locationIds.length === 0) return [];
      const results = await Promise.all(
        locationIds.map(async (locId) => {
          const res = await shiftsApi.getShifts(locId, start, end);
          const body = res.data as { data?: ShiftResponseDto[] };
          return body?.data ?? [];
        })
      );
      return results.flat();
    },
    enabled: locationIds.length > 0,
  });

  const myShifts = useMemo(
    () =>
      user?.id
        ? allShifts.filter((s) =>
            s.assignments?.some((a) => a.user_id === user.id && a.status === 'ACTIVE')
          )
        : [],
    [allShifts, user]
  );

  const otherShiftsForSwap = useMemo(
    () =>
      allShifts.filter(
        (s) =>
          s.id !== shiftId &&
          (s.assignments?.length ?? 0) > 0 &&
          s.assignments?.some((a) => a.user_id !== user?.id && a.status === 'ACTIVE')
      ),
    [allShifts, shiftId, user?.id]
  );

  const targetShift = useMemo(
    () => otherShiftsForSwap.find((s) => s.id === targetShiftId),
    [otherShiftsForSwap, targetShiftId]
  );

  const targetUserOptions = useMemo(
    () =>
      targetShift?.assignments?.filter((a) => a.user_id !== user?.id && a.status === 'ACTIVE') ?? [],
    [targetShift, user?.id]
  );

  const cancelMutation = useMutation({
    mutationFn: (id: string) => swapRequestsApi.cancelSwapRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests', 'pending'] });
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACCEPT' | 'REJECT' }) =>
      swapRequestsApi.respondToSwap(id, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests', 'pending'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: { shift_id: string; type: 'SWAP' | 'DROP'; target_shift_id?: string; target_user_id?: string }) =>
      swapRequestsApi.createSwapRequest(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests', 'pending'] });
      setShiftId('');
      setTargetShiftId('');
      setTargetUserId('');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftId) return;
    const dto: { shift_id: string; type: 'SWAP' | 'DROP'; target_shift_id?: string; target_user_id?: string } = {
      shift_id: shiftId,
      type: formType,
    };
    if (formType === 'SWAP') {
      if (targetShiftId) dto.target_shift_id = targetShiftId;
      if (targetUserId) dto.target_user_id = targetUserId;
    }
    createMutation.mutate(dto);
  };

  const tz = (req: SwapRequestResponseDto) => req.shift?.location?.timezone ?? 'UTC';

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Swap Requests</h2>
      </div>

      <div className="p-4 space-y-8">
        <section>
          <h3 className="font-medium text-gray-900 mb-2">My Pending Requests</h3>
          {pendingLoading ? (
            <p className="text-gray-500">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-gray-500">No pending requests.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {pending.map((req) => {
                const isRequester = req.requester?.id === user?.id;
                const isTargetAndPendingStaff =
                  req.target_user?.id === user?.id && req.status === 'PENDING_STAFF';
                const canCancel =
                  isRequester &&
                  (req.status === 'PENDING_STAFF' || req.status === 'PENDING_MANAGER');

                return (
                  <li key={req.id} className="py-3 first:pt-0">
                    <p className="text-sm text-gray-600">
                      Status: {req.status} · Type: {req.type}
                    </p>
                    <p className="text-sm text-gray-600">
                      Shift: {req.shift?.location?.name}{' '}
                      {req.shift
                        ? `${formatInTimezone(req.shift.start_time, tz(req), 'MMM d HH:mm')} – ${formatInTimezone(req.shift.end_time, tz(req), 'HH:mm')}`
                        : ''}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => cancelMutation.mutate(req.id)}
                          disabled={cancelMutation.isPending}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                      {isTargetAndPendingStaff && (
                        <>
                          <button
                            type="button"
                            onClick={() => respondMutation.mutate({ id: req.id, action: 'ACCEPT' })}
                            disabled={respondMutation.isPending}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => respondMutation.mutate({ id: req.id, action: 'REJECT' })}
                            disabled={respondMutation.isPending}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h3 className="font-medium text-gray-900 mb-3">Create New Request</h3>
          <form onSubmit={handleCreateSubmit} className="space-y-3 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as 'SWAP' | 'DROP')}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              >
                <option value="SWAP">SWAP</option>
                <option value="DROP">DROP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">My shift</label>
              <select
                value={shiftId}
                onChange={(e) => {
                  setShiftId(e.target.value);
                  setTargetShiftId('');
                  setTargetUserId('');
                }}
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
              >
                <option value="">Select shift</option>
                {myShifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.location?.name} {formatInTimezone(s.start_time, s.location?.timezone ?? 'UTC', 'MMM d HH:mm')} –{' '}
                    {formatInTimezone(s.end_time, s.location?.timezone ?? 'UTC', 'HH:mm')}
                  </option>
                ))}
              </select>
            </div>
            {formType === 'SWAP' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target shift</label>
                  <select
                    value={targetShiftId}
                    onChange={(e) => {
                      setTargetShiftId(e.target.value);
                      setTargetUserId('');
                    }}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  >
                    <option value="">Select shift to swap with</option>
                    {otherShiftsForSwap.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.location?.name}{' '}
                        {formatInTimezone(s.start_time, s.location?.timezone ?? 'UTC', 'MMM d HH:mm')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target user</label>
                  <select
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                  >
                    <option value="">Select user</option>
                    {targetUserOptions.map((a) => (
                      <option key={a.user_id} value={a.user_id}>
                        {a.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {createMutation.isError && (
              <p className="text-sm text-red-600">
                {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  'Failed to create request'}
              </p>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create request'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
