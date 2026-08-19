'use client';

import { useState, useRef, useEffect } from 'react';

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
        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        title="Actions"
      >
        ⋮
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl z-50 py-1 text-xs text-slate-200">

          {/* Toggle Pin Top */}
          <button
            onClick={() => {
              onTogglePin();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 transition-colors"
          >
            <span>{isPinned ? '★' : '☆'}</span>
            <span>{isPinned ? 'Unpin from Top' : 'Pin to Top Companies'}</span>
          </button>

          {/* Move to Section */}
          <div className="relative">
            <button
              onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
              className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors"
            >
              <span>📂 Move Section</span>
              <span>▸</span>
            </button>

            {showMoveSubmenu && (
              <div className="absolute left-full top-0 ml-1 w-48 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      onMoveSection(s.key);
                      setIsOpen(false);
                      setShowMoveSubmenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-800 transition-colors text-xs
                                ${currentSection === s.key ? 'text-blue-400 font-semibold' : ''}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-800 my-1" />

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm('Move this recruitment drive to Recycle Bin?')) {
                onDelete();
                setIsOpen(false);
              }
            }}
            className="w-full text-left px-3 py-2 hover:bg-red-950/40 text-red-400 flex items-center gap-2 transition-colors"
          >
            <span>🗑️</span>
            <span>Move to Recycle Bin</span>
          </button>

        </div>
      )}
    </div>
  );
}
