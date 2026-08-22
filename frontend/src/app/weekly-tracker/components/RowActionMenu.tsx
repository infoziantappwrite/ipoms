'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Star, FolderInput, ChevronRight, MoreVertical } from 'lucide-react';

interface Props {
  isPinned: boolean;
  currentSection: string;
  onMoveSection: (newSection: string) => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

const SECTIONS = [
  { key: 'completed', label: 'Companies Completed' },
  { key: 'in_progress', label: 'Companies In Progress' },
  { key: 'pipeline', label: 'Companies in Pipeline' },
  { key: 'top_companies', label: 'Top Companies' },
  { key: 'rejected_by_hr', label: 'Rejected by HR' },
  { key: 'rejected_by_college', label: 'Rejected by College' },
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
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        title="Actions"
      >
        <MoreVertical size={15} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 rounded-xl bg-white border border-slate-200 shadow-xl z-50 py-1 text-xs text-slate-700">

          {/* Toggle Pin Top */}
          <button
            onClick={() => {
              onTogglePin();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Star size={14} className={isPinned ? 'fill-amber-400 text-amber-500' : 'text-slate-400'} />
            <span>{isPinned ? 'Unpin from Top' : 'Pin to Top Companies'}</span>
          </button>

          {/* Move to Section */}
          <div className="relative">
            <button
              onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FolderInput size={14} className="text-slate-400" />
                <span>Move Section</span>
              </div>
              <ChevronRight size={13} className="text-slate-400" />
            </button>

            {showMoveSubmenu && (
              <div className="absolute left-full top-0 ml-1 w-52 rounded-xl bg-white border border-slate-200 shadow-xl py-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      onMoveSection(s.key);
                      setIsOpen(false);
                      setShowMoveSubmenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors text-xs cursor-pointer
                                ${currentSection === s.key ? 'text-primary font-bold bg-primary-subtle' : 'text-slate-700'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100 my-1" />

          {/* Delete */}
          <button
            onClick={() => {
              if (confirm('Move this recruitment drive to Recycle Bin?')) {
                onDelete();
                setIsOpen(false);
              }
            }}
            className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 size={14} strokeWidth={2} />
            <span>Move to Recycle Bin</span>
          </button>

        </div>
      )}
    </div>
  );
}
