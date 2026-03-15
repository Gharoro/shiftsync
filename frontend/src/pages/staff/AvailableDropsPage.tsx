import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as swapRequestsApi from '../../api/swap-requests.api';
import { formatInTimezone } from '../../utils/timezone.utils';
import { ListSkeleton } from '../../components/ui/Skeleton';
import type { SwapRequestResponseDto } from '../../types/swap-request.types';

export function AvailableDropsPage() {
  const queryClient = useQueryClient();

  const { data: drops = [], isLoading } = useQuery({
    queryKey: ['swap-requests', 'drops'],
    queryFn: async () => {
      const res = await swapRequestsApi.getAvailableDrops();
      const body = res.data as { data?: SwapRequestResponseDto[] };
      return body?.data ?? [];
    },
  });

  const claimMutation = useMutation({
    mutationFn: (shiftId: string) => swapRequestsApi.claimDrop({ shift_id: shiftId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests', 'drops'] });
    },
  });

  const tz = (req: SwapRequestResponseDto) => req.shift?.location?.timezone ?? 'UTC';

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Drops</h2>
        <ListSkeleton items={4} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Available Drops</h2>
      </div>
      <div className="p-4">
        {drops.length === 0 ? (
          <p className="text-gray-500">No drops available.</p>
        ) : (
          <ul className="space-y-4">
            {drops.map((drop) => (
              <li
                key={drop.id}
                className="rounded border border-gray-200 p-4 bg-gray-50"
              >
                <p className="font-medium text-gray-900">
                  Original staff: {drop.requester?.full_name ?? '—'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Location: {drop.shift?.location?.name ?? '—'}
                </p>
                <p className="text-sm text-gray-600">
                  Date: {drop.shift ? formatInTimezone(drop.shift.start_time, tz(drop), 'yyyy-MM-dd') : '—'}
                </p>
                <p className="text-sm text-gray-600">
                  Time: {drop.shift ? `${formatInTimezone(drop.shift.start_time, tz(drop), 'HH:mm')} – ${formatInTimezone(drop.shift.end_time, tz(drop), 'HH:mm')}` : '—'}
                </p>
                <p className="text-sm text-gray-600">Skill: —</p>
                <p className="text-sm text-gray-500 mt-1">
                  Expires: {format(new Date(drop.expires_at), 'yyyy-MM-dd HH:mm')}
                </p>
                <button
                  type="button"
                  onClick={() => claimMutation.mutate(drop.shift.id)}
                  disabled={claimMutation.isPending}
                  className="mt-3 rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Claim
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
