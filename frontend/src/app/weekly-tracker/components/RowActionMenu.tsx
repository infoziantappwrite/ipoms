'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Star, FolderInput, ChevronRight, MoreVertical } from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

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
  { key: 'on_hold_by_college', label: 'On Hold by College (TPO)' },
  { key: 'on_hold_by_hr', label: 'On Hold by HR' },
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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
    <>
      <div className="relative inline-block text-left" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors cursor-pointer"
          title="More actions"
        >
          <MoreVertical size={15} />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 bg-surface rounded-xl shadow-xl border border-border py-1 z-30 text-xs text-fg divide-y divide-border">
            {/* Toggle Pin to Top */}
            <button
              onClick={() => {
                onTogglePin();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-surface-raised flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Star size={14} className={isPinned ? 'text-amber-500 fill-amber-500' : 'text-fg-subtle'} />
              <span>{isPinned ? 'Unpin from Top' : 'Pin to Top (Top Companies)'}</span>
            </button>

            {/* Move Section Submenu */}
            <div className="relative">
              <button
                onClick={() => setShowMoveSubmenu(!showMoveSubmenu)}
                className="w-full text-left px-3 py-2 hover:bg-surface-raised flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FolderInput size={14} className="text-fg-subtle" />
                  <span>Move to Section</span>
                </div>
                <ChevronRight size={13} className="text-fg-subtle" />
              </button>

              {showMoveSubmenu && (
                <div className="absolute right-full top-0 mr-1 w-52 bg-surface rounded-xl shadow-xl border border-border py-1 z-40 text-xs text-fg">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        onMoveSection(s.key);
                        setIsOpen(false);
                        setShowMoveSubmenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-surface-raised transition-colors text-xs cursor-pointer
                                  ${currentSection === s.key ? 'text-primary font-bold bg-primary/10' : 'text-fg'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-border my-1" />

            {/* Delete */}
            <button
              onClick={() => {
                setIsOpen(false);
                setIsConfirmOpen(true);
              }}
              className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 size={14} strokeWidth={2} />
              <span>Move to Recycle Bin</span>
            </button>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        count={1}
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          onDelete();
        }}
      />
    </>
  );
}
