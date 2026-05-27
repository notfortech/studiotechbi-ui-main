import type { AddressLocatorSuggestion } from '../../types/property/AddressLocatorsResponse';

export interface AddressSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: AddressLocatorSuggestion[];
  isLoadingSuggestions: boolean;
  onSelectSuggestion: (suggestion: AddressLocatorSuggestion) => void;
  disabled?: boolean;
}

export function AddressSearchInput({
  value,
  onChange,
  suggestions,
  isLoadingSuggestions,
  onSelectSuggestion,
  disabled,
}: AddressSearchInputProps) {
  const showList = value.trim().length >= 2 && (suggestions.length > 0 || isLoadingSuggestions);

  return (
    <div className="relative">
      <label htmlFor="property-address-search" className="mb-1 block text-sm font-medium text-slate-700">
        Address search
      </label>
      <input
        id="property-address-search"
        type="search"
        autoComplete="off"
        disabled={disabled}
        placeholder="Start typing an address…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-violet-600 placeholder:text-slate-400 focus:border-violet-600 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
      {showList ? (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
          role="listbox"
        >
          {isLoadingSuggestions && suggestions.length === 0 ? (
            <li className="px-3 py-2 text-slate-500">Searching…</li>
          ) : null}
          {suggestions.map((s, idx) => {
            const label =
              s.displayText ??
              [s.suburb, s.state, s.postcode].filter(Boolean).join(', ') ??
              `Suggestion ${idx + 1}`;
            return (
              <li key={String(s.id ?? s.domainLocationId ?? label)}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-slate-800 hover:bg-slate-50"
                  onClick={() => onSelectSuggestion(s)}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
