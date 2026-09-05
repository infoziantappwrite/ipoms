'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  HelpCircle,
  Search,
  X,
  ChevronDown,
  FileText,
  Sparkles,
  ListTodo,
  PhoneCall,
  TrendingUp,
  Building2,
  ShieldCheck,
  Copy,
  Check,
  ThumbsUp,
  ExternalLink,
} from 'lucide-react';
import { FAQ_CATEGORIES, FAQ_ITEMS, FaqItem } from '@/data/faqData';

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
}

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

export function FaqModal({ isOpen, onClose, defaultCategory = 'all' }: FaqModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync default category when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(defaultCategory || 'all');
      setSearchQuery('');
      // Auto-expand first item in selected category or none
      setExpandedId(null);
    }
  }, [isOpen, defaultCategory]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter FAQ items by category and search query
  const filteredFaqs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!query) return true;

      const inQuestion = item.question.toLowerCase().includes(query);
      const inAnswer = item.answer.toLowerCase().includes(query);
      const inTags = item.tags.some((t) => t.toLowerCase().includes(query));
      return inQuestion || inAnswer || inTags;
    });
  }, [searchQuery, selectedCategory]);

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
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCopyAnswer = (item: FaqItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `Q: ${item.question}\n\nA: ${item.answer}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="faq-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-surface text-fg rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-scaleIn select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Modal Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-surface/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <HelpCircle size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 id="faq-modal-title" className="text-base font-bold text-fg tracking-tight flex items-center gap-2">
                <span>Frequently Asked Questions</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {FAQ_ITEMS.length} Guides
                </span>
              </h2>
              <p className="text-micro text-fg-subtle">
                Self-serve placement operations guide, report builder help, and workflow answers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close FAQ dialog"
            className="w-8 h-8 rounded-lg hover:bg-surface-sunken border border-transparent hover:border-border text-fg-subtle hover:text-fg flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 2. Search & Category Filters Strip ───────────────────────────── */}
        <div className="p-4 sm:px-6 bg-surface-sunken/50 border-b border-border/60 space-y-3 shrink-0">
          {/* Search Input Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword, topic, or question (e.g. 'Active Leads', 'PDF export', 'Call outcome')..."
              className="w-full bg-surface border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl pl-10 pr-9 py-2.5 text-xs text-fg placeholder:text-fg-subtle outline-none shadow-xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg cursor-pointer p-0.5 rounded-md"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {FAQ_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICON_MAP[cat.iconName] || HelpCircle;
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-surface hover:bg-surface-raised text-fg-subtle hover:text-fg border-border'
                  }`}
                >
                  <Icon size={12} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-sunken text-fg-muted border border-border/60'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. Questions Accordion List (Scrollable) ──────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-sunken border border-border flex items-center justify-center text-fg-subtle mx-auto">
                <Search size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-fg">No matching questions found</h3>
                <p className="text-xs text-fg-subtle mt-1">
                  Try searching with different keywords or switch to another category.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reset Search & Filters
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isExpanded = expandedId === faq.id;
              const isCopied = copiedId === faq.id;
              const isLiked = !!likedIds[faq.id];

              return (
                <div
                  key={faq.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-surface border-primary/40 dark:border-primary/50 shadow-sm ring-1 ring-primary/10'
                      : 'bg-surface hover:bg-surface-raised/80 border-border/80'
                  }`}
                >
                  {/* Question Header Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleAccordion(faq.id)}
                    className="w-full flex items-start justify-between gap-3 p-4 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`text-[11px] font-mono font-bold w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                          isExpanded
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-surface-sunken border-border text-fg-subtle'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                          {faq.categoryLabel}
                        </span>
                        <h3 className="text-xs font-bold text-fg leading-snug">
                          {faq.question}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-fg-subtle transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-primary bg-primary/10' : ''
                        }`}
                      >
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </button>

                  {/* Expanded Answer Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/40 text-xs text-fg leading-relaxed space-y-3 animate-fadeIn">
                      <div className="p-3.5 bg-surface-sunken/80 border border-border/60 rounded-xl space-y-2 text-xs font-normal">
                        {faq.answer.split('\n\n').map((paragraph, pIdx) => {
                          if (paragraph.startsWith('* ') || paragraph.startsWith('1. ') || paragraph.startsWith('2. ') || paragraph.startsWith('3. ') || paragraph.startsWith('4. ')) {
                            return (
                              <div key={pIdx} className="space-y-1.5 pl-1">
                                {paragraph.split('\n').map((line, lIdx) => (
                                  <div key={lIdx} className="flex items-start gap-2">
                                    <span className="text-primary font-bold mt-0.5">•</span>
                                    <span
                                      className="flex-1"
                                      dangerouslySetInnerHTML={{
                                        __html: line
                                          .replace(/^[\*\d\.]+\s+/, '')
                                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-fg">$1</strong>')
                                          .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                                          .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[11px] text-primary">$1</code>'),
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
                                  .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[11px] text-primary">$1</code>'),
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── 4. Modal Footer ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border bg-surface-sunken/80 shrink-0 text-micro text-fg-subtle">
          <div className="flex items-center gap-2">
            <span>If you have any other questions:</span>
            <span className="font-semibold text-fg">Reach out to Mohanaradha</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
