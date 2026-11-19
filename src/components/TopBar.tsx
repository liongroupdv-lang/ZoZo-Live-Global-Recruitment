import { ExternalLink, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { RECRUITMENT_COPY, type Language } from '../data/translations';
import { ZoZoLogo } from './ZoZoLogo';

interface TopBarProps {
  language: Language;
  logoUrl: string | null;
  onScrollToPositions: () => void;
  onScrollToProcess: () => void;
  onScrollToApply: () => void;
}

export function TopBar({
  language,
  logoUrl,
  onScrollToPositions,
  onScrollToProcess,
  onScrollToApply,
}: TopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const copy = RECRUITMENT_COPY[language];

  const handleAction = (fn: () => void) => {
    fn();
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0624]/95 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Official Brand Lockup */}
        <a
          href="/"
          className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22D3EE] rounded"
        >
          <ZoZoLogo logoUrl={logoUrl} size="sm" />
          <span>ZoZo Live</span>
        </a>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleAction(onScrollToPositions)}
            className="py-1 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copy.nav.positions}
          </button>
          <button
            type="button"
            onClick={() => handleAction(onScrollToProcess)}
            className="py-1 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copy.nav.process}
          </button>
          <button
            type="button"
            onClick={() => handleAction(onScrollToApply)}
            className="py-1 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copy.nav.apply}
          </button>
          <a
            href="https://download.zozolive.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="py-1 inline-flex items-center gap-1 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
          >
            <span>{copy.nav.downloadApp}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-75" aria-hidden="true" />
          </a>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleAction(onScrollToApply)}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4] hover:opacity-95 rounded-xl transition-opacity whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22D3EE]"
          >
            {copy.nav.apply}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0B0624] px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => handleAction(onScrollToPositions)}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            {copy.nav.positions}
          </button>
          <button
            type="button"
            onClick={() => handleAction(onScrollToProcess)}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            {copy.nav.process}
          </button>
          <button
            type="button"
            onClick={() => handleAction(onScrollToApply)}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            {copy.nav.apply}
          </button>
          <a
            href="https://download.zozolive.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#22D3EE] hover:bg-white/10"
          >
            <span>{copy.nav.downloadApp}</span>
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      )}
    </header>
  );
}
