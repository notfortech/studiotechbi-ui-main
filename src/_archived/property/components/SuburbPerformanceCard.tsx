import type { SuburbPerformanceResponse } from '../../types/property/SuburbPerformanceResponse';
import { getUserFacingApiMessage } from '../../services/apiErrorMessage';

export interface SuburbPerformanceCardProps {
  data: SuburbPerformanceResponse | undefined;
  isLoading: boolean;
  error: unknown;
  /** When true, show hint to enter state + suburb */
  showEmptyHint?: boolean;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-6 w-2/5 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 rounded-lg bg-slate-200" />
        <div className="h-16 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

export function SuburbPerformanceCard({
  data,
  isLoading,
  error,
  showEmptyHint,
}: SuburbPerformanceCardProps) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Suburb performance</h2>
        <Skeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Suburb performance</h2>
        <p className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {getUserFacingApiMessage(error)}
        </p>
      </section>
    );
  }

  if (showEmptyHint && !data) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Suburb performance</h2>
        <p className="text-sm text-slate-500">
          Enter state and suburb, then click <span className="font-medium">Load suburb data</span>{' '}
          to view performance metrics.
        </p>
      </section>
    );
  }

  const hasStats =
    data?.medianPrice != null ||
    data?.medianRent != null ||
    data?.annualGrowthPercent != null ||
    data?.listingsCount != null ||
    (data?.series && data.series.length > 0) ||
    (data?.summary != null && data.summary !== '');

  if (!data || !hasStats) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Suburb performance</h2>
        <p className="text-sm text-slate-500">No performance data returned for this search.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Suburb performance</h2>
      <p className="mb-4 text-sm text-slate-600">
        {[data.suburb, data.state, data.postcode].filter(Boolean).join(', ') || 'Selected area'}
      </p>
      {data.summary ? <p className="mb-4 text-sm text-slate-600">{data.summary}</p> : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.medianPrice != null ? (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-slate-500">Median price</p>
            <p className="text-lg font-semibold text-slate-900">
              {typeof data.medianPrice === 'number'
                ? data.medianPrice.toLocaleString()
                : data.medianPrice}
            </p>
          </div>
        ) : null}
        {data.medianRent != null ? (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-slate-500">Median rent</p>
            <p className="text-lg font-semibold text-slate-900">{data.medianRent}</p>
          </div>
        ) : null}
        {data.annualGrowthPercent != null ? (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-slate-500">Annual growth</p>
            <p className="text-lg font-semibold text-slate-900">{data.annualGrowthPercent}%</p>
          </div>
        ) : null}
        {data.listingsCount != null ? (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium uppercase text-slate-500">Listings</p>
            <p className="text-lg font-semibold text-slate-900">{data.listingsCount}</p>
          </div>
        ) : null}
      </div>
      {data.series && data.series.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-medium uppercase text-slate-500">Recent periods</p>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
            {data.series.slice(0, 8).map((pt, idx) => (
              <li key={`${pt.period ?? idx}`} className="flex justify-between text-slate-700">
                <span>{pt.period ?? '—'}</span>
                <span>
                  {pt.medianPrice != null
                    ? typeof pt.medianPrice === 'number'
                      ? `$${pt.medianPrice.toLocaleString()}`
                      : String(pt.medianPrice)
                    : ''}
                  {pt.volume != null ? ` · ${pt.volume} sold` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
