import React, { useState } from 'react';
import {
  FileText,
  Users,
  Image,
  Wallet,
  Lock,
  ShieldAlert,
  Check
} from 'lucide-react';

interface Pillar {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  accent: string;
  features: string[];
  mockup: {
    heading: string;
    subheading: string;
    metrics: { label: string; value: string; hint?: string }[];
    badge: string;
    alert?: string;
  };
}

const PILLARS: Pillar[] = [
  {
    id: 'documents',
    badge: 'CHAMBER 01',
    title: 'Sovereign Document Storage',
    subtitle: 'Every deed, passport, and vital record sealed in private GridFS storage',
    description:
      'Stop scattering your life across email threads, random cloud folders, and filing cabinets. Arkive encrypts each document with isolated vectors and proactively alerts you before critical life documents expire.',
    icon: FileText,
    accent: 'text-brand-400',
    features: [
      'Proactive 30-day passport & license expiration radar',
      'Nested collections with tree hierarchy & tags',
      'Streaming previews with safe Content-Disposition',
      '25 MB file limit with per-asset cryptographic hashes'
    ],
    mockup: {
      heading: 'Family Passport & Identity Vault',
      subheading: 'Encrypted GridFS Bucket · ID: doc_904128',
      metrics: [
        { label: 'Asset Format', value: 'Original PDF' },
        { label: 'Encryption', value: 'AES-256-GCM' },
        { label: 'Integrity Hash', value: 'SHA-256 Verified' }
      ],
      badge: 'Active Expiration Alert',
      alert: '⚠️ US Passport (Leo) expires in 45 days. Schedule renewal.'
    }
  },
  {
    id: 'family',
    badge: 'CHAMBER 02',
    title: 'Permissioned Family Circle',
    subtitle: 'Give your loved ones the keys they need, exactly when they need them',
    description:
      'Most cloud storage is all-or-nothing: either you give your family the master password to your entire account, or they have nothing. Arkive introduces granular item-scoped grants with verifiable audit trails.',
    icon: Users,
    accent: 'text-blue-400',
    features: [
      'Role-based governance: Admin, Member, and Trustee',
      'Zero-leakage isolation: sharing one item never exposes the rest of your vault',
      'Instant access revocation terminates streaming keys in milliseconds',
      'Immutable audit trail logs every access, download, and view'
    ],
    mockup: {
      heading: 'Highland Residence Deed Sharing Grant',
      subheading: 'Shared to: elena@family.dev (Partner / Co-Admin)',
      metrics: [
        { label: 'Access Level', value: 'View & Edit' },
        { label: 'Duration', value: 'Indefinite' },
        { label: 'Revocation', value: '1-Click Instant' }
      ],
      badge: 'Protected Share Grant'
    }
  },
  {
    id: 'memories',
    badge: 'CHAMBER 03',
    title: 'Generational Memory Reliquary',
    subtitle: 'Original resolution photo reels that stay private forever',
    description:
      'Big tech platforms downsample your photos, strip your metadata, and train AI models on your children’s faces. Arkive preserves raw media in its authentic fidelity, arranged on a pristine chronological timeline.',
    icon: Image,
    accent: 'text-amber-400',
    features: [
      'Chronological month-by-month and year-by-year timeline',
      'Lossless image and video streaming directly from private GridFS',
      'Group photos into custom family albums & milestones',
      'Zero algorithmic profiling or face recognition telemetry'
    ],
    mockup: {
      heading: 'Summer 2024 Lake Cabin Chronology',
      subheading: '42 Assets · Uncompressed RAW & 4K Media',
      metrics: [
        { label: 'Timeline Span', value: 'July 14 – 22, 2024' },
        { label: 'Compression', value: '0% (Lossless)' },
        { label: 'Audience', value: 'Immediate Family' }
      ],
      badge: 'Encrypted Timeline Reel'
    }
  },
  {
    id: 'finance',
    badge: 'CHAMBER 04',
    title: 'Integer-Accurate Life Ledger',
    subtitle: 'Exact paise calculations with zero IEEE-754 penny drift',
    description:
      'Tracking family wealth, subscriptions, and recurring commitments requires precision. Arkive computes all financial balances in exact integer minor units (paise) to guarantee zero rounding errors over a lifetime.',
    icon: Wallet,
    accent: 'text-emerald-400',
    features: [
      'Exact integer paise arithmetic prevents floating point rounding drift',
      'Recurring subscriptions and bills with due date alerts',
      '6-month historical cash flow and category spending distribution',
      'One-click "Mark as Paid" with historical payment records'
    ],
    mockup: {
      heading: 'Household Commitment Ledger',
      subheading: 'November 2026 Scheduled Commitments',
      metrics: [
        { label: 'Monthly Commitments', value: '₹64,200' },
        { label: 'Upcoming in 7 Days', value: '3 Bills Due' },
        { label: 'Precision', value: 'Paise (0.00 Error)' }
      ],
      badge: 'Exact Integer Arithmetic'
    }
  }
];

export const VaultChambersScroll: React.FC = () => {
  const [selectedPillarId, setSelectedPillarId] = useState(PILLARS[0].id);
  const activePillar = PILLARS.find((p) => p.id === selectedPillarId) || PILLARS[0];

  return (
    <section id="the-vault" className="py-24 sm:py-32 relative overflow-hidden bg-white border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-mono mb-4">
            <Lock className="w-3.5 h-3.5 text-brand-600" />
            <span>FOUR PILLARS OF PRESERVATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.03em] text-slate-900 leading-[1.12]">
            A digital vault built like a fortress. <br />
            <span className="bg-gradient-to-r from-teal-700 to-brand-600 bg-clip-text text-transparent">
              Organized for everyday life.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Arkive replaces fragile cloud folders with four dedicated preservation chambers,
            all governed by zero-knowledge security and seamless family delegation.
          </p>
        </div>

        {/* Chamber Selection Segmented Control */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-inner max-w-3xl mx-auto mb-12">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const isSelected = pillar.id === selectedPillarId;
            return (
              <button
                key={pillar.id}
                onClick={() => setSelectedPillarId(pillar.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'bg-white text-slate-900 font-semibold shadow-sm border border-black/[0.04]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                <span>{pillar.title}</span>
              </button>
            );
          })}
        </div>

        {/* Detailed Chamber Interactive Showcase Card */}
        <div className="rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-10 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.06)] relative">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Details & Capabilities */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md font-mono text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/70">
                  {activePillar.badge}
                </span>
                <span className="text-xs text-slate-500 font-mono tracking-wider uppercase">
                  Zero-Knowledge Storage
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {activePillar.title}
              </h3>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {activePillar.description}
              </p>

              {/* Feature Checklist */}
              <div className="space-y-3 pt-2">
                {activePillar.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-brand-600" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-700 font-medium">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: High-Craft Chamber Mockup Display */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
                {/* Mockup Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-brand-600 shadow-xs">
                      <activePillar.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {activePillar.mockup.heading}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {activePillar.mockup.subheading}
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white border border-slate-200 text-slate-700 shadow-xs">
                    {activePillar.mockup.badge}
                  </span>
                </div>

                {/* Optional Alert Banner */}
                {activePillar.mockup.alert && (
                  <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>{activePillar.mockup.alert}</span>
                  </div>
                )}

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {activePillar.mockup.metrics.map((metric, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-xs">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        {metric.label}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-1">
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Simulated Verification Seal */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Lock className="w-3.5 h-3.5 text-brand-600" />
                    <span>Cryptographic Verification</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                    100% Sealed & Valid
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
