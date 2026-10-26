import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  FolderLock,
  Wallet,
  Image,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
  RotateCw
} from 'lucide-react';

interface Chamber {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  category: string;
  icon: any;
  color: string;
  badge: string;
  items: { label: string; detail: string; status: string }[];
  tag: string;
}

const CHAMBERS: Chamber[] = [
  {
    id: 'docs',
    number: '01',
    title: 'The Sovereign Document Vault',
    subtitle: 'Zero-knowledge encrypted asset & identity storage',
    category: 'LEGAL & IDENTITY',
    icon: FolderLock,
    color: 'from-brand-500 to-teal-400',
    badge: 'AES-256-GCM Sealed',
    tag: 'Property deeds, passports, birth certificates',
    items: [
      { label: 'Deed of Conveyance #9482', detail: 'Maple Ridge Property (Title Clear)', status: 'Encrypted' },
      { label: 'Family Passports (4 items)', detail: 'Alert: Renewal in 62 days', status: 'Monitored' },
      { label: 'Living Will & Healthcare Directive', detail: 'Designated Trustee: Elena', status: 'Time-locked' }
    ]
  },
  {
    id: 'family',
    number: '02',
    title: 'Granular Family Circle',
    subtitle: 'Share what matters without exposing your entire life',
    category: 'TRUST & DELEGATION',
    icon: Users,
    color: 'from-blue-500 to-teal-400',
    badge: 'Scoped Share Grants',
    tag: 'Partner, children, caretakers, estate executor',
    items: [
      { label: 'Elena (Partner)', detail: 'Full co-admin on property & health files', status: 'Co-Owner' },
      { label: 'Maya & Leo (Kids)', detail: 'Read-only access to memories & medical cards', status: 'Restricted' },
      { label: 'Marcus (Estate Attorney)', detail: 'Inheritance directive upon verified event', status: 'Emergency Only' }
    ]
  },
  {
    id: 'memories',
    number: '03',
    title: 'Living Memory Reliquary',
    subtitle: 'High-res generational media free from cloud compression',
    category: 'CHRONOLOGICAL ARCHIVE',
    icon: Image,
    color: 'from-amber-400 to-brand-400',
    badge: 'GridFS Private Streaming',
    tag: 'Family milestones, raw photography, heirlooms',
    items: [
      { label: 'Summer 2024 Lake House Reel', detail: '48 uncompressed raw captures', status: 'Shared with Clan' },
      { label: 'Grandparents Audio Memoirs', detail: 'Oral history interview · 45 mins', status: 'Archived' },
      { label: 'Maya First Steps & Milestones', detail: 'GridFS secure media chunking', status: 'Preserved' }
    ]
  },
  {
    id: 'finance',
    number: '04',
    title: 'Paise-Accurate Life Ledger',
    subtitle: 'Exact integer math with zero floating-point penny drift',
    category: 'WEALTH & COMMITMENTS',
    icon: Wallet,
    color: 'from-emerald-400 to-teal-500',
    badge: 'Integer Minor Units',
    tag: 'Recurring commitments, insurance, net cashflow',
    items: [
      { label: 'Home Insurance Premium', detail: '₹28,500 due on Nov 15', status: 'Auto-Tracked' },
      { label: 'Monthly Household Commitments', detail: '₹64,200 · 8 recurring bills', status: 'Aggregated' },
      { label: 'Emergency Reserve Liquidity', detail: 'Encrypted proof of funds voucher', status: 'Secured' }
    ]
  }
];

export const LandingHero: React.FC = () => {
  const [activeChamberIndex, setActiveChamberIndex] = useState(0);
  const activeChamber = CHAMBERS[activeChamberIndex];

  const handleNextChamber = () => {
    setActiveChamberIndex((prev) => (prev + 1) % CHAMBERS.length);
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#fbfbfd]">
      {/* Background ambient light wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(20,184,166,0.07),rgba(251,251,253,0)_70%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-20 right-10 w-96 h-96 bg-[radial-gradient(circle,rgba(45,212,191,0.05),transparent_70%)] blur-3xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Column: Copy & Narrative */}
          <div className="lg:col-span-6 space-y-8 text-center lg:text-left">
            {/* Cryptographic Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-mono font-medium tracking-wide text-slate-700 uppercase">
                Zero-Knowledge Encrypted Family Vault
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.03em] text-slate-900 leading-[1.1]">
              Everything you cherish.{' '}
              <span className="block text-slate-500 font-semibold">
                Preserved in your vault.
              </span>
              <span className="bg-gradient-to-r from-teal-700 via-brand-600 to-emerald-600 bg-clip-text text-transparent">
                Shared with family.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              The sovereign digital vault for life's irreplaceable assets — property deeds, passports,
              uncompressed family photo reels, paise-accurate finances, and inheritance directives.
              Built for today. Protected for generations.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm active:scale-[0.97] transition-all duration-150 group"
              >
                <Sparkles className="w-4 h-4 text-teal-300" />
                <span>Claim Your Private Vault</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <a
                href="#interactive-sim"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 active:scale-[0.97] transition-all"
              >
                <span>Simulate Family Sharing</span>
              </a>
            </div>

            {/* Micro Demo Credentials Callout */}
            <div className="pt-1 flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-500">
              <KeyRound className="w-3.5 h-3.5 text-brand-600" />
              <span>Instant evaluation: sign in with</span>
              <Link
                to="/login"
                className="text-brand-700 hover:text-brand-800 font-mono font-semibold underline underline-offset-2"
              >
                demo@ownly.dev
              </Link>
            </div>

            {/* Trust Pillars Grid */}
            <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-left">
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">256-Bit</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">AES-GCM at rest</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-brand-700">Zero</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Big-tech ad tracking</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">100%</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Your private keys</div>
              </div>
            </div>
          </div>

          {/* Right Hero Column: The Interactive Vault Stage */}
          <div className="lg:col-span-6 relative">
            {/* Subtle soft backdrop blur halo */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-100/40 via-teal-50/20 to-transparent rounded-3xl blur-2xl -z-10" />

            {/* Main Vault Housing Card */}
            <div className="rounded-3xl border border-black/[0.07] bg-white/90 p-6 sm:p-8 backdrop-blur-xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.07)] relative overflow-hidden">
              {/* Subtle top indicator */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-60" />

              {/* Chamber Selector Tabs */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700">
                    VAULT CHAMBER {activeChamber.number} // 04
                  </span>
                </div>

                <button
                  onClick={handleNextChamber}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 text-xs font-mono text-slate-700 hover:text-slate-900 transition-colors active:scale-95"
                  title="Rotate to next chamber"
                >
                  <RotateCw className="w-3 h-3 text-slate-500" />
                  <span>Cycle Chamber</span>
                </button>
              </div>

              {/* Central Vault Tumbler Indicator */}
              <div className="relative mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {/* Rotating dial representation */}
                    <div
                      className="w-14 h-14 rounded-full border-2 border-brand-500/40 p-1 flex items-center justify-center transition-transform duration-700 ease-out bg-white shadow-sm"
                      style={{ transform: `rotate(${activeChamberIndex * 90}deg)` }}
                    >
                      <div className="w-full h-full rounded-full border border-dashed border-teal-400/80 flex items-center justify-center relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                        <div className="absolute top-0 w-1.5 h-1.5 bg-slate-800 rounded-full -translate-y-1" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono tracking-wider uppercase text-brand-700 font-semibold">
                      {activeChamber.category}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {activeChamber.title}
                    </h3>
                    <p className="text-xs text-slate-500">{activeChamber.subtitle}</p>
                  </div>
                </div>

                <div className="hidden sm:block text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono bg-brand-50 text-brand-700 border border-brand-200/70 font-medium">
                    {activeChamber.badge}
                  </span>
                </div>
              </div>

              {/* Active Chamber Vault Contents Simulation */}
              <div className="space-y-2.5">
                {activeChamber.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-white hover:border-brand-500/40 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/70 flex items-center justify-center flex-shrink-0 text-brand-600 shadow-xs group-hover:scale-105 transition-transform">
                        <CheckCircle2 className="w-4 h-4 text-brand-600" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{item.detail}</div>
                      </div>
                    </div>

                    <span className="ml-3 flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wide bg-white border border-slate-200/80 text-slate-700 shadow-xs">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chamber Selector Quick Dots */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {CHAMBERS.map((chamber, i) => (
                    <button
                      key={chamber.id}
                      onClick={() => setActiveChamberIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeChamberIndex === i
                          ? 'w-7 bg-slate-900 shadow-sm'
                          : 'w-2 bg-slate-200 hover:bg-slate-300'
                      }`}
                      aria-label={`Select chamber ${chamber.number}`}
                    />
                  ))}
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Cycle to preview all chambers
                </div>
              </div>
            </div>

            {/* Floating Orbiting Accent Pill */}
            <div className="hidden sm:flex absolute -bottom-4 -left-4 p-3 rounded-2xl bg-white/95 border border-slate-200 shadow-lg backdrop-blur-xl items-center gap-3 animate-float-slow">
              <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center border border-brand-200/60">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Family Safe-Pass Active</p>
                <p className="text-[10px] text-slate-500 font-mono">Zero unshared metadata leaks</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

