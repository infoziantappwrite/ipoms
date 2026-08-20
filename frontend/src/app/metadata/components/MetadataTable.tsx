'use client';

import { Building2, Pencil, Phone, RotateCcw, X } from 'lucide-react';
interface Props {
  companies: any[];
  isRecycleBin: boolean;
  onEdit: (company: any) => void;
  onDelete: (id: string, name: string) => void;
  onRestore: (id: string, name: string) => void;
  onPurge: (id: string, name: string) => void;
}

export function MetadataTable({
  companies,
  isRecycleBin,
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
    <div className="glass-panel rounded-2xl border border-border overflow-hidden shadow-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-background/90 text-fg-subtle font-semibold border-b border-border text-micro uppercase tracking-wider">
              <th className="py-3.5 px-5">Company Name</th>
              <th className="py-3.5 px-4">HR Contact Person</th>
              <th className="py-3.5 px-4">Mobile Numbers</th>
              <th className="py-3.5 px-4">Email ID(s)</th>
              <th className="py-3.5 px-4 text-center">Company Type</th>
              <th className="py-3.5 px-4 text-center">Last Updated</th>
              <th className="py-3.5 px-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-fg-subtle italic">
                  {isRecycleBin ? 'Recycle bin is empty' : 'No matching companies found in metadata catalog'}
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr key={c._id} className="hover:bg-surface/30 transition-colors">
                  {/* Company Name */}
                  <td className="py-3 px-5 font-bold text-white">
                    <Building2 size={14} strokeWidth={2} aria-hidden />
                    {c.company_name}
                  </td>

                  {/* HR Contact */}
                  <td className="py-3 px-4 text-fg">
                    <div className="font-semibold">{c.hr_name || '—'}</div>
                    {c.hr_designation && (
                      <span className="text-micro text-fg-subtle block">{c.hr_designation}</span>
                    )}
                  </td>

                  {/* Mobile Numbers with click-to-copy */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {c.primary_mobile ? (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(c.primary_mobile)}
                          className="bg-surface/80 hover:bg-surface-raised text-fg px-2 py-0.5 rounded font-mono text-micro border border-border-strong transition-colors"
                          title="Click to copy number"
                        >
                          <Phone size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}{c.primary_mobile}
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
                            className="bg-background hover:bg-surface text-fg-subtle px-1.5 py-0.5 rounded font-mono text-micro border border-border"
                            title="Click to copy alternate number"
                          >
                            {m}
                          </button>
                        ))}
                    </div>
                  </td>

                  {/* Email ID(s) */}
                  <td className="py-3 px-4 text-fg-muted font-mono text-micro">
                    {c.primary_email ? (
                      <a
                        href={`mailto:${c.primary_email}`}
                        className="text-primary hover:text-primary underline underline-offset-2"
                      >
                        {c.primary_email}
                      </a>
                    ) : (
                      <span className="text-fg-subtle">—</span>
                    )}
                  </td>

                  {/* Company Type Badge (Spec Section 13) */}
                  <td className="py-3 px-4 text-center">
                    <span className="text-micro bg-surface text-fg-muted px-2.5 py-1 rounded-full border border-border-strong capitalize font-medium">
                      {(c.company_type || 'other').replace('_', ' ')}
                    </span>
                  </td>

                  {/* Audit Trail (Spec Section 15) */}
                  <td className="py-3 px-4 text-center text-micro text-fg-subtle font-mono">
                    {new Date(c.updated_at || c.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-5 text-center">
                    {!isRecycleBin ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(c)}
                          className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-2.5 py-1 rounded text-micro font-semibold transition-colors"
                        >
                          <Pencil size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(c._id, c.company_name)}
                          className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 px-2 py-1 rounded text-micro font-semibold transition-colors"
                          title="Move to Recycle Bin"
                        >
                          🗑️
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRestore(c._id, c.company_name)}
                          className="bg-success/20 hover:bg-success/30 text-success border border-success/30 px-2.5 py-1 rounded text-micro font-semibold transition-colors"
                        >
                          <RotateCcw size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => onPurge(c._id, c.company_name)}
                          className="bg-destructive/20 hover:bg-destructive/40 text-destructive border border-destructive/30 px-2 py-1 rounded text-micro font-bold transition-colors"
                          title="Permanently Purge"
                        >
                          <X size={15} strokeWidth={2} className="inline shrink-0" aria-hidden />{" "}Purge
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
