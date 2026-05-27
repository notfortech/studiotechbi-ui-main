import type { DemographicsResponse } from '../../types/property/DemographicsResponse';
import { getUserFacingApiMessage } from '../../services/apiErrorMessage';

export interface DemographicsCardProps {
  data: DemographicsResponse | undefined;
  isLoading: boolean;
  error: unknown;
  /** When true, prompt user to run a suburb search first. */
  showEmptyHint?: boolean;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-5 w-1/3 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-200" />
      <div className="h-4 w-5/6 rounded bg-slate-200" />
    </div>
  );
}

export function DemographicsCard({ data, isLoading, error, showEmptyHint }: DemographicsCardProps) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Demographics</h2>
        <Skeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Demographics</h2>
        <p className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {getUserFacingApiMessage(error)}
        </p>
      </section>
    );
  }

  if (showEmptyHint) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Demographics</h2>
        <p className="text-sm text-slate-500">
          Load suburb data (state and suburb) to fetch demographics for that area.
        </p>
      </section>
    );
  }

  const metrics = data?.metrics?.filter((m) => m.label != null || m.value != null) ?? [];
  const hasBody =
    data?.summary ||
    data?.population != null ||
    data?.medianAge != null ||
    data?.medianIncome != null ||
    metrics.length > 0;

  if (!hasBody) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Demographics</h2>
        <p className="text-sm text-slate-500">No demographics summary is available yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Demographics</h2>
      {data?.region ? (
        <p className="mb-2 text-sm font-medium text-slate-700">{data.region}</p>
      ) : null}
      {data?.summary ? <p className="mb-4 text-sm text-slate-600">{data.summary}</p> : null}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data?.population != null ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Population
            </dt>
            <dd className="text-base font-semibold text-slate-900">{data.population}</dd>
          </div>
        ) : null}
        {data?.medianAge != null ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Median age
            </dt>
            <dd className="text-base font-semibold text-slate-900">{data.medianAge}</dd>
          </div>
        ) : null}
        {data?.medianIncome != null ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Median income
            </dt>
            <dd className="text-base font-semibold text-slate-900">{data.medianIncome}</dd>
          </div>
        ) : null}
        {data?.householdSize != null ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Household size
            </dt>
            <dd className="text-base font-semibold text-slate-900">{data.householdSize}</dd>
          </div>
        ) : null}
      </dl>
      {metrics.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {metrics.map((m, i) => (
            <li key={`${String(m.label)}-${i}`} className="flex justify-between text-sm">
              <span className="text-slate-600">{m.label}</span>
              <span className="font-medium text-slate-900">
                {m.value}
                {m.unit ? ` ${m.unit}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
