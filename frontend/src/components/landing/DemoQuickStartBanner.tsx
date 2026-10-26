import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Copy, Check, ArrowRight, Database, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DemoQuickStartBanner: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
  const [autoLoginError, setAutoLoginError] = useState<string | null>(null);

  const handleCopyCredentials = () => {
    navigator.clipboard.writeText('Email: demo@ownly.dev\nPassword: DemoPassword123!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOneClickDemo = async () => {
    setIsAutoLoggingIn(true);
    setAutoLoginError(null);
    try {
      await login({
        email: 'demo@ownly.dev',
        password: 'DemoPassword123!'
      });
      navigate('/dashboard');
    } catch (err: any) {
      setAutoLoginError(err.message || 'Could not auto-login with demo account. Please try regular login.');
    } finally {
      setIsAutoLoggingIn(false);
    }
  };

  return (
    <section className="py-16 sm:py-20 relative bg-[#fbfbfd]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 p-8 sm:p-12 shadow-[0_8px_30px_rgb(0_0_0/0.04)] backdrop-blur-xl relative overflow-hidden">
          
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/70 text-brand-700 text-xs font-mono">
                <Database className="w-3.5 h-3.5" />
                <span>PRE-SEEDED SYNTHETIC SANDBOX</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Want to evaluate a fully loaded family vault right now?
              </h3>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Test Arkive with realistic synthetic records: deed attachments in GridFS, 
                recurring bills, family photo reels, and active item-level sharing grants.
              </p>

              {autoLoginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {autoLoginError}
                </div>
              )}
            </div>

            {/* Right Column: Instant Action Buttons */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-end gap-3.5">
              <button
                onClick={handleOneClickDemo}
                disabled={isAutoLoggingIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm active:scale-[0.97] transition-all duration-150 disabled:opacity-60"
              >
                {isAutoLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Unlocking Demo Vault...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-300" />
                    <span>Instant 1-Click Demo Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Copy Credentials Pill */}
              <button
                onClick={handleCopyCredentials}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-mono text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-colors active:scale-95"
                title="Copy demo credentials"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>demo@ownly.dev // DemoPassword123!</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
