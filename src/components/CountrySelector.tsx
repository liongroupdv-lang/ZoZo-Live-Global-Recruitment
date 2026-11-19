import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_COUNTRIES, type CountryOption } from '../data/countries';

interface CountrySelectorProps {
  value: CountryOption | null;
  onChange: (country: CountryOption) => void;
  hasError?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptySearch: string;
}

export function CountrySelector({
  value,
  onChange,
  hasError = false,
  placeholder,
  searchPlaceholder,
  emptySearch,
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm bg-white border rounded-xl transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#4F46E5] ${
          hasError
            ? 'border-red-400 focus:border-red-500'
            : isOpen
            ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/15'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {value ? (
          <span className="flex items-center gap-2.5 text-slate-900 truncate">
            <span className="text-lg leading-none shrink-0" aria-hidden="true">
              {value.flag}
            </span>
            <span className="font-medium truncate">{value.name}</span>
          </span>
        ) : (
          <span className="text-slate-400 truncate">{placeholder}</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  } else if (e.key === 'Enter' && filtered.length > 0) {
                    e.preventDefault();
                    onChange(filtered[0]);
                    setIsOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                {emptySearch}
              </div>
            ) : (
              filtered.map((country) => {
                const selected = value?.label === country.label;
                return (
                  <button
                    key={country.label}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(country);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                      selected
                        ? 'bg-indigo-50 text-[#4F46E5] font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none shrink-0" aria-hidden="true">
                        {country.flag}
                      </span>
                      <span className="truncate">{country.name}</span>
                    </span>
                    {selected && <Check className="w-4 h-4 text-[#4F46E5] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
