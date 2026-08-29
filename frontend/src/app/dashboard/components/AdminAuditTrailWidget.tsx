'use client';

import { Shield, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface AuditLogEntry {
  _id: string;
  action_type: string;
  result: 'SUCCESS' | 'FAILED';
  entity_type: string;
  performed_by_role: string;
  performed_by_email: string;
  module_name: string;
  severity: 'info' | 'warning' | 'critical';
  summary_message: string;
  created_at: string | Date;
}

interface Props {
  auditLogs: AuditLogEntry[];
}

export function AdminAuditTrailWidget({ auditLogs = [] }: Props) {
  if (!auditLogs || auditLogs.length === 0) {
    return null;
  }

  const getActionBadge = (action: string, result: string) => {
    if (result === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold font-mono uppercase bg-danger/10 text-danger border border-danger/30 px-1.5 py-0.2 rounded">
          <XCircle size={9} /> FAILED
        </span>
      );
    }

    if (action.includes('LOCK') || action.includes('RESET') || action.includes('STATUS')) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold font-mono uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded">
          <AlertTriangle size={9} /> {action}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold font-mono uppercase bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded">
        <CheckCircle2 size={9} /> {action}
      </span>
    );
  };

  return (
    <div className="glass-panel rounded-2xl border border-border p-5 space-y-4 shadow-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Shield size={16} />
          </span>
          <div>
            <h3 className="text-xs font-bold text-fg">System Security & Operational Audit Log</h3>
            <p className="text-micro text-fg-subtle mt-0.5">
              Live audit trail of user authentications, account lockouts, security unlocks, and administrative actions
            </p>
          </div>
        </div>

        <span className="text-micro text-fg-subtle font-mono">
          Immutable Trail (Zero Password Storage)
        </span>
      </div>

      {/* Audit List */}
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-surface">
        {auditLogs.map((log) => {
          const timeString = log.created_at
            ? new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : 'Recently';
          const dateString = log.created_at
            ? new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            : '';

          return (
            <div
              key={log._id}
              className="p-3 hover:bg-surface-sunken/40 transition-colors flex items-center justify-between flex-wrap gap-2 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0 max-w-[70%]">
                {getActionBadge(log.action_type, log.result)}
                <div className="min-w-0">
                  <p className="text-fg font-medium truncate" title={log.summary_message}>
                    {log.summary_message}
                  </p>
                  <span className="text-[10px] text-fg-subtle flex items-center gap-1 font-mono">
                    <span>Actor: {log.performed_by_email || log.performed_by_role}</span>
                    <span>•</span>
                    <span>Module: {log.module_name}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-fg-subtle font-mono shrink-0">
                <Clock size={11} className="text-fg-subtle/70" />
                <span>{dateString} {timeString}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
