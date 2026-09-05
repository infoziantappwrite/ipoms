'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Mail,
  X,
  Copy,
  Check,
  ShieldCheck,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  RotateCcw,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { TrackerRow } from '../page';
import { College } from './CollegeSelector';
import { getCollegeEmailTemplate } from '@/lib/collegeEmailTemplates';

interface Props {
  row: TrackerRow;
  college?: College | null;
  onClose: () => void;
  onUpdateEmail?: (rowId: string, email: string) => Promise<void>;
}

export function InviteEmailModal({
  row,
  college,
  onClose,
  onUpdateEmail,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [toEmail, setToEmail] = useState(row.email_id || '');

  const template = getCollegeEmailTemplate(
    college?.college_code,
    college?.college_name,
    row.hr_name,
    row.company_name
  );

  const [fromEmail, setFromEmail] = useState(template.fromEmail);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [copied, setCopied] = useState(false);
  const [emailUpdated, setEmailUpdated] = useState(false);

  // Sync toEmail if row changes
  useEffect(() => {
    setToEmail(row.email_id || '');
  }, [row.email_id]);

  // Sync template when college or row opens
  useEffect(() => {
    const t = getCollegeEmailTemplate(
      college?.college_code,
      college?.college_name,
      row.hr_name,
      row.company_name
    );
    setFromEmail(t.fromEmail);
    setSubject(t.subject);
    setBody(t.body);
  }, [college, row.hr_name, row.company_name]);

  const handleCopy = async () => {
    triggerHaptic('medium');
    const fullText = `To: ${toEmail}\nSubject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleLaunchGmail = () => {
    triggerHaptic('medium');
    if (toEmail !== row.email_id && onUpdateEmail) {
      onUpdateEmail(row._id, toEmail);
    }
    const cleanFrom = (fromEmail || 'placementacet@achariya.org').trim();
    const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
      cleanFrom
    )}&view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
  };

  const handleSaveEmailChange = async () => {
    if (!toEmail.trim()) return;
    if (onUpdateEmail) {
      await onUpdateEmail(row._id, toEmail.trim());
      setEmailUpdated(true);
      triggerHaptic('light');
      setTimeout(() => setEmailUpdated(false), 2000);
    }
  };

  // ── Formatting Engine (Gmail-style Bold, Italic, Bullets, Numbers) ──
  const applyFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);

    let replacement = '';
    if (selectedText) {
      replacement = `${prefix}${selectedText}${suffix}`;
    } else {
      replacement = `${prefix}text${suffix}`;
    }

    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);
    triggerHaptic('light');

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 0);
  };

  const applyBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end) || 'Item 1\nItem 2';
    const lines = selectedText.split('\n');
    const bulleted = lines
      .map((l) => (l.startsWith('• ') ? l.replace('• ', '') : `• ${l}`))
      .join('\n');
    const newBody = body.substring(0, start) + bulleted + body.substring(end);
    setBody(newBody);
    triggerHaptic('light');
  };

  const applyNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end) || 'Item 1\nItem 2';
    const lines = selectedText.split('\n');
    const numbered = lines.map((l, i) => `${i + 1}. ${l.replace(/^\d+\.\s*/, '')}`).join('\n');
    const newBody = body.substring(0, start) + numbered + body.substring(end);
    setBody(newBody);
    triggerHaptic('light');
  };

  const resetToDefault = () => {
    const t = getCollegeEmailTemplate(college?.college_code, college?.college_name);
    setFromEmail(t.fromEmail);
    setSubject(t.subject);
    setBody(t.body);
    triggerHaptic('medium');
  };

  return (
    <div className="fixed inset-0 bg-overlay/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
      {/* Modal Container */}
      <div className="w-full max-w-2xl rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-fg">
        
        {/* ── Modern Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-sunken shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-xs">
              <Mail size={18} strokeWidth={2.25} />
            </div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-fg tracking-tight">
                Invite Email Content
              </h2>
              <span className="text-micro bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold">
                {college?.college_code || 'ACET'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-raised flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── Email Body & Controls ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs no-scrollbar bg-surface">
          
          {/* From & To Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* From Address */}
            <div>
              <label className="block text-fg font-semibold mb-1 flex items-center gap-1.5">
                From (College Placement Email)
                <ShieldCheck size={13} className="text-emerald-500" />
              </label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full bg-surface-sunken border border-border rounded-xl px-3.5 py-2 text-fg text-xs outline-none font-mono font-medium"
              />
            </div>

            {/* To Address */}
            <div>
              <label className="block text-fg font-semibold mb-1 flex items-center justify-between">
                <span>To (Company HR Email) <span className="text-rose-500">*</span></span>
                {emailUpdated && <span className="text-micro text-emerald-600 font-bold">Saved!</span>}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="email"
                  required
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  onBlur={handleSaveEmailChange}
                  placeholder="e.g. hr@company.com"
                  className="flex-1 bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2 text-fg placeholder:text-fg-disabled text-xs transition-all outline-none font-mono font-medium"
                />
              </div>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-fg font-semibold mb-1">
              Subject Line
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-surface-sunken border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl px-3.5 py-2 text-fg text-xs transition-all outline-none font-medium"
            />
          </div>

          {/* Message Body with Gmail-style Toolbar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-fg font-semibold">
                Official Invitation Letter Content
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-primary hover:underline cursor-pointer font-semibold text-micro"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
              </button>
            </div>

            {/* Gmail-style Rich Formatting Toolbar */}
            <div className="flex items-center justify-between gap-2 p-1.5 bg-surface-sunken border border-border border-b-0 rounded-t-xl text-fg-subtle flex-wrap">
              <div className="flex items-center gap-1">
                {/* Bold */}
                <button
                  type="button"
                  onClick={() => applyFormatting('**', '**')}
                  title="Bold (Select text or click)"
                  className="p-1 rounded-lg hover:bg-surface hover:text-fg text-fg font-bold text-xs cursor-pointer flex items-center justify-center w-7 h-7 transition-colors shadow-2xs"
                >
                  <Bold size={13} strokeWidth={2.75} />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onClick={() => applyFormatting('*', '*')}
                  title="Italic"
                  className="p-1 rounded-lg hover:bg-surface hover:text-fg text-fg cursor-pointer flex items-center justify-center w-7 h-7 transition-colors shadow-2xs"
                >
                  <Italic size={13} strokeWidth={2.25} />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onClick={() => applyFormatting('<u>', '</u>')}
                  title="Underline"
                  className="p-1 rounded-lg hover:bg-surface hover:text-fg text-fg cursor-pointer flex items-center justify-center w-7 h-7 transition-colors shadow-2xs"
                >
                  <Underline size={13} strokeWidth={2.25} />
                </button>

                <div className="h-4 w-px bg-border mx-1" />

                {/* Bullet List */}
                <button
                  type="button"
                  onClick={applyBulletList}
                  title="Bullet Points"
                  className="p-1 rounded-lg hover:bg-surface hover:text-fg text-fg cursor-pointer flex items-center justify-center gap-1 px-2 h-7 transition-colors shadow-2xs font-medium"
                >
                  <List size={13} strokeWidth={2.25} />
                  <span className="text-micro hidden sm:inline">Bullets</span>
                </button>

                {/* Numbered List */}
                <button
                  type="button"
                  onClick={applyNumberedList}
                  title="Numbered List"
                  className="p-1 rounded-lg hover:bg-surface hover:text-fg text-fg cursor-pointer flex items-center justify-center gap-1 px-2 h-7 transition-colors shadow-2xs font-medium"
                >
                  <ListOrdered size={13} strokeWidth={2.25} />
                  <span className="text-micro hidden sm:inline">Numbered</span>
                </button>
              </div>

              {/* Reset to Original ACET */}
              <button
                type="button"
                onClick={resetToDefault}
                title="Reset to Original ACET Template"
                className="flex items-center gap-1 text-micro text-fg-subtle hover:text-primary px-2 py-1 rounded-lg hover:bg-surface transition-colors cursor-pointer font-medium"
              >
                <RotateCcw size={11} />
                <span>Reset Original</span>
              </button>
            </div>

            {/* Textarea Editor */}
            <textarea
              ref={textareaRef}
              rows={13}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-surface-sunken border border-border rounded-b-xl p-3.5 text-fg text-xs transition-all outline-none font-sans leading-relaxed resize-y font-normal"
            />
          </div>

        </div>

        {/* ── Sticky Footer Actions ──────────────────────────────────── */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-surface-sunken shrink-0">
          <button
            type="button"
            onClick={handleLaunchGmail}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-primary hover:bg-blue-700 text-primary-foreground font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95"
            title="Send Email via Gmail"
          >
            <Mail size={15} strokeWidth={2.25} />
            <span>Send</span>
          </button>
        </div>

      </div>
    </div>
  );
}
