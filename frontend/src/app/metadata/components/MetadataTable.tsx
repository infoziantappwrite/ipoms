'use client';

import React from 'react';
import { Pencil, Phone, RotateCcw, Trash2, X } from 'lucide-react';

interface CompanyRecord {
  _id: string;
  serial_number?: number;
  company_name: string;
  hr_name?: string;
  hr_designation?: string;
  primary_mobile?: string;
  mobile_numbers?: string[];
  primary_email?: string;
  email_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

interface Props {
  companies: CompanyRecord[];
  isRecycleBin: boolean;
  page?: number;
  limit?: number;
  onEdit: (company: CompanyRecord) => void;
  onDelete: (id: string, name: string) => void;
  onRestore: (id: string, name: string) => void;
  onPurge: (id: string, name: string) => void;
}

export function MetadataTable({
  companies,
  isRecycleBin,
  page = 1,
  limit = 50,
  onEdit,
  onDelete,
  onRestore,
  onPurge,
}: Props) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied "${text}" to clipboard!`);
  };

  return (
    <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-1 bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-surface-sunken text-fg-subtle font-semibold border-b border-border text-micro uppercase tracking-wider">
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              <th className="py-3.5 px-5 min-w-[200px] max-w-[280px] text-left">Company Name</th>
              <th className="py-3.5 px-4 min-w-[140px] max-w-[220px]">HR Contact Person</th>
              <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">Mobile Numbers</th>
              <th className="py-3.5 px-4 min-w-[200px] max-w-[300px]">Email ID(s)</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px]">Last Updated</th>
              <th className="py-3.5 px-5 text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-fg-subtle">
                  {isRecycleBin ? 'Recycle bin is empty' : 'No matching companies found in metadata catalog'}
                </td>
              </tr>
            ) : (
              companies.map((c, idx) => {
                const serialNo = c.serial_number ?? ((page - 1) * limit + idx + 1);
                return (
                  <tr key={c._id} className="hover:bg-surface-sunken/60 transition-colors">
                    {/* Serial Number (#) */}
                    <td className="py-3.5 px-4 text-center font-mono text-[11px] font-semibold whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-surface-sunken/90 border border-border text-fg font-mono text-xs font-bold shadow-2xs">
                        {serialNo}
                      </span>
                    </td>

                    {/* Company Name - Wrap Allowed */}
                    <td className="py-3.5 px-5 font-bold text-fg min-w-[200px] max-w-[280px] break-words leading-snug text-xs">
                      {c.company_name}
                    </td>

                    {/* HR Contact - Wrap Allowed */}
                    <td className="py-3.5 px-4 text-fg min-w-[140px] max-w-[220px]">
                      <div className="font-semibold text-fg break-words">{c.hr_name || '—'}</div>
                    </td>

                    {/* Mobile Numbers - NEVER Wrap Numbers */}
                    <td className="py-3.5 px-4 whitespace-nowrap min-w-[160px]">
                      <div className="flex flex-col gap-1.5 items-start">
                        {c.primary_mobile ? (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(c.primary_mobile!)}
                            className="bg-surface-sunken hover:bg-surface text-fg px-2 py-0.5 rounded-md font-mono text-micro border border-border transition-colors cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0"
                            title="Click to copy number"
                          >
                            <Phone size={12} strokeWidth={2} className="text-primary shrink-0" aria-hidden />
                            <span className="whitespace-nowrap tabular-nums">{c.primary_mobile}</span>
                          </button>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                        {c.mobile_numbers
                          ?.filter((m: string) => m !== c.primary_mobile)
                          .map((m: string, i: number) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => copyToClipboard(m)}
                              className="bg-surface-sunken/50 hover:bg-surface text-fg-subtle hover:text-fg px-1.5 py-0.5 rounded-md font-mono text-micro border border-border/80 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              title="Click to copy alternate number"
                            >
                              <span className="whitespace-nowrap tabular-nums">{m}</span>
                            </button>
                          ))}
                      </div>
                    </td>

                    {/* Email ID(s) - Wraps Multiple Emails Cleanly */}
                    <td className="py-3.5 px-4 text-fg-muted font-mono text-micro min-w-[200px] max-w-[300px]">
                      {c.email_ids && c.email_ids.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {c.email_ids.map((email: string, i: number) => (
                            <a
                              key={i}
                              href={`mailto:${email}`}
                              className="text-primary hover:underline underline-offset-2 font-medium break-all leading-tight"
                              title={email}
                            >
                              {email}
                            </a>
                          ))}
                        </div>
                      ) : c.primary_email ? (
                        <a
                          href={`mailto:${c.primary_email}`}
                          className="text-primary hover:underline underline-offset-2 font-medium break-all leading-tight"
                          title={c.primary_email}
                        >
                          {c.primary_email}
                        </a>
                      ) : (
                        <span className="text-fg-subtle">—</span>
                      )}
                    </td>

                    {/* Audit Trail (Spec Section 15) */}
                    <td className="py-3.5 px-4 text-center text-micro text-fg-subtle font-mono whitespace-nowrap">
                      {new Date(c.updated_at || c.created_at || '').toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-center">
                      {!isRecycleBin ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(c)}
                            className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Edit Company Details"
                          >
                            <Pencil size={13} strokeWidth={2} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(c._id, c.company_name)}
                            className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Move to Recycle Bin"
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onRestore(c._id, c.company_name)}
                            className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Restore Contact"
                          >
                            <RotateCcw size={13} strokeWidth={2} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => onPurge(c._id, c.company_name)}
                            className="w-7 h-7 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-600 border border-rose-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Permanently Purge"
                          >
                            <X size={13} strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
