import { useState, useMemo, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
} from 'date-fns';
import { formatInTimezone } from '../../utils/timezone.utils';
import { useAuthStore } from '../../store/auth.store';
import * as usersApi from '../../api/users.api';
import * as shiftsApi from '../../api/shifts.api';
import * as skillsApi from '../../api/skills.api';
import { getSocket } from '../../socket/socket.client';
import type { ShiftResponseDto } from '../../types/shift.types';
import type { UserDetailResponseDto } from '../../types/user.types';
import type { FullValidationResult } from '../../types/validation.types';
import type { SkillOption } from '../../types/skill.types';

const WEEK_START = 1;

function getWeekRange(weekStart: Date): { start: string; end: string } {
  const start = startOfWeek(weekStart, { weekStartsOn: WEEK_START });
  const end = endOfWeek(weekStart, { weekStartsOn: WEEK_START });
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

function shiftDayKey(shift: ShiftResponseDto, timezone: string): string {
  return formatInTimezone(shift.start_time, timezone, 'yyyy-MM-dd');
}

export function SchedulePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: WEEK_START }));
  const [locationId, setLocationId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [previewResult, setPreviewResult] = useState<FullValidationResult | null>(null);

  const { data: userDetail } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await usersApi.getUser(user.id);
      const body = res.data as { data?: UserDetailResponseDto };
      return body?.data ?? null;
    },
    enabled: !!user?.id && user?.role === 'MANAGER',
  });

  const managerLocations = useMemo(
    () => userDetail?.manager_locations ?? [],
    [userDetail]
  );

  const selectedLocationId = locationId ?? managerLocations[0]?.location_id ?? '';
  const { start, end } = useMemo(() => getWeekRange(weekAnchor), [weekAnchor]);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts', selectedLocationId, start, end],
    queryFn: async () => {
      const res = await shiftsApi.getShifts(selectedLocationId, start, end);
      const body = res.data as { data?: ShiftResponseDto[] };
      return body?.data ?? [];
    },
    enabled: !!selectedLocationId,
  });

  const selectedShift = useQuery({
    queryKey: ['shift', selectedShiftId],
    queryFn: async () => {
      if (!selectedShiftId) return null;
      const res = await shiftsApi.getShift(selectedShiftId);
      const body = res.data as { data?: ShiftResponseDto };
      return body?.data ?? null;
    },
    enabled: !!selectedShiftId,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['shifts'] });
    socket.on('shift_updated', invalidate);
    socket.on('schedule_published', invalidate);
    return () => {
      socket.off('shift_updated', invalidate);
      socket.off('schedule_published', invalidate);
    };
  }, [queryClient]);

  const weekDays = useMemo(() => {
    const s = startOfWeek(weekAnchor, { weekStartsOn: WEEK_START });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const locationTimezone = 'UTC';

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ShiftResponseDto[]>();
    const tz = locationTimezone;
    for (const shift of shifts) {
      const key = shiftDayKey(shift, shift.location?.timezone ?? tz);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(shift);
    }
    return map;
  }, [shifts, locationTimezone]);

  if (user?.role !== 'MANAGER') {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">Access restricted to managers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <select
            value={selectedLocationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-gray-900 min-w-[180px]"
          >
            <option value="">Select location</option>
            {managerLocations.map((loc) => (
              <option key={loc.id} value={loc.location_id}>
                {loc.location_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekAnchor((w) => subWeeks(w, 1))}
            className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous week
          </button>
          <span className="text-sm font-medium text-gray-900">
            {format(weekAnchor, 'MMM d')} – {format(endOfWeek(weekAnchor, { weekStartsOn: WEEK_START }), 'MMM d, yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
            className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next week
          </button>
        </div>
        {selectedLocationId && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create Shift
          </button>
        )}
      </div>

      {!selectedLocationId ? (
        <p className="text-gray-500">Select a location to view schedule.</p>
      ) : isLoading ? (
        <p className="text-gray-500">Loading shifts…</p>
      ) : (
        <div className="grid grid-cols-7 gap-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayShifts = shiftsByDay.get(key) ?? [];
            return (
              <div key={key} className="border-r border-gray-200 last:border-r-0 p-2 min-h-[120px]">
                <p className="text-xs font-medium text-gray-500 mb-2">{format(day, 'EEE M/d')}</p>
                <div className="space-y-2">
                  {dayShifts.map((shift) => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setSelectedShiftId(shift.id)}
                      className="w-full text-left rounded border border-gray-200 bg-gray-50 p-2 hover:bg-gray-100"
                    >
                      <p className="text-xs font-medium text-gray-900">
                        {formatInTimezone(shift.start_time, shift.location?.timezone ?? 'UTC', 'HH:mm')}–
                        {formatInTimezone(shift.end_time, shift.location?.timezone ?? 'UTC', 'HH:mm')}
                      </p>
                      <p className="text-xs text-gray-600">{shift.required_skill?.name}</p>
                      <p className="text-xs text-gray-500">
                        {shift.assignments?.filter((a) => a.status === 'ACTIVE').length ?? 0}/{shift.headcount_needed} · {shift.status}
                      </p>
                      {shift.assignments?.length ? (
                        <p className="text-xs text-gray-500 truncate">
                          {shift.assignments.filter((a) => a.status === 'ACTIVE').map((a) => a.full_name).join(', ')}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

{createOpen && selectedLocationId && (
          <CreateShiftModal
            locationId={selectedLocationId}
          weekStart={start}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
          }}
        />
      )}

      {selectedShiftId && (
        <ShiftPanel
          shiftId={selectedShiftId}
          shift={selectedShift.data}
          isLoading={selectedShift.isLoading}
          locationId={selectedLocationId}
          weekStart={start}
          onClose={() => {
            setSelectedShiftId(null);
            setPreviewResult(null);
            setAssignUserId('');
          }}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            queryClient.invalidateQueries({ queryKey: ['shift', selectedShiftId] });
          }}
          previewResult={previewResult}
          assignUserId={assignUserId}
          onAssignUserIdChange={setAssignUserId}
          onPreviewResultChange={setPreviewResult}
        />
      )}
    </div>
  );
}

interface CreateShiftModalProps {
  locationId: string;
  weekStart: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateShiftModal({ locationId, weekStart, onClose, onSuccess }: CreateShiftModalProps) {
  const [startTime, setStartTime] = useState(`${weekStart}T09:00`);
  const [endTime, setEndTime] = useState(`${weekStart}T17:00`);
  const [requiredSkillId, setRequiredSkillId] = useState('');
  const [headcountNeeded, setHeadcountNeeded] = useState(1);
  const [isPremium, setIsPremium] = useState(false);

  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await skillsApi.getSkills();
      const body = res.data as { data?: { id: string; name: string }[] };
      return body?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (dto: {
      location_id: string;
      start_time: string;
      end_time: string;
      required_skill_id: string;
      headcount_needed: number;
      is_premium: boolean;
    }) => shiftsApi.createShift(dto),
    onSuccess: onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      location_id: locationId,
      start_time: startTime,
      end_time: endTime,
      required_skill_id: requiredSkillId,
      headcount_needed: headcountNeeded,
      is_premium: isPremium,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Shift</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required skill</label>
            <select
              value={requiredSkillId}
              onChange={(e) => setRequiredSkillId(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            >
              <option value="">Select skill</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headcount needed</label>
            <input
              type="number"
              min={1}
              value={headcountNeeded}
              onChange={(e) => setHeadcountNeeded(Number(e.target.value))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="premium"
              checked={isPremium}
              onChange={(e) => setIsPremium(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="premium" className="text-sm text-gray-700">Premium shift</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ShiftPanelProps {
  shiftId: string;
  shift: ShiftResponseDto | null | undefined;
  isLoading: boolean;
  locationId: string;
  weekStart: string;
  onClose: () => void;
  onUpdated: () => void;
  previewResult: FullValidationResult | null;
  assignUserId: string;
  onAssignUserIdChange: (v: string) => void;
  onPreviewResultChange: (v: FullValidationResult | null) => void;
}

function ShiftPanel({
  shiftId,
  shift,
  isLoading,
  locationId,
  weekStart,
  onClose,
  onUpdated,
  previewResult,
  assignUserId,
  onAssignUserIdChange,
  onPreviewResultChange,
}: ShiftPanelProps) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editSkillId, setEditSkillId] = useState('');
  const [editHeadcount, setEditHeadcount] = useState(1);
  const [editPremium, setEditPremium] = useState(false);

  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await skillsApi.getSkills();
      const body = res.data as { data?: SkillOption[] };
      return body?.data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { start_time?: string; end_time?: string; required_skill_id?: string; headcount_needed?: number; is_premium?: boolean } }) =>
      shiftsApi.updateShift(id, dto),
    onSuccess: () => {
      onUpdated();
      queryClient.invalidateQueries({ queryKey: ['shift', shiftId] });
    },
  });
  const publishMutation = useMutation({
    mutationFn: () => shiftsApi.publishWeek({ location_id: locationId, week_start: weekStart }),
    onSuccess: onUpdated,
  });
  const unpublishMutation = useMutation({
    mutationFn: () => shiftsApi.unpublishShift(shiftId),
    onSuccess: onUpdated,
  });
  const assignMutation = useMutation({
    mutationFn: (userId: string) => shiftsApi.assignStaff(shiftId, { user_id: userId }),
    onSuccess: () => {
      onUpdated();
      onPreviewResultChange(null);
      onAssignUserIdChange('');
    },
  });
  const unassignMutation = useMutation({
    mutationFn: (userId: string) => shiftsApi.unassignStaff(shiftId, { user_id: userId }),
    onSuccess: onUpdated,
  });

  const handlePreview = async () => {
    if (!assignUserId) return;
    try {
      const res = await shiftsApi.previewAssignment(shiftId, { user_id: assignUserId });
      const body = res.data as { data?: FullValidationResult };
      onPreviewResultChange(body?.data ?? null);
    } catch {
      onPreviewResultChange(null);
    }
  };

  if (isLoading || !shift) {
    return (
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l shadow-lg z-40 p-6 overflow-y-auto">
        <p className="text-gray-500">Loading…</p>
        <button type="button" onClick={onClose} className="mt-4 text-sm text-blue-600">Close</button>
      </div>
    );
  }

  const tz = shift.location?.timezone ?? 'UTC';
  const activeAssignments = shift.assignments?.filter((a) => a.status === 'ACTIVE') ?? [];

  const openEdit = () => {
    setEditStart(shift.start_time.slice(0, 16));
    setEditEnd(shift.end_time.slice(0, 16));
    setEditSkillId(shift.required_skill?.id ?? '');
    setEditHeadcount(shift.headcount_needed);
    setEditPremium(shift.is_premium);
    setEditMode(true);
  };

  const saveEdit = () => {
    updateMutation.mutate(
      {
        id: shiftId,
        dto: {
          start_time: editStart ? new Date(editStart).toISOString() : undefined,
          end_time: editEnd ? new Date(editEnd).toISOString() : undefined,
          required_skill_id: editSkillId || undefined,
          headcount_needed: editHeadcount,
          is_premium: editPremium,
        },
      },
      { onSuccess: () => setEditMode(false) }
    );
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l shadow-lg z-40 p-6 overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Shift details</h3>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      {!editMode ? (
        <>
          <p className="text-sm text-gray-600">
            {formatInTimezone(shift.start_time, tz, 'HH:mm')} – {formatInTimezone(shift.end_time, tz, 'yyyy-MM-dd HH:mm')}
          </p>
          <p className="text-sm text-gray-600">{shift.required_skill?.name}</p>
          <p className="text-sm text-gray-500">{shift.headcount_needed} needed · {shift.status}</p>
          {shift.is_premium && <p className="text-sm text-amber-600">Premium</p>}
          {activeAssignments.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">Assigned: {activeAssignments.map((a) => a.full_name).join(', ')}</p>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-500">Start</label>
            <input type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">End</label>
            <input type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="w-full rounded border px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Skill</label>
            <select value={editSkillId} onChange={(e) => setEditSkillId(e.target.value)} className="w-full rounded border px-2 py-1 text-sm">
              {skills.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">Headcount</label>
            <input type="number" min={1} value={editHeadcount} onChange={(e) => setEditHeadcount(Number(e.target.value))} className="w-full rounded border px-2 py-1 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={editPremium} onChange={(e) => setEditPremium(e.target.checked)} className="rounded" />
            <span className="text-sm">Premium</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditMode(false)} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
            <button type="button" onClick={saveEdit} disabled={updateMutation.isPending} className="rounded bg-gray-900 text-white px-3 py-1.5 text-sm disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {!editMode && (
          <button
            type="button"
            onClick={openEdit}
            className="w-full rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={() => publishMutation.mutate()}
          disabled={publishMutation.isPending || shift.status === 'PUBLISHED'}
          className="w-full rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Publish Week
        </button>
        <button
          type="button"
          onClick={() => unpublishMutation.mutate()}
          disabled={unpublishMutation.isPending || shift.status === 'DRAFT'}
          className="w-full rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Unpublish
        </button>
      </div>

      <div className="mt-6 border-t pt-4">
        <p className="text-sm font-medium text-gray-900 mb-2">Assign staff</p>
        <input
          type="text"
          placeholder="User ID"
          value={assignUserId}
          onChange={(e) => onAssignUserIdChange(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 mb-2"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreview}
            className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Preview
          </button>
          {previewResult && (
            <button
              type="button"
              onClick={() => assignUserId && assignMutation.mutate(assignUserId)}
              disabled={!previewResult.can_assign || assignMutation.isPending}
              className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Confirm assign
            </button>
          )}
        </div>
        {previewResult && (
          <div className="mt-2 text-sm">
            {previewResult.errors.length > 0 && (
              <p className="text-red-600">Errors: {previewResult.errors.map((e) => e.explanation).join('; ')}</p>
            )}
            {previewResult.warnings.length > 0 && (
              <p className="text-amber-600">Warnings: {previewResult.warnings.map((w) => w.explanation).join('; ')}</p>
            )}
            {previewResult.can_assign && previewResult.errors.length === 0 && (
              <p className="text-green-600">OK to assign</p>
            )}
          </div>
        )}
      </div>

      {activeAssignments.map((a) => (
        <div key={a.user_id} className="mt-2 flex items-center justify-between">
          <span className="text-sm text-gray-700">{a.full_name}</span>
          <button
            type="button"
            onClick={() => unassignMutation.mutate(a.user_id)}
            disabled={unassignMutation.isPending}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Unassign
          </button>
        </div>
      ))}
    </div>
  );
}
