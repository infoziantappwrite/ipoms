'use client';

export function RoleMatrixTab() {
  const matrix = [
    { feature: 'Login / Logout', coord: true, tl: true, admin: true, tpo: true },
    { feature: 'View own dashboard', coord: true, tl: true, admin: true, tpo: true },
    { feature: 'Daily Call Tracker (Logging & Recall)', coord: true, tl: true, admin: true, tpo: false },
    { feature: 'Positive Leads & JD Register', coord: true, tl: true, admin: true, tpo: true },
    { feature: 'Weekly Tracker Pipeline Board', coord: true, tl: true, admin: true, tpo: true },
    { feature: 'Reports & Analytics Center', coord: true, tl: true, admin: true, tpo: true },
    { feature: 'Export Reports (PDF / Excel / CSV)', coord: false, tl: true, admin: true, tpo: true },
    { feature: 'Search Master Company Directory', coord: true, tl: true, admin: true, tpo: false },
    { feature: 'Edit Contact Details (Operational)', coord: true, tl: true, admin: true, tpo: false },
    { feature: 'Delete / Archive Company Records', coord: false, tl: true, admin: true, tpo: false },
    { feature: 'Restore from Recycle Bin', coord: false, tl: true, admin: true, tpo: false },
    { feature: 'Permanently Purge Records', coord: false, tl: false, admin: true, tpo: false },
    { feature: 'Dispatch Broadcast Announcements', coord: false, tl: true, admin: true, tpo: false },
    { feature: 'User & Coordinator Management', coord: false, tl: false, admin: true, tpo: false },
    { feature: 'Global Season & App Configuration', coord: false, tl: false, admin: true, tpo: false },
    { feature: 'View Governance & Audit Trail', coord: false, tl: false, admin: true, tpo: false },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl border border-slate-800 p-5 shadow-xl">
        <div className="border-b border-slate-800 pb-3 mb-4">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <span>🛡️</span> Role-Based Access Control (RBAC) Permissions Matrix
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Operational and governance permissions frozen per Section 8 of Module 01 User Management Specification
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase">
                <th className="py-3 px-4">System Feature / Capability</th>
                <th className="py-3 px-3 text-center">Placement Coordinator</th>
                <th className="py-3 px-3 text-center">Team Leader</th>
                <th className="py-3 px-3 text-center">Administrator (CEO/Dir)</th>
                <th className="py-3 px-3 text-center">TPO Officer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {matrix.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-200">{m.feature}</td>

                  <td className="py-2.5 px-3 text-center">
                    <span className={m.coord ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                      {m.coord ? '✓ Allowed' : '—'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span className={m.tl ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                      {m.tl ? '✓ Allowed' : '—'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span className={m.admin ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                      {m.admin ? '✓ Allowed' : '—'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span className={m.tpo ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                      {m.tpo ? '✓ Allowed' : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
