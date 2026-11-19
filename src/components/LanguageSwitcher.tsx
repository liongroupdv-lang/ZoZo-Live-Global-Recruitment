import type { Language } from '../data/translations';

interface LanguageSwitcherProps {
  language: Language;
  onChange: (lang: Language) => void;
  size?: 'sm' | 'md';
}

export function LanguageSwitcher({
  language,
  onChange,
  size = 'md',
}: LanguageSwitcherProps) {
  const padding = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <div
      role="group"
      aria-label="Language selection"
      className="inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg"
    >
      <button
        type="button"
        onClick={() => onChange('en')}
        aria-pressed={language === 'en'}
        className={`inline-flex items-center gap-2 ${padding} font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#4C1D95] ${
          language === 'en'
            ? 'bg-[#4C1D95] text-white shadow-xs'
            : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
        }`}
      >
        <span aria-hidden="true">🇬🇧</span>
        <span>English</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('bn')}
        aria-pressed={language === 'bn'}
        className={`inline-flex items-center gap-2 ${padding} font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#4C1D95] ${
          language === 'bn'
            ? 'bg-[#4C1D95] text-white shadow-xs'
            : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
        }`}
      >
        <span aria-hidden="true">🇧🇩</span>
        <span>বাংলা</span>
      </button>
    </div>
  );
}
