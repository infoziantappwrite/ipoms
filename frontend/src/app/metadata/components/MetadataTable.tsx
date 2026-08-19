'use client';

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
    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <th className="py-3.5 px-5">Company Name</th>
              <th className="py-3.5 px-4">HR Contact Person</th>
              <th className="py-3.5 px-4">Mobile Numbers</th>
              <th className="py-3.5 px-4">Email ID(s)</th>
              <th className="py-3.5 px-4 text-center">Company Type</th>
              <th className="py-3.5 px-4 text-center">Last Updated</th>
              <th className="py-3.5 px-5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                  {isRecycleBin ? 'Recycle bin is empty' : 'No matching companies found in metadata catalog'}
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr key={c._id} className="hover:bg-slate-800/30 transition-colors">
                  {/* Company Name */}
                  <td className="py-3 px-5 font-bold text-white">
                    <span className="text-blue-400 mr-1.5">🏢</span>
                    {c.company_name}
                  </td>

                  {/* HR Contact */}
                  <td className="py-3 px-4 text-slate-200">
                    <div className="font-semibold">{c.hr_name || '—'}</div>
                    {c.hr_designation && (
                      <span className="text-[10px] text-slate-400 block">{c.hr_designation}</span>
                    )}
                  </td>

                  {/* Mobile Numbers with click-to-copy */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {c.primary_mobile ? (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(c.primary_mobile)}
                          className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-700 transition-colors"
                          title="Click to copy number"
                        >
                          📞 {c.primary_mobile}
                        </button>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                      {c.mobile_numbers
                        ?.filter((m: string) => m !== c.primary_mobile)
                        .map((m: string, i: number) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => copyToClipboard(m)}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono text-[10px] border border-slate-800"
                            title="Click to copy alternate number"
                          >
                            {m}
                          </button>
                        ))}
                    </div>
                  </td>

                  {/* Email ID(s) */}
                  <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                    {c.primary_email ? (
                      <a
                        href={`mailto:${c.primary_email}`}
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                      >
                        {c.primary_email}
                      </a>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  {/* Company Type Badge (Spec Section 13) */}
                  <td className="py-3 px-4 text-center">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 capitalize font-medium">
                      {(c.company_type || 'other').replace('_', ' ')}
                    </span>
                  </td>

                  {/* Audit Trail (Spec Section 15) */}
                  <td className="py-3 px-4 text-center text-[10px] text-slate-400 font-mono">
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
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(c._id, c.company_name)}
                          className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[11px] font-semibold transition-colors"
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
                          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                        >
                          ♻️ Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => onPurge(c._id, c.company_name)}
                          className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 px-2 py-1 rounded text-[11px] font-bold transition-colors"
                          title="Permanently Purge"
                        >
                          ❌ Purge
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
