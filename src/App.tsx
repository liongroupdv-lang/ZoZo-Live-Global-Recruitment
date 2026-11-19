import {
  ArrowDown,
  ArrowUpRight,
  Coins,
  Crown,
  Globe2,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AdminPortal } from './components/AdminPortal';
import { ApplicationForm } from './components/ApplicationForm';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { TopBar } from './components/TopBar';
import { WorldMapBackdrop } from './components/WorldMapBackdrop';
import { ZoZoLogo } from './components/ZoZoLogo';
import { RECRUITMENT_COPY, type Language } from './data/translations';
import type { BrandAssets, RolePosition } from './types/recruitment';

function getRouteContext(): { isAdmin: boolean; selectedId: string | null } {
  if (typeof window === 'undefined') {
    return { isAdmin: false, selectedId: null };
  }
  const path = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const tab = params.get('tab');
  const isAdmin =
    path.startsWith('/admin') ||
    view === 'admin' ||
    tab === 'admin' ||
    tab === 'applications';
  return {
    isAdmin,
    selectedId: params.get('id'),
  };
}

function RoleIcon({ role, active }: { role: RolePosition; active: boolean }) {
  const cls = `w-5 h-5 ${active ? 'text-white' : 'text-[#4F46E5]'}`;
  if (role === 'Super Admin') return <Crown className={cls} aria-hidden="true" />;
  if (role === 'Admin') return <ShieldCheck className={cls} aria-hidden="true" />;
  return <Coins className={cls} aria-hidden="true" />;
}

export default function App() {
  const [route] = useState(getRouteContext);
  const [language, setLanguage] = useState<Language>('en');
  const [selectedRole, setSelectedRole] = useState<RolePosition | ''>('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [brandAssets, setBrandAssets] = useState<BrandAssets>({
    logoUrl: null,
    mascotUrl: null,
  });

  const rolesRef = useRef<HTMLElement>(null);
  const processRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const copy = RECRUITMENT_COPY[language];

  useEffect(() => {
    fetch('/api/public/brand-assets')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setBrandAssets(data);
      })
      .catch(() => {
        // ignore background brand fetch error
      });
  }, []);

  if (route.isAdmin) {
    return (
      <AdminPortal
        brandAssets={brandAssets}
        onBrandAssetsChange={setBrandAssets}
        initialSelectedId={route.selectedId}
      />
    );
  }

  const scrollToForm = (role?: RolePosition) => {
    if (role) {
      setSelectedRole(role);
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <TopBar
        language={language}
        logoUrl={brandAssets.logoUrl}
        onScrollToPositions={() =>
          rolesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        onScrollToProcess={() =>
          processRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        onScrollToApply={() => scrollToForm()}
      />

      {/* Sticky Top Bilingual Switcher Bar */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
          <div className="text-xs font-medium text-slate-600 truncate">
            <span className="hidden sm:inline">{copy.form.headerBanner}</span>
            <span className="sm:hidden">{copy.languageBarLabel}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs font-medium text-slate-500">
              {copy.languageBarLabel}:
            </span>
            <LanguageSwitcher language={language} onChange={setLanguage} size="sm" />
          </div>
        </div>
      </div>

      <main className="flex-1">
        {/* Premium Blue, Purple & Cyan Gradient Banner */}
        <section className="relative bg-gradient-to-br from-[#0B0624] via-[#2E1065] to-[#0E7490] text-white overflow-hidden">
          <WorldMapBackdrop />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <ZoZoLogo logoUrl={brandAssets.logoUrl} size="lg" />
                  <div className="text-xs font-medium text-cyan-200 flex flex-wrap items-center gap-2">
                    <span>{copy.hero.meta1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{copy.hero.meta2}</span>
                    <span aria-hidden="true">·</span>
                    <span>{copy.hero.meta3}</span>
                  </div>
                </div>

                <h1 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight leading-[1.15] text-balance">
                  {copy.hero.title}
                </h1>

                <p className="mt-5 text-base text-slate-200 leading-relaxed max-w-2xl">
                  {copy.hero.description}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => scrollToForm()}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4] hover:opacity-95 rounded-xl transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{copy.hero.startCta}</span>
                    <ArrowDown className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <a
                    href="https://download.zozolive.site/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{copy.hero.downloadCta}</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="h-full min-h-[260px] lg:min-h-[360px] rounded-2xl overflow-hidden border border-white/15 bg-[#120A33] relative flex flex-col justify-between">
                  {brandAssets.mascotUrl ? (
                    <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-[#1E1B4B] via-[#3B0764] to-[#0E7490]">
                      <img
                        src={brandAssets.mascotUrl}
                        alt="ZoZo Live Official Mascot"
                        referrerPolicy="no-referrer"
                        className="max-h-64 max-w-full object-contain"
                      />
                    </div>
                  ) : !heroImgFailed ? (
                    <img
                      src="/src/assets/images/hero_zozo_globe_1795110769484.jpg"
                      alt="ZoZo Live international holographic global network"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                      <Globe2 className="w-10 h-10 text-cyan-300 mb-3" aria-hidden="true" />
                      <p className="font-display text-lg font-semibold text-white">
                        {copy.hero.mapTitle}
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-gradient-to-t from-black/85 via-black/60 to-transparent absolute inset-x-0 bottom-0">
                    <div className="font-display text-sm font-bold text-white">
                      {copy.hero.mapTitle}
                    </div>
                    <div className="text-xs text-slate-200 mt-0.5">
                      {copy.hero.mapSubtitle}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Column Overview Bar */}
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 border border-white/15 bg-white/10 backdrop-blur-sm rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-white/15">
              <div className="p-5">
                <div className="text-xs text-slate-300">{copy.hero.stats.regionsLabel}</div>
                <div className="mt-1 font-display text-xl font-bold text-white tabular-nums">
                  {copy.hero.stats.regionsValue}
                </div>
              </div>
              <div className="p-5">
                <div className="text-xs text-slate-300">{copy.hero.stats.rolesLabel}</div>
                <div className="mt-1 font-display text-xl font-bold text-white tabular-nums">
                  {copy.hero.stats.rolesValue}
                </div>
              </div>
              <div className="p-5">
                <div className="text-xs text-slate-300">{copy.hero.stats.accessLabel}</div>
                <div className="mt-1 font-display text-xl font-bold text-white">
                  {copy.hero.stats.accessValue}
                </div>
              </div>
              <div className="p-5">
                <div className="text-xs text-slate-300">{copy.hero.stats.appLabel}</div>
                <a
                  href="https://download.zozolive.site/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 font-display text-xl font-bold text-cyan-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>zozolive.site</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Recruitment Positions Section (Strictly 3 Official Positions) */}
        <section
          ref={rolesRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        >
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {copy.openRoles.heading}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {copy.openRoles.subheading}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {copy.openRoles.items.map((item) => {
              const isChosen = selectedRole === item.role;
              return (
                <div
                  key={item.role}
                  className={`p-6 rounded-2xl border bg-white flex flex-col justify-between transition-all duration-200 ${
                    isChosen
                      ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/15'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          isChosen
                            ? 'bg-gradient-to-br from-[#2563EB] via-[#7C3AED] to-[#06B6D4]'
                            : 'bg-indigo-50'
                        }`}
                      >
                        <RoleIcon role={item.role} active={isChosen} />
                      </div>
                      <span className="text-xs font-medium text-slate-500 text-right">
                        {item.scope}
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-bold text-slate-900">
                      {item.role}
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => scrollToForm(item.role)}
                      className={`w-full py-2.5 px-4 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                        isChosen
                          ? 'bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4] text-white'
                          : 'bg-slate-100 text-slate-900 hover:bg-indigo-50 hover:text-[#4F46E5]'
                      }`}
                    >
                      {isChosen
                        ? `${copy.openRoles.selectedPrefix} ${item.role}`
                        : `${copy.openRoles.applyPrefix} ${item.role}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Three-Step Application Process */}
        <section
          ref={processRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-slate-200"
        >
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
              {copy.process.heading}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {copy.process.subheading}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {copy.process.steps.map((step) => (
              <div
                key={step.number}
                className="p-6 rounded-2xl border border-slate-200 bg-white space-y-2.5"
              >
                <div className="font-mono text-xs font-bold text-[#0891B2]">{step.number}</div>
                <h3 className="font-display text-base font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Custom Public Application Form */}
        <section
          ref={formRef}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16"
        >
          <ApplicationForm
            language={language}
            onChangeLanguage={setLanguage}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            logoUrl={brandAssets.logoUrl}
          />
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <ZoZoLogo logoUrl={brandAssets.logoUrl} size="sm" />
            <span className="font-display font-semibold text-slate-900">ZoZo Live</span>
            <span aria-hidden="true">·</span>
            <span>{copy.footer.tagline}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>{copy.footer.publicNotice}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => scrollToForm()}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              {copy.nav.apply}
            </button>
            <a
              href="https://download.zozolive.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4F46E5] font-medium hover:underline"
            >
              download.zozolive.site
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
