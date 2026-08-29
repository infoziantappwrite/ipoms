'use client';

import { Shield } from 'lucide-react';

export function RoleMatrixTab() {
  // TPO removed 29 Aug 2026 — no dashboard experience exists for that role,
  // so it was pulled from every role picker and this matrix. See the
  // RoleCode comment in backend/src/lib/routePolicy.ts.
  // Verified 29 Aug 2026 against the actual enforced rules in
  // backend/src/lib/routePolicy.ts (the POLICIES table) — this had drifted
  // from real behavior on 5 rows: Export Reports, Delete/Archive Company
  // Records, and Restore from Recycle Bin all understated what a Coordinator
  // can already do; User & Coordinator Management understated Team Leader;
  // View Governance & Audit Trail claimed a working feature that doesn't
  // exist (no audit-log viewing endpoint is built yet). This table has no
  // live connection to routePolicy.ts, so it can still drift again the next
  // time a permission rule changes — re-verify against POLICIES before
  // trusting it blindly.
  const matrix = [
    { feature: 'Login / Logout', coord: true, tl: true, admin: true },
    { feature: 'View own dashboard', coord: true, tl: true, admin: true },
    { feature: 'Daily Call Tracker (Logging & Recall)', coord: true, tl: true, admin: true },
    { feature: 'Positive Leads & JD Register', coord: true, tl: true, admin: true },
    { feature: 'Weekly Tracker Pipeline Board', coord: true, tl: true, admin: true },
    { feature: 'Reports & Analytics Center', coord: true, tl: true, admin: true },
    { feature: 'Export Reports (PDF / Excel XLSX)', coord: true, tl: true, admin: true },
    { feature: 'Search Master Company Directory', coord: true, tl: true, admin: true },
    { feature: 'Edit Contact Details (Operational)', coord: true, tl: true, admin: true },
    { feature: 'Delete / Archive Company Records', coord: true, tl: true, admin: true },
    { feature: 'Restore from Recycle Bin', coord: true, tl: true, admin: true },
    { feature: 'Permanently Purge Records', coord: false, tl: false, admin: true },
    { feature: 'Dispatch Broadcast Announcements', coord: false, tl: true, admin: true },
    { feature: 'User & Coordinator Management', coord: false, tl: true, admin: true },
    { feature: 'Global Season & App Configuration', coord: false, tl: false, admin: true },
  ];

  // Not a permission row — there is no audit-log viewing screen built for
  // any role yet, so it doesn't belong in a table of what's allowed. Shown
  // separately so the gap is visible without implying it half-works.
  const notYetBuilt = 'View Governance & Audit Trail — no audit-log screen exists for any role yet.';

  return (
    <div className="space-y-4 max-w-5xl mx-auto w-full">
      <div className="glass-panel rounded-2xl border border-border p-5 shadow-4">
        <div className="border-b border-border pb-3 mb-4">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <Shield size={14} strokeWidth={2.2} aria-hidden /> Role-Based Access Control (RBAC) Permissions Matrix
          </h3>
          <p className="text-micro text-fg-subtle mt-0.5">
            Operational and governance permissions frozen per Section 8 of Module 01 User Management Specification
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-background/90 text-fg-subtle font-semibold border-b border-border text-micro uppercase">
                <th className="py-3 px-4">System Feature / Capability</th>
                <th className="py-3 px-3 text-center">Placement Coordinator</th>
                <th className="py-3 px-3 text-center">Team Leader</th>
                <th className="py-3 px-3 text-center">Administrator (CEO/Dir)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {matrix.map((m, idx) => (
                <tr key={idx} className="hover:bg-surface/30 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-fg">{m.feature}</td>

                  <td className="py-2.5 px-3 text-center">
                    <span className={m.coord ? 'text-success font-bold' : 'text-fg-muted'}>
                      {m.coord ? '✓ Allowed' : '—'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span className={m.tl ? 'text-success font-bold' : 'text-fg-muted'}>
                      {m.tl ? '✓ Allowed' : '—'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span className={m.admin ? 'text-success font-bold' : 'text-fg-muted'}>
                      {m.admin ? '✓ Allowed' : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-micro text-fg-subtle mt-3 flex items-center gap-1.5">
          <span className="text-fg-disabled">•</span> {notYetBuilt}
        </p>
      </div>
    </div>
  );
}
