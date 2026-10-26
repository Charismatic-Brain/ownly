import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Who owns the encryption keys to my family vault?',
    answer:
      'You do. Your credentials derive isolated keys through Argon2id password hashing and per-file AES-256-GCM vectors. Arkive has zero advertising business model, zero third-party telemetry, and zero AI scraping pipelines.'
  },
  {
    question: 'What happens when I share an item with my spouse or children?',
    answer:
      'Arkive generates an item-scoped cryptographic grant. The recipient receives access only to that specific document and its attachments. It never leaks your broader vault hierarchy, personal reflections, or private financial ledgers.'
  },
  {
    question: 'Can I revoke access immediately if needed?',
    answer:
      'Yes. Revoking an item share terminates the authorization token instantaneously. Any subsequent attempt to download or stream the attachment via MongoDB GridFS is immediately rejected with an HTTP 403.'
  },
  {
    question: 'How is Arkive different from standard Google Drive or iCloud?',
    answer:
      'Mainstream cloud storage provides zero life-specific intelligence: no proactive 30-day document expiration radar, no integer paise arithmetic for family commitments, no generational keyholder directives, and coarse all-or-nothing folder sharing.'
  },
  {
    question: 'How does the proactive expiration radar work?',
    answer:
      'When you upload passports, driver licenses, insurance policies, or lease contracts with expiration dates, Arkive continuously aggregates upcoming deadlines and surfaces alerts 30 days before expiration, preventing lapses and penalties.'
  },
  {
    question: 'Can I export my documents and cancel anytime?',
    answer:
      'Yes. Digital sovereignty means you are never locked in. You can download your original files, financial logs, and notes in open, standard formats whenever you choose.'
  }
];

export const LandingFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 sm:py-32 relative bg-white border-t border-slate-200/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-mono mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
            <span>TRANSPARENCY & ASSURANCE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.03em] text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600">
            Clear, uncompromising answers about our architecture, privacy guarantees,
            and family sharing mechanisms.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-white border-slate-300 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => toggleIndex(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 active:scale-[0.99] transition-transform"
                >
                  <span className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                    {faq.question}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? 'bg-slate-900 text-white rotate-180'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
