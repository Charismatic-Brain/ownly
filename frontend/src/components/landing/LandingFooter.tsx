import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, ArrowRight, Sparkles } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="relative bg-[#fbfbfd] pt-20 pb-12 border-t border-slate-200/80 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Grand Closing Vault Call-to-Action Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-8 sm:p-14 text-center shadow-[0_12px_40px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden mb-20">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono">
              <Lock className="w-3.5 h-3.5 text-brand-600" />
              <span>THE LIFETIME SOVEREIGN VAULT</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-[-0.03em] text-slate-900 leading-tight">
              Close the door on chaos. <br />
              <span className="bg-gradient-to-r from-teal-700 via-brand-600 to-emerald-600 bg-clip-text text-transparent">
                Seal your family’s legacy today.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Every critical deed, birth certificate, uncompressed memory reel, and inheritance directive —
              safely organized in one encrypted vault, accessible whenever your family needs it.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm active:scale-[0.97] transition-all duration-150"
              >
                <Sparkles className="w-4 h-4 text-teal-300" />
                <span>Open Your Private Vault</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 active:scale-[0.97] transition-all shadow-xs"
              >
                <span>Sign In with Demo Account</span>
              </Link>
            </div>

            <p className="text-xs text-slate-500 font-mono">
              Free setup for your immediate family · Zero telemetry
            </p>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-slate-200/80">
          {/* Brand Info */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-4 h-4 text-brand-400" />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">Arkive</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your life, digitally organized. The sovereign digital vault for life's most essential records.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-mono text-slate-500">All systems online & encrypted</span>
            </div>
          </div>

          {/* Product Modules */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-900 font-bold">
              Vault Chambers
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>
                <Link to="/vault" className="hover:text-slate-900 transition-colors">
                  Documents & Deeds
                </Link>
              </li>
              <li>
                <Link to="/family" className="hover:text-slate-900 transition-colors">
                  Family Circle & Sharing
                </Link>
              </li>
              <li>
                <Link to="/memories" className="hover:text-slate-900 transition-colors">
                  Living Memories Archive
                </Link>
              </li>
              <li>
                <Link to="/finance" className="hover:text-slate-900 transition-colors">
                  Paise-Accurate Finance
                </Link>
              </li>
              <li>
                <Link to="/reminders" className="hover:text-slate-900 transition-colors">
                  Expiration Radar & Deadlines
                </Link>
              </li>
            </ul>
          </div>

          {/* Security & Architecture */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-900 font-bold">
              Cryptographic Bedrock
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>
                <span className="text-slate-600">Argon2id Memory Hardness</span>
              </li>
              <li>
                <span className="text-slate-600">AES-256-GCM Per-File Keys</span>
              </li>
              <li>
                <span className="text-slate-600">MongoDB GridFS Chunking</span>
              </li>
              <li>
                <span className="text-slate-600">Strict IDOR Ownership Scoping</span>
              </li>
              <li>
                <span className="text-slate-600">Immutable Audit Logs</span>
              </li>
            </ul>
          </div>

          {/* Quick Access */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-900 font-bold">
              Access & Sandbox
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>
                <Link to="/register" className="hover:text-slate-900 transition-colors">
                  Create New Vault
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-slate-900 transition-colors">
                  Keyholder Sign In
                </Link>
              </li>
              <li>
                <span className="font-mono text-[11px] text-brand-700 block pt-1">
                  demo@ownly.dev
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  DemoPassword123!
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Attribution */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} Arkive. Digital sovereignty for families. All rights reserved.
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span>Built with precision & care for generational preservation</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
