import { useMemo, useState } from 'react';
import { useDemographics } from '../../hooks/property/useDemographics';
import { useSalesResults } from '../../hooks/property/useSalesResults';
import { useCityListings } from '../../hooks/property/useCityListings';
import { useDisclaimers } from '../../hooks/property/useDisclaimers';
import { usePropertyDetails } from '../../hooks/property/usePropertyDetails';
import { useSuburbPerformance } from '../../hooks/property/useSuburbPerformance';
import { useAddressLocators } from '../../hooks/property/useAddressLocators';
import { useLocationProfile } from '../../hooks/property/useLocationProfile';
import { useDebouncedValue } from '../../hooks/property/useDebouncedValue';
import { DemographicsCard } from '../../components/property/DemographicsCard';
import { SuburbPerformanceCard } from '../../components/property/SuburbPerformanceCard';
import { SalesResultsTable } from '../../components/property/SalesResultsTable';
import { PropertyDetailsCard } from '../../components/property/PropertyDetailsCard';
import { AddressSearchInput } from '../../components/property/AddressSearchInput';
import { getUserFacingApiMessage } from '../../services/apiErrorMessage';
import type { AddressLocatorSuggestion } from '../../types/property/AddressLocatorsResponse';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] as const;

const CITY_OPTIONS = [
  'Sydney',
  'Melbourne',
  'Brisbane',
  'Perth',
  'Adelaide',
  'Hobart',
  'Canberra',
  'Darwin',
] as const;

function formatDisclaimerPayload(data: unknown): string {
  if (data == null) return 'No disclaimer content returned.';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return 'Disclaimer content could not be displayed.';
  }
}

export function PropertyDashboardPage() {
  const [city, setCity] = useState<string>('');
  const [suburbForm, setSuburbForm] = useState({ state: 'NSW', suburb: '', postcode: '' });
  const [suburbSearch, setSuburbSearch] = useState<{
    state: string;
    suburb: string;
    postcode?: string;
  } | null>(null);

  const [propertyDraft, setPropertyDraft] = useState('');
  const [propertyId, setPropertyId] = useState('');

  const [addressInput, setAddressInput] = useState('');
  const debouncedAddress = useDebouncedValue(addressInput, 350);
  const [locationId, setLocationId] = useState('');

  const demographicsQ = useDemographics(suburbSearch);
  const salesQ = useSalesResults(city);
  const listingsQ = useCityListings(city);
  const disclaimersQ = useDisclaimers(true);
  const suburbQ = useSuburbPerformance({
    state: suburbSearch?.state ?? '',
    suburb: suburbSearch?.suburb ?? '',
    postcode: suburbSearch?.postcode,
  });
  const propertyQ = usePropertyDetails(propertyId);
  const addressQ = useAddressLocators(debouncedAddress);
  const locationQ = useLocationProfile(locationId);

  const addressSuggestions = useMemo(() => {
    const d = addressQ.data;
    if (!d) return [];
    const a = d.suggestions ?? [];
    const b = d.items ?? [];
    return [...a, ...b];
  }, [addressQ.data]);

  const handleSuburbLoad = () => {
    const sub = suburbForm.suburb.trim();
    if (!suburbForm.state.trim() || !sub) return;
    setSuburbSearch({
      state: suburbForm.state.trim(),
      suburb: sub,
      postcode: suburbForm.postcode.trim() || undefined,
    });
  };

  const handlePropertyLoad = () => {
    setPropertyId(propertyDraft.trim());
  };

  const handleSelectAddress = (s: AddressLocatorSuggestion) => {
    const id = s.domainLocationId ?? s.id;
    setLocationId(id != null ? String(id) : '');
    const label =
      s.displayText ?? [s.suburb, s.state, s.postcode].filter(Boolean).join(', ') ?? '';
    if (label) setAddressInput(label);
  };

  const suburbBusy = suburbQ.isFetching && suburbSearch != null;
  const propertyBusy = propertyQ.isFetching && propertyId.length > 0;

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Property market
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Suburb analytics, demographics, and sales activity powered by your Domain integration.
            Refine searches below; data loads on demand.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Suburb search</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="pm-state" className="mb-1 block text-sm font-medium text-slate-700">
                  State
                </label>
                <select
                  id="pm-state"
                  value={suburbForm.state}
                  onChange={(e) => setSuburbForm((f) => ({ ...f, state: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
                >
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pm-suburb" className="mb-1 block text-sm font-medium text-slate-700">
                  Suburb
                </label>
                <input
                  id="pm-suburb"
                  type="text"
                  value={suburbForm.suburb}
                  onChange={(e) => setSuburbForm((f) => ({ ...f, suburb: e.target.value }))}
                  placeholder="e.g. Surry Hills"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="pm-postcode" className="mb-1 block text-sm font-medium text-slate-700">
                  Postcode (optional)
                </label>
                <input
                  id="pm-postcode"
                  type="text"
                  value={suburbForm.postcode}
                  onChange={(e) => setSuburbForm((f) => ({ ...f, postcode: e.target.value }))}
                  placeholder="Refine with postcode"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSuburbLoad}
              disabled={
                suburbBusy || !suburbForm.state.trim() || !suburbForm.suburb.trim()
              }
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {suburbBusy ? 'Loading…' : 'Load suburb data'}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">City & sales</h2>
            <label htmlFor="pm-city" className="mb-1 block text-sm font-medium text-slate-700">
              City
            </label>
            <select
              id="pm-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
            >
              <option value="">Select a city</option>
              {CITY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="mt-3 text-xs text-slate-500">
              Sales results load automatically when a city is selected.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <SuburbPerformanceCard
            data={suburbQ.data}
            isLoading={
              (suburbQ.isPending || suburbQ.isFetching) && suburbSearch != null
            }
            error={suburbQ.error}
            showEmptyHint={suburbSearch == null}
          />
          <DemographicsCard
            data={demographicsQ.data}
            isLoading={
              suburbSearch != null &&
              (demographicsQ.isPending || demographicsQ.isFetching)
            }
            error={demographicsQ.error}
            showEmptyHint={suburbSearch == null}
          />
        </div>

        <SalesResultsTable
          data={salesQ.data}
          isLoading={(salesQ.isPending || salesQ.isFetching) && city.trim().length > 0}
          error={salesQ.error}
          cityLabel={city}
        />

        <SalesResultsTable
          title="City listings"
          data={listingsQ.data}
          isLoading={(listingsQ.isPending || listingsQ.isFetching) && city.trim().length > 0}
          error={listingsQ.error}
          cityLabel={city}
        />

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Disclaimers</h2>
          {disclaimersQ.isPending || disclaimersQ.isFetching ? (
            <div className="animate-pulse h-16 rounded bg-slate-200" aria-hidden />
          ) : disclaimersQ.error ? (
            <p className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {getUserFacingApiMessage(disclaimersQ.error)}
            </p>
          ) : (
            <pre className="max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              {formatDisclaimerPayload(disclaimersQ.data)}
            </pre>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Address & location</h2>
            <AddressSearchInput
              value={addressInput}
              onChange={setAddressInput}
              suggestions={addressSuggestions}
              isLoadingSuggestions={addressQ.isFetching}
              onSelectSuggestion={handleSelectAddress}
            />
            {locationId ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">Location profile</h3>
                {locationQ.isPending ? (
                  <div className="mt-2 animate-pulse space-y-2" aria-hidden>
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                  </div>
                ) : locationQ.error ? (
                  <p className="mt-2 border-l-4 border-amber-500 bg-amber-50 px-2 py-1 text-sm text-amber-900">
                    {getUserFacingApiMessage(locationQ.error)}
                  </p>
                ) : locationQ.data ? (
                  <dl className="mt-2 space-y-1 text-sm">
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Name</dt>
                      <dd className="font-medium text-slate-900">
                        {locationQ.data.name ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-slate-500">Type</dt>
                      <dd className="text-slate-800">{locationQ.data.type ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase text-slate-500">State / postcode</dt>
                      <dd className="text-slate-800">
                        {[locationQ.data.state, locationQ.data.postcode].filter(Boolean).join(' ') ||
                          '—'}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No profile data returned.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Pick a suggestion to load a Domain location profile.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Property by id</h2>
            <label htmlFor="pm-property-id" className="mb-1 block text-sm font-medium text-slate-700">
              Property id
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="pm-property-id"
                type="text"
                value={propertyDraft}
                onChange={(e) => setPropertyDraft(e.target.value)}
                placeholder="Listing or property identifier"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
              <button
                type="button"
                onClick={handlePropertyLoad}
                disabled={propertyBusy || !propertyDraft.trim()}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {propertyBusy ? 'Loading…' : 'Load'}
              </button>
            </div>
            <div className="mt-6">
              <PropertyDetailsCard
                data={propertyQ.data}
                isLoading={
                  (propertyQ.isPending || propertyQ.isFetching) && propertyId.length > 0
                }
                error={propertyQ.error}
                propertyIdLabel={propertyId}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
