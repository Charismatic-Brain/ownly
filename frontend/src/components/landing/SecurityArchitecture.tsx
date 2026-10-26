import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Check,
  X
} from 'lucide-react';

interface SecurityFeature {
  title: string;
  code: string;
  description: string;
  badge: string;
}

const SECURITY_SPECS: SecurityFeature[] = [
  {
    title: 'Argon2id Key Derivation',
    code: 'argon2-cffi // RFC 9106',
    description:
      'Password derivation uses memory-hard Argon2id parameters, rendering GPU cluster and ASIC brute-force password cracking attacks computationally infeasible.',
    badge: 'Cryptographic Standard'
  },
  {
    title: 'AES-256-GCM Per-File Vectors',
    code: 'AES-256-GCM // Auth Tags',
    description:
      'Documents and assets stored at rest utilize unique initialization vectors. Authentication tags detect any server-side tampering prior to streaming.',
    badge: 'Tamper-Evident'
  },
  {
    title: 'MongoDB GridFS Chunking',
    code: '255 KB Binary Chunks',
    description:
      'High-resolution photos and documents are split into encrypted chunks and streamed over TLS. Server-side MIME validation enforces a 25 MB ceiling.',
    badge: 'Private Streaming'
  },
  {
    title: 'Strict IDOR Ownership Verification',
    code: 'Owner Scoping on Every Query',
    description:
      'Every REST endpoint verifies that the authenticated user either owns the resource or holds an unexpired, unrevoked share grant. No unauthenticated leaks.',
    badge: 'Zero IDOR Risk'
  },
  {
    title: 'Immutable Security Audit Feed',
    code: 'audit_logs Collection',
    description:
      'Every authentication event, item mutation, sharing invitation, and download request writes a tamper-evident audit log with sanitized client metadata.',
    badge: 'Full Traceability'
  },
  {
    title: 'Zero Ad-Tracking or Data Mining',
    code: 'Zero Third-Party Telemetry',
    description:
      'Arkive contains zero marketing trackers, zero tracking pixels, and zero AI scraping pipelines. Your family records remain private property.',
    badge: '100% Sovereign'
  }
];

export const SecurityArchitecture: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'specs' | 'matrix'>('specs');

  return (
    <section id="security" className="py-24 sm:py-32 relative bg-white border-t border-slate-200/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-mono mb-4">
            <Lock className="w-3.5 h-3.5 text-brand-600" />
            <span>CRYPTOGRAPHIC FORTRESS ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.03em] text-slate-900 leading-[1.12]">
            Security you can inspect, <br />
            <span className="bg-gradient-to-r from-teal-700 via-brand-600 to-emerald-600 bg-clip-text text-transparent">
              not just trust.
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600">
            Arkive is built with cryptographic defense-in-depth: memory-hard key derivation,
            per-file encryption vectors, and zero data monetization.
          </p>

          {/* Apple-style Segmented View Tabs */}
          <div className="inline-flex items-center gap-1 mt-8 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-inner">
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all duration-150 active:scale-95 ${
                activeTab === 'specs'
                  ? 'bg-white text-slate-900 font-semibold shadow-sm border border-black/[0.04]'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              Architectural Specifications
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm transition-all duration-150 active:scale-95 ${
                activeTab === 'matrix'
                  ? 'bg-white text-slate-900 font-semibold shadow-sm border border-black/[0.04]'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              How Arkive Compares
            </button>
          </div>
        </div>

        {activeTab === 'specs' ? (
          /* Architectural Specifications Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECURITY_SPECS.map((spec, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-brand-50 text-brand-700 border border-brand-200/70">
                      {spec.badge}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{spec.code}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-brand-700 transition-colors">
                    {spec.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {spec.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Cryptographically Verified</span>
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Comparison Matrix Table */
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="p-4 sm:p-5 font-bold text-slate-900">Security Capability</th>
                  <th className="p-4 sm:p-5 font-bold text-brand-800 bg-brand-50/60">Arkive Vault</th>
                  <th className="p-4 sm:p-5 font-semibold text-slate-600">Google Drive / iCloud</th>
                  <th className="p-4 sm:p-5 font-semibold text-slate-600">Password Managers</th>
                  <th className="p-4 sm:p-5 font-semibold text-slate-600">Physical Home Safe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                <tr className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 sm:p-5 text-slate-900 font-semibold">
                    Granular Family Scoped Sharing
                  </td>
                  <td className="p-4 sm:p-5 bg-brand-50/30 text-emerald-700 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Yes (Per-item isolation)
                  </td>
                  <td className="p-4 sm:p-5 text-slate-500">Coarse folder share</td>
                  <td className="p-4 sm:p-5 text-slate-500">Vault level only</td>
                  <td className="p-4 sm:p-5 text-rose-600 flex items-center gap-1">
                    <X className="w-4 h-4" /> All or nothing
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 sm:p-5 text-slate-900 font-semibold">
                    Automatic Expiration Radar (30-day alerts)
                  </td>
                  <td className="p-4 sm:p-5 bg-brand-50/30 text-emerald-700 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Built-in real time
                  </td>
                  <td className="p-4 sm:p-5 text-rose-600 flex items-center gap-1">
                    <X className="w-4 h-4" /> None
                  </td>
                  <td className="p-4 sm:p-5 text-slate-500">Manual text fields</td>
                  <td className="p-4 sm:p-5 text-rose-600 flex items-center gap-1">
                    <X className="w-4 h-4" /> None
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 sm:p-5 text-slate-900 font-semibold">
                    Paise-Accurate Financial & Bill Ledger
                  </td>
                  <td className="p-4 sm:p-5 bg-brand-50/30 text-emerald-700 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Exact Integer Paise
                  </td>
                  <td className="p-4 sm:p-5 text-rose-600 flex items-center gap-1">
                    <X className="w-4 h-4" /> Manual Spreadsheets
                  </td>
                  <td className="p-4 sm:p-5 text-rose-600 flex items-center gap-1">
                    <X className="w-4 h-4" /> None
                  </td>
                  <td className="p-4 sm:p-5 text-rose-600 flex items-center gap-1">
                    <X className="w-4 h-4" /> Paper receipts
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 sm:p-5 text-slate-900 font-semibold">
                    Zero Ad Profiling & AI Data Harvesting
                  </td>
                  <td className="p-4 sm:p-5 bg-brand-50/30 text-emerald-700 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Guaranteed Zero
                  </td>
                  <td className="p-4 sm:p-5 text-rose-600 flex items-center gap-1">
                    <X className="w-4 h-4" /> Big-tech ad models
                  </td>
                  <td className="p-4 sm:p-5 text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Private
                  </td>
                  <td className="p-4 sm:p-5 text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Private
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/40 transition-colors">
                  <td className="p-4 sm:p-5 text-slate-900 font-semibold">
                    Disaster Proof & Remote Emergency Access
                  </td>
                  <td className="p-4 sm:p-5 bg-brand-50/30 text-emerald-700 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Encrypted GridFS Cloud
                  </td>
                  <td className="p-4 sm:p-5 text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Cloud
                  </td>
                  <td className="p-4 sm:p-5 text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Cloud
                  </td>
                  <td className="p-4 sm:p-5 text-rose-600 flex items-center gap-1">
                    <X className="w-4 h-4" /> Vulnerable to disaster
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>
    </section>
  );
};
