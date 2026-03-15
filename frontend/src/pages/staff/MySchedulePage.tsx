import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';
import * as shiftsApi from '../../api/shifts.api';
import * as usersApi from '../../api/users.api';
import { useAuthStore } from '../../store/auth.store';
import { formatInTimezone } from '../../utils/timezone.utils';
import { ListSkeleton } from '../../components/ui/Skeleton';
import type { ShiftResponseDto } from '../../types/shift.types';
import type { UserDetailResponseDto } from '../../types/user.types';

const WEEK_START = 1;

function getCurrentAndNextWeekRange(): { start: string; end: string } {
  const now = new Date();
  const currentStart = startOfWeek(now, { weekStartsOn: WEEK_START });
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: WEEK_START });
  return {
    start: format(currentStart, 'yyyy-MM-dd'),
    end: format(nextWeekEnd, 'yyyy-MM-dd'),
  };
}

export function MySchedulePage() {
  const user = useAuthStore((s) => s.user);
  const { start, end } = useMemo(() => getCurrentAndNextWeekRange(), []);

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
    () =>
      userDetail?.location_certifications?.map((c) => c.location_id).filter(Boolean) ?? [],
    [userDetail]
  );

  const { data: allShifts = [], isLoading } = useQuery({
    queryKey: ['shifts', 'staff', locationIds.join(','), start, end],
    queryFn: async () => {
      if (locationIds.length === 0) return [];
      const results = await Promise.all(
        locationIds.map(async (locationId) => {
          const res = await shiftsApi.getShifts(locationId, start, end);
          const body = res.data as { data?: ShiftResponseDto[] };
          return body?.data ?? [];
        })
      );
      return results.flat();
    },
    enabled: locationIds.length > 0,
  });

  const byDate = useMemo(() => {
    const map = new Map<string, ShiftResponseDto[]>();
    for (const shift of allShifts) {
      const tz = shift.location?.timezone ?? 'UTC';
      const key = formatInTimezone(shift.start_time, tz, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(shift);
    }
    const keys = Array.from(map.keys()).sort();
    return keys.map((key) => ({ dateKey: key, shifts: map.get(key)! }));
  }, [allShifts]);

  if (isLoading && allShifts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">My Schedule</h2>
        <ListSkeleton items={5} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">My Schedule</h2>
        <p className="text-sm text-slate-500 mt-1">Current and next week · locations you are certified at</p>
      </div>
      <div className="p-4">
        {byDate.length === 0 ? (
          <p className="text-slate-500">No shifts scheduled.</p>
        ) : (
          <div className="space-y-6">
            {byDate.map(({ dateKey, shifts }) => (
              <div key={dateKey}>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{dateKey}</h3>
                <ul className="space-y-2">
                  {shifts.map((shift) => {
                    const tz = shift.location?.timezone ?? 'UTC';
                    return (
                      <li
                        key={shift.id}
                        className="rounded border border-gray-200 p-3 bg-gray-50"
                      >
                        <p className="font-medium text-gray-900">{shift.location?.name ?? '—'}</p>
                        <p className="text-sm text-gray-600">
                          {formatInTimezone(shift.start_time, tz, 'HH:mm')} –{' '}
                          {formatInTimezone(shift.end_time, tz, 'HH:mm')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {shift.required_skill?.name ?? '—'}
                        </p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                            shift.status === 'PUBLISHED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {shift.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
