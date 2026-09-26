import type { Request } from 'express';
import { AuditLog, type AuditAction, type AuditSeverity } from '../models/AuditLog';

/**
 * Audit writer. Never throws: an audit failure must not take down the request
 * that triggered it, but it must be loud in the server log, because a silently
 * missing security trail is worse than a noisy one.
 */

interface AuditInput {
  action: AuditAction;
  result?: 'SUCCESS' | 'FAILED';
  entityType: string;
  entityId?: any;
  performedBy?: any;
  performedByRole?: string;
  performedByEmail?: string;
  module: string;
  severity?: AuditSeverity;
  summary: string;
  changes?: Record<string, unknown> | null;
  req?: Request;
}

/** Crude but readable UA summary — "Chrome / Windows / Desktop". */
function describeDevice(ua = ''): string {
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : /Firefox\//.test(ua) ? 'Firefox'
    : 'Unknown browser';
  const os = /Windows/.test(ua) ? 'Windows'
    : /Mac OS/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown OS';
  const form = /Mobile|Android|iPhone/.test(ua) ? 'Mobile' : 'Desktop';
  return `${browser} / ${os} / ${form}`;
}

/** Audit rows hold text a caller controls (the email typed at a login form, a summary built from it). Without a cap
 *  one request could write megabytes into a row that every admin dashboard load then had to ship. */
const clip = (v: unknown, max: number): string => {
  const s = String(v ?? '');
  return s.length > max ? s.slice(0, max) + `…[+${s.length - max} chars]` : s;
};

function clipSnapshot(v: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!v) return null;
  try {
    const json = JSON.stringify(v);
    return json.length <= 20_000 ? v : { truncated: true, preview: json.slice(0, 2000), original_chars: json.length };
  } catch {
    return { truncated: true };
  }
}

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    const ua = input.req?.headers['user-agent'] ?? '';
    await AuditLog.create({
      action_type: input.action,
      result: input.result ?? 'SUCCESS',
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      performed_by: input.performedBy ?? null,
      performed_by_role: input.performedByRole ?? 'system',
      performed_by_email: clip(input.performedByEmail, 254),
      module_name: input.module,
      severity: input.severity ?? 'info',
      summary_message: clip(input.summary, 1000),
      changes_snapshot: clipSnapshot(input.changes),
      ip_address: input.req?.ip ?? null,
      user_agent: ua ? clip(ua, 300) : null,
      device_info: ua ? describeDevice(String(ua)) : null,
    });
  } catch (err) {
    console.error('[audit] FAILED to write audit entry:', input.action, err);
  }
}
