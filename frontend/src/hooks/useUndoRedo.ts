'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';
import { triggerHaptic } from '@/lib/haptics';

export interface HistoryAction {
  id: string;
  description: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  timestamp: number;
}

interface UseUndoRedoOptions {
  maxHistory?: number;
  enableKeyboardShortcuts?: boolean;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}) {
  const { maxHistory = 50, enableKeyboardShortcuts = true } = options;
  const { toast } = useToast();

  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  // Keep references to current stacks for shortcut handlers
  const undoStackRef = useRef<HistoryAction[]>([]);
  const redoStackRef = useRef<HistoryAction[]>([]);
  const isExecutingRef = useRef(false);

  undoStackRef.current = undoStack;
  redoStackRef.current = redoStack;
  isExecutingRef.current = isExecuting;

  const pushAction = useCallback(
    (action: { description: string; undo: () => Promise<void> | void; redo: () => Promise<void> | void }) => {
      const historyItem: HistoryAction = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        description: action.description,
        undo: action.undo,
        redo: action.redo,
        timestamp: Date.now(),
      };

      setUndoStack((prev) => [...prev.slice(-(maxHistory - 1)), historyItem]);
      setRedoStack([]); // Clear redo stack on new action
    },
    [maxHistory]
  );

  const undo = useCallback(async () => {
    if (isExecutingRef.current || undoStackRef.current.length === 0) return;

    setIsExecuting(true);
    isExecutingRef.current = true;

    const action = undoStackRef.current[undoStackRef.current.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));

    try {
      await action.undo();
      setRedoStack((prev) => [...prev, action]);
      triggerHaptic('medium');
      toast(`↶ Undone: ${action.description}`, 'info');
    } catch (err) {
      console.error('Failed to execute undo action:', err);
      toast('Failed to undo action', 'error');
    } finally {
      setIsExecuting(false);
      isExecutingRef.current = false;
    }
  }, [toast]);

  const redo = useCallback(async () => {
    if (isExecutingRef.current || redoStackRef.current.length === 0) return;

    setIsExecuting(true);
    isExecutingRef.current = true;

    const action = redoStackRef.current[redoStackRef.current.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));

    try {
      await action.redo();
      setUndoStack((prev) => [...prev, action]);
      triggerHaptic('medium');
      toast(`↷ Redone: ${action.description}`, 'info');
    } catch (err) {
      console.error('Failed to execute redo action:', err);
      toast('Failed to redo action', 'error');
    } finally {
      setIsExecuting(false);
      isExecutingRef.current = false;
    }
  }, [toast]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Cmd+Z, Cmd+Y, Cmd+Shift+Z)
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      const isInputFocused =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable);

      const key = e.key.toLowerCase();

      // Undo: Ctrl+Z (without Shift)
      if (key === 'z' && !e.shiftKey) {
        // If user is focused on a standard text input, let native browser text undo happen unless it's blurred
        if (isInputFocused && activeEl instanceof HTMLInputElement && ['text', 'search', 'email', 'number'].includes(activeEl.type)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        undo();
      }
      // Redo: Ctrl+Y OR Ctrl+Shift+Z
      else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        if (isInputFocused && activeEl instanceof HTMLInputElement && ['text', 'search', 'email', 'number'].includes(activeEl.type)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enableKeyboardShortcuts, undo, redo]);

  return {
    pushAction,
    undo,
    redo,
    clearHistory,
    canUndo: undoStack.length > 0 && !isExecuting,
    canRedo: redoStack.length > 0 && !isExecuting,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
    isExecuting,
  };
}
