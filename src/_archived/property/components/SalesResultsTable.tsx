import type { SalesResultsResponse } from '../../types/property/SalesResultsResponse';
import { getUserFacingApiMessage } from '../../services/apiErrorMessage';

export interface SalesResultsTableProps {
  data: SalesResultsResponse | undefined;
  isLoading: boolean;
  error: unknown;
  cityLabel: string;
  /** Card heading (default: Sales trends). */
  title?: string;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-hidden>
      <div className="h-10 w-full rounded bg-slate-200" />
      <div className="h-10 w-full rounded bg-slate-200" />
      <div className="h-10 w-full rounded bg-slate-200" />
    </div>
  );
}

export function SalesResultsTable({
  data,
  isLoading,
  error,
  cityLabel,
  title = 'Sales trends',
}: SalesResultsTableProps) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
        <Skeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
        <p className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {getUserFacingApiMessage(error)}
        </p>
      </section>
    );
  }

  if (!cityLabel.trim()) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">Select a city to load recent sales results.</p>
      </section>
    );
  }

  const rows = data?.results ?? [];
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">
          No sales records returned for <span className="font-medium">{cityLabel}</span>.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {data?.totalCount != null ? (
          <span className="text-sm text-slate-500">{data.totalCount} results</span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
              <th className="py-2 pr-4">Address</th>
              <th className="py-2 pr-4">Suburb</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 25).map((row, i) => (
              <tr key={`${row.address ?? ''}-${i}`} className="border-b border-slate-100">
                <td className="py-2 pr-4 text-slate-800">{row.address ?? '—'}</td>
                <td className="py-2 pr-4 text-slate-600">{row.suburb ?? '—'}</td>
                <td className="py-2 pr-4 font-medium text-slate-900">
                  {row.salePrice != null && typeof row.salePrice === 'number'
                    ? `$${row.salePrice.toLocaleString()}`
                    : (row.salePrice ?? '—')}
                </td>
                <td className="py-2 text-slate-600">{row.saleDate ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
