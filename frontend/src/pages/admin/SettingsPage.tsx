import { useState, useMemo } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import * as settingsApi from '../../api/settings.api';
import type { SettingsResponseDto } from '../../types/settings.types';
import { getSettingKeyLabel } from '../../constants/setting-keys';
import { TableSkeleton } from '../../components/ui/Skeleton';

function normalizeRow(raw: SettingsResponseDto & { location_id?: string }): SettingsResponseDto & { locationIdResolved: string | null } {
  const id = raw.id;
  const locationIdResolved = raw.locationId ?? raw.location_id ?? null;
  const key = raw.key;
  const value = raw.value;
  return { ...raw, id, locationId: locationIdResolved, locationIdResolved, key, value };
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: settingsRaw = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await settingsApi.getAllSettings();
      const body = res.data as { data?: (SettingsResponseDto & { location_id?: string })[] };
      return body?.data ?? [];
    },
  });

  const settings = useMemo(() => settingsRaw.map(normalizeRow), [settingsRaw]);

  const upsertMutation = useMutation({
    mutationFn: ({
      locationId,
      key,
      value,
    }: {
      locationId: string;
      key: string;
      value: string;
    }) => settingsApi.upsertSetting(locationId, key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setEditingId(null);
      setFeedback({ type: 'success', message: 'Saved.' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setFeedback({ type: 'error', message: typeof msg === 'string' ? msg : 'Save failed.' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      settingsApi.updateSetting(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setEditingId(null);
      setFeedback({ type: 'success', message: 'Saved.' });
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setFeedback({ type: 'error', message: typeof msg === 'string' ? msg : 'Save failed.' });
    },
  });

  const startEdit = (row: ReturnType<typeof normalizeRow>) => {
    setEditingId(row.id);
    setEditValue(row.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (row: ReturnType<typeof normalizeRow>) => {
    if (row.locationIdResolved != null) {
      upsertMutation.mutate({
        locationId: row.locationIdResolved,
        key: row.key,
        value: editValue,
      });
    } else {
      updateMutation.mutate({ id: row.id, value: editValue });
    }
  };

  const isSaving = upsertMutation.isPending || updateMutation.isPending;

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        {feedback && (
          <p
            className={`mt-2 text-sm ${
              feedback.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {feedback.message}
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        {settingsLoading ? (
          <TableSkeleton rows={8} cols={4} />
        ) : (
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Setting
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Location
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {settings.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{getSettingKeyLabel(row.key)}</td>
                <td className="px-4 py-3 text-sm">
                  {editingId === row.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full max-w-md rounded border border-gray-300 px-2 py-1 text-gray-900"
                      autoFocus
                    />
                  ) : (
                    <span className="text-gray-600">{row.value}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {row.locationIdResolved ?? 'Global'}
                </td>
                <td className="px-4 py-3 text-right text-sm" onClick={(e) => e.stopPropagation()}>
                  {editingId === row.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveEdit(row)}
                        disabled={isSaving}
                        className="text-blue-600 hover:text-blue-700 font-medium mr-3 cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-gray-600 hover:text-gray-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(row);
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      {!settingsLoading && settings.length === 0 && (
        <p className="text-center text-gray-500 py-8">No settings.</p>
      )}
    </div>
  );
}
