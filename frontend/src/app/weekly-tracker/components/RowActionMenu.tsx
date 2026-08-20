'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface Props {
  isPinned: boolean;
  currentSection: string;
  onMoveSection: (newSection: string) => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

const SECTIONS = [
  { key: 'pipeline', label: '📥 Companies in Pipeline' },
  { key: 'in_progress', label: '🚀 Companies In Progress' },
  { key: 'completed', label: '🏆 Companies Completed' },
  { key: 'top_companies', label: '⭐ Top Companies' },
  { key: 'rejected_by_hr', label: '🚫 Rejected by HR' },
  { key: 'rejected_by_college', label: '🚫 Rejected by College' },
];

export function RowActionMenu({
  isPinned,
  currentSection,
  onMoveSection,
  onTogglePin,
  onDelete,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowMoveSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded text-fg-subtle hover:text-white hover:bg-surface-raised transition-colors"
        title="Actions"
      >
        ⋮
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-xl bg-background border border-border-strong shadow-4 z-50 py-1 text-xs text-fg">

          {/* Toggle Pin Top */}
          <button
            onClick={() => {
              onTogglePin();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 hover:bg-surface flex items-center gap-2 transition-colors"
          >
            <span>{isPinned ? '★' : '☆'}</span>
            <span>{isPinned ? 'Unpin from Top' : 'Pin to Top Companies'}</span>
          </button>

          {/* Move to Section */}
          <div className="relative">
            <button
              onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
              className="w-full text-left px-3 py-2 hover:bg-surface flex items-center justify-between transition-colors"
            >
              <span>📂 Move Section</span>
              <span>▸</span>
            </button>

            {showMoveSubmenu && (
              <div className="absolute left-full top-0 ml-1 w-48 rounded-xl bg-background border border-border-strong shadow-4 py-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      onMoveSection(s.key);
                      setIsOpen(false);
                      setShowMoveSubmenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-surface transition-colors text-xs
                                ${currentSection === s.key ? 'text-primary font-semibold' : ''}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-surface my-1" />

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm('Move this recruitment drive to Recycle Bin?')) {
                onDelete();
                setIsOpen(false);
              }
            }}
            className="w-full text-left px-3 py-2 hover:bg-destructive/40 text-destructive flex items-center gap-2 transition-colors"
          >
            <Trash2 size={14} strokeWidth={2} aria-hidden />
            <span>Move to Recycle Bin</span>
          </button>

        </div>
      )}
    </div>
  );
}
