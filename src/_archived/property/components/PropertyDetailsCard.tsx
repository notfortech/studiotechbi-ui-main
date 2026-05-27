import type { PropertyResponse } from '../../types/property/PropertyResponse';
import { getUserFacingApiMessage } from '../../services/apiErrorMessage';

export interface PropertyDetailsCardProps {
  data: PropertyResponse | undefined;
  isLoading: boolean;
  error: unknown;
  propertyIdLabel: string;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2" aria-hidden>
      <div className="h-6 w-1/2 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-200" />
      <div className="h-4 w-4/5 rounded bg-slate-200" />
    </div>
  );
}

export function PropertyDetailsCard({
  data,
  isLoading,
  error,
  propertyIdLabel,
}: PropertyDetailsCardProps) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Property lookup</h2>
        <Skeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Property lookup</h2>
        <p className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {getUserFacingApiMessage(error)}
        </p>
      </section>
    );
  }

  if (!propertyIdLabel.trim()) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Property lookup</h2>
        <p className="text-sm text-slate-500">Enter a property id and click Load to fetch details.</p>
      </section>
    );
  }

  if (!data || (!data.address && !data.id && !data.listingId)) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Property lookup</h2>
        <p className="text-sm text-slate-500">No property details were returned for this id.</p>
      </section>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Id', value: String(data.id ?? data.listingId ?? propertyIdLabel) },
    { label: 'Address', value: data.address ?? '—' },
    { label: 'Suburb', value: data.suburb ?? '—' },
    { label: 'State', value: data.state ?? '—' },
    { label: 'Postcode', value: data.postcode ?? '—' },
    {
      label: 'Type',
      value: data.propertyType ?? '—',
    },
    {
      label: 'Bed / bath / car',
      value: [data.bedrooms, data.bathrooms, data.carSpaces].every((x) => x == null)
        ? '—'
        : `${data.bedrooms ?? '—'} / ${data.bathrooms ?? '—'} / ${data.carSpaces ?? '—'}`,
    },
    {
      label: 'Last sale',
      value:
        data.lastSalePrice != null
          ? `${typeof data.lastSalePrice === 'number' ? `$${data.lastSalePrice.toLocaleString()}` : data.lastSalePrice}${data.lastSaleDate ? ` · ${data.lastSaleDate}` : ''}`
          : '—',
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Property details</h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{r.label}</dt>
            <dd className="text-sm font-medium text-slate-900">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
