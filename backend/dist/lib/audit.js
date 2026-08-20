"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAudit = writeAudit;
const AuditLog_1 = require("../models/AuditLog");
/** Crude but readable UA summary — "Chrome / Windows / Desktop". */
function describeDevice(ua = '') {
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
async function writeAudit(input) {
    try {
        const ua = input.req?.headers['user-agent'] ?? '';
        await AuditLog_1.AuditLog.create({
            action_type: input.action,
            result: input.result ?? 'SUCCESS',
            entity_type: input.entityType,
            entity_id: input.entityId ?? null,
            performed_by: input.performedBy ?? null,
            performed_by_role: input.performedByRole ?? 'system',
            performed_by_email: input.performedByEmail ?? '',
            module_name: input.module,
            severity: input.severity ?? 'info',
            summary_message: input.summary,
            changes_snapshot: input.changes ?? null,
            ip_address: input.req?.ip ?? null,
            user_agent: ua || null,
            device_info: ua ? describeDevice(String(ua)) : null,
        });
    }
    catch (err) {
        console.error('[audit] FAILED to write audit entry:', input.action, err);
    }
}
