import { useState, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import * as swapRequestsApi from '../../api/swap-requests.api';
import { getSocket } from '../../socket/socket.client';
import { formatInTimezone } from '../../utils/timezone.utils';
import { ListSkeleton } from '../../components/ui/Skeleton';
import type { SwapRequestResponseDto } from '../../types/swap-request.types';
import { format } from 'date-fns';

export function SwapApprovalsPage() {
  const queryClient = useQueryClient();
  const [rejectModal, setRejectModal] = useState<{ id: string; requesterName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['swap-requests', 'pending'],
    queryFn: async () => {
      const res = await swapRequestsApi.getPendingRequests();
      const body = res.data as { data?: SwapRequestResponseDto[] };
      return body?.data ?? [];
    },
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ['swap-requests', 'pending'] });
    socket.on('swap_requested', invalidate);
    socket.on('swap_accepted', invalidate);
    socket.on('swap_rejected', invalidate);
    socket.on('swap_rejected_by_manager', invalidate);
    return () => {
      socket.off('swap_requested', invalidate);
      socket.off('swap_accepted', invalidate);
      socket.off('swap_rejected', invalidate);
      socket.off('swap_rejected_by_manager', invalidate);
    };
  }, [queryClient]);

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      swapRequestsApi.managerDecision(id, { action: 'APPROVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests', 'pending'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, rejection_reason }: { id: string; rejection_reason: string }) =>
      swapRequestsApi.managerDecision(id, { action: 'REJECT', rejection_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swap-requests', 'pending'] });
      setRejectModal(null);
      setRejectionReason('');
    },
  });

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal || !rejectionReason.trim()) return;
    rejectMutation.mutate({ id: rejectModal.id, rejection_reason: rejectionReason.trim() });
  };

  const tz = (req: SwapRequestResponseDto) => req.shift?.location?.timezone ?? 'UTC';

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Swap Approvals</h2>
      </div>
      <div className="p-4">
        {isLoading ? (
          <ListSkeleton items={4} />
        ) : requests.length === 0 ? (
          <p className="text-gray-500">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {requests.map((req) => (
              <li key={req.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{req.requester?.full_name ?? '—'}</p>
                    <p className="text-sm text-gray-600">
                      Type: {req.type} · Status: {req.status}
                    </p>
                    <p className="text-sm text-gray-600">
                      Shift: {req.shift?.location?.name ?? '—'}{' '}
                      {req.shift
                        ? `${formatInTimezone(req.shift.start_time, tz(req), 'MMM d HH:mm')} – ${formatInTimezone(req.shift.end_time, tz(req), 'HH:mm')}`
                        : ''}
                    </p>
                    {req.target_user && (
                      <p className="text-sm text-gray-600">
                        Target user: {req.target_user.full_name}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      Expires: {format(new Date(req.expires_at), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate(req.id)}
                      disabled={approveMutation.isPending}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                    >
                      {approveMutation.isPending ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRejectModal({ id: req.id, requesterName: req.requester?.full_name ?? 'Requester' })
                      }
                      className="rounded-md border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setRejectModal(null);
              setRejectionReason('');
            }}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject request</h3>
            <p className="text-sm text-gray-600 mb-3">
              Reject swap request from {rejectModal.requesterName}. Reason is required.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rejection reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 mb-4"
                placeholder="Enter reason..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModal(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending || !rejectionReason.trim()}
                  className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
