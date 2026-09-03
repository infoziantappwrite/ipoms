'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  HelpCircle,
  ChevronDown,
  FileText,
  Sparkles,
  ListTodo,
  PhoneCall,
  TrendingUp,
  Building2,
  ShieldCheck,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { FAQ_CATEGORIES, FAQ_ITEMS } from '@/data/faqData';
import { FaqHeader } from './components/FaqHeader';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  HelpCircle,
  FileText,
  Sparkles,
  ListTodo,
  PhoneCall,
  TrendingUp,
  Building2,
  ShieldCheck,
};

function FaqContent() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get('category') || 'all';

  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  
  // All questions expanded by default so they are listed line by line with answers
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const all: Record<string, boolean> = {};
    FAQ_ITEMS.forEach((f) => {
      all[f.id] = true;
    });
    return all;
  });

  // Floating quick scroll state
  const [isNearBottom, setIsNearBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const windowH = window.innerHeight;
      const fullH = document.documentElement.scrollHeight || document.body.scrollHeight;
      setIsNearBottom(scrollY + windowH >= fullH - 350);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight || document.body.scrollHeight,
      behavior: 'smooth',
    });
  };

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Sync category when query param changes
  useEffect(() => {
    if (initialCat) {
      setSelectedCategory(initialCat);
    }
  }, [initialCat]);

  // Filter FAQ items strictly by selected category
  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      return selectedCategory === 'all' || item.category === selectedCategory;
    });
  }, [selectedCategory]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: FAQ_ITEMS.length };
    FAQ_CATEGORIES.forEach((cat) => {
      if (cat.id !== 'all') {
        counts[cat.id] = FAQ_ITEMS.filter((item) => item.category === cat.id).length;
      }
    });
    return counts;
  }, []);

  const handleToggleAccordion = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredFaqs.forEach((f) => {
      allExpanded[f.id] = true;
    });
    setExpandedIds(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedIds({});
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">
      {/* ── Clean Standalone Header (No Subtitle, No Search Box, No Badge) ──────────── */}
      <FaqHeader />

      {/* ── Main Full-Window Content ──────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* ── Category Filter Pills Bar ──────────────────────────────────── */}
        <div className="bg-surface border border-border p-2 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FAQ_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICON_MAP[cat.iconName] || HelpCircle;
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-sunken hover:bg-surface-raised text-fg-subtle hover:text-fg border-border/80'
                  }`}
                >
                  <Icon size={14} className={isSelected ? 'text-white' : 'text-primary'} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-surface text-fg-muted border border-border'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Control Bar: Results Count & Expand/Collapse All ─────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-fg">
              Showing {filteredFaqs.length} {filteredFaqs.length === 1 ? 'Question' : 'Questions'}
            </span>
            {selectedCategory !== 'all' && (
              <span className="text-fg-subtle">
                in <strong className="text-primary">{FAQ_CATEGORIES.find((c) => c.id === selectedCategory)?.label}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-semibold">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-3 py-1 bg-surface hover:bg-surface-raised border border-border rounded-lg text-primary hover:underline cursor-pointer shadow-2xs"
            >
              Expand All
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-3 py-1 bg-surface hover:bg-surface-raised border border-border rounded-lg text-fg-subtle hover:text-fg hover:underline cursor-pointer shadow-2xs"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* ── Questions Listed Line-by-Line with Answers ───────────────────── */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, idx) => {
            const isExpanded = !!expandedIds[faq.id];

            return (
              <article
                key={faq.id}
                className="rounded-2xl border border-border bg-surface shadow-xs transition-all overflow-hidden"
              >
                {/* Question Header */}
                <button
                  type="button"
                  onClick={() => handleToggleAccordion(faq.id)}
                  className="w-full flex items-start justify-between gap-4 p-4 sm:p-5 text-left cursor-pointer transition-colors hover:bg-surface-raised/60"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span className="text-xs font-mono font-bold w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                      {idx + 1}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        {faq.categoryLabel}
                      </span>
                      <h2 className="text-sm font-bold text-fg leading-snug">
                        {faq.question}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-fg-subtle transition-all duration-200 ${
                        isExpanded
                          ? 'rotate-180 text-primary bg-primary/10'
                          : 'bg-surface-sunken hover:bg-surface-raised'
                      }`}
                    >
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </button>

                {/* Clean Formatted Answer Line-by-Line */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-border/40 text-xs text-fg leading-relaxed animate-fadeIn">
                    <div className="p-4 bg-surface-sunken/80 border border-border/60 rounded-xl space-y-2.5 text-xs font-normal">
                      {faq.answer.split('\n\n').map((paragraph, pIdx) => {
                        if (
                          paragraph.startsWith('* ') ||
                          paragraph.startsWith('1. ') ||
                          paragraph.startsWith('2. ') ||
                          paragraph.startsWith('3. ') ||
                          paragraph.startsWith('4. ')
                        ) {
                          return (
                            <div key={pIdx} className="space-y-2 pl-1">
                              {paragraph.split('\n').map((line, lIdx) => (
                                <div key={lIdx} className="flex items-start gap-2.5">
                                  <span className="text-primary font-bold mt-0.5">•</span>
                                  <span
                                    className="flex-1"
                                    dangerouslySetInnerHTML={{
                                      __html: line
                                        .replace(/^[\*\d\.]+\s+/, '')
                                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-fg">$1</strong>')
                                        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[11px] text-primary font-semibold">$1</code>'),
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return (
                          <p
                            key={pIdx}
                            dangerouslySetInnerHTML={{
                              __html: paragraph
                                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-fg">$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[11px] text-primary font-semibold">$1</code>'),
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* ── Footer Support Banner ────────────────────────────────────────── */}
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="space-y-1">
            <h4 className="font-bold text-fg">Have other questions?</h4>
            <p className="text-fg-subtle">
              If you have any other questions, you can reach out to <strong className="text-fg font-bold">Mohanaradha</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-primary px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
              Infoziant iPOMS Support
            </span>
          </div>
        </div>

      </main>

      {/* ── Quick Scroll Floating Action Button (Bottom-Right Corner) ────── */}
      <aside aria-label="Page scroll controls" className="fixed bottom-6 right-6 z-50 print:hidden flex flex-col items-center gap-2">
        {isNearBottom ? (
          <button
            type="button"
            onClick={handleScrollToTop}
            title="Scroll to Top of FAQs"
            aria-label="Scroll to Top of FAQs"
            className="w-11 h-11 rounded-full bg-surface/95 hover:bg-surface text-primary hover:text-primary-hover border border-border shadow-2xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ring-1 ring-black/5 dark:ring-white/10 group"
          >
            <ArrowUp size={19} strokeWidth={2.5} className="group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleScrollToBottom}
            title="Jump to Bottom of FAQs"
            aria-label="Jump to Bottom of FAQs"
            className="w-11 h-11 rounded-full bg-primary hover:bg-primary-hover text-white border border-primary/40 shadow-2xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-primary/30 group"
          >
            <ArrowDown size={19} strokeWidth={2.5} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        )}
      </aside>
    </div>
  );
}

export default function FaqPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <FaqContent />
    </Suspense>
  );
}
