import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LandingNav: React.FC = () => {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.03)] py-3'
            : 'bg-white/40 backdrop-blur-md py-4 sm:py-5 border-b border-black/[0.03]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-slate-900 p-0.5 shadow-sm group-hover:scale-105 transition-transform duration-200">
                  <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-brand-400" />
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-semibold tracking-tight text-slate-900 group-hover:text-brand-700 transition-colors">
                    Arkive
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold tracking-wider uppercase bg-brand-50 text-brand-700 border border-brand-200/60">
                    <Lock className="w-2 h-2" />
                    VAULT
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal tracking-tight">
                  Sovereign Family Vault
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-black/[0.05] backdrop-blur-md shadow-inner">
              <button
                onClick={() => scrollToSection('the-vault')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all duration-150"
              >
                The Vault
              </button>
              <button
                onClick={() => scrollToSection('interactive-sim')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all duration-150"
              >
                Family Circle
              </button>
              <button
                onClick={() => scrollToSection('security')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all duration-150"
              >
                Security & Privacy
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all duration-150"
              >
                FAQ
              </button>
            </nav>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden lg:flex flex-col text-right">
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]">
                      {user.email}
                    </span>
                    <span className="text-[10px] text-brand-600 font-mono">Vault Keyholder</span>
                  </div>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all duration-150 active:scale-[0.97]"
                  >
                    <span>Enter Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    to="/login"
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-full"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all duration-150 active:scale-[0.97]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                    <span>Open Vault</span>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-2xl md:hidden pt-24 px-6 flex flex-col justify-between pb-8">
          <div className="space-y-4">
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400 px-3">
              Explore Arkive
            </p>
            <div className="space-y-1">
              <button
                onClick={() => scrollToSection('the-vault')}
                className="w-full text-left px-4 py-3 text-base font-medium text-slate-800 hover:text-brand-600 hover:bg-slate-100/70 rounded-xl transition-colors"
              >
                The Sovereign Vault
              </button>
              <button
                onClick={() => scrollToSection('interactive-sim')}
                className="w-full text-left px-4 py-3 text-base font-medium text-slate-800 hover:text-brand-600 hover:bg-slate-100/70 rounded-xl transition-colors"
              >
                Family Circle Simulator
              </button>
              <button
                onClick={() => scrollToSection('security')}
                className="w-full text-left px-4 py-3 text-base font-medium text-slate-800 hover:text-brand-600 hover:bg-slate-100/70 rounded-xl transition-colors"
              >
                Security & Privacy Bedrock
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="w-full text-left px-4 py-3 text-base font-medium text-slate-800 hover:text-brand-600 hover:bg-slate-100/70 rounded-xl transition-colors"
              >
                Questions & Answers
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 space-y-3">
            {user ? (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-full bg-slate-900 text-white font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Enter Your Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-full bg-slate-900 text-white font-semibold flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-teal-300" />
                  <span>Start Your Free Vault</span>
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-full border border-slate-200 bg-white text-slate-700 font-medium flex items-center justify-center hover:bg-slate-50 shadow-sm"
                >
                  Sign In to Existing Vault
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
export default LandingNav;
