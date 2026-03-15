import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as auditLogApi from '../../api/audit-log.api';
import * as locationsApi from '../../api/locations.api';
import type { AuditLogResponseDto } from '../../types/audit-log.types';
import type { LocationOption } from '../../types/location.types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { format } from 'date-fns';

export function AuditLogPage() {
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await locationsApi.getLocations();
      const body = res.data as { data?: LocationOption[] };
      return body?.data ?? [];
    },
  });

  const hasFilters = !!locationId && !!startDate && !!endDate;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', locationId, startDate, endDate],
    queryFn: async () => {
      const res = await auditLogApi.getAuditLogs(locationId, startDate, endDate);
      const body = res.data as { data?: AuditLogResponseDto[] };
      return body?.data ?? [];
    },
    enabled: submitted && hasFilters,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasFilters) setSubmitted(true);
  };

  const handleExport = async () => {
    if (!locationId || !startDate || !endDate) return;
    try {
      const res = await auditLogApi.exportLogs(locationId, startDate, endDate);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data as string]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-log.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="al-location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              id="al-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-gray-900 min-w-[200px]"
              required
            >
              <option value="">Select location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="al-start" className="block text-sm font-medium text-gray-700 mb-1">
              Start date
            </label>
            <input
              id="al-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-gray-900"
              required
            />
          </div>
          <div>
            <label htmlFor="al-end" className="block text-sm font-medium text-gray-700 mb-1">
              End date
            </label>
            <input
              id="al-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-gray-900"
              required
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Load
          </button>
          {submitted && hasFilters && !isLoading && logs.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </button>
          )}
        </form>
      </div>
      <div className="overflow-x-auto">
        {!submitted || !hasFilters ? (
          <p className="p-8 text-center text-gray-500">Select location, start date and end date, then click Load to view audit logs.</p>
        ) : isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Performed at
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Entity type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Performed by
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Before / After
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(log.performedAt), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.entityType}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.performedBy}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-1">
                        {log.beforeState != null && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId((id) =>
                                  id === `${log.id}-before` ? null : `${log.id}-before`
                                )
                              }
                              className="text-left font-medium text-gray-700 hover:text-gray-900"
                            >
                              Before {expandedId === `${log.id}-before` ? '▼' : '▶'}
                            </button>
                            {expandedId === `${log.id}-before` && (
                              <pre className="mt-1 rounded bg-gray-100 p-2 text-xs overflow-auto max-h-32">
                                {JSON.stringify(log.beforeState, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                        {log.afterState != null && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId((id) =>
                                  id === `${log.id}-after` ? null : `${log.id}-after`
                                )
                              }
                              className="text-left font-medium text-gray-700 hover:text-gray-900"
                            >
                              After {expandedId === `${log.id}-after` ? '▼' : '▶'}
                            </button>
                            {expandedId === `${log.id}-after` && (
                              <pre className="mt-1 rounded bg-gray-100 p-2 text-xs overflow-auto max-h-32">
                                {JSON.stringify(log.afterState, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                        {log.beforeState == null && log.afterState == null && '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
        {submitted && hasFilters && !isLoading && logs.length === 0 && (
          <p className="p-8 text-center text-gray-500">No logs for this range.</p>
        )}
      </div>
    </div>
  );
}
