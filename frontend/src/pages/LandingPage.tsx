import React, { useState, useEffect } from 'react';
import { LandingNav } from '../components/landing/LandingNav';
import { LandingHero } from '../components/landing/LandingHero';
import { VaultChambersScroll } from '../components/landing/VaultChambersScroll';
import { InteractiveFamilySim } from '../components/landing/InteractiveFamilySim';
import { SecurityArchitecture } from '../components/landing/SecurityArchitecture';
import { DemoQuickStartBanner } from '../components/landing/DemoQuickStartBanner';
import { LandingFAQ } from '../components/landing/LandingFAQ';
import { LandingFooter } from '../components/landing/LandingFooter';

export const LandingPage: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-slate-900 selection:bg-teal-500/15 selection:text-teal-900 relative">
      {/* Scroll Progress Hairline Indicator */}
      <div className="fixed top-0 left-0 right-0 h-[2px] z-50 bg-slate-200/50 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-teal-600 via-brand-500 to-emerald-500 transition-all duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Navigation */}
      <LandingNav />

      {/* Hero Section */}
      <LandingHero />

      {/* 4 Pillars of Preservation Section */}
      <VaultChambersScroll />

      {/* Interactive Family Vault Simulator */}
      <InteractiveFamilySim />

      {/* Security Architecture & Cryptographic Bedrock */}
      <SecurityArchitecture />

      {/* Pre-Seeded Synthetic Sandbox Quick Start */}
      <DemoQuickStartBanner />

      {/* Frequently Asked Questions */}
      <LandingFAQ />

      {/* Grand Closing CTA & Footer */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
