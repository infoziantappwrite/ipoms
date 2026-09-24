// iPOMS Backend Server - August 2026 Segregation Active - Reloaded Audit
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import * as xlsx from 'xlsx';
import { connectDatabase } from './config/database';
import { CompanyMetadata } from './models/CompanyMetadata';
import { User } from './models/User';
import { Role } from './models/Role';
import { College } from './models/College';
import { DailyTracker, POSITIVE_OUTCOMES, PIPELINE_SYNC_OUTCOME } from './models/DailyTracker';
import { WeeklyTracker, PIPELINE_SECTIONS, PipelineSection } from './models/WeeklyTracker';
import { DailyLead, LEAD_TYPES, LeadType } from './models/DailyLead';
import { ReportLibrary, REPORT_TEMPLATE_TYPES, ReportTemplateType, REPORT_THEMES, ReportTheme } from './models/ReportLibrary';
import { AssignedWork, ASSIGNMENT_PRIORITIES, AssignmentPriority, ASSIGNMENT_STATUSES, AssignmentStatus } from './models/AssignedWork';
import { Notification, NOTIFICATION_TYPES, NotificationType, AUDIENCE_TYPES, AudienceType, SENDER_ROLES, SenderRole } from './models/Notification';
import { PendingTask } from './models/PendingTask';
import { ActiveLead } from './models/ActiveLead';
import { SystemSettings } from './models/SystemSettings';
import { AuditLog } from './models/AuditLog';
import { writeAudit } from './lib/audit';
import { getCurrentAcademicYear, getCurrentGraduatingBatchYear, clearAcademicYearCache } from './lib/academicYear';
import mongoose, { Types } from 'mongoose';
import { startFinalizationJob } from './jobs/finalizeDailyTracker';
import { startPositiveSyncReminderJob } from './jobs/positiveSyncReminder';
import rateLimit from 'express-rate-limit';
import { registerAuthRoutes } from './lib/authRoutes';
import { registerActiveLeadRoutes, syncLeadFromDailyTracker } from './lib/activeLeadRoutes';
import { registerPendingTaskRoutes } from './lib/pendingTaskRoutes';
import { seedMasterDailyLeads, MASTER_POSITIVES_DATA } from './lib/seedMasterDailyLeads';
import { seedAugustAllCollegesPositives } from './lib/seedAugustAllCollegesPositives';
import { seedAugustAllCollegesJdReceived } from './lib/seedAugustAllCollegesJdReceived';
import { seedActiveLeadsFromMasterPositives } from './lib/seedActiveLeadsFromMasterPositives';
import { reloadWeeklyTrackerFrom2027Workbook } from './lib/reloadWeeklyTracker2027';
import { reloadMetaDatabaseFromFile } from './lib/reloadMetaDatabase';
import { importUniqueCompaniesList } from './lib/loadUniqueCompanies';
import { generateMissingMobilesExcel } from './lib/exportMissingMobiles';
import { renumberCompanyMetadata } from './lib/normalizeSerialNumbers';
import { importWeeklySheetForCollege } from './lib/weeklyExcelParser';
import { updateNehruWeeklyTracker } from './scripts/updateNehruWeeklyTracker';
import { updateHitsWeeklyTracker } from './scripts/updateHitsWeeklyTracker';
import { authenticateJWT, authorizeRoles, AuthUserPayload } from './lib/authMiddleware';
import { authorizeRoute, scopeToSelf, isSupervisor, refuseForeignOwner, refuseRoleEscalation, assignableRoles, normalizeRole } from './lib/routePolicy';
import { isPasswordValid, firstPasswordError } from './lib/passwordPolicy';
import { sendForeignCollegeEditEmail } from './lib/mailer';
import { syncCollegesFromExcel } from './scripts/syncCollegesFromSharepoint';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Enable trust proxy so Express correctly detects HTTPS when running behind reverse proxies (Nginx, Cloudflare, Traefik, AWS ALB)
app.set('trust proxy', 1);

/**
 * Destructive demo seeding on boot. Off unless explicitly requested — see the
 * comment block in startServer() for what each seed empties.
 */
const SEED_ON_BOOT = process.env.SEED_ON_BOOT === 'true';

/**
 * Rewrite every seeded account's password, role, colleges and lock state back to
 * the defaults on boot. Off unless explicitly requested: leaving it on silently
 * undid password changes, the 3-strike lockout, profile locks and user deletion
 * every time the process restarted. Use it deliberately to reset a dev database.
 */
const RESET_ACCOUNTS_ON_BOOT = process.env.RESET_ACCOUNTS_ON_BOOT === 'true';

const allowedOrigins = [
  CORS_ORIGIN,
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:5000',
  'https://localhost:5000',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'https://ipoms.vercel.app',
];

// Middleware stack - Configure Helmet to allow cross-origin API access across HTTP and HTTPS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (native apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // Allow localhost on any port (HTTP or HTTPS)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      // Allow local networks
      if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(origin)) {
        return callback(null, true);
      }
      // Allow Vercel deployments and custom allowed origins
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      // Anything else is refused. The fallback here used to be `callback(null, true)`
      // — approving every origin unconditionally, which combined with
      // `credentials: true` let any website make credentialed cross-origin
      // requests (cookies, including the httpOnly refresh-token cookie) and read
      // the JSON response, e.g. POST /auth/refresh returning a fresh access
      // token to an attacker page. See §5 item 44.
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cookie'],
    exposedHeaders: ['Authorization', 'Set-Cookie'],
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// ── Shared Helpers ───────────────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Get today's operational calendar date as midnight UTC with 12:00 AM (00:00:00 IST) cutoff
// Refreshes every morning early at 12:00 AM midnight IST
function getTodayDate(): Date {
  const now = new Date();
  // IST offset: UTC + 5 hours 30 mins
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffsetMs);
  return new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0, 0));
}

// Build session_date as midnight UTC for a given local date string (YYYY-MM-DD) or today
function buildSessionDate(dateStr?: string): Date {
  if (dateStr) {
    return parseDateParam(dateStr);
  }
  return getTodayDate();
}

function parseDateParam(dateStr: string): Date {
  if (!dateStr) return getTodayDate();
  const trimmed = dateStr.trim();
  // Check if DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  // Check if YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2].slice(0, 2), 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return getTodayDate();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

// Format duration from seconds to "01m 53s" as per spec Section 10.4
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

// Format duration from seconds into Hours, Minutes, Seconds with breakdown
function formatDurationClock(seconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  let formatted = '';
  if (h > 0) {
    formatted = `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  } else {
    formatted = `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }
  return { hours: h, minutes: m, seconds: s, formatted };
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// CORE INFRASTRUCTURE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Health Check Endpoint
app.get('/api/v1/health', (req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const status = isDbConnected ? 'HEALTHY' : 'DEGRADED';
  res.status(isDbConnected ? 200 : 503).json({
    success: isDbConnected,
    status,
    service: 'iPOMS Core Backend API',
    version: '1.0.0',
    database: {
      status: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
      name: mongoose.connection.name || 'ipoms_db',
      readyState: mongoose.connection.readyState,
    },
    timestamp: new Date().toISOString(),
  });
});

// Metadata Contact Audit Endpoint
app.get('/api/v1/meta-audit', async (req: Request, res: Response) => {
  try {
    const allRecords = await CompanyMetadata.find({ is_deleted: { $ne: true } }).lean();
    const suspiciousRecords: any[] = [];

    for (const c of allRecords) {
      const issues: string[] = [];

      // 1. Mobile Number Audit
      const mobs = [...(c.mobile_numbers || [])];
      if (c.primary_mobile) mobs.push(c.primary_mobile);
      const invalidMobiles: string[] = [];
      for (const m of mobs) {
        if (!m) continue;
        const clean = m.replace(/[\s\-\(\)\+]/g, '');
        if (clean.length > 0 && clean.length < 10) {
          invalidMobiles.push(`${m} (Incomplete < 10 digits)`);
        } else if (/^(\d)\1{9,}$/.test(clean)) {
          invalidMobiles.push(`${m} (Repeated digits)`);
        } else if (['1234567890', '9876543210', '0000000000', '1111111111'].includes(clean)) {
          invalidMobiles.push(`${m} (Dummy number)`);
        }
      }
      if (invalidMobiles.length > 0) {
        issues.push(`Invalid/Suspicious Mobile: ${Array.from(new Set(invalidMobiles)).join(', ')}`);
      }

      // 2. Email ID Audit
      const emails = [...(c.email_ids || [])];
      if (c.primary_email) emails.push(c.primary_email);
      const invalidEmails: string[] = [];
      for (const e of emails) {
        if (!e) continue;
        const trimmed = e.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          invalidEmails.push(`${e} (Invalid Email Format)`);
        } else if (trimmed.includes('test.com') || trimmed.includes('example.com') || trimmed.includes('noemail') || trimmed.includes('abc.com')) {
          invalidEmails.push(`${e} (Dummy/Placeholder Domain)`);
        }
      }
      if (invalidEmails.length > 0) {
        issues.push(`Invalid/Suspicious Email: ${Array.from(new Set(invalidEmails)).join(', ')}`);
      }

      // 3. Complete Contact Information Missing
      const hasValidMobile = mobs.some(m => m && m.replace(/\D/g, '').length >= 10);
      const hasValidEmail = emails.some(e => e && e.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
      if (!hasValidMobile && !hasValidEmail) {
        issues.push('Missing both valid Mobile Number and valid Email ID');
      }

      // 4. Missing/Generic HR Name
      if (!c.hr_name || c.hr_name.trim() === '' || ['hr', 'test', 'unknown', 'na', 'n/a', 'nil'].includes(c.hr_name.trim().toLowerCase())) {
        issues.push(`Missing/Generic HR Name (${c.hr_name ? `"${c.hr_name}"` : 'Empty'})`);
      }

      if (issues.length > 0) {
        suspiciousRecords.push({
          id: c._id,
          serial_number: c.serial_number || 'N/A',
          company_name: c.company_name,
          hr_name: c.hr_name || 'N/A',
          primary_mobile: c.primary_mobile || 'N/A',
          primary_email: c.primary_email || 'N/A',
          issues
        });
      }
    }

    res.json({
      total_active_records: allRecords.length,
      total_suspicious: suspiciousRecords.length,
      suspicious_records: suspiciousRecords
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1b. Duplicate Company Audit across Active Leads & Master Sources
app.get('/health/duplicate-audit', async (req: Request, res: Response) => {
  try {
    const leads = await ActiveLead.find({ is_deleted: false }).lean();
    const weeklyTrackers = await WeeklyTracker.find({ is_deleted: false }).select('company_name job_role ctc_lpa pipeline_section academic_year').lean();
    const masterPositives = MASTER_POSITIVES_DATA || [];

    const cleanName = (s: string) => {
      return (s || '')
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const stripCorporateSuffixes = (s: string) => {
      let n = cleanName(s);
      const suffixes = [
        'private limited', 'pvt ltd', 'pvt limited', 'private ltd', 'pvtltd',
        'limited', 'ltd', 'inc', 'corporation', 'corp', 'llc', 'llp',
        'technologies', 'technology', 'tech', 'solutions', 'solution',
        'infotech', 'services', 'service', 'systems', 'system',
        'enterprises', 'enterprise', 'studios', 'studio', 'group',
        'consultancy', 'consulting', 'consultants', 'software', 'soft',
        'digital', 'global', 'international', 'india', 'labs', 'lab'
      ];
      let changed = true;
      while (changed) {
        changed = false;
        for (const suf of suffixes) {
          const regex = new RegExp(`\\b${suf}\\b`, 'gi');
          const before = n;
          n = n.replace(regex, ' ').replace(/\s+/g, ' ').trim();
          if (n !== before) changed = true;
        }
      }
      return n || cleanName(s);
    };

    const levenshtein = (a: string, b: string): number => {
      const matrix: number[][] = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    };

    // Helper to analyze any company item list
    const analyzeCompanyList = (items: Array<{ name: string; role?: string; ctc?: string; extra?: string }>) => {
      const exactGroups = new Map<string, any[]>();
      for (const item of items) {
        if (!item.name || !item.name.trim()) continue;
        const key = cleanName(item.name);
        if (!exactGroups.has(key)) exactGroups.set(key, []);
        exactGroups.get(key)!.push(item);
      }

      const exactDuplicates: any[] = [];
      for (const [key, group] of exactGroups.entries()) {
        if (group.length > 1) {
          exactDuplicates.push({
            normalized_key: key,
            count: group.length,
            unique_name_casings: Array.from(new Set(group.map(i => i.name))),
            roles: Array.from(new Set(group.map(i => i.role || '—'))),
            ctcs: Array.from(new Set(group.map(i => i.ctc || '—'))),
            instances: group,
          });
        }
      }

      const strippedGroups = new Map<string, any[]>();
      for (const item of items) {
        if (!item.name || !item.name.trim()) continue;
        const key = stripCorporateSuffixes(item.name);
        if (!strippedGroups.has(key)) strippedGroups.set(key, []);
        strippedGroups.get(key)!.push(item);
      }

      const suffixDuplicates: any[] = [];
      for (const [key, group] of strippedGroups.entries()) {
        const distinctCleanNames = new Set(group.map(i => cleanName(i.name)));
        if (distinctCleanNames.size > 1) {
          suffixDuplicates.push({
            stripped_core_name: key,
            total_count: group.length,
            distinct_variants: Array.from(new Set(group.map(i => i.name))),
            roles: Array.from(new Set(group.map(i => i.role || '—'))),
            ctcs: Array.from(new Set(group.map(i => i.ctc || '—'))),
          });
        }
      }

      const allDistinctEntries = Array.from(exactGroups.entries()).map(([cleanKey, group]) => ({
        cleanKey,
        coreKey: stripCorporateSuffixes(cleanKey),
        sampleName: group[0].name,
        count: group.length,
        items: group,
      }));

      const fuzzyMatches: any[] = [];
      const pairedKeys = new Set<string>();

      for (let i = 0; i < allDistinctEntries.length; i++) {
        for (let j = i + 1; j < allDistinctEntries.length; j++) {
          const e1 = allDistinctEntries[i];
          const e2 = allDistinctEntries[j];

          if (e1.coreKey === e2.coreKey) continue;

          const tokens1 = new Set(e1.cleanKey.split(' ').filter(Boolean));
          const tokens2 = new Set(e2.cleanKey.split(' ').filter(Boolean));
          const isSubset = Array.from(tokens1).every(t => tokens2.has(t)) || Array.from(tokens2).every(t => tokens1.has(t));

          const distClean = levenshtein(e1.cleanKey, e2.cleanKey);
          const distCore = levenshtein(e1.coreKey, e2.coreKey);
          const minLen = Math.min(e1.cleanKey.length, e2.cleanKey.length);
          const minCoreLen = Math.min(e1.coreKey.length, e2.coreKey.length);

          const isTypoMatch = (minLen > 4 && distClean <= 2) || (minCoreLen > 3 && distCore <= 1);

          if (isSubset || isTypoMatch) {
            const pairKey = [e1.cleanKey, e2.cleanKey].sort().join(' <--> ');
            if (!pairedKeys.has(pairKey)) {
              pairedKeys.add(pairKey);
              fuzzyMatches.push({
                type: isSubset ? 'Token Subset / Acronym / Permutation' : `Typo / Character Variation (Edit Distance: ${Math.min(distClean, distCore)})`,
                company_a: e1.sampleName,
                company_b: e2.sampleName,
                count_a: e1.count,
                count_b: e2.count,
                roles_a: Array.from(new Set(e1.items.map(l => l.role))),
                roles_b: Array.from(new Set(e2.items.map(l => l.role))),
                ctcs_a: Array.from(new Set(e1.items.map(l => l.ctc))),
                ctcs_b: Array.from(new Set(e2.items.map(l => l.ctc))),
              });
            }
          }
        }
      }

      return {
        total_items: items.length,
        total_unique_normalized: exactGroups.size,
        exact_duplicate_groups: exactDuplicates,
        corporate_suffix_duplicates: suffixDuplicates,
        fuzzy_and_spelling_matches: fuzzyMatches,
      };
    };

    const activeLeadsAudit = analyzeCompanyList(
      leads.map(l => ({ name: l.company_name, role: l.role, ctc: l.ctc, extra: l.academic_year }))
    );

    const masterPositivesAudit = analyzeCompanyList(
      masterPositives.map(m => ({ name: m.company, role: m.role, ctc: m.ctc, extra: m.collegeCode + ' ' + m.date }))
    );

    const weeklyTrackersAudit = analyzeCompanyList(
      weeklyTrackers.map(w => ({ name: w.company_name, role: w.job_role, ctc: w.ctc_lpa, extra: w.pipeline_section }))
    );

    return res.status(200).json({
      success: true,
      active_leads: activeLeadsAudit,
      master_positives_source_400_plus: masterPositivesAudit,
      weekly_tracker: weeklyTrackersAudit,
    });
  } catch (err: any) {
    console.error('duplicate-audit error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// One-off data-repair tooling, not a health probe despite the name. It is
// registered here, ABOVE the `app.use('/api/v1', authenticateJWT)` mount below,
// so the global gate never sees it — hence the explicit per-route middleware.
// Without it this was an anonymous endpoint that deleted colleges on a GET.
app.get('/api/v1/health/daily-leads-diagnostics', authenticateJWT, authorizeRoles('ADMINISTRATOR'), async (req: Request, res: Response) => {
  try {
    // Every mutation here is now behind ?resync=true. A GET is supposed to be
    // safe to repeat; this one silently deleted the MAR/NGC colleges and
    // reassigned six companies' college_id on every call, including from a
    // browser preflight or an uptime checker.
    const resync = req.query.resync === 'true';

    if (resync) {
      await seedMasterDailyLeads();
      await seedAugustAllCollegesJdReceived();
      await seedActiveLeadsFromMasterPositives();
    }
    let ngceCollege = await College.findOne({ college_code: 'NGCE' });
    if (!ngceCollege && resync) {
      ngceCollege = await College.create({
        college_name: 'Narayana Guru College of Engineering',
        college_code: 'NGCE',
        location: 'Kanyakumari / Coimbatore, Tamil Nadu',
        departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
        is_deleted: false,
      });
    }
    if (resync) {
      await College.deleteMany({ college_code: { $in: ['MAR', 'NGC'] } });
      if (ngceCollege) {
        await DailyLead.updateMany(
          { company_name: { $in: ['Merlin Automation', 'sasken', 'Avinya Infinity Solutions Pvt Ltd', 'BIBUS India', 'SSHRD GROUP', 'DEEPFACTS'] } },
          { $set: { college_id: ngceCollege._id } }
        );
      }
    }

    const augStart = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
    const preAugustCount = await DailyLead.countDocuments({ lead_date: { $lt: augStart } });
    const augustPositivesCount = await DailyLead.countDocuments({ lead_type: 'positive', lead_date: { $gte: augStart } });
    const augustJdCount = await DailyLead.countDocuments({ lead_type: 'jd_received', lead_date: { $gte: augStart } });

    const positives = await DailyLead.find({ lead_type: 'positive', lead_date: { $gte: augStart } })
      .populate('college_id', 'college_name college_code');
    const jds = await DailyLead.find({ lead_type: 'jd_received', lead_date: { $gte: augStart } })
      .populate('college_id', 'college_name college_code');

    const collegeBreakdown: Record<string, number> = {};
    const dateBreakdown: Record<string, number> = {};

    positives.forEach((p: any) => {
      const cCode = p.college_id?.college_code || 'UNKNOWN';
      collegeBreakdown[cCode] = (collegeBreakdown[cCode] || 0) + 1;
      const dStr = p.lead_date && p.lead_date instanceof Date ? p.lead_date.toISOString().split('T')[0] : (p.lead_date ? String(p.lead_date).split('T')[0] : 'UNKNOWN');
      dateBreakdown[dStr] = (dateBreakdown[dStr] || 0) + 1;
    });

    const jdCollegeBreakdown: Record<string, number> = {};
    const jdDateBreakdown: Record<string, number> = {};

    jds.forEach((j: any) => {
      const cCode = j.college_id?.college_code || 'UNKNOWN';
      jdCollegeBreakdown[cCode] = (jdCollegeBreakdown[cCode] || 0) + 1;
      const dStr = j.lead_date && j.lead_date instanceof Date ? j.lead_date.toISOString().split('T')[0] : (j.lead_date ? String(j.lead_date).split('T')[0] : 'UNKNOWN');
      jdDateBreakdown[dStr] = (jdDateBreakdown[dStr] || 0) + 1;
    });

    const allColleges = await College.find({ is_deleted: { $ne: true } }, 'college_code college_name');

    return res.status(200).json({
      success: true,
      data: {
        pre_august_records_count: preAugustCount,
        august_positives_total: augustPositivesCount,
        august_jd_received_total: augustJdCount,
        positives_by_college: collegeBreakdown,
        positives_by_date: dateBreakdown,
        jd_received_by_college: jdCollegeBreakdown,
        jd_received_by_date: jdDateBreakdown,
        all_colleges: allColleges,
        status: preAugustCount === 0 ? 'CLEAN_AUGUST_ONLY' : 'DIRTY_PRE_AUGUST_EXISTS',
      },
    });
  } catch (err: any) {
    console.error('❌ [Diagnostics Error]:', err);
    return res.status(200).json({ success: false, error: err.stack || err.message });
  }
});

// ── WT-8B: POST & GET /api/v1/weekly-tracker/sync-all-past
// Runs full synchronization of all historical Daily Tracker positive leads across all colleges into Weekly Tracker
app.all('/api/v1/weekly-tracker/sync-all-past', async (req: Request, res: Response) => {
  try {
    const { syncAllPastDailyToWeekly } = await import('./scripts/syncPastDailyToWeekly');
    await syncAllPastDailyToWeekly();
    return res.status(200).json({
      success: true,
      message: 'Successfully synchronized all past Daily Tracker positive leads into Weekly Tracker with default status "Invite sent, Awaiting JD".',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to sync all past leads' },
    });
  }
});

// ── WT-8C: GET /api/v1/weekly-tracker/sync-inspection
app.get('/api/v1/weekly-tracker/sync-inspection', async (req: Request, res: Response) => {
  try {
    const totalWeekly = await WeeklyTracker.countDocuments({ is_deleted: false });
    const pipelineCount = await WeeklyTracker.countDocuments({ pipeline_section: 'pipeline', is_deleted: false });
    const statusCounts = await WeeklyTracker.aggregate([
      { $match: { is_deleted: false } },
      { $group: { _id: '$current_status_text', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const dailyPositiveCount = await DailyTracker.countDocuments({ outcome_status: 'invite_mail' });
    const dailyPromotedCount = await DailyTracker.countDocuments({ outcome_status: 'invite_mail', is_promoted_to_weekly: true });

    return res.status(200).json({
      success: true,
      data: {
        totalWeekly,
        pipelineCount,
        dailyPositiveCount,
        dailyPromotedCount,
        topStatuses: statusCounts.slice(0, 10),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Authentication Login Endpoint & Rate Limiting (AUD-C-03)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 500, // Generous allowance for concurrent coordinator logins across shared office IPs
  skipSuccessfulRequests: true, // Do not count successful sign-ins against rate limits
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts from this IP. Please wait a few moments and try again.',
    },
  },
});

app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/request-otp', authLimiter);
app.use('/api/v1/auth/signup', authLimiter);

// Auth routes (sign-in, lockout, OTP reset) live in lib/authRoutes.ts
registerAuthRoutes(app);

// ── Authentication & RBAC Middleware ──────────────────────────────────────────
// Two distinct gates, in order:
//   1. authenticateJWT  — WHO are you?   (401 if unproven)
//   2. authorizeRoute   — MAY you do it? (403 if your role is not permitted)
// Step 2 is default-deny: an endpoint with no entry in the policy table is
// refused, so a route added without a policy fails closed instead of silently
// being open to every logged-in user.
// Per-record ownership ("may you see THIS row?") is separate again — see
// scopeToSelf() at the handlers that take a coordinator_id.
app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
  // Must stay in step with isPublic() in routePolicy.ts — an entry here skips
  // authentication, and the matching entry there skips the default-deny table.
  if (req.path === '/health' || req.path.startsWith('/auth')) {
    return next();
  }
  return authenticateJWT(req, res, next);
});

app.use('/api/v1', authorizeRoute);

// ── Maintenance Mode Enforcement Gate ──
app.use('/api/v1', async (req: Request, res: Response, next: NextFunction) => {
  // Never block public endpoints, health checks, auth flows, or settings
  if (req.path === '/health' || req.path.startsWith('/auth') || req.path.startsWith('/settings')) {
    return next();
  }

  const user = (req as any).user;
  if (!user) return next();

  // ADMINISTRATOR / ADMIN is NEVER blocked so they can fix issues and toggle maintenance off
  const isUserAdmin = (user.roles || []).some((r: string) => r === 'ADMINISTRATOR' || r === 'ADMIN');
  if (isUserAdmin) return next();

  try {
    const settings = await SystemSettings.findOne({}).lean();
    if (!settings || !settings.maintenance_mode_enabled) return next();

    const now = new Date();
    const inTimeWindow =
      (!settings.maintenance_start_time || new Date(settings.maintenance_start_time) <= now) &&
      (!settings.maintenance_end_time || new Date(settings.maintenance_end_time) >= now);

    if (!inTimeWindow) return next();

    const affectedRoles = settings.maintenance_affected_roles || ['PLACEMENT_COORDINATOR', 'TEAM_LEADER'];
    const isAffected = (user.roles || []).some((r: string) => affectedRoles.includes(r));

    if (isAffected) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'MAINTENANCE_MODE',
          message: 'System Under Scheduled Maintenance',
          reason: settings.maintenance_reason || 'System maintenance in progress. Please check back shortly.',
          start_time: settings.maintenance_start_time,
          end_time: settings.maintenance_end_time,
        },
      });
    }
  } catch {
    // If settings lookup fails, let request proceed
  }
  return next();
});

// Register Active Leads routes
registerActiveLeadRoutes(app);

// Register Pending Task routes
registerPendingTaskRoutes(app);

// Refresh Nehru Weekly Tracker with fresh 2027 Pipeline & In-Progress datasets
app.all('/api/v1/weekly-tracker/nehru/refresh', async (req: Request, res: Response) => {
  try {
    const result = await updateNehruWeeklyTracker();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Refresh HITS Weekly Tracker with fresh 2027 Pipeline & In-Progress datasets
app.all('/api/v1/weekly-tracker/hits/refresh', async (req: Request, res: Response) => {
  try {
    const result = await updateHitsWeeklyTracker();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});



// 3. High-Speed Company Search Endpoint (Searches across 3,850+ companies in < 10ms)
app.get('/api/v1/companies/search', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const filter: any = { is_deleted: false };

    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { company_name: { $regex: escaped, $options: 'i' } },
        { hr_name: { $regex: escaped, $options: 'i' } },
        { primary_mobile: { $regex: escaped } },
        { primary_email: { $regex: escaped, $options: 'i' } },
        { mobile_numbers: { $in: [new RegExp(escaped, 'i')] } },
        { email_ids: { $in: [new RegExp(escaped, 'i')] } },
      ];
    }

    if (req.query.type && req.query.type !== 'all') {
      filter.company_type = req.query.type;
    }

    const fromSnoNum = req.query.from_sno ? parseInt(String(req.query.from_sno), 10) : undefined;
    const toSnoNum = req.query.to_sno ? parseInt(String(req.query.to_sno), 10) : undefined;
    if ((fromSnoNum !== undefined && !isNaN(fromSnoNum)) || (toSnoNum !== undefined && !isNaN(toSnoNum))) {
      filter.serial_number = {};
      if (fromSnoNum !== undefined && !isNaN(fromSnoNum) && fromSnoNum > 0) {
        filter.serial_number.$gte = fromSnoNum;
      }
      if (toSnoNum !== undefined && !isNaN(toSnoNum) && toSnoNum > 0) {
        filter.serial_number.$lte = toSnoNum;
      }
    }

    const isRecent = req.query.recent === 'true';
    if (isRecent) {
      // Recent data selects the latest 100 companies in the directory
      const highestDoc = await CompanyMetadata.findOne({ is_deleted: false }).sort({ serial_number: -1 }).select('serial_number');
      const maxSerial = highestDoc?.serial_number || 100;
      const recentThreshold = Math.max(1, maxSerial - 99);
      if (!filter.serial_number) {
        filter.serial_number = { $gte: recentThreshold };
      } else {
        filter.serial_number.$gte = Math.max(filter.serial_number.$gte || recentThreshold, recentThreshold);
      }
    }

    // In Recent Data view, sort descending so the most recently added companies appear at the top
    const sortOrder: any = isRecent
      ? { serial_number: -1, _id: -1 }
      : { serial_number: 1, _id: 1 };

    const [companies, totalCount] = await Promise.all([
      CompanyMetadata.find(filter)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .select('serial_number company_name hr_name hr_designation primary_mobile mobile_numbers primary_email email_ids company_type location notes created_at'),
      CompanyMetadata.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        companies,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to search companies',
      },
    });
  }
});

// 4. Colleges List Endpoint
// Coordinators see only their own assigned colleges (Module 08 §10 — normally 3,
// max 4 in practice); Team Leader/Admin see the full active roster. Matches the
// ownership-scoping pattern already applied to /dashboard/coordinator and
// /profile/:id — without this, CollegeSelector on Daily Tracker let a
// coordinator pick any college in the org, not just their own.
//
// This merges what used to be two separate `GET /colleges` handlers in this
// file (the second was unreachable dead code — Express only ever matched the
// first) into one, keeping the useful bits of both: population of assigned
// coordinators, and first-run seeding of sane defaults when the roster is empty.
app.get('/api/v1/colleges', async (req: Request, res: Response) => {
  try {
    const MASTER_PARTNER_COLLEGES = [
      { college_name: 'Achariya College of Engineering Technology', college_code: 'ACET', location: 'Puducherry', logo_url: '/college-logos/acet.png' },
      { college_name: 'Knowledge Institute of Technology', college_code: 'KIOT', location: 'Salem, Tamil Nadu', logo_url: '/college-logos/kiot.jfif' },
      { college_name: 'Kalasalingam Academy of Research and Education', college_code: 'KLU', location: 'Virudhunagar, Tamil Nadu', logo_url: '/college-logos/klu.png' },
      { college_name: 'KPR Institute of Engineering and Technology', college_code: 'KPR', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/kpr.png' },
      { college_name: 'Karpagam College of Engineering', college_code: 'KARPAGAM', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/karpagam.png' },
      { college_name: 'Anand Institute of Higher Technology', college_code: 'AIHT', location: 'Chennai, Tamil Nadu', logo_url: '/college-logos/aiht.png' },
      { college_name: 'PSNA College of Engineering and Technology', college_code: 'PSNA', location: 'Dindigul, Tamil Nadu', logo_url: '/college-logos/psna.png' },
      { college_name: 'Sri Manakula Vinayagar Engineering College', college_code: 'SMVEC', location: 'Puducherry', logo_url: '/college-logos/smvec.png' },
      { college_name: 'Dhanalakshmi Srinivasan University', college_code: 'DSU', location: 'Perambalur / Trichy, Tamil Nadu', logo_url: '/college-logos/dsu.png' },
      { college_name: 'M. Kumarasamy College of Engineering', college_code: 'MKCE', location: 'Karur, Tamil Nadu', logo_url: '/college-logos/mkce.png' },
      { college_name: 'Sona College of Technology', college_code: 'SONA', location: 'Salem, Tamil Nadu', logo_url: '/college-logos/sona.png' },
      { college_name: 'Karunya Institute of Technology and Sciences', college_code: 'KARUNYA', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/karunya.png' },
      { college_name: 'Kamaraj College of Engineering and Technology', college_code: 'KAMARAJ', location: 'Virudhunagar, Tamil Nadu', logo_url: '/college-logos/kamaraj.png' },
      { college_name: 'NPR College of Engineering and Technology', college_code: 'NPR', location: 'Natham / Dindigul, Tamil Nadu', logo_url: '/college-logos/npr.png' },
      { college_name: 'AVS Engineering College', college_code: 'AVS', location: 'Salem, Tamil Nadu', logo_url: '/college-logos/avs.png' },
      { college_name: 'AAA College of Engineering and Technology', college_code: 'AAA', location: 'Sivakasi, Tamil Nadu', logo_url: '/college-logos/aaa.png' },
      { college_name: 'KGiSL Institute of Technology', college_code: 'KGISL', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/kgisl.png' },
      { college_name: 'Sri Shanmugha College of Engineering and Technology', college_code: 'SSEI', location: 'Salem, Tamil Nadu', logo_url: '/college-logos/sri shanmuga.png' },
      { college_name: 'Dr. N.G.P. Institute of Technology', college_code: 'NGP', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/ngp.png' },
      { college_name: 'Hindustan Institute of Technology and Science', college_code: 'HITS', location: 'Chennai, Tamil Nadu', logo_url: '/college-logos/hits.png' },
      { college_name: 'Nehru Institute of Technology', college_code: 'NEHRU', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/Infozianthead.png' },
      { college_name: 'Narayana Guru College of Engineering', college_code: 'NGCE', location: 'Kanyakumari / Coimbatore, Tamil Nadu', logo_url: '/college-logos/narayanaguru.png' },
      { college_name: 'Arunachala College of Engineering for Women', college_code: 'ACEW', location: 'Kanyakumari, Tamil Nadu', logo_url: '/college-logos/ACEW.jfif' },
    ];

    // First-run bootstrap ONLY. This used to run on every request: 23 sequential
    // findOne calls plus create/save, i.e. a write on every read of a list that
    // changes maybe twice a year. One cheap count now guards it, so a populated
    // database costs a single extra query instead of 23 round-trips per page load.
    if ((await College.estimatedDocumentCount()) === 0) {
      console.log('🌱 [Colleges] Empty roster — seeding master partner colleges (first run).');
      await College.insertMany(
        MASTER_PARTNER_COLLEGES.map((item) => ({
          college_name: item.college_name,
          college_code: item.college_code,
          location: item.location,
          logo_url: item.logo_url,
          departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
          status: 'active',
        })),
      );
    }

    // Active colleges only.
    // The previous filter was an $or whose third clause was `is_deleted: {$ne: true}`
    // — true for essentially every document, so it swallowed the other two and
    // returned `inactive` and `on_hold` colleges as well. `status` has a default
    // of 'active' in the schema, so the $exists branch is unnecessary.
    //
    // `assigned_coordinator_ids` is deliberately NOT populated: it pulled each
    // coordinator's full_name, official_email and primary_mobile into a response
    // no frontend caller reads (verified — nothing references the field), which
    // is how the staff directory ended up exposed.
    const colleges = await College.find({ status: 'active' }).sort({ college_code: 1 });

    return res.status(200).json({
      success: true,
      data: {
        total: colleges.length,
        colleges,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve colleges' },
    });
  }
});

// List of official active partner college definitions (21 active colleges)
export const OFFICIAL_COLLEGE_DEFINITIONS = [
  { college_code: 'KARPAGAM', college_name: 'Karpagam College of Engineering', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/karpagam.png' },
  { college_code: 'MCET', college_name: 'Dr. Mahalingam College of Engineering and Technology', location: 'Pollachi, Tamil Nadu', logo_url: '/college-logos/MCET.png' },
  { college_code: 'ACET', college_name: 'Achariya College of Engineering Technology', location: 'Puducherry', logo_url: '/college-logos/acet.png' },
  { college_code: 'KPR', college_name: 'KPR Institute of Engineering and Technology', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/kpr.png' },
  { college_code: 'AIHT', college_name: 'Anand Institute of Higher Technology', location: 'Chennai, Tamil Nadu', logo_url: '/college-logos/aiht.png' },
  { college_code: 'KAMARAJ', college_name: 'Kamaraj College of Engineering and Technology', location: 'Virudhunagar, Tamil Nadu', logo_url: '/college-logos/kamaraj.png' },
  { college_code: 'NGP', college_name: 'Dr. N.G.P. Institute of Technology', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/ngp.png' },
  { college_code: 'MKCE', college_name: 'M.Kumarasamy College of Engineering', location: 'Karur, Tamil Nadu', logo_url: '/college-logos/mkce.png' },
  { college_code: 'ACEW', college_name: 'Arunachala College of Engineering for Women', location: 'Kanyakumari, Tamil Nadu', logo_url: '/college-logos/acew.png' },
  { college_code: 'NPR', college_name: 'NPR College of Engineering and Technology', location: 'Natham / Dindigul, Tamil Nadu', logo_url: '/college-logos/npr.png' },
  { college_code: 'KIOT', college_name: 'Knowledge Institute of Technology', location: 'Salem, Tamil Nadu', logo_url: '/college-logos/kiot.jfif' },
  { college_code: 'KLU', college_name: 'Kalasalingam Academy of Research and Education', location: 'Virudhunagar, Tamil Nadu', logo_url: '/college-logos/klu.png' },
  { college_code: 'SMVEC', college_name: 'Sri Manakula Vinayagar Engineering College', location: 'Puducherry', logo_url: '/college-logos/smvec.png' },
  { college_code: 'DSU', college_name: 'Dhanalakshmi Srinivasan University', location: 'Perambalur / Trichy, Tamil Nadu', logo_url: '/college-logos/dsu.png' },
  { college_code: 'PSNA', college_name: 'PSNA College of Engineering and Technology', location: 'Dindigul, Tamil Nadu', logo_url: '/college-logos/psna.png' },
  { college_code: 'SONA', college_name: 'Sona College of Technology', location: 'Salem, Tamil Nadu', logo_url: '/college-logos/sona.png' },
  { college_code: 'MEC', college_name: 'Muthayammal Engineering College', location: 'Singlandhapuram, Tamil Nadu', logo_url: '/college-logos/MEC.png' },
  { college_code: 'NGCE', college_name: 'Narayanaguru College of Engineering', location: 'Kanyakumari, Tamil Nadu', logo_url: '/college-logos/ngce.png' },
  { college_code: 'HITS', college_name: 'Hindustan Institute of Technology and Science', location: 'Chennai, Tamil Nadu', logo_url: '/college-logos/hits.png' },
  { college_code: 'NEHRU', college_name: 'Nehru Institute of Technology', location: 'Coimbatore, Tamil Nadu', logo_url: '/college-logos/nehru.png' },
  { college_code: 'MAREPHRAM', college_name: 'Mar Ephraem College of Engineering and Technology', location: 'Kanyakumari, Tamil Nadu', logo_url: '/college-logos/marephraem.png' },
];

export const ACTIVE_COLLEGE_CODES = OFFICIAL_COLLEGE_DEFINITIONS.map(c => c.college_code);

/** Resolves any college code, name, or id to the official uppercase acronym */
export function resolveOfficialCollegeAcronym(input?: any): string {
  if (!input) return '';
  const str = String(typeof input === 'string' ? input : (input.college_code || input.college_name || input.name || '')).trim();
  if (!str) return '';
  const upper = str.toUpperCase();
  if (upper === 'MAREPHRA') return 'MAREPHRAM';
  // 1. Direct match on official code
  const byCode = OFFICIAL_COLLEGE_DEFINITIONS.find(c => c.college_code.toUpperCase() === upper);
  if (byCode) return byCode.college_code;
  // 2. Direct match on official name or substring
  const byName = OFFICIAL_COLLEGE_DEFINITIONS.find(c =>
    c.college_name.toLowerCase() === str.toLowerCase() ||
    c.college_name.toLowerCase().includes(str.toLowerCase()) ||
    str.toLowerCase().includes(c.college_name.toLowerCase())
  );
  if (byName) return byName.college_code;
  // 3. Short acronym already
  if (upper.length <= 8 && !upper.includes(' ')) return upper;
  // 4. Initial letters of words fallback
  const words = str.split(/\s+/).filter(w => !['of', 'and', '&', 'for', 'in', 'the'].includes(w.toLowerCase()));
  if (words.length > 0) {
    return words.map(w => w[0]?.toUpperCase() || '').join('').slice(0, 6);
  }
  return upper;
}

export const DEFAULT_OFFICIAL_COORDINATOR_ALLOCATIONS: Record<string, string[]> = {
  // Mohana: KARPAGAM, AIHT, ACHARIYA (ACET), KPR
  'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  'mohana': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  'mohanaradha': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  'a.mohanaradha': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
  'mohanaradha a': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],

  // Thirisha: PSNA, DSU, SMVEC
  'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
  'thirisha': ['PSNA', 'DSU', 'SMVEC'],
  'thirisha r': ['PSNA', 'DSU', 'SMVEC'],

  // Malvika: KLU, NGCE
  'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
  'malavika': ['KLU', 'NGCE'],
  'malvika': ['KLU', 'NGCE'],
  'malavika ramesh': ['KLU', 'NGCE'],

  // Lizenya: NPR, KIOT, ACEW
  'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
  'lizenya': ['NPR', 'KIOT', 'ACEW'],
  'lizenya r': ['NPR', 'KIOT', 'ACEW'],

  // Megala: NGP, KAMARAJ, MAREPHRAM
  'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ', 'MAREPHRAM'],
  'megala': ['NGP', 'KAMARAJ', 'MAREPHRAM'],
  'megaladevi': ['NGP', 'KAMARAJ', 'MAREPHRAM'],
  'megaladevi p s': ['NGP', 'KAMARAJ', 'MAREPHRAM'],
  'megaladevi ps': ['NGP', 'KAMARAJ', 'MAREPHRAM'],

  // Tamil / Seshmitha: MCET, MEC
  'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
  'tamil': ['MCET', 'MEC'],
  'seshmitha': ['MCET', 'MEC'],
  'tamilselvi': ['MCET', 'MEC'],
  'seshmitha tamilselvi': ['MCET', 'MEC'],
  'seshmitha tamilselvi r': ['MCET', 'MEC'],

  // Sujitha (Team Leader): NEHRU, KPR, HITS, SONA
  'sujitha_s@infoziant.com': ['NEHRU', 'KPR', 'HITS', 'SONA'],
  'sujitha': ['NEHRU', 'KPR', 'HITS', 'SONA'],
  'sujitha s': ['NEHRU', 'KPR', 'HITS', 'SONA'],
};

// Helper to initialize/sync active roster on startup or demand
export async function syncActiveCollegesRoster() {
  try {
    // 1. Ensure old legacy codes like 'MAREPHRA' or variations are updated to official 'MAREPHRAM'
    // Both of these used to be blanket updateMany calls setting the same unique
    // `college_code` on every match. If two Mar Ephraem documents existed (legacy
    // 'MAREPHRA' + a name-matching one), the second write hit E11000 on the unique
    // college_code index and threw — aborting the WHOLE roster sync, so Mar Ephraem
    // never became active and vanished from every user's Active College Focus matrix.
    // Now: pick ONE canonical document, promote just that one, and never let this
    // step abort the rest of the sync.
    try {
      const marCandidates = await College.find({
        $or: [
          { college_code: { $in: ['MAREPHRAM', 'MAREPHRA'] } },
          { college_name: /mar ephraem|mar ephream/i },
        ],
      });
      const canonical =
        marCandidates.find((c) => c.college_code === 'MAREPHRAM') ||
        marCandidates.find((c) => c.college_code === 'MAREPHRA') ||
        marCandidates[0];
      if (canonical) {
        canonical.college_code = 'MAREPHRAM';
        canonical.status = 'active';
        canonical.logo_url = '/college-logos/marephraem.png';
        await canonical.save();
      }
    } catch (marErr) {
      console.warn('[Colleges] Mar Ephraem normalisation skipped:', (marErr as Error).message);
    }

    for (const def of OFFICIAL_COLLEGE_DEFINITIONS) {
      let existing = await College.findOne({
        $or: [
          { college_code: def.college_code },
          { college_code: 'MAREPHRA' },
          { college_name: new RegExp('^' + def.college_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
        ],
      });
      try {
        if (existing) {
          existing.status = 'active';
          existing.college_code = def.college_code;
          if (!existing.location) existing.location = def.location;
          if (!existing.logo_url) existing.logo_url = def.logo_url;
          await existing.save();
        } else {
          await College.findOneAndUpdate(
            { college_code: def.college_code },
            {
              $setOnInsert: {
                college_name: def.college_name,
                location: def.location,
                logo_url: def.logo_url,
                status: 'active',
                assigned_coordinator_ids: [],
              },
            },
            { upsert: true, new: true }
          );
        }
      } catch (colErr: any) {
        if (colErr.code !== 11000) {
          console.warn(`[Colleges] Sync note for ${def.college_code}:`, colErr.message);
        }
      }
    }
    await College.updateMany(
      { college_code: { $nin: ACTIVE_COLLEGE_CODES } },
      { $set: { status: 'inactive' } }
    );
    console.log(`🏛️ [Colleges] Roster fully synchronized: 21 official colleges active.`);
  } catch (err) {
    console.error('Failed to sync active college roster:', err);
  }
}

// ── GET /api/v1/colleges/all ────────────────────────────────────────────────
// Returns all colleges (active and inactive) for management interface
app.get('/api/v1/colleges/all', async (req: Request, res: Response) => {
  try {
    const colleges = await College.find({}).sort({ status: 1, college_code: 1 });
    const activeCount = colleges.filter(c => c.status === 'active').length;
    const inactiveCount = colleges.filter(c => c.status !== 'active').length;
    return res.status(200).json({
      success: true,
      data: {
        total: colleges.length,
        active_count: activeCount,
        inactive_count: inactiveCount,
        colleges,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve all colleges' },
    });
  }
});

// ── PATCH /api/v1/colleges/:id/status ────────────────────────────────────────
// Updates college active/inactive status
app.patch('/api/v1/colleges/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive', 'on_hold'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be active, inactive, or on_hold' },
      });
    }

    const college = await College.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!college) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'College not found' },
      });
    }

    // If marked inactive, clear from any coordinator's active weekly focus
    if (status !== 'active') {
      await User.updateMany(
        { weekly_focus_locked: id },
        { $pull: { weekly_focus_locked: id } }
      );
    }

    return res.status(200).json({
      success: true,
      message: `College ${college.college_code} status updated to ${status}`,
      data: { college },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update college status' },
    });
  }
});

// ── GET /api/v1/colleges/focus-matrix ──────────────────────────────────────────
// Returns all active colleges with real-time occupancy metadata (who currently handles what),
// guaranteeing zero duplication across coordinators.
app.get('/api/v1/colleges/focus-matrix', async (req: Request, res: Response) => {
  try {
    const currentWeekMonday = getWeekMondayKey();

    // Identify current user if authenticated
    let currentUserId: string | null = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id || null;
    let currentUserEmail: string | null = (req as any).user?.email || (req as any).user?.official_email || null;

    if (!currentUserId || !currentUserEmail) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'ipoms_secure_jwt_secret_key_2026');
          if (!currentUserId) currentUserId = decoded.userId || decoded._id || decoded.id || null;
          if (!currentUserEmail) currentUserEmail = decoded.email || decoded.official_email || null;
        } catch {}
      }
    }
    if (!currentUserId && req.query.user_id) {
      currentUserId = String(req.query.user_id);
    }
    if (!currentUserEmail && req.query.email) {
      currentUserEmail = String(req.query.email).toLowerCase().trim();
    }

    let allColleges = await College.find({ status: 'active' }).sort({ college_code: 1 });
    if (allColleges.length < OFFICIAL_COLLEGE_DEFINITIONS.length) {
      await syncActiveCollegesRoster();
      allColleges = await College.find({ status: 'active' }).sort({ college_code: 1 });
      if (allColleges.length === 0) {
        allColleges = await College.find({}).sort({ college_code: 1 });
        if (allColleges.length > 0) {
          await College.updateMany({}, { $set: { status: 'active' } });
        }
      }
    }

    // Resolve current user by ID or email
    let currentUser = null;
    if (currentUserId && Types.ObjectId.isValid(currentUserId)) {
      currentUser = await User.findById(currentUserId);
    }
    if (!currentUser && currentUserEmail) {
      currentUser = await User.findOne({ official_email: currentUserEmail.toLowerCase(), is_deleted: false });
      if (currentUser) {
        currentUserId = String(currentUser._id);
      }
    }

    const activeCoordinators = await User.find({
      role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR', 'TEAM_LEADER'] },
      account_status: 'active',
      is_deleted: false,
    }).select('_id full_name official_email assigned_college_ids weekly_focus_locked weekly_focus_week_key weekly_focus_locked_at');

    const normalizedCurrentEmail = (currentUser?.official_email || currentUserEmail || '').toLowerCase().trim();
    const normalizedCurrentId = currentUserId ? String(currentUserId) : '';

    // Build map of college_id -> array of handlers (other coordinators/TLs who have locked focus)
    const collegeHandlersMap = new Map<string, Array<{ user_id: string; name: string; email: string }>>();

    for (const coord of activeCoordinators) {
      const coordIdStr = String(coord._id);
      const coordEmail = (coord.official_email || '').toLowerCase().trim();

      // Skip current user (their colleges are "selected by me", NEVER occupied by others)
      if (
        (normalizedCurrentId && coordIdStr === normalizedCurrentId) ||
        (normalizedCurrentEmail && coordEmail === normalizedCurrentEmail)
      ) {
        continue;
      }

      // Check if this coordinator has locked focus for current week
      const isLockedForWeek = Boolean(coord.weekly_focus_locked && coord.weekly_focus_week_key === currentWeekMonday);
      const assignedIds = Array.isArray(coord.assigned_college_ids) ? coord.assigned_college_ids : [];

      if (isLockedForWeek && assignedIds.length > 0) {
        for (const cid of assignedIds) {
          const cIdStr = String(cid);
          const list = collegeHandlersMap.get(cIdStr) || [];
          if (!list.some((h) => h.user_id === coordIdStr)) {
            list.push({
              user_id: coordIdStr,
              name: coord.full_name,
              email: coord.official_email,
            });
            collegeHandlersMap.set(cIdStr, list);
          }
        }
      }
    }

    // Determine current user's selected college IDs and lock status
    let myAssignedCollegeIds = (currentUser?.assigned_college_ids || []).map((id: any) => String(id));
    const isMyFocusLocked = Boolean(
      currentUser?.weekly_focus_locked && currentUser?.weekly_focus_week_key === currentWeekMonday
    );

    // Official focus college allocations mapping for default weekly pre-selection
    const DEFAULT_COORDINATOR_COLLEGE_MAP: Record<string, string[]> = {
      'sujitha_s@infoziant.com': ['NEHRU', 'KPR', 'HITS', 'SONA'],
      'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
      'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
      'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
      'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
      'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ', 'MAREPHRAM'],
      'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
    };

    // If current user does not have colleges locked or assigned for the current week, pre-populate their official default colleges
    if (myAssignedCollegeIds.length === 0 && currentUser) {
      const email = (currentUser.official_email || '').toLowerCase().trim();
      const uname = (currentUser.username || '').toLowerCase().trim();
      let defaultCodes = DEFAULT_COORDINATOR_COLLEGE_MAP[email];
      if (!defaultCodes) {
        for (const [key, val] of Object.entries(DEFAULT_COORDINATOR_COLLEGE_MAP)) {
          const keyPrefix = key.split('@')[0];
          if (email.includes(keyPrefix) || uname.includes(keyPrefix) || keyPrefix.includes(uname)) {
            defaultCodes = val;
            break;
          }
        }
      }
      if (defaultCodes && defaultCodes.length > 0) {
        myAssignedCollegeIds = allColleges
          .filter((c) => defaultCodes.some((code) => code.toUpperCase() === c.college_code?.toUpperCase()))
          .map((c) => String(c._id));
      }
    }

    const isSujithaUser = (currentUser?.official_email || currentUserEmail || '').toLowerCase().includes('sujitha') || (currentUser?.username || '').toLowerCase().includes('sujitha');
    if (isSujithaUser) {
      const mcetColId = allColleges.find(c => c.college_code === 'MCET' || /mahalingam/i.test(c.college_name))?._id;
      if (mcetColId) {
        myAssignedCollegeIds = myAssignedCollegeIds.filter(id => String(id) !== String(mcetColId));
      }
    }

    const collegesWithOccupancy = allColleges.map((c) => {
      const cIdStr = String(c._id);
      const rawOtherHandlers = collegeHandlersMap.get(cIdStr) || [];
      // Safety filter: Ensure current user is never listed as an "otherHandler"
      const otherHandlers = rawOtherHandlers.filter(
        (h) =>
          (!normalizedCurrentId || h.user_id !== normalizedCurrentId) &&
          (!normalizedCurrentEmail || h.email?.toLowerCase().trim() !== normalizedCurrentEmail)
      );
      const otherCount = otherHandlers.length;
      const isSelectedByMe = myAssignedCollegeIds.includes(cIdStr);

      // Rule: At most 2 coordinators/team leaders can handle a college.
      // If 2 or more other coordinators already handle it, it is fully occupied.
      const isFullyOccupied = otherCount >= 2;

      // If exactly 1 other coordinator handles it, it is a co-handled slot available for 1 more person
      const isSharedSlot = otherCount === 1;

      const occupierName = otherHandlers.map((h) => h.name).join(' & ');

      return {
        _id: c._id,
        college_name: c.college_name,
        college_code: c.college_code,
        location: c.location || '',
        logo_url: c.logo_url || '',
        other_handlers_count: otherCount,
        is_occupied: isFullyOccupied && !isSelectedByMe,
        is_shared_slot: isSharedSlot,
        occupied_by: otherCount > 0 ? {
          user_id: otherHandlers.map((h) => h.user_id).join(','),
          name: occupierName,
          email: otherHandlers.map((h) => h.email).join(', '),
        } : null,
        is_selected_by_me: isSelectedByMe,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        week_key: currentWeekMonday,
        total_colleges: collegesWithOccupancy.length,
        colleges: collegesWithOccupancy,
        current_user_focus: {
          user_id: currentUserId,
          selected_college_ids: myAssignedCollegeIds,
          is_locked: isMyFocusLocked,
          week_key: currentUser?.weekly_focus_week_key || currentWeekMonday,
          locked_at: currentUser?.weekly_focus_locked_at || null,
        },
        active_coordinators_count: activeCoordinators.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [Focus Matrix Error]:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch college focus matrix' },
    });
  }
});

// ── GET /api/v1/colleges/:id ────────────────────────────────────────────────
// Retrieve a single college with full placement dossier profile details
app.get('/api/v1/colleges/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let college: any = null;
    if (Types.ObjectId.isValid(id)) {
      college = await College.findById(id);
    } else {
      college = await College.findOne({
        $or: [
          { college_code: id.toUpperCase() },
          { college_name: new RegExp(id, 'i') },
        ],
      });
    }

    if (!college) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'College not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: { college },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve college profile' },
    });
  }
});

// ── PATCH /api/v1/colleges/:id ───────────────────────────────────────────────
// Update college profile, placement officer details & institutional highlights
app.patch('/api/v1/colleges/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'A valid college ObjectId is required' },
      });
    }

    const allowedFields = [
      'college_name',
      'college_code',
      'location',
      'college_website',
      'logo_url',
      'tpo_name',
      'tpo_email',
      'tpo_contact_mobile',
      'tpo_designation',
      'tpo_alternate_mobile',
      'tpo_alternate_email',
      'departments',
      'student_strength',
      'nirf_ranking',
      'highest_package_lpa',
      'average_package_lpa',
      'lowest_package_lpa',
      'established_year',
      'landmarks',
      'address',
      'map_location',
      'accreditations',
      'placement_notes',
    ];

    const updatePayload: Record<string, any> = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] === 'string') {
          updatePayload[field] = req.body[field].trim();
        } else {
          updatePayload[field] = req.body[field];
        }
      }
    });

    const college = await College.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!college) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'College not found' },
      });
    }

    return res.status(200).json({
      success: true,
      message: `College profile for ${college.college_code} updated successfully`,
      data: { college },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update college dossier' },
    });
  }
});

// ── POST /api/v1/colleges/sync-sharepoint ────────────────────────────────────
// Lively synchronize college profiles and TPO contacts from SharePoint Excel
app.post('/api/v1/colleges/sync-sharepoint', async (_req: Request, res: Response) => {
  try {
    const syncResult = await syncCollegesFromExcel();
    const collegeCount = syncResult.totalColleges ?? syncResult.totalRows ?? (syncResult.updatedCount + syncResult.insertedCount);
    return res.status(200).json({
      success: true,
      message: `Successfully synchronized ${collegeCount} partner colleges from Colleges and Coordinators Excel (${syncResult.updatedCount} updated, ${syncResult.insertedCount} added)`,
      data: syncResult,
    });
  } catch (error: any) {
    console.error('SharePoint sync error:', error);
    try {
      const localFile = path.resolve(__dirname, '../../Colleges_and_Coordinators.xlsx');
      if (fs.existsSync(localFile)) {
        const fallbackResult = await syncCollegesFromExcel(localFile);
        const fallbackCount = fallbackResult.totalColleges ?? fallbackResult.totalRows ?? (fallbackResult.updatedCount + fallbackResult.insertedCount);
        return res.status(200).json({
          success: true,
          message: `Synchronized ${fallbackCount} partner colleges from Colleges and Coordinators Excel`,
          data: fallbackResult,
        });
      }
    } catch (fallbackErr: any) {}

    return res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message || 'Failed to sync colleges from SharePoint' },
    });
  }
});

// ── POST /api/v1/colleges/sync-roster ─────────────────────────────────────────
app.post('/api/v1/colleges/sync-roster', async (req: Request, res: Response) => {
  try {
    await syncActiveCollegesRoster();
    const colleges = await College.find({}).sort({ status: 1, college_code: 1 });
    return res.status(200).json({
      success: true,
      message: 'Active college roster synchronized successfully',
      data: {
        total: colleges.length,
        active_count: colleges.filter(c => c.status === 'active').length,
        inactive_count: colleges.filter(c => c.status !== 'active').length,
        colleges,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to sync roster' },
    });
  }
});

/**
 * Helper to compute current week Monday key (YYYY-MM-DD)
 */
function getWeekMondayKey(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}


// ── POST /api/v1/colleges/lock-focus ──────────────────────────────────────────
// Atomically validates and locks 1-5 colleges for the current coordinator,
// ensuring strict mutual exclusion and co-handling rules.
app.post('/api/v1/colleges/lock-focus', async (req: Request, res: Response) => {
  try {
    const currentWeekMonday = getWeekMondayKey();

    // Identify user
    let currentUserId: string | null = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id || null;
    let currentUserEmail: string | null = (req as any).user?.email || (req as any).user?.official_email || null;

    if (!currentUserId || !currentUserEmail) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'ipoms_secure_jwt_secret_key_2026');
          if (!currentUserId) currentUserId = decoded.userId || decoded._id || decoded.id || null;
          if (!currentUserEmail) currentUserEmail = decoded.email || decoded.official_email || null;
        } catch {}
      }
    }
    if (!currentUserId && req.body.user_id) {
      currentUserId = String(req.body.user_id);
    }
    if (!currentUserEmail && req.body.email) {
      currentUserEmail = String(req.body.email).toLowerCase().trim();
    }
    if (!currentUserId && currentUserEmail) {
      const foundUser = await User.findOne({ official_email: currentUserEmail.toLowerCase(), is_deleted: false });
      if (foundUser) currentUserId = String(foundUser._id);
    }

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to lock college focus.' },
      });
    }

    const { college_ids } = req.body;
    if (!Array.isArray(college_ids) || college_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please select at least 1 partner college (Minimum 1, Maximum 5).' },
      });
    }

    if (college_ids.length > 5) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Maximum 5 colleges allowed.' },
      });
    }

    // Ensure all 21 official colleges are present & active
    let allActiveColleges = await College.find({ status: 'active' });
    if (allActiveColleges.length === 0) {
      await syncActiveCollegesRoster();
      allActiveColleges = await College.find({ status: 'active' });
    }

    const resolvedCollegeDocs: any[] = [];
    const resolvedObjectIds: Types.ObjectId[] = [];

    for (const rawItem of college_ids) {
      const itemStr = String(rawItem).trim();
      if (!itemStr) continue;

      let foundDoc: any = null;

      // 1. Try match by ObjectId
      if (Types.ObjectId.isValid(itemStr)) {
        foundDoc = allActiveColleges.find((c) => String(c._id) === itemStr);
        if (!foundDoc) {
          foundDoc = await College.findById(itemStr);
        }
      }

      // 2. Try match by college_code (direct, stripped col_ prefix, or case-insensitive)
      if (!foundDoc) {
        const cleanedCode = itemStr.replace(/^col_/i, '').toUpperCase();
        foundDoc = allActiveColleges.find((c) => c.college_code?.toUpperCase() === cleanedCode);
        if (!foundDoc) {
          foundDoc = await College.findOne({ college_code: cleanedCode });
        }
      }

      // 3. Try match by college_name
      if (!foundDoc) {
        const nameClean = itemStr.toLowerCase();
        foundDoc = allActiveColleges.find(
          (c) =>
            c.college_name?.toLowerCase() === nameClean ||
            c.college_name?.toLowerCase().includes(nameClean) ||
            nameClean.includes(c.college_name?.toLowerCase())
        );
        if (!foundDoc) {
          foundDoc = await College.findOne({
            college_name: new RegExp('^' + itemStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
          });
        }
      }

      if (foundDoc) {
        // Ensure status is active
        if (foundDoc.status !== 'active') {
          foundDoc.status = 'active';
          await foundDoc.save();
        }
        if (!resolvedCollegeDocs.some((d) => String(d._id) === String(foundDoc._id))) {
          resolvedCollegeDocs.push(foundDoc);
          resolvedObjectIds.push(foundDoc._id);
        }
      }
    }

    if (resolvedCollegeDocs.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid college IDs provided.' },
      });
    }

    if (resolvedCollegeDocs.length > 4) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Maximum 4 colleges allowed per coordinator.' },
      });
    }

    const sanitizedIds = resolvedCollegeDocs.map((c) => String(c._id));
    const selectedColleges = resolvedCollegeDocs;

    // ── CO-HANDLING & MUTUAL EXCLUSION CHECK ──
    // Rule 1: A minimum of 1 college must be selected, and a maximum of 4 are allowed.
    // Rule 2: At most 2 coordinators or team leaders can handle any single college.
    // Rule 3: Per coordinator / team leader, at most 2 colleges can be co-handled with another person.
    const otherCoordinators = await User.find({
      _id: { $ne: new Types.ObjectId(currentUserId) },
      role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR', 'TEAM_LEADER'] },
      account_status: 'active',
      is_deleted: false,
      weekly_focus_locked: true,
      weekly_focus_week_key: currentWeekMonday,
    }).populate('assigned_college_ids', 'college_name college_code');

    let sharedCollegesCount = 0;
    const sharedCollegeNames: string[] = [];

    for (const reqId of sanitizedIds) {
      const otherHandlersForCollege = otherCoordinators.filter((oc) =>
        (oc.assigned_college_ids as any[]).some((c: any) => String(c?._id || c) === String(reqId))
      );

      const targetColDoc = selectedColleges.find((c) => String(c._id) === String(reqId));
      const colLabel = targetColDoc ? `[${targetColDoc.college_code}] ${targetColDoc.college_name}` : 'Selected institution';

      // Rule: At most 2 coordinators or team leader allowed per college
      if (otherHandlersForCollege.length >= 2) {
        const handlerNames = otherHandlersForCollege.map((h) => h.full_name).join(' & ');
        return res.status(409).json({
          success: false,
          error: {
            code: 'COLLEGE_CAPACITY_EXCEEDED',
            message: `${colLabel} already has the maximum of 2 handlers (${handlerNames}). At most 2 coordinators or team leader can co-handle a college.`,
          },
        });
      }

      // If 1 other coordinator/TL handles it, this is a shared college for the current user
      if (otherHandlersForCollege.length === 1) {
        sharedCollegesCount++;
        sharedCollegeNames.push(colLabel);
      }
    }

    // Rule: At a time, maximum 2 colleges are allowed to be co-handled per user
    if (sharedCollegesCount > 2) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'MAX_SHARED_COLLEGES_EXCEEDED',
          message: `You have selected ${sharedCollegesCount} co-handled colleges (${sharedCollegeNames.join(', ')}). At a time, maximum 2 colleges are allowed to be co-handled by 2 coordinators or team leaders.`,
        },
      });
    }

    // Lock focus for the current user
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
    }

    user.assigned_college_ids = resolvedObjectIds;
    user.weekly_focus_locked = true;
    user.weekly_focus_week_key = currentWeekMonday;
    user.weekly_focus_locked_at = new Date();
    await user.save();

    // Bidirectional sync on College model
    // Remove coordinator from unselected colleges
    await College.updateMany(
      { assigned_coordinator_ids: user._id, _id: { $nin: resolvedObjectIds } },
      { $pull: { assigned_coordinator_ids: user._id } }
    );
    // Add coordinator to newly selected colleges
    await College.updateMany(
      { _id: { $in: resolvedObjectIds } },
      { $addToSet: { assigned_coordinator_ids: user._id } }
    );

    await writeAudit({
      action: 'UPDATE',
      result: 'SUCCESS',
      entityType: 'User',
      entityId: user._id,
      performedBy: user._id,
      performedByRole: user.role_codes?.[0] || 'PLACEMENT_COORDINATOR',
      performedByEmail: user.official_email,
      module: 'CollegeFocus',
      severity: 'info',
      summary: `Coordinator ${user.full_name} locked weekly focus for ${sanitizedIds.length} college(s) (${currentWeekMonday}).`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Active focus locked successfully with ${sanitizedIds.length} institution(s) for the week (${currentWeekMonday}).`,
      data: {
        user_id: user._id,
        selected_college_ids: sanitizedIds,
        selected_colleges: selectedColleges.map((c) => ({
          _id: c._id,
          college_code: c.college_code,
          college_name: c.college_name,
          location: c.location,
          logo_url: c.logo_url,
        })),
        is_locked: true,
        week_key: currentWeekMonday,
        locked_at: user.weekly_focus_locked_at,
      },
    });
  } catch (error: any) {
    console.error('❌ [Lock Focus Error]:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to lock college focus' },
    });
  }
});

// ── POST /api/v1/colleges/unlock-focus ────────────────────────────────────────
// Unlocks focus for the coordinator so they can modify their selections
app.post('/api/v1/colleges/unlock-focus', async (req: Request, res: Response) => {
  try {
    let currentUserId: string | null = (req as any).user?.userId || (req as any).user?._id || (req as any).user?.id || null;
    let currentUserEmail: string | null = (req as any).user?.email || (req as any).user?.official_email || null;

    if (!currentUserId || !currentUserEmail) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'ipoms_secure_jwt_secret_key_2026');
          if (!currentUserId) currentUserId = decoded.userId || decoded._id || decoded.id || null;
          if (!currentUserEmail) currentUserEmail = decoded.email || decoded.official_email || null;
        } catch {}
      }
    }
    if (!currentUserId && req.body.user_id) {
      currentUserId = String(req.body.user_id);
    }
    if (!currentUserEmail && req.body.email) {
      currentUserEmail = String(req.body.email).toLowerCase().trim();
    }
    if (!currentUserId && currentUserEmail) {
      const foundUser = await User.findOne({ official_email: currentUserEmail.toLowerCase(), is_deleted: false });
      if (foundUser) currentUserId = String(foundUser._id);
    }

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required to unlock college focus.' },
      });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
    }

    user.weekly_focus_locked = false;
    await user.save();

    await writeAudit({
      action: 'UPDATE',
      result: 'SUCCESS',
      entityType: 'User',
      entityId: user._id,
      performedBy: user._id,
      performedByRole: user.role_codes?.[0] || 'PLACEMENT_COORDINATOR',
      performedByEmail: user.official_email,
      module: 'CollegeFocus',
      severity: 'info',
      summary: `Coordinator ${user.full_name} unlocked weekly college focus for editing.`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'College focus unlocked. You can now adjust your partner institutions.',
      data: {
        user_id: user._id,
        selected_college_ids: user.assigned_college_ids,
        is_locked: false,
      },
    });
  } catch (error: any) {
    console.error('❌ [Unlock Focus Error]:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to unlock college focus' },
    });
  }
});

// 5. Coordinators List Endpoint (With mapped focus colleges)
app.get('/api/v1/coordinators', async (req: Request, res: Response) => {
  try {
    const allColleges = await College.find({ status: 'active', is_deleted: false }).select(
      '_id college_name college_code location logo_url'
    );
    const coordinators = await User.find({
      role_codes: { $in: ['PLACEMENT_COORDINATOR', 'COORDINATOR', 'TEAM_LEADER'] },
      username: { $nin: ['admin', 'administrator'] },
      full_name: { $nin: ['Administrator', 'Admin', 'administrator', 'admin'] },
      account_status: 'active',
      is_deleted: false,
    }).select('full_name official_email username primary_mobile presence_status');

    const DEFAULT_COORDINATOR_COLLEGE_MAP: Record<string, string[]> = {
      // Sujitha
      'sujitha_s@infoziant.com': ['NEHRU', 'KPR', 'HITS', 'SONA'],
      'sujitha': ['NEHRU', 'KPR', 'HITS', 'SONA'],
      // Mohana / Mohanaradha
      'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
      'mohana': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
      'mohanaradha': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
      // Thirisha
      'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
      'thirisha': ['PSNA', 'DSU', 'SMVEC'],
      // Malavika
      'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
      'malavika': ['KLU', 'NGCE'],
      'malvika': ['KLU', 'NGCE'],
      // Lizenya
      'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
      'lizenya': ['NPR', 'KIOT', 'ACEW'],
      // Megaladevi
      'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ', 'MAREPHRAM'],
      'megaladevi': ['NGP', 'KAMARAJ', 'MAREPHRAM'],
      'megala': ['NGP', 'KAMARAJ', 'MAREPHRAM'],
      // Seshmitha / Tamilselvi
      'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
      'seshmitha': ['MCET', 'MEC'],
      'tamil': ['MCET', 'MEC'],
      'tamilselvi': ['MCET', 'MEC'],
    };

    const formatted = coordinators.map((coord) => {
      const email = (coord.official_email || '').toLowerCase().trim();
      const uname = (coord.username || '').toLowerCase().trim();
      const fname = (coord.full_name || '').toLowerCase().trim();

      let defaultCodes = DEFAULT_COORDINATOR_COLLEGE_MAP[email] || DEFAULT_COORDINATOR_COLLEGE_MAP[uname];
      if (!defaultCodes) {
        for (const [key, val] of Object.entries(DEFAULT_COORDINATOR_COLLEGE_MAP)) {
          const keyPrefix = key.split('@')[0].toLowerCase();
          if (
            (email && email.includes(keyPrefix)) ||
            (uname && uname.includes(keyPrefix)) ||
            (fname && fname.includes(keyPrefix)) ||
            (keyPrefix && fname.includes(keyPrefix))
          ) {
            defaultCodes = val;
            break;
          }
        }
      }
      const matchedColleges = defaultCodes && defaultCodes.length > 0
        ? allColleges.filter((col) =>
            defaultCodes!.some(
              (cd) =>
                cd.toUpperCase() === col.college_code?.toUpperCase() ||
                cd.toLowerCase() === col.college_name?.toLowerCase() ||
                String(col._id) === cd
            )
          )
        : [];

      return {
        _id: String(coord._id),
        full_name: coord.full_name,
        official_email: coord.official_email,
        primary_mobile: coord.primary_mobile,
        presence_status: coord.presence_status,
        focus_colleges: matchedColleges,
        focus_college_ids: matchedColleges.map((c) => String(c._id)),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        total: formatted.length,
        coordinators: formatted,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch coordinators',
      },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 03 — DAILY TRACKER ENDPOINTS
// Spec: Module_03_Daily_Tracker_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────

// ── DT-1: GET /api/v1/daily-tracker/today
// Load today's active (non-finalized) tracker rows for a coordinator+college (supports viewing any user's tracker in read-only mode)
app.get('/api/v1/daily-tracker/today', async (req: Request, res: Response) => {
  try {
    const rawCollegeId = req.query.college_id as string | undefined;
    const rawCoordId = req.query.coordinator_id as string | undefined;
    const isSuper = isSupervisor(req);
    const selfId = req.user?.userId;

    const filter: any = {
      session_date: buildSessionDate(),
      is_finalized: false,
    };

    if (rawCollegeId && rawCollegeId !== 'all' && Types.ObjectId.isValid(rawCollegeId)) {
      filter.college_id = new Types.ObjectId(String(rawCollegeId));
    }

    if (rawCoordId && rawCoordId !== 'all' && Types.ObjectId.isValid(rawCoordId)) {
      filter.coordinator_id = new Types.ObjectId(String(rawCoordId));
    } else if (!rawCoordId && !isSuper) {
      if (selfId && Types.ObjectId.isValid(selfId)) {
        filter.coordinator_id = new Types.ObjectId(String(selfId));
      }
    }

    const today = buildSessionDate();
    const rows = await DailyTracker.find(filter)
      .populate('coordinator_id', 'full_name official_email')
      .populate('college_id', 'college_name college_code logo_url location')
      .sort({ created_at: 1 });

    // Auto-clean any unfinalized duplicate rows created in the same session
    const seenKeys = new Set<string>();
    const uniqueRows: any[] = [];
    const duplicateIdsToDelete: any[] = [];

    for (const row of rows) {
      const key = `${row.college_id?._id || row.college_id}_${row.company_id || row.company_name}_${row.mobile_number}`;
      if (seenKeys.has(key) && !row.call_start_time && !row.outcome_status) {
        duplicateIdsToDelete.push(row._id);
      } else {
        seenKeys.add(key);
        uniqueRows.push(row);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await DailyTracker.deleteMany({ _id: { $in: duplicateIdsToDelete } });
    }

    const enriched = uniqueRows.map((row, idx) => {
      const obj: any = row.toObject ? row.toObject() : row;
      const coord = obj.coordinator_id as any;
      const coll = obj.college_id as any;
      const colCode = (coll?.college_code || obj.college_code || '').toUpperCase();
      const rowCoordId = String(coord?._id ?? obj.coordinator_id);
      const isReadOnlyRow = !isSuper && rowCoordId !== String(selfId);

      let coordName = coord?.full_name;
      if (!coordName || coordName === 'Administrator') {
        if (['ACET', 'AIHT', 'KARPAGAM', 'KPR'].includes(colCode)) {
          coordName = 'A.Mohanaradha';
        } else if (['NEHRU', 'MAREPHRAM', 'MAREPHRA', 'HITS', 'SONA'].includes(colCode)) {
          coordName = 'Sujitha S';
        } else if (['PSNA', 'DSU', 'SMVEC'].includes(colCode)) {
          coordName = 'Thirisha R';
        } else if (['KLU', 'NGCE'].includes(colCode)) {
          coordName = 'Malavika Ramesh T K';
        } else if (['NPR', 'KIOT', 'ACEW'].includes(colCode)) {
          coordName = 'Lizenya R';
        } else if (['NGP', 'KAMARAJ'].includes(colCode)) {
          coordName = 'Megala Devi P S';
        } else if (['MCET', 'MEC'].includes(colCode)) {
          coordName = 'Seshmitha Tamilselvi R';
        }
      }

      return {
        ...obj,
        coordinator_id: coord?._id ?? obj.coordinator_id,
        coordinator_name: coordName || undefined,
        college_id: coll?._id ?? obj.college_id,
        college_name: coll?.college_name || undefined,
        college_code: coll?.college_code || undefined,
        serial_no: idx + 1,
        duration_formatted: row.duration_seconds != null ? formatDuration(row.duration_seconds) : null,
        is_read_only: isReadOnlyRow,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        session_date: today,
        total: enriched.length,
        rows: enriched,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || "Failed to load today's tracker" },
    });
  }
});

// ── DT-2: POST /api/v1/daily-tracker/load-contacts
// Bulk-create tracker rows from selected company_ids (Contact Picker)
app.post('/api/v1/daily-tracker/load-contacts', async (req: Request, res: Response) => {
  try {
    const { college_id, company_ids } = req.body;
    const coordinator_id = scopeToSelf(req, req.body.coordinator_id);

    if (!coordinator_id || !college_id || !Array.isArray(company_ids) || company_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'coordinator_id, college_id, and company_ids[] are required' },
      });
    }

    const today = buildSessionDate();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();

    const companies = await CompanyMetadata.find({
      _id: { $in: company_ids.map((id: string) => new Types.ObjectId(id)) },
      is_deleted: false,
    }).select('_id company_name hr_name primary_mobile primary_email');

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No valid companies found for the given IDs' },
      });
    }

    const existingRows = await DailyTracker.find({
      coordinator_id: new Types.ObjectId(coordinator_id),
      college_id: new Types.ObjectId(college_id),
      session_date: today,
      is_finalized: false,
    }).select('company_id mobile_number');

    const existingMobiles = new Set(existingRows.map((r) => r.mobile_number));
    const existingCompanyIds = new Set(existingRows.map((r) => String(r.company_id)));

    const duplicates: string[] = [];
    const toInsert: any[] = [];

    for (const company of companies) {
      const isDuplicate =
        existingCompanyIds.has(String(company._id)) ||
        existingMobiles.has(String(company.primary_mobile || ''));

      if (isDuplicate) {
        duplicates.push(company.company_name);
        continue;
      }

      toInsert.push({
        coordinator_id: new Types.ObjectId(coordinator_id),
        college_id: new Types.ObjectId(college_id),
        company_id: company._id,
        company_name: company.company_name,
        hr_name: company.hr_name,
        mobile_number: company.primary_mobile,
        email_id: company.primary_email || '',
        year,
        month,
        day,
        session_date: today,
        is_skipped: false,
        is_promoted_to_weekly: false,
        is_finalized: false,
        save_count: 0,
        duplicate_acknowledged: false,
      });
    }

    let inserted: any[] = [];
    if (toInsert.length > 0) {
      inserted = await DailyTracker.insertMany(toInsert, { ordered: false });
    }

    return res.status(201).json({
      success: true,
      message: `${inserted.length} contact(s) loaded into today's tracker`,
      data: {
        loaded: inserted.length,
        duplicates_skipped: duplicates.length,
        duplicate_companies: duplicates,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to load contacts' },
    });
  }
});

// ── DT-MANUAL: POST /api/v1/daily-tracker/manual-row
// Manually add an entry directly into today's Daily Tracker
app.post('/api/v1/daily-tracker/manual-row', async (req: Request, res: Response) => {
  try {
    const {
      coordinator_id,
      college_id,
      company_name,
      hr_name,
      mobile_number,
      email_id,
      call_start_time,
      call_end_time,
      duration_seconds,
      outcome_status,
      follow_up_month,
      comments,
      session_date,
    } = req.body;

    if (!coordinator_id || !college_id || !company_name?.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Coordinator, College, and Company Name are required' },
      });
    }

    if (!outcome_status) {
      return res.status(400).json({
        success: false,
        error: { code: 'CALL_STATUS_REQUIRED', message: 'Call Status is mandatory to save this entry' },
      });
    }

    if (outcome_status === 'follow_up' && !follow_up_month) {
      return res.status(400).json({
        success: false,
        error: { code: 'FOLLOW_UP_MONTH_REQUIRED', message: 'Follow Up Month is mandatory when Call Status is Follow Up' },
      });
    }

    const effectiveDate = session_date ? new Date(session_date) : new Date();
    const today = new Date(Date.UTC(effectiveDate.getUTCFullYear(), effectiveDate.getUTCMonth(), effectiveDate.getUTCDate()));
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();

    // Calculate duration in seconds if start and end are provided
    let calculatedDuration = duration_seconds != null ? Number(duration_seconds) : undefined;
    const startDate = call_start_time ? new Date(call_start_time) : undefined;
    const endDate = call_end_time ? new Date(call_end_time) : undefined;

    if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      calculatedDuration = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000));
    }

    // Find or create CompanyMetadata with live sequential serial number assignment
    let company = await CompanyMetadata.findOne({
      company_name: { $regex: new RegExp(`^${escapeRegex(company_name.trim())}$`, 'i') },
      is_deleted: false,
    });

    if (!company) {
      const highestDoc = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } })
        .sort({ serial_number: -1 })
        .select('serial_number');
      const nextSerial = (highestDoc?.serial_number || 0) + 1;

      const mobList = mobile_number ? mobile_number.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean) : [];
      const emailList = email_id ? email_id.split(/[,;/]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean) : [];

      company = await CompanyMetadata.create({
        serial_number: nextSerial,
        company_name: company_name.trim(),
        hr_name: hr_name?.trim() || 'HR Contact',
        primary_mobile: mobList[0] || '',
        mobile_numbers: mobList,
        primary_email: emailList[0] || '',
        email_ids: emailList,
        notes: `Created via Daily Tracker manual entry on ${new Date().toLocaleDateString('en-IN')}`,
      });
    } else {
      let metaUpdated = false;
      if (hr_name && hr_name.trim()) {
        const existingHrs = (company.hr_name || '')
          .split(/[,;/]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s && s.toLowerCase() !== 'hr contact' && s.toLowerCase() !== 'contact');
        const incomingHrs = hr_name
          .split(/[,;/]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s && s.toLowerCase() !== 'hr contact' && s.toLowerCase() !== 'contact');
        const mergedHrs = Array.from(new Set([...existingHrs, ...incomingHrs]));
        if (mergedHrs.length > 0 && mergedHrs.join(', ') !== company.hr_name) {
          company.hr_name = mergedHrs.join(', ');
          metaUpdated = true;
        }
      }
      if (mobile_number && mobile_number.trim()) {
        const mobList = mobile_number.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean);
        for (const mob of mobList) {
          if (!company.mobile_numbers.includes(mob)) {
            company.mobile_numbers.push(mob);
            metaUpdated = true;
          }
        }
        if (!company.primary_mobile && mobList[0]) {
          company.primary_mobile = mobList[0];
          metaUpdated = true;
        }
      }
      if (email_id && email_id.trim()) {
        const emailList = email_id.split(/[,;/]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
        for (const em of emailList) {
          if (!company.email_ids.includes(em)) {
            company.email_ids.push(em);
            metaUpdated = true;
          }
        }
        if (!company.primary_email && emailList[0]) {
          company.primary_email = emailList[0];
          metaUpdated = true;
        }
      }
      if (metaUpdated) {
        await company.save();
      }
    }

    const newRow = await DailyTracker.create({
      coordinator_id: new Types.ObjectId(coordinator_id),
      college_id: new Types.ObjectId(college_id),
      company_id: company._id,
      company_name: company_name.trim(),
      hr_name: hr_name?.trim() || company.hr_name || 'HR Contact',
      mobile_number: mobile_number?.trim() || company.primary_mobile || '',
      email_id: email_id?.trim().toLowerCase() || company.primary_email || '',
      call_start_time: startDate,
      call_end_time: endDate,
      duration_seconds: calculatedDuration,
      outcome_status: outcome_status || null,
      follow_up_month: outcome_status === 'follow_up' ? (follow_up_month || null) : null,
      comments: comments?.trim() || '',
      year,
      month,
      day,
      session_date: today,
      is_skipped: false,
      is_promoted_to_weekly: false,
      is_finalized: false,
      save_count: 0,
      duplicate_acknowledged: false,
    });

    // Note: Active Leads is now exclusively sourced from Weekly Tracker (Daily Tracker sync decoupled)

    const enrichedRow = {
      ...(newRow.toObject ? newRow.toObject() : newRow),
      duration_formatted: newRow.duration_seconds != null ? formatDuration(newRow.duration_seconds) : null,
    };

    return res.status(201).json({
      success: true,
      message: 'Contact row added successfully',
      data: { row: enrichedRow },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to add manual contact row' },
    });
  }
});

// ── DT-CHECK-PASTE-METADATA: POST /api/v1/daily-tracker/check-metadata-batch
// Pre-checks which companies in paste payload already exist in CompanyMetadata
app.post('/api/v1/daily-tracker/check-metadata-batch', async (req: Request, res: Response) => {
  try {
    const { company_names } = req.body;
    if (!Array.isArray(company_names) || company_names.length === 0) {
      return res.json({ success: true, data: { existing_names: [], new_names: [] } });
    }

    const trimmedNames = company_names.map((n: string) => String(n || '').trim()).filter(Boolean);
    if (trimmedNames.length === 0) {
      return res.json({ success: true, data: { existing_names: [], new_names: [] } });
    }

    // Match exact or case-insensitive
    const regexes = trimmedNames.map((name) => new RegExp(`^${escapeRegex(name)}$`, 'i'));
    const matchedDocs = await CompanyMetadata.find({
      company_name: { $in: regexes },
      is_deleted: false,
    }).select('company_name hr_name primary_mobile primary_email');

    const matchedMap = new Map<string, any>();
    matchedDocs.forEach((doc) => {
      matchedMap.set((doc.company_name || '').trim().toLowerCase(), doc);
    });

    const existingNames: string[] = [];
    const newNames: string[] = [];

    for (const name of trimmedNames) {
      const lower = name.toLowerCase();
      if (matchedMap.has(lower)) {
        if (!existingNames.includes(name)) existingNames.push(name);
      } else {
        if (!newNames.includes(name)) newNames.push(name);
      }
    }

    return res.json({
      success: true,
      data: {
        existing_names: existingNames,
        new_names: newNames,
        existing_count: existingNames.length,
        new_count: newNames.length,
      },
    });
  } catch (error: any) {
    console.error('POST /daily-tracker/check-metadata-batch error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to check metadata batch' },
    });
  }
});

// ── DT-BULK-MOVE: POST /api/v1/daily-tracker/bulk-move
// Bulk move or copy selected daily tracker company call rows to another target college
app.post('/api/v1/daily-tracker/bulk-move', async (req: Request, res: Response) => {
  try {
    const { row_ids, target_college_id, mode = 'move' } = req.body;

    if (!Array.isArray(row_ids) || row_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one row ID is required to process' },
      });
    }

    if (!target_college_id || !Types.ObjectId.isValid(String(target_college_id))) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid Target College ID is required' },
      });
    }

    const targetCollege = await College.findById(target_college_id);
    if (!targetCollege) {
      return res.status(404).json({
        success: false,
        error: { code: 'COLLEGE_NOT_FOUND', message: 'Target college not found' },
      });
    }

    const objectIds = row_ids.map((id: string) => new Types.ObjectId(String(id)));

    if (mode === 'copy') {
      let copiedCount = 0;
      const sourceRows = await DailyTracker.find({ _id: { $in: objectIds }, is_deleted: { $ne: true } });
      for (const src of sourceRows) {
        await DailyTracker.create({
          session_date: src.session_date || new Date(),
          day: src.day,
          month: src.month,
          year: src.year,
          academic_year: (src as any).academic_year || 2026,
          college_id: new Types.ObjectId(String(target_college_id)),
          coordinator_id: src.coordinator_id,
          company_id: src.company_id || null,
          company_name: src.company_name,
          hr_name: src.hr_name || 'HR Contact',
          mobile_number: src.mobile_number || '',
          email_id: src.email_id || '',
          is_contact_added: (src as any).is_contact_added || false,
          is_skipped: false,
          is_promoted_to_weekly: false,
          is_deleted: false,
          call_start_time: src.call_start_time || null,
          call_end_time: src.call_end_time || null,
          duration_seconds: src.duration_seconds || 0,
          outcome_status: src.outcome_status || null,
          follow_up_month: src.follow_up_month || null,
          comments: src.comments || '',
          created_at: new Date(),
          updated_at: new Date(),
        });
        copiedCount++;
      }

      return res.status(200).json({
        success: true,
        message: `Successfully copied ${copiedCount} company call(s) to ${targetCollege.college_name}`,
        data: {
          action: 'copy',
          processed_count: copiedCount,
          target_college: {
            _id: targetCollege._id,
            college_name: targetCollege.college_name,
            college_code: targetCollege.college_code,
          },
        },
      });
    }

    // Default Mode: Move (re-assign college_id)
    const updateRes = await DailyTracker.updateMany(
      { _id: { $in: objectIds } },
      { $set: { college_id: new Types.ObjectId(String(target_college_id)), updated_at: new Date() } }
    );

    // Also cascade college_id update to any linked DailyLead or WeeklyTracker records
    await DailyLead.updateMany(
      { daily_tracker_id: { $in: objectIds } },
      { $set: { college_id: new Types.ObjectId(String(target_college_id)), updated_at: new Date() } }
    );

    await WeeklyTracker.updateMany(
      { daily_tracker_id: { $in: objectIds } },
      { $set: { college_id: new Types.ObjectId(String(target_college_id)), updated_at: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully moved ${updateRes.modifiedCount} company call(s) to ${targetCollege.college_name}`,
      data: {
        action: 'move',
        processed_count: updateRes.modifiedCount,
        target_college: {
          _id: targetCollege._id,
          college_name: targetCollege.college_name,
          college_code: targetCollege.college_code,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ [DailyTracker] Bulk move/copy error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to process daily tracker rows' },
    });
  }
});

// ── DT-BULK-PASTE: POST /api/v1/daily-tracker/bulk-paste
// Bulk import rows pasted from Excel/Sheets (Order: Company Name, HR Name, Contact, Email ID)
// Automatically creates/saves new company records into CompanyMetadata catalog
app.post('/api/v1/daily-tracker/bulk-paste', async (req: Request, res: Response) => {
  try {
    const { college_id, rows: incomingRows } = req.body;
    const coordinator_id = scopeToSelf(req, req.body.coordinator_id);

    if (!coordinator_id || !college_id || !Array.isArray(incomingRows) || incomingRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Coordinator, College, and at least one row are required' },
      });
    }

    const today = buildSessionDate();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Check existing loaded company/contact for today's session to avoid duplicate row insertion
    const existingTrackerRows = await DailyTracker.find({
      coordinator_id: new Types.ObjectId(coordinator_id),
      college_id: new Types.ObjectId(college_id),
      session_date: today,
      is_finalized: false,
    }).select('company_name mobile_number email_id');

    const existingKeys = new Set(
      existingTrackerRows.map((r) => {
        const c = (r.company_name || '').trim().toLowerCase();
        const contact = (r.mobile_number || r.email_id || '').trim().toLowerCase();
        return `${c}_${contact}`;
      })
    );

    let createdCount = 0;
    let duplicatesSkipped = 0;
    const createdRows: any[] = [];

    let newMetadataCount = 0;
    let existingMetadataCount = 0;
    const newMetadataCompanies: any[] = [];
    const newMetadataIds: string[] = [];

    // Highest company serial number for new companies
    const highestDoc = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } })
      .sort({ serial_number: -1 })
      .select('serial_number');
    let currentNextSerial = (highestDoc?.serial_number || 0) + 1;

    for (const item of incomingRows) {
      const companyName = (item.company_name || '').trim();
      const mobileNumber = (item.mobile_number || '').trim();
      const emailId = (item.email_id || '').trim().toLowerCase();
      const hrName = (item.hr_name || 'HR Contact').trim();
      const comments = (item.comments || '').trim();

      // Mandatory validation: Company Name is required, and at least ONE contact point (Mobile or Email) must be present
      if (!companyName || (!mobileNumber && !emailId)) {
        continue;
      }

      const key = `${companyName.toLowerCase()}_${(mobileNumber || emailId).toLowerCase()}`;
      if (existingKeys.has(key)) {
        duplicatesSkipped++;
        continue;
      }
      existingKeys.add(key);

      // Find or create CompanyMetadata
      let company = await CompanyMetadata.findOne({
        company_name: { $regex: new RegExp(`^${escapeRegex(companyName)}$`, 'i') },
        is_deleted: false,
      });

      const mobList = mobileNumber ? mobileNumber.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean) : [];
      const emailList = emailId ? emailId.split(/[,;/]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean) : [];

      if (!company) {
        // Automatically save new contact into Company Metadata Base
        company = await CompanyMetadata.create({
          serial_number: currentNextSerial++,
          company_name: companyName,
          hr_name: hrName || 'HR Contact',
          primary_mobile: mobList[0] || '',
          mobile_numbers: mobList,
          primary_email: emailList[0] || '',
          email_ids: emailList,
          notes: `Imported via Daily Tracker Excel paste on ${new Date().toLocaleDateString('en-IN')}`,
        });

        newMetadataCount++;
        newMetadataIds.push(String(company._id));
        newMetadataCompanies.push({
          _id: String(company._id),
          serial_number: company.serial_number,
          company_name: company.company_name,
          hr_name: company.hr_name,
          primary_mobile: company.primary_mobile,
          primary_email: company.primary_email,
        });
      } else {
        existingMetadataCount++;
        let metaUpdated = false;
        if (hrName && hrName !== 'HR Contact') {
          const existingHrs = (company.hr_name || '')
            .split(/[,;/]+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s && s.toLowerCase() !== 'hr contact' && s.toLowerCase() !== 'contact');
          if (!existingHrs.includes(hrName)) {
            existingHrs.push(hrName);
            company.hr_name = existingHrs.join(', ');
            metaUpdated = true;
          }
        }
        for (const mob of mobList) {
          if (!company.mobile_numbers.includes(mob)) {
            company.mobile_numbers.push(mob);
            metaUpdated = true;
          }
        }
        if (!company.primary_mobile && mobList[0]) {
          company.primary_mobile = mobList[0];
          metaUpdated = true;
        }
        for (const em of emailList) {
          if (!company.email_ids.includes(em)) {
            company.email_ids.push(em);
            metaUpdated = true;
          }
        }
        if (!company.primary_email && emailList[0]) {
          company.primary_email = emailList[0];
          metaUpdated = true;
        }
        if (metaUpdated) {
          await company.save();
        }
      }

      const newRow = await DailyTracker.create({
        coordinator_id: new Types.ObjectId(coordinator_id),
        college_id: new Types.ObjectId(college_id),
        company_id: company._id,
        company_name: companyName,
        hr_name: hrName || company.hr_name || 'HR Contact',
        mobile_number: mobileNumber || company.primary_mobile || '',
        email_id: emailId || company.primary_email || '',
        comments: comments,
        year,
        month,
        day,
        session_date: today,
        is_skipped: false,
        is_promoted_to_weekly: false,
        is_finalized: false,
        save_count: 0,
        duplicate_acknowledged: false,
      });

      createdCount++;
      createdRows.push(newRow);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${createdCount} rows into Daily Tracker. ${newMetadataCount} new contact(s) automatically saved to Metadata Database.`,
      data: {
        created_count: createdCount,
        duplicates_skipped: duplicatesSkipped,
        new_metadata_count: newMetadataCount,
        new_metadata_companies: newMetadataCompanies,
        new_metadata_ids: newMetadataIds,
        existing_metadata_count: existingMetadataCount,
        rows: createdRows,
      },
    });
  } catch (error: any) {
    console.error('POST /daily-tracker/bulk-paste error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to bulk import rows' },
    });
  }
});

// ── DT-COPY-HISTORY: POST /api/v1/daily-tracker/copy-from-history
// Copy single, multiple, or random selection of historical rows into the current working workspace
app.post('/api/v1/daily-tracker/copy-from-history', async (req: Request, res: Response) => {
  try {
    const { college_id, rows: inputRows, row_ids } = req.body;
    const coordinator_id = scopeToSelf(req, req.body.coordinator_id);

    if (!coordinator_id || !college_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and college_id are required' },
      });
    }

    let sourceRows: any[] = [];
    if (Array.isArray(inputRows) && inputRows.length > 0) {
      sourceRows = inputRows;
    } else if (Array.isArray(row_ids) && row_ids.length > 0) {
      sourceRows = await DailyTracker.find({
        _id: { $in: row_ids.map((id: string) => new Types.ObjectId(id)) },
      }).lean();
    }

    if (sourceRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No rows provided to copy' },
      });
    }

    const today = buildSessionDate();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();

    // Fetch existing rows for today to avoid duplicate entries in the same session
    const existingRows = await DailyTracker.find({
      coordinator_id: new Types.ObjectId(coordinator_id),
      college_id: new Types.ObjectId(college_id),
      session_date: today,
    }).select('company_name mobile_number email_id');

    const existingKeys = new Set(
      existingRows.map(
        (r) => `${(r.company_name || '').trim().toLowerCase()}_${(r.mobile_number || '').trim()}`
      )
    );

    const toInsert: any[] = [];
    const skippedDuplicates: string[] = [];

    for (const src of sourceRows) {
      const compName = (src.company_name || '').trim();
      const mob = (src.mobile_number || '').trim();
      if (!compName && !mob) continue;

      const dedupeKey = `${compName.toLowerCase()}_${mob}`;
      if (existingKeys.has(dedupeKey)) {
        skippedDuplicates.push(compName || mob);
        continue;
      }
      existingKeys.add(dedupeKey);

      let companyId: Types.ObjectId | undefined = src.company_id && Types.ObjectId.isValid(src.company_id) ? new Types.ObjectId(src.company_id) : undefined;
      if (!companyId) {
        let comp = await CompanyMetadata.findOne({
          company_name: { $regex: new RegExp(`^${escapeRegex(compName)}$`, 'i') },
          is_deleted: false,
        });
        if (!comp) {
          const highestDoc = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } })
            .sort({ serial_number: -1 })
            .select('serial_number');
          const nextSerial = (highestDoc?.serial_number || 0) + 1;
          const mobList = mob ? mob.split(/[,;/]+/).map((s: string) => s.trim()).filter(Boolean) : [];
          const emailList = src.email_id ? src.email_id.split(/[,;/]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean) : [];
          comp = await CompanyMetadata.create({
            serial_number: nextSerial,
            company_name: compName,
            hr_name: (src.hr_name || '').trim() || 'HR Contact',
            primary_mobile: mobList[0] || '',
            mobile_numbers: mobList,
            primary_email: emailList[0] || '',
            email_ids: emailList,
            notes: `Created via History Copy on ${new Date().toLocaleDateString('en-IN')}`,
          });
        }
        companyId = comp._id as Types.ObjectId;
      }

      toInsert.push({
        coordinator_id: new Types.ObjectId(coordinator_id),
        college_id: new Types.ObjectId(college_id),
        company_id: companyId,
        company_name: compName,
        hr_name: (src.hr_name || '').trim() || 'HR Contact',
        mobile_number: mob,
        email_id: (src.email_id || '').trim().toLowerCase(),
        year,
        month,
        day,
        session_date: today,
        comments: src.comments ? String(src.comments).trim() : '',
        is_skipped: false,
        is_promoted_to_weekly: false,
        is_finalized: false,
        save_count: 0,
        duplicate_acknowledged: false,
      });
    }

    let inserted: any[] = [];
    if (toInsert.length > 0) {
      inserted = await DailyTracker.insertMany(toInsert, { ordered: false });
    }

    return res.status(201).json({
      success: true,
      message: `Successfully copied ${inserted.length} row(s) to today's workspace`,
      data: {
        copied_count: inserted.length,
        skipped_duplicates_count: skippedDuplicates.length,
        skipped_duplicates: skippedDuplicates,
        rows: inserted,
      },
    });
  } catch (error: any) {
    console.error('POST /daily-tracker/copy-from-history error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to copy rows from history' },
    });
  }
});

// ── DT-3: PATCH /api/v1/daily-tracker/:id
// Auto-save a single row — start_time, outcome, comments
app.patch('/api/v1/daily-tracker/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      call_start_time,
      outcome_status,
      comments,
      follow_up_date,
      follow_up_month,
      company_name,
      hr_name,
      mobile_number,
      email_id,
    } = req.body;

    const row = await DailyTracker.findById(id);
    if (!row) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tracker row not found' },
      });
    }

    // The route policy only proves the caller is staff; it cannot know this
    // particular row belongs to them. Without this, any coordinator could
    // read or edit another coordinator's call log by guessing/enumerating ids.
    if (refuseForeignOwner(req, res, String(row.coordinator_id), 'You can only edit your own tracker rows.')) return;

    if (row.is_finalized) {
      return res.status(403).json({
        success: false,
        error: { code: 'FINALIZED', message: "This day's tracker has been finalized and is read-only" },
      });
    }

    if (company_name !== undefined && typeof company_name === 'string') {
      row.company_name = company_name.trim();
    }
    if (hr_name !== undefined && typeof hr_name === 'string') {
      row.hr_name = hr_name.trim();
    }
    if (mobile_number !== undefined && typeof mobile_number === 'string') {
      row.mobile_number = mobile_number.trim();
    }
    if (email_id !== undefined && typeof email_id === 'string') {
      row.email_id = email_id.trim();
    }

    if (outcome_status && !call_start_time && !row.call_start_time) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'START_TIME_REQUIRED',
          message:
            'Start Time is required before selecting Call Outcome. Press Spacebar to insert the current system time, or manually enter the Start Time.',
        },
      });
    }

    if (call_start_time) {
      row.call_start_time = new Date(call_start_time);
      if (row.call_end_time) {
        const diffMs = row.call_end_time.getTime() - row.call_start_time.getTime();
        row.duration_seconds = Math.max(0, Math.round(diffMs / 1000));
      }
    }

    if (outcome_status) {
      row.outcome_status = outcome_status;
      row.call_end_time = new Date();

      if (row.call_start_time) {
        const diffMs = row.call_end_time.getTime() - row.call_start_time.getTime();
        row.duration_seconds = Math.max(0, Math.round(diffMs / 1000));
      }

      if (outcome_status === 'follow_up') {
        if (follow_up_date) row.follow_up_date = new Date(follow_up_date);
        if (follow_up_month !== undefined) row.follow_up_month = follow_up_month || null;
      } else {
        // If outcome changed away from follow_up, reset follow_up_month
        row.follow_up_month = null;
        row.follow_up_date = null;
      }
    } else if (follow_up_month !== undefined) {
      row.follow_up_month = follow_up_month || null;
    }

    if (comments !== undefined) {
      row.comments = comments;
    }

    row.last_saved_at = new Date();
    await row.save();

    // Lively sync edited contact info to CompanyMetadata & synchronize across catalog
    if (row.company_id || row.company_name) {
      (async () => {
        try {
          let meta = row.company_id ? await CompanyMetadata.findById(row.company_id) : null;
          if (!meta && row.company_name) {
            meta = await CompanyMetadata.findOne({
              company_name: { $regex: new RegExp(`^${escapeRegex(row.company_name.trim())}$`, 'i') },
              is_deleted: false,
            });
          }
          if (meta && !meta.is_deleted) {
            let metaUpdated = false;

            // 1. Sync HR Names (Comma / semicolon / slash separated)
            if (row.hr_name && row.hr_name.trim()) {
              const existingHrs = (meta.hr_name || '')
                .split(/[,;/]+/)
                .map((s: string) => s.trim())
                .filter((s: string) => s && s.toLowerCase() !== 'hr contact' && s.toLowerCase() !== 'contact');
              const incomingHrs = row.hr_name
                .split(/[,;/]+/)
                .map((s: string) => s.trim())
                .filter((s: string) => s && s.toLowerCase() !== 'hr contact' && s.toLowerCase() !== 'contact');
              const mergedHrs = Array.from(new Set([...existingHrs, ...incomingHrs]));
              if (mergedHrs.length > 0 && mergedHrs.join(', ') !== meta.hr_name) {
                meta.hr_name = mergedHrs.join(', ');
                metaUpdated = true;
              }
            }

            // 2. Sync Mobile Numbers (Comma / semicolon / slash separated)
            if (row.mobile_number && row.mobile_number.trim()) {
              const incomingMobiles = row.mobile_number
                .split(/[,;/]+/)
                .map((m: string) => m.trim())
                .filter((m: string) => m.length > 0);
              for (const mob of incomingMobiles) {
                if (!meta.mobile_numbers.includes(mob)) {
                  meta.mobile_numbers.push(mob);
                  metaUpdated = true;
                }
              }
              if (!meta.primary_mobile && meta.mobile_numbers.length > 0) {
                meta.primary_mobile = meta.mobile_numbers[0];
                metaUpdated = true;
              }
            }

            // 3. Sync Email IDs (Comma / semicolon / slash separated)
            if (row.email_id && row.email_id.trim()) {
              const incomingEmails = row.email_id
                .split(/[,;/]+/)
                .map((e: string) => e.trim().toLowerCase())
                .filter((e: string) => e.length > 0);
              for (const em of incomingEmails) {
                if (!meta.email_ids.includes(em)) {
                  meta.email_ids.push(em);
                  metaUpdated = true;
                }
              }
              if (!meta.primary_email && meta.email_ids.length > 0) {
                meta.primary_email = meta.email_ids[0];
                metaUpdated = true;
              }
            }

            if (metaUpdated) {
              await meta.save();
            }

            // Synchronize full merged emails/mobiles/hr_name across DailyTracker & connected modules
            const fullMergedEmails = meta.email_ids.join(', ');
            const fullMergedMobiles = meta.mobile_numbers.join(', ');
            const fullMergedHr = meta.hr_name;

            let rowUpdated = false;
            if (fullMergedEmails && row.email_id !== fullMergedEmails) {
              row.email_id = fullMergedEmails;
              rowUpdated = true;
            }
            if (fullMergedMobiles && row.mobile_number !== fullMergedMobiles) {
              row.mobile_number = fullMergedMobiles;
              rowUpdated = true;
            }
            if (fullMergedHr && row.hr_name !== fullMergedHr) {
              row.hr_name = fullMergedHr;
              rowUpdated = true;
            }
            if (rowUpdated) {
              await row.save();
            }

            // Cascade to other DailyTracker records for this company
            if (fullMergedEmails || fullMergedMobiles || fullMergedHr) {
              const dtCascade: any = {};
              if (fullMergedEmails) dtCascade.email_id = fullMergedEmails;
              if (fullMergedMobiles) dtCascade.mobile_number = fullMergedMobiles;
              if (fullMergedHr) dtCascade.hr_name = fullMergedHr;

              await DailyTracker.updateMany(
                {
                  _id: { $ne: row._id },
                  $or: [
                    { company_id: meta._id },
                    { company_name: { $regex: new RegExp(`^${escapeRegex(row.company_name.trim())}$`, 'i') } },
                  ],
                },
                { $set: dtCascade }
              );
            }
          }
        } catch (syncErr) {
          console.error('Metadata sync error on tracker update:', syncErr);
        }
      })();
    }

    // Note: Active Leads is now exclusively sourced from Weekly Tracker (Daily Tracker sync decoupled)

    // ── Cascade Edits / Outcome changes to already connected DailyLead and WeeklyTracker ──
    (async () => {
      try {
        const escapedName = escapeRegex(row.company_name.trim());
        const isPositiveOutcome = row.outcome_status && ['invite_mail', 'jd_received', 'hiring', 'drive_completed'].includes(row.outcome_status);

        // 1. If outcome changed AWAY from positive outcome, cascade soft-delete to linked DailyLead and WeeklyTracker
        if (outcome_status !== undefined && !isPositiveOutcome) {
          await DailyLead.updateMany(
            {
              $or: [
                { daily_tracker_id: row._id },
                {
                  college_id: row.college_id,
                  company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                },
              ],
              is_deleted: false,
            },
            {
              $set: { is_deleted: true, deleted_at: new Date() },
            }
          );

          await WeeklyTracker.updateMany(
            {
              $or: [
                { daily_tracker_id: row._id },
                {
                  college_id: row.college_id,
                  company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                },
              ],
              is_deleted: false,
            },
            {
              $set: { is_deleted: true, deleted_at: new Date() },
            }
          );
        }

        // 2. If outcome is positive (invite_mail or jd_received), ensure matching DailyLead is in sync
        if (isPositiveOutcome) {
          const leadType = row.outcome_status === 'jd_received' ? 'jd_received' : 'positive';
          const existingLead = await DailyLead.findOne({
            $or: [
              { daily_tracker_id: row._id },
              {
                college_id: row.college_id,
                company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
              },
            ],
          });

          if (existingLead) {
            existingLead.lead_type = leadType;
            existingLead.company_name = row.company_name.trim();
            existingLead.daily_tracker_id = row._id;
            if (row.comments) existingLead.remarks = row.comments;
            existingLead.is_deleted = false;
            existingLead.deleted_at = undefined;
            await existingLead.save();
          }
        }

        // 3. Propagate edited company / contact fields to already-synchronized records
        if (company_name !== undefined || hr_name !== undefined || mobile_number !== undefined || email_id !== undefined || comments !== undefined) {
          // Update matching DailyLeads
          await DailyLead.updateMany(
            {
              $or: [
                { daily_tracker_id: row._id },
                {
                  college_id: row.college_id,
                  company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                },
              ],
              is_deleted: false,
            },
            {
              $set: {
                company_name: row.company_name.trim(),
                ...(comments !== undefined && comments ? { remarks: comments } : {}),
              },
            }
          );

          // Update matching already-synchronized WeeklyTracker rows
          const wtRows = await WeeklyTracker.find({
            $or: [
              { daily_tracker_id: row._id },
              {
                college_id: row.college_id,
                company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
              },
            ],
            is_deleted: false,
          });

          for (const wt of wtRows) {
            wt.company_name = row.company_name.trim();
            if (row.mobile_number) {
              wt.contact_number = row.mobile_number.trim();
              if (!wt.mobile_numbers) wt.mobile_numbers = [];
              if (!wt.mobile_numbers.includes(row.mobile_number.trim())) {
                wt.mobile_numbers.push(row.mobile_number.trim());
              }
            }
            if (row.email_id) {
              wt.email_id = row.email_id.trim();
              if (!wt.email_ids) wt.email_ids = [];
              if (!wt.email_ids.includes(row.email_id.trim())) {
                wt.email_ids.push(row.email_id.trim());
              }
            }
            if (row.hr_name) {
              wt.cdc_reference = `${row.hr_name.trim()}${row.mobile_number ? ` (${row.mobile_number.trim()})` : ''}`;
            }
            wt.last_status_updated_at = new Date();
            wt.updated_at = new Date();
            await wt.save();
          }
        }
      } catch (cascadeErr) {
        console.error('Cascade DT update error:', cascadeErr);
      }
    })();

    return res.status(200).json({
      success: true,
      message: 'Row saved',
      data: {
        ...row.toObject(),
        duration_formatted: row.duration_seconds != null ? formatDuration(row.duration_seconds) : null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to save row' },
    });
  }
});

// ── DT-4: PATCH /api/v1/daily-tracker/:id/skip
// Skip a contact
app.patch('/api/v1/daily-tracker/:id/skip', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const row = await DailyTracker.findById(id);
    if (!row) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tracker row not found' },
      });
    }

    if (refuseForeignOwner(req, res, String(row.coordinator_id), 'You can only skip your own tracker rows.')) return;

    if (row.is_finalized) {
      return res.status(403).json({
        success: false,
        error: { code: 'FINALIZED', message: 'Cannot skip — this day is finalized' },
      });
    }

    row.is_skipped = true;
    row.last_saved_at = new Date();
    await row.save();

    return res.status(200).json({
      success: true,
      message: `${row.company_name} skipped for today. The company remains in the Master Database.`,
      data: { id: row._id, is_skipped: true },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to skip row' },
    });
  }
});

// ── DT-4B: DELETE /api/v1/daily-tracker/:id
// Delete a contact row from today's daily tracker with cascading synchronization
app.delete('/api/v1/daily-tracker/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const row = await DailyTracker.findById(id);
    if (!row) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tracker row not found' },
      });
    }

    if (refuseForeignOwner(req, res, String(row.coordinator_id), 'You can only delete your own tracker rows.')) return;

    if (row.is_finalized) {
      return res.status(403).json({
        success: false,
        error: { code: 'FINALIZED', message: 'Cannot delete — this day is finalized' },
      });
    }

    // Cascade soft-delete matching DailyLead and WeeklyTracker
    const escapedName = escapeRegex(row.company_name.trim());
    await DailyLead.updateMany(
      {
        $or: [
          { daily_tracker_id: row._id },
          {
            college_id: row.college_id,
            company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          },
        ],
        is_deleted: false,
      },
      {
        $set: { is_deleted: true, deleted_at: new Date() },
      }
    );

    await WeeklyTracker.updateMany(
      {
        $or: [
          { daily_tracker_id: row._id },
          {
            college_id: row.college_id,
            company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          },
        ],
        is_deleted: false,
      },
      {
        $set: { is_deleted: true, deleted_at: new Date() },
      }
    );

    await DailyTracker.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `${row.company_name} removed from today's calling sheet and synchronized across trackers`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete row' },
    });
  }
});

// ── DT-4C: DELETE /api/v1/daily-tracker/bulk
// Bulk delete daily tracker rows with cascading synchronization
app.delete('/api/v1/daily-tracker/bulk', async (req: Request, res: Response) => {
  try {
    const { college_id, scope, session_date } = req.body || {};
    const coordinator_id = scopeToSelf(req, req.body?.coordinator_id);

    const filter: any = {};

    // Filter by college if not explicitly 'all'
    if (college_id && college_id !== 'all') {
      filter.college_id = new Types.ObjectId(college_id);
    }

    // Determine scope
    if (scope === 'today') {
      const targetDate = session_date ? buildSessionDate(session_date) : buildSessionDate();
      filter.session_date = targetDate;
      if (coordinator_id) {
        filter.coordinator_id = new Types.ObjectId(coordinator_id);
      }
    } else if (scope === 'college_all') {
      // All dates for this college
      if (coordinator_id) {
        filter.coordinator_id = new Types.ObjectId(coordinator_id);
      }
    } else if (scope === 'entire_database') {
      // Entire daily tracker database cleared
      // Leave filter empty to delete all DailyTracker documents
    } else {
      // Default: today's rows for current college and coordinator
      const targetDate = session_date ? buildSessionDate(session_date) : buildSessionDate();
      filter.session_date = targetDate;
      if (coordinator_id) {
        filter.coordinator_id = new Types.ObjectId(coordinator_id);
      }
    }

    const rowsToDelete = await DailyTracker.find(filter);
    const rowIds = rowsToDelete.map((r) => r._id);
    const rowCompanyNames = rowsToDelete.map((r) => r.company_name.trim()).filter(Boolean);
    const collegeIds = Array.from(new Set(rowsToDelete.map((r) => r.college_id)));

    if (rowIds.length > 0) {
      await DailyLead.updateMany(
        {
          $or: [
            { daily_tracker_id: { $in: rowIds } },
            {
              college_id: { $in: collegeIds },
              company_name: { $in: rowCompanyNames },
            },
          ],
          is_deleted: false,
        },
        {
          $set: { is_deleted: true, deleted_at: new Date() },
        }
      );

      await WeeklyTracker.updateMany(
        {
          $or: [
            { daily_tracker_id: { $in: rowIds } },
            {
              college_id: { $in: collegeIds },
              company_name: { $in: rowCompanyNames },
            },
          ],
          is_deleted: false,
        },
        {
          $set: { is_deleted: true, deleted_at: new Date() },
        }
      );
    }

    const result = await DailyTracker.deleteMany(filter);

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} daily tracker record${result.deletedCount === 1 ? '' : 's'}.`,
      deleted_count: result.deletedCount,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to bulk delete tracker records' },
    });
  }
});

// ── DT-5: POST /api/v1/daily-tracker/save-progress
// Manual Save Progress
app.post('/api/v1/daily-tracker/save-progress', async (req: Request, res: Response) => {
  try {
    const { college_id } = req.body;
    const coordinator_id = scopeToSelf(req, req.body.coordinator_id);

    if (!coordinator_id || !college_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and college_id are required' },
      });
    }

    const today = buildSessionDate();

    await DailyTracker.updateMany(
      {
        coordinator_id: new Types.ObjectId(coordinator_id),
        college_id: new Types.ObjectId(college_id),
        session_date: today,
        is_finalized: false,
      },
      {
        $inc: { save_count: 1 },
        $set: { last_saved_at: new Date() },
      }
    );

    const positiveRows = await DailyTracker.find({
      coordinator_id: new Types.ObjectId(coordinator_id),
      college_id: new Types.ObjectId(college_id),
      session_date: today,
      outcome_status: { $in: POSITIVE_OUTCOMES },
      is_promoted_to_weekly: false,
    });

    for (const row of positiveRows) {
      row.is_promoted_to_weekly = true;
      await row.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Progress saved successfully',
      data: {
        saved_at: new Date().toISOString(),
        positive_promoted: positiveRows.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to save progress' },
    });
  }
});

// ── DT-SYNC-COORDINATORS: ALL /api/v1/daily-tracker/sync-coordinators
app.all('/api/v1/daily-tracker/sync-coordinators', async (req: Request, res: Response) => {
  try {
    const currentWeekMonday = getWeekMondayKey();
    const mohanaDoc = await User.findOne({
      $or: [
        { official_email: 'mohanaradha_a@infoziant.com' },
        { username: 'mohanaradha' },
        { full_name: /mohanaradha/i },
      ],
      is_deleted: false,
    });

    let updatedCount = 0;
    if (mohanaDoc) {
      const targetCollegeCodes = ['ACET', 'AIHT', 'KARPAGAM', 'KPR'];
      const targetCollegeDocs = await College.find({
        college_code: { $in: targetCollegeCodes },
      });
      const targetCollegeIds = targetCollegeDocs.map((c) => c._id);

      if (targetCollegeIds.length > 0) {
        // Defaults are only a STARTING point: applied when the user has no colleges at all.
        // This used to overwrite assigned_college_ids on every boot / dashboard load / tracker
        // page load, so any focus change a user saved in Active College Focus was silently
        // reverted to the hardcoded list the next time any of those ran (24 Sep 2026).
        if (!mohanaDoc.assigned_college_ids || mohanaDoc.assigned_college_ids.length === 0) {
          mohanaDoc.assigned_college_ids = targetCollegeIds;
          mohanaDoc.weekly_focus_locked = true;
          mohanaDoc.weekly_focus_week_key = currentWeekMonday;
          await mohanaDoc.save();
        }

        const acetDoc = targetCollegeDocs.find((c) => c.college_code === 'ACET');
        if (acetDoc) {
          const r1 = await DailyTracker.updateMany(
            { college_id: acetDoc._id },
            { $set: { coordinator_id: mohanaDoc._id } }
          );
          updatedCount += r1.modifiedCount;
        }

        const adminUsersList = await User.find({
          role_codes: { $in: ['ADMINISTRATOR', 'ADMIN'] },
        }).select('_id');
        const adminIds = adminUsersList.map((u) => u._id);

        const r2 = await DailyTracker.updateMany(
          {
            college_id: { $in: targetCollegeIds },
            $or: [
              { coordinator_id: { $in: adminIds } },
              { coordinator_id: { $exists: false } },
              { coordinator_id: null },
            ],
          },
          { $set: { coordinator_id: mohanaDoc._id } }
        );
        updatedCount += r2.modifiedCount;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Coordinator sync complete. ${updatedCount} tracker records re-attributed to Mohanaradha.`,
      data: { updatedCount, coordinator: mohanaDoc?.full_name },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to sync coordinators' },
    });
  }
});

// ── DT-6: GET /api/v1/daily-tracker/history
// Fetch a past day's (or upcoming day's) tracker in read-only mode
app.get('/api/v1/daily-tracker/history', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    // Deliberately NOT scoped to the caller — history is a shared organizational
    // record, and the user decided (6 Sep 2026) that every role (Coordinator,
    // Team Leader, Administrator) may view any college's past daily-tracker
    // data, not just their own. `coordinator_id` is now an optional narrowing
    // filter, never an ownership pin. This is a deliberate divergence from
    // `/daily-tracker/today`, which stays self-scoped since that view is the
    // live, in-progress calling session, not historical record-keeping.
    const coordinator_id = req.query.coordinator_id as string | undefined;
    const rawCollegeId = req.query.college_id as string | undefined;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'date (YYYY-MM-DD) is required' },
      });
    }

    const sessionDate = buildSessionDate(String(date));
    const parsedDate = parseDateParam(String(date));
    const yr = parsedDate.getUTCFullYear();
    const mo = parsedDate.getUTCMonth() + 1;
    const dy = parsedDate.getUTCDate();
    const startOfDay = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(yr, mo - 1, dy, 23, 59, 59, 999));

    const filter: any = {
      $or: [
        { session_date: sessionDate },
        { session_date: { $gte: startOfDay, $lte: endOfDay } },
        { year: yr, month: mo, day: dy },
      ],
    };
    if (coordinator_id && coordinator_id !== 'all' && Types.ObjectId.isValid(coordinator_id)) {
      filter.coordinator_id = new Types.ObjectId(String(coordinator_id));
    }
    if (rawCollegeId && rawCollegeId !== 'all' && Types.ObjectId.isValid(String(rawCollegeId))) {
      filter.college_id = new Types.ObjectId(String(rawCollegeId));
    }

    const rows = await DailyTracker.find(filter)
      .populate('coordinator_id', 'full_name official_email')
      .populate('college_id', 'college_name college_code logo_url location')
      .sort({ serial_no: 1, created_at: 1 });

    const enriched = rows.map((row, idx) => {
      const obj: any = row.toObject();
      const coordinator = obj.coordinator_id as any;
      const college = obj.college_id as any;
      const colCode = (college?.college_code || obj.college_code || '').toUpperCase();

      let coordName = coordinator?.full_name;
      if (!coordName || coordName === 'Administrator') {
        if (['ACET', 'AIHT', 'KARPAGAM', 'KPR'].includes(colCode)) {
          coordName = 'A.Mohanaradha';
        } else if (['NEHRU', 'MAREPHRAM', 'MAREPHRA', 'HITS', 'SONA'].includes(colCode)) {
          coordName = 'Sujitha S';
        } else if (['PSNA', 'DSU', 'SMVEC'].includes(colCode)) {
          coordName = 'Thirisha R';
        } else if (['KLU', 'NGCE'].includes(colCode)) {
          coordName = 'Malavika Ramesh T K';
        } else if (['NPR', 'KIOT', 'ACEW'].includes(colCode)) {
          coordName = 'Lizenya R';
        } else if (['NGP', 'KAMARAJ'].includes(colCode)) {
          coordName = 'Megala Devi P S';
        } else if (['MCET', 'MEC'].includes(colCode)) {
          coordName = 'Seshmitha Tamilselvi R';
        }
      }

      return {
        ...obj,
        coordinator_id: coordinator?._id ?? obj.coordinator_id,
        coordinator_name: coordName || undefined,
        college_id: college?._id ?? obj.college_id,
        college_name: college?.college_name || undefined,
        college_code: college?.college_code || undefined,
        serial_no: idx + 1,
        duration_formatted: row.duration_seconds != null ? formatDuration(row.duration_seconds) : null,
        is_read_only: true,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        session_date: sessionDate,
        is_read_only: true,
        total: enriched.length,
        rows: enriched,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to load history' },
    });
  }
});

// ── DT-6b: GET /api/v1/tracker/active-days and /api/v1/daily-tracker/active-days
const getActiveDaysHandler = async (req: Request, res: Response) => {
  try {
    const rawCoordinatorId = req.query.coordinator_id as string | undefined;
    const rawCollegeId = req.query.college_id as string | undefined;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const filter: any = {
      $or: [
        { session_date: { $gte: startOfMonth, $lte: endOfMonth } },
        { created_at: { $gte: startOfMonth, $lte: endOfMonth } },
        { year, month },
      ],
    };

    if (rawCoordinatorId && rawCoordinatorId !== 'all' && Types.ObjectId.isValid(rawCoordinatorId)) {
      filter.coordinator_id = new Types.ObjectId(String(rawCoordinatorId));
    }
    if (rawCollegeId && rawCollegeId !== 'all' && Types.ObjectId.isValid(rawCollegeId)) {
      filter.college_id = new Types.ObjectId(String(rawCollegeId));
    }

    const records = await DailyTracker.find(filter).select('session_date day created_at year month').lean();

    const daysSet = new Set<number>();
    for (const r of records) {
      if (typeof r.day === 'number' && r.day >= 1 && r.day <= 31) {
        if (!r.year || r.year === year) {
          if (!r.month || r.month === month) {
            daysSet.add(r.day);
          }
        }
      }
      if (r.session_date) {
        const d = new Date(r.session_date);
        if (!isNaN(d.getTime())) {
          if (d.getUTCFullYear() === year && (d.getUTCMonth() + 1) === month) {
            daysSet.add(d.getUTCDate());
          }
          const ist = new Date(d.getTime() + IST_OFFSET_MS);
          if (ist.getUTCFullYear() === year && (ist.getUTCMonth() + 1) === month) {
            daysSet.add(ist.getUTCDate());
          }
        }
      }
      if (r.created_at) {
        const cd = new Date(r.created_at);
        if (!isNaN(cd.getTime())) {
          const ist = new Date(cd.getTime() + IST_OFFSET_MS);
          if (ist.getUTCFullYear() === year && (ist.getUTCMonth() + 1) === month) {
            daysSet.add(ist.getUTCDate());
          }
        }
      }
    }

    // Only include active days matching the specific college / coordinator filter
    return res.status(200).json({
      success: true,
      data: {
        year,
        month,
        days: Array.from(daysSet).sort((a, b) => a - b),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch active days' },
    });
  }
};

app.get('/api/v1/tracker/active-days', getActiveDaysHandler);
app.get('/api/v1/daily-tracker/active-days', getActiveDaysHandler);

// ── DT-7: GET /api/v1/daily-tracker/kpi
// Live KPI counts for today (supports specific college or All Colleges)
app.get('/api/v1/daily-tracker/kpi', async (req: Request, res: Response) => {
  try {
    const rawCollegeId = req.query.college_id as string | undefined;
    const rawCoordId = req.query.coordinator_id as string | undefined;
    const isSuper = isSupervisor(req);

    const today = buildSessionDate();
    const baseFilter: any = {
      session_date: today,
      is_finalized: false,
    };

    if (rawCollegeId && rawCollegeId !== 'all' && Types.ObjectId.isValid(rawCollegeId)) {
      baseFilter.college_id = new Types.ObjectId(String(rawCollegeId));
    }

    if (rawCoordId && rawCoordId !== 'all' && Types.ObjectId.isValid(rawCoordId)) {
      baseFilter.coordinator_id = new Types.ObjectId(String(rawCoordId));
    } else if (!rawCoordId && !isSuper) {
      const selfId = scopeToSelf(req, rawCoordId);
      if (selfId && Types.ObjectId.isValid(selfId)) {
        baseFilter.coordinator_id = new Types.ObjectId(String(selfId));
      }
    }

    const [total, completed, noResponse, followUp, positive] = await Promise.all([
      DailyTracker.countDocuments({ ...baseFilter, is_skipped: false }),
      DailyTracker.countDocuments({ ...baseFilter, outcome_status: { $ne: null }, is_skipped: false }),
      DailyTracker.countDocuments({ ...baseFilter, outcome_status: 'no_response', is_skipped: false }),
      DailyTracker.countDocuments({ ...baseFilter, outcome_status: 'follow_up', is_skipped: false }),
      // Positive KPI Card: specifically counts only invite_mail calls
      DailyTracker.countDocuments({ ...baseFilter, outcome_status: 'invite_mail', is_skipped: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        session_date: today,
        kpi: {
          total_loaded: total,
          completed,
          pending: Math.max(0, total - completed),
          positive,
          no_response: noResponse,
          follow_up: followUp,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch KPI' },
    });
  }
});

// ── DT-8: GET /api/v1/daily-tracker/calendar-activity
// Calendar activity dots
app.get('/api/v1/daily-tracker/calendar-activity', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query;
    const coordinator_id = scopeToSelf(req, req.query.coordinator_id as string | undefined);

    if (!coordinator_id || !year || !month) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'coordinator_id, year, and month are required' },
      });
    }

    const activeDays = await DailyTracker.distinct('day', {
      coordinator_id: new Types.ObjectId(String(coordinator_id)),
      year: Number(year),
      month: Number(month),
    });

    return res.status(200).json({
      success: true,
      data: {
        year: Number(year),
        month: Number(month),
        active_days: (activeDays as number[]).sort((a, b) => a - b),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch calendar activity' },
    });
  }
});

// ── DT-9: GET /api/v1/daily-tracker/pending-followups & /api/v1/weekly-tracker/pending-followups
// Fetch all scheduled follow-ups from Weekly Tracker (Companies in Progress & Pipeline)
// for the respective user handling their colleges
const handlePendingFollowups = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const requestedCoordId = req.query.coordinator_id as string | undefined;
    const collegeIdsParam = req.query.college_ids as string | undefined;
    const collegeIdParam = req.query.college_id as string | undefined;

    let targetCollegeIds: any[] = [];

    if (collegeIdsParam) {
      const splitIds = collegeIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
      if (splitIds.length > 0) {
        targetCollegeIds = splitIds;
      }
    } else if (collegeIdParam) {
      targetCollegeIds = [collegeIdParam.trim()];
    }

    // If no explicit college filter provided in query, scope to user's assigned colleges
    if (targetCollegeIds.length === 0 && userId) {
      const userDoc = await User.findById(userId).select('assigned_college_ids role_codes').lean();
      if (userDoc && Array.isArray(userDoc.assigned_college_ids) && userDoc.assigned_college_ids.length > 0) {
        // Coordinators and non-admins only see their assigned colleges
        targetCollegeIds = userDoc.assigned_college_ids.map((id: any) => String(id));
      }
    }

    const wtFilter: any = {
      is_deleted: { $ne: true },
      pipeline_section: { $in: ['in_progress', 'pipeline', 'companies_in_progress', 'companies_in_pipeline', 'drive_in_progress'] },
      follow_up_date: { $exists: true, $ne: null },
    };

    if (targetCollegeIds.length > 0) {
      wtFilter.college_id = { $in: targetCollegeIds.map((id: string) => new Types.ObjectId(id)) };
    }

    if (requestedCoordId && requestedCoordId !== 'all') {
      wtFilter.coordinator_id = new Types.ObjectId(requestedCoordId);
    }

    const rows = await WeeklyTracker.find(wtFilter)
      .populate('college_id', 'college_name college_code logo_url')
      .populate('coordinator_id', 'full_name official_email')
      .sort({ follow_up_date: 1, company_name: 1 })
      .lean();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const categorized = rows.map((r: any) => {
      let dateStr = '';
      let urgency: 'due_now' | 'overdue' | 'upcoming' = 'upcoming';

      if (r.follow_up_date) {
        const d = new Date(r.follow_up_date);
        if (!isNaN(d.getTime())) {
          dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (dateStr === todayStr) {
            urgency = 'due_now';
          } else if (dateStr < todayStr) {
            urgency = 'overdue';
          } else {
            urgency = 'upcoming';
          }
        }
      }

      const isProgress = r.pipeline_section === 'in_progress' || r.pipeline_section === 'companies_in_progress' || r.pipeline_section === 'drive_in_progress';
      const sectionLabel = isProgress ? 'Companies in Progress' : 'Companies in Pipeline';
      const primaryContact = r.contact_number || (r.mobile_numbers && r.mobile_numbers[0]) || '';
      const primaryEmail = r.email_id || (r.email_ids && r.email_ids[0]) || '';

      return {
        _id: String(r._id),
        company_name: r.company_name || 'Unknown Company',
        job_role: r.job_role || '',
        ctc_lpa: r.ctc_lpa || '',
        company_type: r.company_type || '',
        phone_number: primaryContact,
        mobile_numbers: Array.isArray(r.mobile_numbers) && r.mobile_numbers.length > 0 ? r.mobile_numbers : (primaryContact ? [primaryContact] : []),
        email_id: primaryEmail,
        email_ids: Array.isArray(r.email_ids) && r.email_ids.length > 0 ? r.email_ids : (primaryEmail ? [primaryEmail] : []),
        college_id: String(r.college_id?._id || r.college_id || ''),
        college_name: r.college_id?.college_name || '',
        college_code: r.college_id?.college_code || '',
        college_logo: r.college_id?.logo_url || '',
        pipeline_section: r.pipeline_section,
        pipeline_section_label: sectionLabel,
        follow_up_date: dateStr,
        follow_up_date_raw: r.follow_up_date,
        comments: r.current_status_text || '',
        coordinator_name: r.coordinator_id?.full_name || '',
        urgency,
      };
    });

    const dueNow = categorized.filter((c) => c.urgency === 'due_now');
    const overdue = categorized.filter((c) => c.urgency === 'overdue');
    const upcoming = categorized.filter((c) => c.urgency === 'upcoming');

    // Aggregate summary per college
    const collegesMap = new Map<string, { college_id: string; college_name: string; college_code: string; logo_url?: string; due_now_count: number; overdue_count: number; total_count: number }>();

    for (const item of categorized) {
      if (!item.college_id) continue;
      if (!collegesMap.has(item.college_id)) {
        collegesMap.set(item.college_id, {
          college_id: item.college_id,
          college_name: item.college_name,
          college_code: item.college_code,
          logo_url: item.college_logo,
          due_now_count: 0,
          overdue_count: 0,
          total_count: 0,
        });
      }
      const c = collegesMap.get(item.college_id)!;
      c.total_count += 1;
      if (item.urgency === 'due_now') c.due_now_count += 1;
      if (item.urgency === 'overdue') c.overdue_count += 1;
    }

    if (targetCollegeIds.length > 0) {
      const allTargetColleges = await College.find({
        _id: { $in: targetCollegeIds.map((id: string) => new Types.ObjectId(id)) },
        is_deleted: { $ne: true },
      }).select('_id college_name college_code logo_url').lean();

      for (const col of allTargetColleges) {
        const idStr = String(col._id);
        if (!collegesMap.has(idStr)) {
          collegesMap.set(idStr, {
            college_id: idStr,
            college_name: col.college_name,
            college_code: col.college_code,
            logo_url: col.logo_url,
            due_now_count: 0,
            overdue_count: 0,
            total_count: 0,
          });
        }
      }
    }

    const availableColleges = Array.from(collegesMap.values()).sort((a, b) => {
      const scoreA = a.due_now_count * 2 + a.overdue_count;
      const scoreB = b.due_now_count * 2 + b.overdue_count;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (a.college_code || '').localeCompare(b.college_code || '');
    });

    return res.status(200).json({
      success: true,
      data: {
        today_date: todayStr,
        total_pending: categorized.length,
        due_now_count: dueNow.length,
        overdue_count: overdue.length,
        upcoming_count: upcoming.length,
        available_colleges: availableColleges,
        follow_ups: [...dueNow, ...overdue, ...upcoming],
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch pending follow-ups' },
    });
  }
};

app.get('/api/v1/daily-tracker/pending-followups', handlePendingFollowups);
app.get('/api/v1/weekly-tracker/pending-followups', handlePendingFollowups);

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 04 — WEEKLY TRACKER ENDPOINTS
// Spec: Module_04_Weekly_Tracker_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────

// Helper: Calculate Month-bound 4-week periods (never crossing month boundaries)
function getMonthWeekBounds(offset: number = 0) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  const currentWeekInMonth =
    currentDate <= 7 ? 1 : currentDate <= 14 ? 2 : currentDate <= 21 ? 3 : 4;

  const currentAbsoluteWeek =
    (currentYear * 12 + currentMonth) * 4 + (currentWeekInMonth - 1);
  const targetAbsoluteWeek = currentAbsoluteWeek + offset;

  const targetMonthTotal = Math.floor(targetAbsoluteWeek / 4);
  const targetWeekNumber = ((targetAbsoluteWeek % 4) + 4) % 4 + 1;
  const targetYear = Math.floor(targetMonthTotal / 12);
  const targetMonth = ((targetMonthTotal % 12) + 12) % 12;

  const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  let startDay = 1;
  let endDay = 7;
  if (targetWeekNumber === 1) {
    startDay = 1;
    endDay = 7;
  } else if (targetWeekNumber === 2) {
    startDay = 8;
    endDay = 14;
  } else if (targetWeekNumber === 3) {
    startDay = 15;
    endDay = 21;
  } else {
    startDay = 22;
    endDay = lastDayOfMonth;
  }

  const startDate = new Date(targetYear, targetMonth, startDay, 0, 0, 0, 0);
  const endDate = new Date(targetYear, targetMonth, endDay, 23, 59, 59, 999);

  return { startDate, endDate, weekNumber: targetWeekNumber, month: targetMonth, year: targetYear };
}

// Helper: Calculate Friday-to-Friday week bounds for a given date
function getFridayWeekBounds(targetDate: Date = new Date()) {
  const d = new Date(targetDate);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  // Calculate distance back to preceding Friday (or today if Friday)
  const diffToFriday = (day >= 5 ? day - 5 : day + 2);
  const startFriday = new Date(d);
  startFriday.setDate(d.getDate() - diffToFriday);
  startFriday.setHours(0, 0, 0, 0);

  const endThursday = new Date(startFriday);
  endThursday.setDate(startFriday.getDate() + 6);
  endThursday.setHours(23, 59, 59, 999);

  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  return { startFriday, endThursday, weekNumber };
}

// ── WT-1: GET /api/v1/weekly-tracker
// Fetch college placement drive records grouped by the 7 operational sections
app.get('/api/v1/weekly-tracker', async (req: Request, res: Response) => {
  try {
    const { college_id, academic_year, search, company_type, week_offset } = req.query;
    // Echo back what was actually filtered on - 'all' when no year was requested,
    // never an invented default. A hardcoded fallback here previously mislabeled
    // unfiltered results as a specific year (see the removed fallback-query below).
    const year: number | string = academic_year && academic_year !== 'all' ? Number(academic_year) : 'all';

    const filter: any = {
      is_deleted: false,
    };

    if (college_id && college_id !== 'all') {
      const queryCollegeIds: any[] = [];
      const idTokens = String(college_id).split(',').map((s) => s.trim()).filter(Boolean);
      for (const token of idTokens) {
        if (Types.ObjectId.isValid(token)) {
          queryCollegeIds.push(new Types.ObjectId(token));
          const targetCol = await College.findById(token);
          if (targetCol) {
            const sameCodeCols = await College.find({
              $or: [
                { college_code: targetCol.college_code },
                { college_name: targetCol.college_name },
              ],
            });
            sameCodeCols.forEach((sc) => {
              if (!queryCollegeIds.some((id) => String(id) === String(sc._id))) {
                queryCollegeIds.push(sc._id);
              }
            });
          }
        } else {
          const foundCols = await College.find({
            $or: [
              { college_code: String(token).toUpperCase() },
              { college_name: new RegExp(String(token), 'i') },
            ],
          });
          foundCols.forEach((fc) => queryCollegeIds.push(fc._id));
        }
        queryCollegeIds.push(String(token));
      }
      filter.college_id = { $in: queryCollegeIds };
    }

    if (academic_year && academic_year !== 'all') {
      const numYear = Number(academic_year);
      filter.academic_year = { $in: [numYear, String(academic_year)] };
    }

    if (company_type && company_type !== 'all') {
      filter.company_type = company_type;
    }

    // Month-based week filtering when user navigates prev/next week
    const offsetNum = week_offset !== undefined ? Number(week_offset) : 0;
    if (offsetNum !== 0 && !Number.isNaN(offsetNum)) {
      const { startDate, endDate } = getMonthWeekBounds(offsetNum);
      filter.$or = [
        { follow_up_date: { $gte: startDate, $lte: endDate } },
        { drive_date: { $gte: startDate, $lte: endDate } },
        { week_start_date: { $gte: startDate, $lte: endDate } },
      ];
    }

    if (search) {
      // Was unescaped raw user input straight into $regex — a bare "("
      // (common in real company names like "ABC (India) Pvt Ltd") threw an
      // uncaught 500 on this and the export-xlsx endpoint below.
      const q = escapeRegex(String(search).trim());
      filter.$or = [
        { company_name: { $regex: q, $options: 'i' } },
        { job_role: { $regex: q, $options: 'i' } },
        { cdc_reference: { $regex: q, $options: 'i' } },
        { current_status_text: { $regex: q, $options: 'i' } },
      ];
    }

    // .lean() — this endpoint returns the full unfiltered dataset (~1,000 rows) with
    // no way to page it, and was measuring ~4s under light load hydrating a full
    // Mongoose document + running .toObject() per row below for data nothing here
    // needs to mutate or re-save. populate() still works the same under .lean()
    // (perf item 44).
    const rows = await WeeklyTracker.find(filter)
      .sort({ follow_up_date: 1, company_name: 1 })
      .populate('coordinator_id', 'full_name official_email')
      .lean();

    // Deduplicate any repeated company rows for the same college & year
    const uniqueRows: typeof rows = [];
    const seenRowKeys = new Set<string>();
    const dupIdsToClean: any[] = [];

    rows.forEach((row) => {
      const cName = row.company_name ? row.company_name.trim().toLowerCase() : '';
      const rRole = row.job_role ? row.job_role.trim().toLowerCase() : '';
      const key = `${String(row.college_id)}_${row.academic_year}_${cName}_${rRole}_${row.pipeline_section}`;
      if (!seenRowKeys.has(key)) {
        seenRowKeys.add(key);
        uniqueRows.push(row);
      } else {
        dupIdsToClean.push(row._id);
      }
    });

    if (dupIdsToClean.length > 0) {
      WeeklyTracker.deleteMany({ _id: { $in: dupIdsToClean } }).catch((e) =>
        console.error('[WT-1] Failed to clean duplicate rows:', e)
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Dynamic partition into the standard operational sections
    const followUpsDueToday: any[] = [];
    const completed: any[] = [];
    const driveInProgress: any[] = [];
    const inDrive: any[] = [];
    const inProgress: any[] = [];
    const pipeline: any[] = [];
    const topCompanies: any[] = [];
    const rejectedCompanies: any[] = [];
    const onHoldByCollege: any[] = [];
    const onHoldByHr: any[] = [];

    uniqueRows.forEach((row) => {
      const r = row; // already a plain object under .lean()

      // Top Companies override
      if (row.is_pinned_top || row.pipeline_section === 'top_companies') {
        topCompanies.push(r);
      }

      // Check for follow-up due today / overdue (excluding completed/rejected/holds)
      if (
        row.follow_up_date &&
        new Date(row.follow_up_date) <= todayEnd &&
        !['completed', 'rejected_companies', 'rejected_by_hr', 'on_hold_by_college', 'on_hold_by_hr', 'rejected_by_college'].includes(row.pipeline_section)
      ) {
        followUpsDueToday.push(r);
      }

      // Primary section placement
      switch (row.pipeline_section) {
        case 'completed':
          completed.push(r);
          break;
        case 'drive_in_progress':
          driveInProgress.push(r);
          break;
        case 'in_drive':
        case 'companies_in_drive':
        case 'upcoming_drives':
          inDrive.push(r);
          break;
        case 'in_progress':
          inProgress.push(r);
          break;
        case 'rejected_companies':
        case 'rejected_by_hr':
          rejectedCompanies.push(r);
          break;
        case 'on_hold_by_college':
        case 'rejected_by_college':
          onHoldByCollege.push(r);
          break;
        case 'on_hold_by_hr':
          onHoldByHr.push(r);
          break;
        case 'top_companies':
          // Top companies are also included in companies in pipeline section
          pipeline.push(r);
          break;
        case 'pipeline':
        default:
          pipeline.push(r);
          break;
      }
    });

    // Sorting helper: Automatically arrange pipeline by follow-up date ascending (dated items first, undated items second),
    // and respect custom row swapping (order_index) across all sections.
    const sortSectionRows = (sectionKey: string, list: any[]) => {
      if (sectionKey === 'pipeline') {
        return list.sort((a, b) => {
          const dateA = a.follow_up_date ? new Date(a.follow_up_date).getTime() : null;
          const dateB = b.follow_up_date ? new Date(b.follow_up_date).getTime() : null;

          // Follow-up date present vs absent
          if (dateA !== null && dateB !== null) {
            if (dateA !== dateB) return dateA - dateB;
          } else if (dateA !== null && dateB === null) {
            return -1; // Companies with scheduled follow-up dates come first
          } else if (dateA === null && dateB !== null) {
            return 1; // Companies without follow-up dates come second
          }

          // If dates match or both are null, sort by custom row order (order_index)
          const orderA = typeof a.order_index === 'number' ? a.order_index : 0;
          const orderB = typeof b.order_index === 'number' ? b.order_index : 0;
          if (orderA !== orderB) return orderA - orderB;

          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeA - timeB;
        });
      }

      // Other sections: sort by custom row order (order_index), then secondary dates / created_at
      return list.sort((a, b) => {
        const orderA = typeof a.order_index === 'number' ? a.order_index : 0;
        const orderB = typeof b.order_index === 'number' ? b.order_index : 0;
        if (orderA !== orderB) return orderA - orderB;

        if (sectionKey === 'follow_ups_due_today' || sectionKey === 'in_progress') {
          const dateA = a.follow_up_date ? new Date(a.follow_up_date).getTime() : Infinity;
          const dateB = b.follow_up_date ? new Date(b.follow_up_date).getTime() : Infinity;
          if (dateA !== dateB) return dateA - dateB;
        }

        if (['drive_in_progress', 'in_drive', 'upcoming_drives', 'companies_in_drive'].includes(sectionKey)) {
          const driveA = a.drive_date ? new Date(a.drive_date).getTime() : Infinity;
          const driveB = b.drive_date ? new Date(b.drive_date).getTime() : Infinity;
          if (driveA !== driveB) return driveA - driveB;
        }

        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });
    };

    sortSectionRows('follow_ups_due_today', followUpsDueToday);
    sortSectionRows('completed', completed);
    sortSectionRows('drive_in_progress', driveInProgress);
    sortSectionRows('in_drive', inDrive);
    sortSectionRows('in_progress', inProgress);
    sortSectionRows('pipeline', pipeline);
    sortSectionRows('top_companies', topCompanies);
    sortSectionRows('rejected_companies', rejectedCompanies);
    sortSectionRows('on_hold_by_college', onHoldByCollege);
    sortSectionRows('on_hold_by_hr', onHoldByHr);

    return res.status(200).json({
      success: true,
      data: {
        academic_year: year,
        total_records: rows.length,
        sections: {
          follow_ups_due_today: {
            title: 'Follow-ups Due Today',
            order: 0,
            summary_metric: `${followUpsDueToday.length} Urgent Follow-ups • Action Required Today`,
            rows: followUpsDueToday,
          },
          completed: {
            title: 'Companies Completed',
            order: 1,
            summary_metric: `${completed.length} Drives Completed • ${completed.reduce((acc, curr) => acc + (curr.selected_count || 0), 0)} Offers Placed`,
            rows: completed,
          },
          drive_in_progress: {
            title: 'Drive in Progress',
            order: 2,
            summary_metric: `${driveInProgress.length} Drives Currently In Progress`,
            rows: driveInProgress,
          },
          in_drive: {
            title: 'Upcoming Drives',
            order: 3,
            summary_metric: `${inDrive.length} Upcoming Placement Drives`,
            rows: inDrive,
          },
          companies_in_drive: {
            title: 'Upcoming Drives',
            order: 3,
            summary_metric: `${inDrive.length} Upcoming Placement Drives`,
            rows: inDrive,
          },
          upcoming_drives: {
            title: 'Upcoming Drives',
            order: 3,
            summary_metric: `${inDrive.length} Upcoming Placement Drives`,
            rows: inDrive,
          },
          in_progress: {
            title: 'Companies In Progress',
            order: 4,
            summary_metric: `${inProgress.length} Active Operations • JD Received & Pipeline`,
            rows: inProgress,
          },
          pipeline: {
            title: 'Companies In Pipeline',
            order: 5,
            summary_metric: `${pipeline.length} Total Leads • Awaiting JD`,
            rows: pipeline,
          },
          top_companies: {
            title: 'Top Companies',
            order: 6,
            summary_metric: `${topCompanies.length} Priority Hiring Partners`,
            rows: topCompanies,
          },
          rejected_companies: {
            title: 'Rejected Companies',
            order: 7,
            summary_metric: `${rejectedCompanies.length} Employer / Process Declines`,
            rows: rejectedCompanies,
          },
          on_hold_by_college: {
            title: 'Companies On Hold By College',
            order: 8,
            summary_metric: `${onHoldByCollege.length} Institutional Holds`,
            rows: onHoldByCollege,
          },
          on_hold_by_hr: {
            title: 'Companies On Hold By HR',
            order: 9,
            summary_metric: `${onHoldByHr.length} Corporate Holds`,
            rows: onHoldByHr,
          },
          // Backward-compatible keys
          rejected_by_hr: {
            title: 'Rejected Companies',
            order: 6,
            summary_metric: `${rejectedCompanies.length} Employer / Process Declines`,
            rows: rejectedCompanies,
          },
          rejected_by_college: {
            title: 'Companies On Hold By College',
            order: 7,
            summary_metric: `${onHoldByCollege.length} Institutional Holds`,
            rows: onHoldByCollege,
          },
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch weekly tracker' },
    });
  }
});

// ── WT-1K: GET /api/v1/weekly-tracker/kpi
// Live KPI counts across sections for weekly tracker
app.get('/api/v1/weekly-tracker/kpi', async (req: Request, res: Response) => {
  try {
    const { college_id, academic_year, week_offset } = req.query;
    const filter: any = { is_deleted: false };

    if (college_id && college_id !== 'all') {
      const queryCollegeIds: any[] = [];
      if (Types.ObjectId.isValid(String(college_id))) {
        queryCollegeIds.push(new Types.ObjectId(String(college_id)));
        const targetCol = await College.findById(college_id);
        if (targetCol) {
          const sameCodeCols = await College.find({
            $or: [
              { college_code: targetCol.college_code },
              { college_name: targetCol.college_name },
            ],
          });
          sameCodeCols.forEach((sc) => {
            if (!queryCollegeIds.some((id) => String(id) === String(sc._id))) {
              queryCollegeIds.push(sc._id);
            }
          });
        }
      } else {
        const foundCols = await College.find({
          $or: [
            { college_code: String(college_id).toUpperCase() },
            { college_name: new RegExp(String(college_id), 'i') },
          ],
        });
        foundCols.forEach((fc) => queryCollegeIds.push(fc._id));
      }
      queryCollegeIds.push(String(college_id));
      filter.college_id = { $in: queryCollegeIds };
    }

    if (academic_year && academic_year !== 'all') {
      filter.academic_year = { $in: [Number(academic_year), String(academic_year)] };
    }

    // Keep KPI totals consistent with the row list at /weekly-tracker, which
    // applies the same offset-based week filter — see comment there.
    const offsetNum = week_offset !== undefined ? Number(week_offset) : 0;
    if (offsetNum !== 0 && !Number.isNaN(offsetNum)) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + offsetNum * 7);
      const { startFriday } = getFridayWeekBounds(targetDate);
      filter.week_start_date = startFriday;
    }

    const allRows = await WeeklyTracker.find(filter);
    const seenKpiRowKeys = new Set<string>();
    const rows = allRows.filter((r) => {
      const cName = r.company_name ? r.company_name.trim().toLowerCase() : '';
      const key = `${String(r.college_id)}_${r.academic_year}_${cName}`;
      if (seenKpiRowKeys.has(key)) return false;
      seenKpiRowKeys.add(key);
      return true;
    });

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const followUps = rows.filter(
      (r) =>
        r.follow_up_date &&
        new Date(r.follow_up_date) <= todayEnd &&
        !['completed', 'rejected_by_hr', 'rejected_by_college'].includes(r.pipeline_section)
    ).length;
    const completed = rows.filter((r) => r.pipeline_section === 'completed').length;
    const driveInProgress = rows.filter((r) => r.pipeline_section === 'drive_in_progress').length;
    const inDrive = rows.filter((r) => r.pipeline_section === 'in_drive' || r.pipeline_section === 'companies_in_drive' || r.pipeline_section === 'upcoming_drives').length;
    const inProgress = rows.filter((r) => r.pipeline_section === 'in_progress').length;
    const pipeline = rows.filter((r) => r.pipeline_section === 'pipeline').length;
    const topCompanies = rows.filter((r) => r.is_pinned_top || r.pipeline_section === 'top_companies').length;
    const totalOffers = rows
      .filter((r) => r.pipeline_section === 'completed')
      .reduce((sum, r) => sum + (r.selected_count || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        kpi: {
          follow_ups_due_today: followUps,
          completed_companies: completed,
          drive_in_progress: driveInProgress,
          upcoming_drives: inDrive,
          in_drive: inDrive,
          in_progress: inProgress,
          pipeline_leads: pipeline,
          top_companies: topCompanies,
          total_offers: totalOffers,
          total_records: rows.length,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── WT-1X: GET /api/v1/weekly-tracker/export-xlsx
// Export all sections to a single-sheet styled XLSX workbook with college acronym tab name
app.get('/api/v1/weekly-tracker/export-xlsx', async (req: Request, res: Response) => {
  try {
    const { college_id, academic_year, search, company_type } = req.query;

    if (!college_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'college_id is required' },
      });
    }

    const college = await College.findById(college_id);
    const collegeCode = college?.college_code || 'COLLEGE';
    const collegeName = college?.college_name || 'Weekly Placement Tracker';

    // Label only - never invents a year. Reflects exactly what was filtered on.
    const year: string = academic_year && academic_year !== 'all' ? String(academic_year) : 'All Years';
    const filter: any = {
      college_id: new Types.ObjectId(String(college_id)),
      is_deleted: false,
    };

    if (academic_year && academic_year !== 'all') {
      filter.academic_year = { $in: [Number(academic_year), String(academic_year)] };
    }

    if (company_type && company_type !== 'all') {
      filter.company_type = company_type;
    }

    if (search) {
      // Was unescaped raw user input straight into $regex — a bare "("
      // (common in real company names like "ABC (India) Pvt Ltd") threw an
      // uncaught 500 on this and the export-xlsx endpoint below.
      const q = escapeRegex(String(search).trim());
      filter.$or = [
        { company_name: { $regex: q, $options: 'i' } },
        { job_role: { $regex: q, $options: 'i' } },
        { cdc_reference: { $regex: q, $options: 'i' } },
        { current_status_text: { $regex: q, $options: 'i' } },
      ];
    }

    const rows = await WeeklyTracker.find(filter)
      .sort({ follow_up_date: 1, company_name: 1 })
      .populate('coordinator_id', 'full_name official_email');

    // Partition into sections
    const completed = rows.filter((r) => r.pipeline_section === 'completed');
    const driveInProgress = rows.filter((r) => r.pipeline_section === 'drive_in_progress');
    const inDrive = rows.filter((r) => r.pipeline_section === 'in_drive' || r.pipeline_section === 'companies_in_drive' || r.pipeline_section === 'upcoming_drives');
    const inProgress = rows.filter((r) => r.pipeline_section === 'in_progress');
    const pipeline = rows.filter((r) => r.pipeline_section === 'pipeline' || r.pipeline_section === 'top_companies' || (r.is_pinned_top && r.pipeline_section !== 'in_progress' && r.pipeline_section !== 'completed' && !r.pipeline_section?.startsWith('rejected') && !r.pipeline_section?.startsWith('on_hold')));
    const topCompanies = rows.filter((r) => r.is_pinned_top || r.pipeline_section === 'top_companies');
    const rejectedByHr = rows.filter((r) => r.pipeline_section === 'rejected_by_hr' || r.pipeline_section === 'rejected_companies');
    const rejectedByCollege = rows.filter((r) => r.pipeline_section === 'rejected_by_college' || r.pipeline_section === 'on_hold_by_college');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'iPOMS Placement Operations Management System';
    workbook.created = new Date();

    // Sheet Name is the College Acronym (max 31 characters as required by Excel)
    const sheetName = (collegeCode || 'Tracker').substring(0, 31);
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });

    // Setup columns with base widths
    sheet.columns = [
      { key: 'sno', width: 8 },
      { key: 'company_name', width: 32 },
      { key: 'job_role', width: 26 },
      { key: 'ctc_lpa', width: 14 },
      { key: 'status', width: 36 },
      { key: 'company_type', width: 26 },
      { key: 'extra', width: 18 },
      { key: 'remarks', width: 28 },
    ];

    // ── Main Header Title Banner ──
    const titleRow = sheet.addRow([`${collegeName} (${collegeCode}) - Weekly Placement Tracker`]);
    sheet.mergeCells(`A${titleRow.number}:H${titleRow.number}`);
    titleRow.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Navy Blue
    };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.height = 32;

    const subTitleRow = sheet.addRow([`Academic Season ${year} | Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`]);
    sheet.mergeCells(`A${subTitleRow.number}:H${subTitleRow.number}`);
    subTitleRow.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
    subTitleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    subTitleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    subTitleRow.height = 20;

    sheet.addRow([]); // Blank spacer

    // Helper to render each section
    const renderSection = (
      sectionTitle: string,
      sectionRows: any[],
      bannerColor: string,
      extraHeaderTitle: string = 'Offers Released'
    ) => {
      // Section Header Banner
      const secHeader = sheet.addRow([`${sectionTitle} (${sectionRows.length})`]);
      sheet.mergeCells(`A${secHeader.number}:H${secHeader.number}`);
      secHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      secHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bannerColor },
      };
      secHeader.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      secHeader.height = 24;

      // Table Column Headers
      const colHeaders = sheet.addRow([
        'S.No',
        'Company Name',
        'Job Role',
        'CTC (LPA)',
        'Current Status',
        'Company Type',
        extraHeaderTitle,
        'Remarks / Notes',
      ]);
      colHeaders.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      colHeaders.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      };
      colHeaders.alignment = { vertical: 'middle' };
      colHeaders.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      colHeaders.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      colHeaders.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      colHeaders.height = 22;

      // Rows
      if (sectionRows.length === 0) {
        const emptyRow = sheet.addRow(['', 'No companies listed in this section', '', '', '', '', '', '']);
        sheet.mergeCells(`B${emptyRow.number}:H${emptyRow.number}`);
        emptyRow.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
        emptyRow.height = 20;
      } else {
        sectionRows.forEach((r, idx) => {
          const rowData = sheet.addRow([
            idx + 1,
            r.company_name || '-',
            r.job_role || '-',
            r.ctc_lpa || '-',
            r.current_status_text || '-',
            r.company_type || '-',
            r.pipeline_section === 'completed'
              ? (r.selected_count !== undefined ? String(r.selected_count) : '-')
              : (r.drive_date ? new Date(r.drive_date).toLocaleDateString('en-IN') : (r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN') : '-')),
            r.remarks || r.cdc_reference || '-',
          ]);
          rowData.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
          rowData.alignment = { vertical: 'middle' };
          rowData.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
          rowData.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
          rowData.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
          rowData.height = 20;

          // Apply light borders
          for (let c = 1; c <= 8; c++) {
            rowData.getCell(c).border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };
          }
        });
      }

      sheet.addRow([]); // Blank spacer between sections
    };

    // 1. Companies Completed (Green Banner)
    renderSection('1. COMPANIES COMPLETED', completed, 'FF047857', 'Offers Released');

    // 2. Drive in Progress (Amber / Orange Banner)
    renderSection('2. DRIVE IN PROGRESS', driveInProgress, 'FFD97706', 'Drive Date / Stage');

    // 3. Upcoming Drives (Indigo Banner)
    renderSection('3. UPCOMING DRIVES', inDrive, 'FF4338CA', 'Drive Date / Stage');

    // 4. Companies in Progress (Blue Banner)
    renderSection('4. COMPANIES IN PROGRESS', inProgress, 'FF2563EB', 'Follow-up / Drive Date');

    // 5. Companies in Pipeline (Indigo Banner)
    renderSection('5. COMPANIES IN PIPELINE', pipeline, 'FF4F46E5', 'Timeline');

    // 6. Top Companies (Purple Banner)
    renderSection('6. TOP COMPANIES', topCompanies, 'FF7C3AED', 'Package / Tier');

    // 7. Companies Rejected by HR (Rose / Coral Banner)
    renderSection('7. COMPANIES REJECTED BY HR', rejectedByHr, 'FFE11D48', 'Reason');

    // 7. Companies Rejected by TPO (Slate / Purple Banner)
    renderSection('7. COMPANIES REJECTED BY TPO', rejectedByCollege, 'FF64748B', 'Reason');

    // Send the XLSX buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Weekly_Tracker_${collegeCode}_${year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('❌ [WeeklyTracker] Export XLSX error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to export XLSX' },
    });
  }
});

/**
 * Weekly Tracker deliberately allows any coordinator to create/edit/delete on
 * any college - there is no access lock. This only reports it afterwards: if
 * the acting coordinator isn't one of the college's real assigned owners
 * (users.assigned_college_ids), every active, non-deleted owner gets an email.
 * A college with nobody assigned yet notifies no one (nothing to protect).
 * Fire-and-forget - a notification failure must never affect the coordinator's
 * own save/delete, which has already succeeded by the time this runs.
 */
async function notifyForeignCollegeOwners(
  actorUserId: string | undefined,
  collegeId: any,
  companyName: string,
  action: 'created' | 'updated' | 'deleted'
): Promise<void> {
  try {
    if (!actorUserId || !collegeId) return;

    const owners: any[] = await User.find({
      assigned_college_ids: collegeId,
      is_deleted: false,
      account_status: 'active',
      // Administrator holds every college for oversight dashboards (all 27, by
      // design) - that is not "the person who really handles it." Excluding
      // the role, not naming an account, so it still works if the admin ever
      // changes.
      role_codes: { $ne: 'ADMINISTRATOR' },
    }).select('_id full_name official_email');

    if (owners.length === 0) return;
    if (owners.some((o) => String(o._id) === String(actorUserId))) return;

    const [actor, college] = await Promise.all([
      User.findById(actorUserId).select('full_name'),
      College.findById(collegeId).select('college_name'),
    ]);
    if (!actor || !college) return;

    const timestamp = new Date();
    for (const owner of owners) {
      sendForeignCollegeEditEmail(owner.official_email, {
        ownerName: owner.full_name,
        actorName: (actor as any).full_name,
        collegeName: (college as any).college_name,
        companyName,
        action,
        timestamp,
      }).catch((e: any) => console.error('[weekly-tracker] notify owner failed:', e?.message || e));
    }
  } catch (e: any) {
    console.error('[weekly-tracker] notifyForeignCollegeOwners error:', e?.message || e);
  }
}

// ── WT-2: POST /api/v1/weekly-tracker
// Add a recruitment drive record manually
app.post('/api/v1/weekly-tracker', async (req: Request, res: Response) => {
  try {
    const {
      college_id,
      coordinator_id,
      company_id,
      company_name,
      job_role,
      cdc_reference,
      company_type,
      ctc_lpa,
      eligible_batch,
      pipeline_section,
      current_status_text,
      follow_up_date,
      drive_date,
      jd_received_date,
      db_shared_date,
      contact_number,
      mobile_numbers,
      email_id,
      email_ids,
      selected_count,
      academic_year,
    } = req.body;

    if (
      !college_id ||
      !coordinator_id ||
      !company_name?.trim() ||
      !job_role?.trim() ||
      !ctc_lpa?.trim() ||
      !current_status_text?.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Company Name, Role, CTC, and Status are mandatory fields and must be filled.',
        },
      });
    }

    // The company must already exist in Master Company Metadata. Never auto-create
    // it here, and never invent a company_id for one that isn't found - that used
    // to mint a random ObjectId pointing at no document in either collection, an
    // orphan reference with no metadata record to even flag it by. Refuse instead,
    // same shape as the mandatory-field check above: add the company via Daily
    // Tracker or the Metadata module first, then retry.
    let resolvedCompanyId = company_id;
    let isInMetadata = false;

    if (resolvedCompanyId && Types.ObjectId.isValid(String(resolvedCompanyId))) {
      const existingMeta = await CompanyMetadata.findById(resolvedCompanyId);
      if (existingMeta && !existingMeta.is_deleted) {
        isInMetadata = true;
      }
    }

    if (!isInMetadata) {
      const existingMeta = await CompanyMetadata.findOne({
        company_name: { $regex: new RegExp(`^${escapeRegex(company_name.trim())}$`, 'i') },
        is_deleted: false,
      });
      if (existingMeta) {
        resolvedCompanyId = existingMeta._id;
        isInMetadata = true;
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'COMPANY_NOT_IN_METADATA',
            message: `"${company_name.trim()}" is not in the Metadata database. Add it via Daily Tracker or the Metadata module first, then try again.`,
          },
        });
      }
    }

    if (follow_up_date) {
      const parsedFollowUp = new Date(follow_up_date);
      if (!isNaN(parsedFollowUp.getTime())) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const followUpDay = new Date(parsedFollowUp);
        followUpDay.setHours(23, 59, 59, 999);
        if (followUpDay < startOfToday) {
          return res.status(400).json({
            success: false,
            error: 'Follow-up date cannot be in the past. Please select today or an upcoming date.',
          });
        }
      }
    }

    const effectiveSection = pipeline_section === 'follow_ups_due_today' ? 'in_progress' : (pipeline_section || 'pipeline');
    const effectiveFollowUp = pipeline_section === 'follow_ups_due_today' && !follow_up_date ? new Date() : (follow_up_date ? new Date(follow_up_date) : null);
    const { startFriday, endThursday, weekNumber } = getFridayWeekBounds();

    const rawOffers = req.body.offers_received !== undefined ? req.body.offers_received : req.body.selected_count;
    let finalSelectedCount = 0;
    if (rawOffers !== undefined && rawOffers !== null && rawOffers !== '') {
      const parsed = parseInt(String(rawOffers), 10);
      if (!isNaN(parsed)) {
        finalSelectedCount = Math.min(50, Math.max(0, parsed));
      }
    }

    const resolvedYear = Number(academic_year) || (await getCurrentAcademicYear());
    const resolvedBatchYear = await getCurrentGraduatingBatchYear();
    const newDrive = await WeeklyTracker.create({
      academic_year: resolvedYear,
      college_id: new Types.ObjectId(String(college_id)),
      coordinator_id: new Types.ObjectId(String(coordinator_id)),
      company_id: new Types.ObjectId(String(resolvedCompanyId)),
      company_name: company_name.trim(),
      job_role: job_role.trim(),
      contact_number: (contact_number || '').trim(),
      mobile_numbers: Array.isArray(mobile_numbers) ? mobile_numbers.map((m: string) => String(m).trim()).filter(Boolean) : (contact_number ? [contact_number.trim()] : []),
      email_id: (email_id || '').trim(),
      email_ids: Array.isArray(email_ids) ? email_ids.map((e: string) => String(e).trim()).filter(Boolean) : (email_id ? [email_id.trim()] : []),
      cdc_reference: cdc_reference?.trim() || '',
      company_type: company_type?.trim() || 'Software / IT',
      ctc_lpa: ctc_lpa.trim(),
      eligible_batch: eligible_batch?.trim() || `${resolvedBatchYear} Batch`,
      pipeline_section: effectiveSection,
      current_status_text: current_status_text.trim(),
      follow_up_date: effectiveFollowUp,
      drive_date: drive_date ? new Date(drive_date) : null,
      jd_received_date: jd_received_date ? new Date(jd_received_date) : null,
      db_shared_date: db_shared_date ? new Date(db_shared_date) : null,
      selected_count: finalSelectedCount,
      week_number: weekNumber,
      week_start_date: startFriday,
      week_end_date: endThursday,
      is_pinned_top: pipeline_section === 'top_companies',
    });

    notifyForeignCollegeOwners(
      (req as any).user?.userId,
      newDrive.college_id,
      newDrive.company_name,
      'created'
    );

    return res.status(201).json({
      success: true,
      message: 'Recruitment drive record created successfully',
      is_in_metadata: true,
      data: newDrive,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create recruitment drive' },
    });
  }
});

// ── WT-3: PATCH /api/v1/weekly-tracker/:id
// Inline update of any field in a row (role, cdc, ctc, status, follow-up date, offers)
app.patch('/api/v1/weekly-tracker/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const patchData = req.body;

    const row = await WeeklyTracker.findById(id);
    if (!row || row.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Weekly tracker record not found' },
      });
    }

    // Validate mandatory fields if they are included in patchData
    const mandatoryStringFields = ['company_name', 'job_role', 'ctc_lpa', 'current_status_text'];
    for (const mf of mandatoryStringFields) {
      if (patchData[mf] !== undefined && (!patchData[mf] || !String(patchData[mf]).trim())) {
        const fieldLabels: Record<string, string> = {
          company_name: 'Company Name',
          job_role: 'Role',
          ctc_lpa: 'CTC',
          current_status_text: 'Status',
        };
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `${fieldLabels[mf] || mf} is mandatory and cannot be empty.`,
          },
        });
      }
    }

    // Apply allowed updates
    const allowedFields = [
      'company_name',
      'job_role',
      'contact_number',
      'mobile_numbers',
      'email_id',
      'email_ids',
      'cdc_reference',
      'company_type',
      'ctc_lpa',
      'eligible_batch',
      'current_status_text',
      'follow_up_date',
      'drive_date',
      'jd_received_date',
      'db_shared_date',
      'registered_count',
      'shortlisted_count',
      'selected_count',
      'pipeline_section',
      'is_pinned_top',
    ];

    // Validate follow_up_date strictly: Cannot be a past date (must be today or future) unless performing an undo operation
    if (patchData.follow_up_date && !patchData.is_undo) {
      const parsedFollowUp = new Date(patchData.follow_up_date);
      if (!isNaN(parsedFollowUp.getTime())) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const followUpDay = new Date(parsedFollowUp);
        followUpDay.setHours(23, 59, 59, 999);
        if (followUpDay < startOfToday) {
          return res.status(400).json({
            success: false,
            error: 'Follow-up date cannot be in the past. Please select today or an upcoming date.',
          });
        }
      }
    }

    allowedFields.forEach((field) => {
      if (patchData[field] !== undefined) {
        if (['follow_up_date', 'drive_date', 'jd_received_date', 'db_shared_date'].includes(field)) {
          (row as any)[field] = patchData[field] ? new Date(patchData[field]) : null;
        } else if (field === 'selected_count') {
          const num = parseInt(String(patchData[field]), 10);
          (row as any)[field] = isNaN(num) ? 0 : Math.min(50, Math.max(0, num));
        } else if (['mobile_numbers', 'email_ids'].includes(field)) {
          (row as any)[field] = Array.isArray(patchData[field]) ? patchData[field] : [];
        } else {
          (row as any)[field] = typeof patchData[field] === 'string' ? patchData[field].trim() : patchData[field];
        }
      }
    });

    if (patchData.offers_received !== undefined && patchData.selected_count === undefined) {
      const num = parseInt(String(patchData.offers_received), 10);
      row.selected_count = isNaN(num) ? 0 : Math.min(50, Math.max(0, num));
    }

    if (patchData.pipeline_section === 'top_companies') {
      row.is_pinned_top = true;
      row.pipeline_section = 'pipeline';
    } else if (patchData.pipeline_section === 'in_progress') {
      row.pipeline_section = 'in_progress';
      row.is_pinned_top = false;
    }

    row.last_status_updated_at = new Date();
    await row.save();

    notifyForeignCollegeOwners((req as any).user?.userId, row.college_id, row.company_name, 'updated');

    // ── Cascade Edits to already connected DailyLead and DailyTracker ──
    (async () => {
      try {
        const escapedName = escapeRegex(row.company_name.trim());
        const leadUpdate: any = {};
        if (patchData.company_name !== undefined) leadUpdate.company_name = row.company_name.trim();
        if (patchData.job_role !== undefined) leadUpdate.job_role = row.job_role?.trim() || '';
        if (patchData.ctc_lpa !== undefined) leadUpdate.ctc = row.ctc_lpa?.trim() || '';
        if (patchData.eligible_batch !== undefined) leadUpdate.eligible_batch = row.eligible_batch?.trim() || '';
        if (patchData.current_status_text !== undefined || patchData.remarks !== undefined) {
          leadUpdate.remarks = row.current_status_text?.trim() || (row as any).remarks?.trim() || '';
        }

        if (Object.keys(leadUpdate).length > 0) {
          await DailyLead.updateMany(
            {
              $or: [
                ...(row.daily_tracker_id ? [{ daily_tracker_id: row.daily_tracker_id }] : []),
                {
                  college_id: row.college_id,
                  company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                },
              ],
              is_deleted: false,
            },
            { $set: leadUpdate }
          );
        }

        // Also update linked DailyTracker if present
        if (row.daily_tracker_id) {
          const dtUpdate: any = {};
          if (patchData.company_name !== undefined) dtUpdate.company_name = row.company_name.trim();
          if (patchData.contact_number !== undefined || (patchData.mobile_numbers && patchData.mobile_numbers.length > 0)) {
            dtUpdate.mobile_number = row.contact_number || (row.mobile_numbers && row.mobile_numbers[0]) || '';
          }
          if (patchData.email_id !== undefined || (patchData.email_ids && patchData.email_ids.length > 0)) {
            dtUpdate.email_id = row.email_id || (row.email_ids && row.email_ids[0]) || '';
          }
          if (Object.keys(dtUpdate).length > 0) {
            await DailyTracker.updateOne(
              { _id: row.daily_tracker_id, is_deleted: false },
              { $set: dtUpdate }
            );
          }
        }

        // Sync contact edits from WeeklyTracker to CompanyMetadata
        if (row.company_name) {
          try {
            let meta = await CompanyMetadata.findOne({
              company_name: { $regex: new RegExp(`^${escapeRegex(row.company_name.trim())}$`, 'i') },
              is_deleted: false,
            });
            if (meta) {
              let metaUpdated = false;
              const incomingMobiles = (row.contact_number || (row.mobile_numbers || []).join(', '))
                .split(/[,;/]+/)
                .map((m: string) => m.trim())
                .filter(Boolean);
              for (const mob of incomingMobiles) {
                if (!meta.mobile_numbers.includes(mob)) {
                  meta.mobile_numbers.push(mob);
                  metaUpdated = true;
                }
              }
              const incomingEmails = (row.email_id || (row.email_ids || []).join(', '))
                .split(/[,;/]+/)
                .map((e: string) => e.trim().toLowerCase())
                .filter(Boolean);
              for (const em of incomingEmails) {
                if (!meta.email_ids.includes(em)) {
                  meta.email_ids.push(em);
                  metaUpdated = true;
                }
              }
              if (metaUpdated) {
                if (!meta.primary_mobile && meta.mobile_numbers.length > 0) meta.primary_mobile = meta.mobile_numbers[0];
                if (!meta.primary_email && meta.email_ids.length > 0) meta.primary_email = meta.email_ids[0];
                await meta.save();
              }
            }
          } catch (mErr) {
            console.error('WT to CompanyMetadata sync error:', mErr);
          }
        }
      } catch (cascadeErr) {
        console.error('Cascade WT update error:', cascadeErr);
      }
    })();

    return res.status(200).json({
      success: true,
      message: 'Weekly tracker record updated successfully',
      data: row,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update weekly tracker' },
    });
  }
});

// ── WT-4: PATCH /api/v1/weekly-tracker/:id/section
// Move company between pipeline sections
app.patch('/api/v1/weekly-tracker/:id/section', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pipeline_section, current_status_text } = req.body;

    if (!pipeline_section || !PIPELINE_SECTIONS.includes(pipeline_section)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid pipeline_section is required' },
      });
    }

    const row = await WeeklyTracker.findById(id);
    if (!row || row.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Weekly tracker record not found' },
      });
    }

    if (pipeline_section === 'top_companies') {
      row.is_pinned_top = true;
      row.pipeline_section = 'pipeline';
    } else if (pipeline_section === 'in_progress') {
      row.pipeline_section = 'in_progress';
      row.is_pinned_top = false;
      row.order_index = 0;
    } else {
      row.pipeline_section = pipeline_section;
      if (pipeline_section !== 'pipeline') {
        row.is_pinned_top = false;
      }
    }

    if (current_status_text) {
      row.current_status_text = current_status_text;
    }
    row.last_status_updated_at = new Date();
    await row.save();

    notifyForeignCollegeOwners((req as any).user?.userId, row.college_id, row.company_name, 'updated');

    return res.status(200).json({
      success: true,
      message: `Moved to ${pipeline_section}`,
      data: row,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to move section' },
    });
  }
});

// ── WT-4B: POST /api/v1/weekly-tracker/batch-move-section
// Move multiple companies between pipeline sections in bulk
app.post('/api/v1/weekly-tracker/batch-move-section', async (req: Request, res: Response) => {
  try {
    const { row_ids, pipeline_section } = req.body;

    if (!Array.isArray(row_ids) || row_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'row_ids array is required' },
      });
    }

    if (!pipeline_section || !PIPELINE_SECTIONS.includes(pipeline_section)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid pipeline_section is required' },
      });
    }

    const objectIds = row_ids
      .filter((id: string) => Types.ObjectId.isValid(id))
      .map((id: string) => new Types.ObjectId(id));
    if (pipeline_section === 'top_companies') {
      await WeeklyTracker.updateMany(
        { _id: { $in: objectIds }, is_deleted: false },
        {
          $set: {
            pipeline_section: 'pipeline',
            is_pinned_top: true,
            last_status_updated_at: new Date(),
          },
        }
      );
    } else if (pipeline_section === 'in_progress') {
      await WeeklyTracker.updateMany(
        { _id: { $in: objectIds }, is_deleted: false },
        {
          $set: {
            pipeline_section: 'in_progress',
            is_pinned_top: false,
            last_status_updated_at: new Date(),
          },
        }
      );
    } else {
      await WeeklyTracker.updateMany(
        { _id: { $in: objectIds }, is_deleted: false },
        {
          $set: {
            pipeline_section,
            is_pinned_top: false,
            last_status_updated_at: new Date(),
          },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Moved ${objectIds.length} companies to ${pipeline_section.replace(/_/g, ' ')}`,
      data: { moved_count: objectIds.length, target_section: pipeline_section },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to bulk move companies' },
    });
  }
});

// ── WT-5: PATCH /api/v1/weekly-tracker/:id/pin
// Toggle Top Companies pinning
app.patch('/api/v1/weekly-tracker/:id/pin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await WeeklyTracker.findById(id);

    if (!row || row.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Weekly tracker record not found' },
      });
    }

    row.is_pinned_top = !row.is_pinned_top;
    await row.save();

    return res.status(200).json({
      success: true,
      message: row.is_pinned_top ? 'Pinned to Top Companies' : 'Unpinned from Top Companies',
      data: { id: row._id, is_pinned_top: row.is_pinned_top },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to toggle pin' },
    });
  }
});

// ── WT-5B: PATCH /api/v1/weekly-tracker/reorder
// Excel-like row reordering: updates custom order_index for rows within a section
app.patch('/api/v1/weekly-tracker/reorder', async (req: Request, res: Response) => {
  try {
    const { row_ids, section, college_id } = req.body;
    if (!Array.isArray(row_ids) || row_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'row_ids array is required' },
      });
    }

    // Bulk update order_index for all rows
    const bulkOps = row_ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id: string, index: number) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(id) },
          update: { $set: { order_index: index } },
        },
      }));

    if (bulkOps.length > 0) {
      await WeeklyTracker.bulkWrite(bulkOps);
    }

    return res.status(200).json({
      success: true,
      message: 'Rows reordered successfully',
      data: { reordered_count: bulkOps.length },
    });
  } catch (error: any) {
    console.error('[weekly-tracker] reorder error:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to reorder rows' },
    });
  }
});

// ── WT-6: DELETE /api/v1/weekly-tracker/:id
// Soft delete record to recycle bin (or remove from top_companies if requested via ?section=top_companies)
app.delete('/api/v1/weekly-tracker/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { section } = req.query;
    const row = await WeeklyTracker.findById(id);

    if (!row || row.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Weekly tracker record not found' },
      });
    }

    // If deletion is specifically from top_companies section, unpin from top companies
    // and ensure it stays safely intact in the pipeline section.
    if (section === 'top_companies') {
      row.is_pinned_top = false;
      if (row.pipeline_section === 'top_companies') {
        row.pipeline_section = 'pipeline';
      }
      await row.save();
      return res.status(200).json({
        success: true,
        message: `${row.company_name} removed from Top Companies (retained in Pipeline)`,
        data: { id: row._id, is_pinned_top: false, pipeline_section: row.pipeline_section },
      });
    }

    row.is_deleted = true;
    row.deleted_at = new Date();
    await row.save();

    notifyForeignCollegeOwners((req as any).user?.userId, row.college_id, row.company_name, 'deleted');

    // ── Cascade soft-delete matching DailyLead and DailyTracker ──
    (async () => {
      try {
        const escapedName = escapeRegex(row.company_name.trim());
        await DailyLead.updateMany(
          {
            $or: [
              ...(row.daily_tracker_id ? [{ daily_tracker_id: row.daily_tracker_id }] : []),
              {
                college_id: row.college_id,
                company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
              },
            ],
            is_deleted: false,
          },
          {
            $set: { is_deleted: true, deleted_at: new Date() },
          }
        );

        if (row.daily_tracker_id) {
          await DailyTracker.updateOne(
            { _id: row.daily_tracker_id, is_deleted: false },
            { $set: { is_deleted: true, deleted_at: new Date() } }
          );
        }
      } catch (cascadeErr) {
        console.error('Cascade WT delete error:', cascadeErr);
      }
    })();

    return res.status(200).json({
      success: true,
      message: `${row.company_name} moved to Recycle Bin`,
      data: { id: row._id, is_deleted: true },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete record' },
    });
  }
});

// ── WT-6B: POST /api/v1/weekly-tracker/batch-delete
app.post('/api/v1/weekly-tracker/batch-delete', async (req: Request, res: Response) => {
  try {
    const { ids, section } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'ids array is required' },
      });
    }

    const objectIds = ids
      .filter((id: string) => Types.ObjectId.isValid(id))
      .map((id: string) => new Types.ObjectId(id));

    if (section === 'top_companies') {
      await WeeklyTracker.updateMany(
        { _id: { $in: objectIds } },
        {
          $set: {
            is_pinned_top: false,
          },
        }
      );
      await WeeklyTracker.updateMany(
        { _id: { $in: objectIds }, pipeline_section: 'top_companies' },
        {
          $set: {
            pipeline_section: 'pipeline',
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: `${objectIds.length} record(s) removed from Top Companies (retained in Pipeline)`,
      });
    }

    const rowsToDelete = await WeeklyTracker.find({ _id: { $in: objectIds } });

    await WeeklyTracker.updateMany(
      { _id: { $in: objectIds } },
      { $set: { is_deleted: true, deleted_at: new Date() } }
    );

    // ── Cascade soft-delete matching DailyLead and DailyTracker records ──
    (async () => {
      try {
        for (const r of rowsToDelete) {
          const escapedName = escapeRegex(r.company_name.trim());
          await DailyLead.updateMany(
            {
              $or: [
                ...(r.daily_tracker_id ? [{ daily_tracker_id: r.daily_tracker_id }] : []),
                {
                  college_id: r.college_id,
                  company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                },
              ],
              is_deleted: false,
            },
            {
              $set: { is_deleted: true, deleted_at: new Date() },
            }
          );

          if (r.daily_tracker_id) {
            await DailyTracker.updateOne(
              { _id: r.daily_tracker_id, is_deleted: false },
              { $set: { is_deleted: true, deleted_at: new Date() } }
            );
          }
        }
      } catch (cascadeErr) {
        console.error('Cascade WT batch-delete error:', cascadeErr);
      }
    })();

    return res.status(200).json({
      success: true,
      message: `${ids.length} records moved to Recycle Bin`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to batch delete records' },
    });
  }
});

// ── WT-6C: POST /api/v1/weekly-tracker/:id/restore
// Un-delete / Restore a soft-deleted record
app.post('/api/v1/weekly-tracker/:id/restore', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await WeeklyTracker.findById(id);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Weekly tracker record not found' },
      });
    }

    row.is_deleted = false;
    row.deleted_at = undefined;
    await row.save();

    return res.status(200).json({
      success: true,
      message: `${row.company_name} restored successfully`,
      data: row,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to restore record' },
    });
  }
});

// ── WT-6D: POST /api/v1/weekly-tracker/batch-restore
// Batch restore multiple soft-deleted records
app.post('/api/v1/weekly-tracker/batch-restore', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'ids array is required' },
      });
    }

    const objectIds = ids.map((id: string) => new Types.ObjectId(id));
    await WeeklyTracker.updateMany(
      { _id: { $in: objectIds } },
      { $set: { is_deleted: false }, $unset: { deleted_at: 1 } }
    );

    return res.status(200).json({
      success: true,
      message: `${ids.length} records restored from Recycle Bin`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to batch restore records' },
    });
  }
});

// ── WT-7: GET /api/v1/weekly-tracker/kpi
// Live KPI counts across sections
app.get('/api/v1/weekly-tracker/kpi', async (req: Request, res: Response) => {
  try {
    const { college_id, academic_year } = req.query;

    if (!college_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'college_id is required' },
      });
    }

    const queryCollegeIds: any[] = [];
    if (college_id === 'all') {
      const allCols = await College.find({ is_active: { $ne: false } });
      allCols.forEach((ac) => queryCollegeIds.push(ac._id));
    } else if (Types.ObjectId.isValid(String(college_id))) {
      queryCollegeIds.push(new Types.ObjectId(String(college_id)));
      const targetCol = await College.findById(college_id);
      if (targetCol) {
        const sameCodeCols = await College.find({
          $or: [
            { college_code: targetCol.college_code },
            { college_name: targetCol.college_name },
          ],
        });
        sameCodeCols.forEach((sc) => {
          if (!queryCollegeIds.some((id) => String(id) === String(sc._id))) {
            queryCollegeIds.push(sc._id);
          }
        });
      }
    } else {
      const foundCols = await College.find({
        $or: [
          { college_code: String(college_id).toUpperCase() },
          { college_name: new RegExp(String(college_id), 'i') },
        ],
      });
      foundCols.forEach((fc) => queryCollegeIds.push(fc._id));
    }

    const baseFilter: any = {
      college_id: { $in: queryCollegeIds },
      is_deleted: false,
    };
    if (academic_year && academic_year !== 'all') {
      baseFilter.academic_year = Number(academic_year) || (await getCurrentAcademicYear());
    }

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      completedRows,
      driveInProgressCount,
      upcomingDrivesCount,
      inProgressCount,
      pipelineCount,
      topCount,
      rejectedCount,
      followUpsDueCount,
    ] = await Promise.all([
      WeeklyTracker.find({ ...baseFilter, pipeline_section: 'completed' }).select('selected_count'),
      WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'drive_in_progress' }),
      WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: { $in: ['in_drive', 'companies_in_drive', 'upcoming_drives'] } }),
      WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'in_progress' }),
      WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: { $in: ['pipeline', 'companies_in_pipeline', 'top_companies'] } }),
      WeeklyTracker.countDocuments({ ...baseFilter, $or: [{ pipeline_section: 'top_companies' }, { is_pinned_top: true }] }),
      WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: { $in: ['rejected_companies', 'rejected_by_hr', 'rejected_by_college', 'on_hold_by_college', 'on_hold_by_hr'] } }),
      WeeklyTracker.countDocuments({
        ...baseFilter,
        follow_up_date: { $ne: null, $lte: todayEnd },
        pipeline_section: { $nin: ['completed', 'rejected_companies', 'rejected_by_hr', 'rejected_by_college', 'on_hold_by_college', 'on_hold_by_hr'] },
      }),
    ]);

    const totalOffers = completedRows.reduce((sum, r) => sum + (r.selected_count || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        kpi: {
          completed: completedRows.length,
          drive_in_progress: driveInProgressCount,
          upcoming_drives: upcomingDrivesCount,
          in_drive: upcomingDrivesCount,
          in_progress: inProgressCount,
          pipeline: pipelineCount,
          top_companies: topCount,
          rejected: rejectedCount,
          total_offers: totalOffers,
          follow_ups_due_today: followUpsDueCount,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch weekly KPI' },
    });
  }
});

// ── WT-8: POST /api/v1/weekly-tracker/sync-daily-positives
// ── WT-8: POST /api/v1/weekly-tracker/sync-daily-positives
// Ingest positive leads from Daily Leads (Positives section) into Weekly Tracker Pipeline (Companies in Pipeline)
app.post('/api/v1/weekly-tracker/sync-daily-positives', async (req: Request, res: Response) => {
  try {
    const { college_id, coordinator_id, academic_year } = req.body;
    const targetYear = Number(academic_year) || (await getCurrentAcademicYear());
    const { startFriday, endThursday, weekNumber } = getFridayWeekBounds();

    // Resolve active college IDs (aliases/codes) for requested college_id
    const queryCollegeIds: any[] = [];
    if (!college_id || college_id === 'all') {
      const allCols = await College.find({ is_active: { $ne: false } });
      allCols.forEach((ac) => queryCollegeIds.push(ac._id));
    } else if (Types.ObjectId.isValid(String(college_id))) {
      queryCollegeIds.push(new Types.ObjectId(String(college_id)));
      const targetCol = await College.findById(college_id);
      if (targetCol) {
        const sameCodeCols = await College.find({
          $or: [
            { college_code: targetCol.college_code },
            { college_name: targetCol.college_name },
          ],
        });
        sameCodeCols.forEach((sc) => {
          if (!queryCollegeIds.some((id) => String(id) === String(sc._id))) {
            queryCollegeIds.push(sc._id);
          }
        });
      }
    } else {
      const foundCols = await College.find({
        $or: [
          { college_code: String(college_id).toUpperCase() },
          { college_name: new RegExp(String(college_id), 'i') },
        ],
      });
      foundCols.forEach((fc) => queryCollegeIds.push(fc._id));
    }

    // Expand query scope to include all colleges assigned to the coordinator (behind the scenes)
    const allSyncCollegeIds: any[] = [...queryCollegeIds];
    if (coordinator_id && Types.ObjectId.isValid(String(coordinator_id))) {
      const coordUser = await User.findById(coordinator_id).select('assigned_college_ids').lean();
      if (coordUser && Array.isArray(coordUser.assigned_college_ids)) {
        for (const cid of coordUser.assigned_college_ids) {
          if (cid && !allSyncCollegeIds.some((id) => String(id) === String(cid))) {
            allSyncCollegeIds.push(new Types.ObjectId(String(cid)));
          }
        }
      }
    }

    // Clean up any existing duplicate records in weekly_tracker per college/year
    const existingAll = await WeeklyTracker.find({
      college_id: { $in: allSyncCollegeIds },
      academic_year: targetYear,
      is_deleted: false,
    }).sort({ created_at: 1 });

    const seenCollegeCompanyKeys = new Set<string>();
    const dupIdsToDelete: Types.ObjectId[] = [];
    for (const row of existingAll) {
      const colIdStr = String(row.college_id);
      const nameKey = row.company_name ? row.company_name.trim().toLowerCase() : '';
      if (nameKey) {
        const compositeKey = `${colIdStr}::${nameKey}`;
        if (seenCollegeCompanyKeys.has(compositeKey)) {
          dupIdsToDelete.push(row._id);
        } else {
          seenCollegeCompanyKeys.add(compositeKey);
        }
      }
    }
    if (dupIdsToDelete.length > 0) {
      await WeeklyTracker.deleteMany({ _id: { $in: dupIdsToDelete } });
    }

    // Daily Leads filter: Include positive & jd_received leads for current active day only (today)
    const todayStart = getTodayDate();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const dailyLeadFilter: any = {
      college_id: { $in: allSyncCollegeIds },
      lead_type: { $in: ['positive', 'jd_received'] },
      lead_date: { $gte: todayStart, $lt: todayEnd },
      is_deleted: false,
    };

    if (coordinator_id && Types.ObjectId.isValid(String(coordinator_id))) {
      dailyLeadFilter.coordinator_id = new Types.ObjectId(String(coordinator_id));
    }

    const positiveDailyLeads = await DailyLead.find(dailyLeadFilter).sort({ lead_date: 1, created_at: 1 });
    const batchYear = await getCurrentGraduatingBatchYear();

    let syncedCount = 0;
    const inBatchSyncedKeys = new Set<string>(seenCollegeCompanyKeys);

    for (const lead of positiveDailyLeads) {
      if (!lead.company_name || !lead.company_name.trim() || !lead.college_id) continue;
      const trimmedName = lead.company_name.trim();
      const normalizedName = trimmedName.toLowerCase();
      const leadCollegeIdStr = String(lead.college_id);
      const compositeKey = `${leadCollegeIdStr}::${normalizedName}`;

      // Already present in Weekly Tracker for this specific college or already processed in this batch
      if (inBatchSyncedKeys.has(compositeKey)) {
        // If existing record for THIS college has empty role or CTC, but DailyLead now has them, backfill them
        if (lead.job_role || lead.ctc) {
          const safeRegex = new RegExp(`^${escapeRegex(trimmedName)}$`, 'i');
          const existingRow = await WeeklyTracker.findOne({
            college_id: lead.college_id,
            academic_year: targetYear,
            company_name: { $regex: safeRegex },
            is_deleted: false,
          });
          if (existingRow) {
            let updated = false;
            if (!existingRow.job_role && lead.job_role) {
              existingRow.job_role = lead.job_role.trim();
              updated = true;
            }
            if (!existingRow.ctc_lpa && lead.ctc) {
              existingRow.ctc_lpa = lead.ctc.trim();
              updated = true;
            }
            if (updated) {
              existingRow.updated_at = new Date();
              await existingRow.save();
            }
          }
        }
        continue;
      }

      // Check if already present in weekly_tracker for THIS specific college and academic year
      const safeRegex = new RegExp(`^${escapeRegex(trimmedName)}$`, 'i');
      const existing = await WeeklyTracker.findOne({
        college_id: lead.college_id,
        academic_year: targetYear,
        company_name: { $regex: safeRegex },
        is_deleted: false,
      });

      if (!existing) {
        const isJdLead = lead.lead_type === 'jd_received';
        const targetSection = isJdLead ? 'in_progress' : 'pipeline';
        const statusText = isJdLead ? 'JD Received' : 'Invite sent, Awaiting JD';

        // Find next order_index for this specific college's pipeline section
        const maxPipelineRow = await WeeklyTracker.findOne({
          college_id: lead.college_id,
          academic_year: targetYear,
          pipeline_section: targetSection,
          is_deleted: false,
        }).sort({ order_index: -1 });

        const nextOrderIndex = maxPipelineRow && typeof maxPipelineRow.order_index === 'number'
          ? maxPipelineRow.order_index + 1
          : (await WeeklyTracker.countDocuments({
              college_id: lead.college_id,
              academic_year: targetYear,
              pipeline_section: targetSection,
              is_deleted: false,
            }));

        // Retrieve full metadata / daily tracker contacts if available
        let metaContacts: { mobile_numbers?: string[]; email_ids?: string[]; company_type?: string } = {};
        if (lead.company_id && Types.ObjectId.isValid(String(lead.company_id))) {
          const meta = await CompanyMetadata.findById(lead.company_id).lean();
          if (meta) {
            metaContacts = {
              mobile_numbers: meta.mobile_numbers,
              email_ids: meta.email_ids,
              company_type: meta.company_type || meta.industry_sector,
            };
          }
        }

        let dtContact: any = null;
        if (lead.daily_tracker_id && Types.ObjectId.isValid(String(lead.daily_tracker_id))) {
          dtContact = await DailyTracker.findById(lead.daily_tracker_id).lean();
        }

        const primaryMobile = dtContact?.mobile_number || (metaContacts.mobile_numbers && metaContacts.mobile_numbers[0]) || '';
        const allMobiles = Array.from(new Set([
          ...(dtContact?.mobile_number ? [dtContact.mobile_number] : []),
          ...(metaContacts.mobile_numbers || []),
        ].filter(Boolean)));

        const primaryEmail = dtContact?.email_id || (metaContacts.email_ids && metaContacts.email_ids[0]) || '';
        const allEmails = Array.from(new Set([
          ...(dtContact?.email_id ? [dtContact.email_id] : []),
          ...(metaContacts.email_ids || []),
        ].filter(Boolean)));

        await WeeklyTracker.create({
          academic_year: targetYear,
          college_id: lead.college_id,
          coordinator_id: lead.coordinator_id || (coordinator_id ? new Types.ObjectId(String(coordinator_id)) : new Types.ObjectId('6a847199fa3bf51271bc14eb')),
          company_id: lead.company_id || new Types.ObjectId(),
          daily_tracker_id: lead.daily_tracker_id || null,
          company_name: trimmedName,
          job_role: lead.job_role?.trim() || '',
          contact_number: primaryMobile,
          mobile_numbers: allMobiles,
          email_id: primaryEmail,
          email_ids: allEmails,
          cdc_reference: dtContact?.hr_name ? `${dtContact.hr_name}${dtContact.mobile_number ? ` (${dtContact.mobile_number})` : ''}` : '',
          company_type: metaContacts.company_type || '',
          ctc_lpa: lead.ctc?.trim() || '',
          eligible_batch: lead.eligible_batch?.trim() || `${batchYear} Batch`,
          pipeline_section: targetSection,
          current_status_text: statusText,
          follow_up_date: null,
          order_index: nextOrderIndex,
          week_number: weekNumber,
          week_start_date: startFriday,
          week_end_date: endThursday,
          created_at: new Date(),
          updated_at: new Date(),
          last_status_updated_at: new Date(),
        });
        syncedCount++;
        inBatchSyncedKeys.add(compositeKey);
      }
    }

    // Modernize any existing records with legacy status text
    await WeeklyTracker.updateMany(
      {
        college_id: { $in: allSyncCollegeIds },
        academic_year: targetYear,
        current_status_text: 'Invite mail shared awaiting JD',
        is_deleted: false,
      },
      {
        $set: {
          current_status_text: 'Invite sent, Awaiting JD',
          updated_at: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: syncedCount > 0
        ? `${syncedCount} lead(s) / JD(s) from Daily Leads synced into Weekly Tracker.`
        : 'All positive leads & JD Received records are already synchronized into Weekly Tracker.',
      data: { synced: syncedCount },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to sync daily positives' },
    });
  }
});

// ── DL-0: GET /api/v1/daily-leads/diagnostics
// Verification endpoint to confirm zero pre-August data and accurate August breakdown
app.get('/api/v1/daily-leads/diagnostics', async (req: Request, res: Response) => {
  try {
    const augStart = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
    const preAugustCount = await DailyLead.countDocuments({ lead_date: { $lt: augStart } });
    const augustPositivesCount = await DailyLead.countDocuments({ lead_type: 'positive', lead_date: { $gte: augStart } });
    const augustJdCount = await DailyLead.countDocuments({ lead_type: 'jd_received', lead_date: { $gte: augStart } });

    const positives = await DailyLead.find({ lead_type: 'positive', lead_date: { $gte: augStart } })
      .populate('college_id', 'college_name college_code');

    const collegeBreakdown: Record<string, number> = {};
    const dateBreakdown: Record<string, number> = {};

    positives.forEach((p: any) => {
      const cCode = p.college_id?.college_code || 'UNKNOWN';
      collegeBreakdown[cCode] = (collegeBreakdown[cCode] || 0) + 1;
      const dStr = p.lead_date.toISOString().split('T')[0];
      dateBreakdown[dStr] = (dateBreakdown[dStr] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        pre_august_records_count: preAugustCount,
        august_positives_total: augustPositivesCount,
        august_jd_received_total: augustJdCount,
        by_college: collegeBreakdown,
        by_date: dateBreakdown,
        status: preAugustCount === 0 ? 'CLEAN_AUGUST_ONLY' : 'DIRTY_PRE_AUGUST_EXISTS',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── DL-1: GET /api/v1/daily-leads
// Fetch leads by date, optional college_id, and lead_type with search
app.get('/api/v1/daily-leads', async (req: Request, res: Response) => {
  try {
    const { date, college_id, lead_type, search } = req.query;
    // Only scope coordinator_id if explicitly requested; if omitted, return all leads across the team
    const requestedCoordId = req.query.coordinator_id as string | undefined;
    const coordinator_id =
      requestedCoordId && requestedCoordId !== 'all' ? scopeToSelf(req, requestedCoordId) : undefined;

    const filter: any = {
      is_deleted: false,
    };

    if (date && date !== 'all') {
      const targetDate = parseDateParam(String(date));
      const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
      filter.lead_date = { $gte: targetDate, $lt: nextDate };
    }

    if (college_id && college_id !== 'all') {
      filter.college_id = new Types.ObjectId(String(college_id));
    }

    if (coordinator_id && coordinator_id !== 'all') {
      filter.coordinator_id = new Types.ObjectId(String(coordinator_id));
    }

    if (lead_type && LEAD_TYPES.includes(lead_type as LeadType)) {
      filter.lead_type = lead_type;
    }

    if (search) {
      // Same unescaped-regex bug as Weekly Tracker — a bare "(" in a
      // company name threw an uncaught 500 here too.
      const q = escapeRegex(String(search).trim());
      filter.$or = [
        { company_name: { $regex: q, $options: 'i' } },
        { job_role: { $regex: q, $options: 'i' } },
        { remarks: { $regex: q, $options: 'i' } },
        { ctc: { $regex: q, $options: 'i' } },
      ];
    }

    // A one-off NGCE college-repair used to run here, unconditionally, on
    // every call to this endpoint — the app's busiest read. Removed 29 Aug
    // 2026: it silently reverted any manual correction a coordinator made to
    // those 6 companies' college assignment, since it reran the same
    // reassignment on every page load regardless of current state. The same
    // repair is still available, opt-in, via
    // GET /health/daily-leads-diagnostics?resync=true (administrator only).

    const leadsRaw = await DailyLead.find(filter)
      .sort({ lead_date: -1, created_at: -1 })
      .populate('college_id', 'college_name college_code')
      .populate('coordinator_id', 'full_name official_email username');

    // Pre-fetch active users and colleges to assign fallback coordinator names for colleges if missing
    const usersList = await User.find({ account_status: { $nin: ['inactive', 'deactivated', 'blocked'] } }).lean();
    const collegesList = await College.find({}).lean();
    const collegeCodeMap = new Map<string, string>();
    collegesList.forEach((c) => collegeCodeMap.set(String(c._id), (c.college_code || '').toUpperCase()));

    const OFFICIAL_COORDINATOR_COLLEGE_MAP: Record<string, string[]> = {
      'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
      'sujitha_s@infoziant.com': ['NEHRU', 'SONA', 'MAREPHRAM', 'KPR', 'MKCE', 'KARUNYA', 'AVS', 'AAA', 'KGISL', 'SSEI', 'HITS', 'EGS'],
      'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
      'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
      'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
      'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ'],
      'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
    };

    const userByEmail = new Map<string, any>();
    usersList.forEach((u) => userByEmail.set((u.official_email || '').toLowerCase(), u));

    const collegeCoordinatorMap = new Map<string, string>();

    // Primary: Official mapping
    for (const [email, codes] of Object.entries(OFFICIAL_COORDINATOR_COLLEGE_MAP)) {
      const u = userByEmail.get(email.toLowerCase());
      if (u) {
        for (const col of collegesList) {
          if (codes.includes((col.college_code || '').toUpperCase())) {
            if (!collegeCoordinatorMap.has(String(col._id))) {
              collegeCoordinatorMap.set(String(col._id), u.full_name || u.username);
            }
          }
        }
      }
    }

    // Secondary: assigned_college_ids
    for (const u of usersList) {
      if (Array.isArray(u.assigned_college_ids)) {
        for (const cid of u.assigned_college_ids) {
          if (!collegeCoordinatorMap.has(String(cid))) {
            collegeCoordinatorMap.set(String(cid), u.full_name || u.username || 'Coordinator');
          }
        }
      }
    }

    const leads = leadsRaw.map((l: any) => {
      const obj = l.toObject ? l.toObject() : l;
      if (!obj.coordinator_id || typeof obj.coordinator_id !== 'object' || !obj.coordinator_id.full_name) {
        const cIdStr = typeof obj.college_id === 'object' && obj.college_id?._id ? String(obj.college_id._id) : String(obj.college_id || '');
        const fallbackName = collegeCoordinatorMap.get(cIdStr) || 'Placement Team';
        obj.coordinator_id = {
          _id: (obj.coordinator_id && (obj.coordinator_id._id || String(obj.coordinator_id))) || '',
          full_name: fallbackName,
          official_email: '',
        };
      }
      return obj;
    });

    return res.status(200).json({
      success: true,
      data: {
        date: date || 'all',
        lead_type: lead_type || 'all',
        total: leads.length,
        leads,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch daily leads' },
    });
  }
});

// ── DL-2: POST /api/v1/daily-leads
// Create a new lead entry (manual or with daily_tracker copy link)
app.post('/api/v1/daily-leads', async (req: Request, res: Response) => {
  try {
    const {
      lead_type,
      college_id,
      coordinator_id,
      company_id,
      daily_tracker_id,
      company_name,
      job_role,
      ctc,
      eligible_batch,
      event_time,
      lead_date,
      remarks,
    } = req.body;

    if (!college_id || college_id === 'all' || !Types.ObjectId.isValid(String(college_id))) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'A valid college selection is required' },
      });
    }

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Company name is required' },
      });
    }

    let resolvedCoordinatorId: string | undefined =
      (req.body.coordinator_id && Types.ObjectId.isValid(String(req.body.coordinator_id)) ? String(req.body.coordinator_id) : undefined) ||
      (req as any).user?.userId;
    if (!resolvedCoordinatorId || !Types.ObjectId.isValid(String(resolvedCoordinatorId))) {
      const fallbackUser = await User.findOne({ is_active: { $ne: false } });
      resolvedCoordinatorId = fallbackUser?._id ? String(fallbackUser._id) : undefined;
    }

    if (!resolvedCoordinatorId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Coordinator ID is required to attribute lead ownership' },
      });
    }

    const targetDate = lead_date ? parseDateParam(String(lead_date)) : getTodayDate();
    const timeStr = formatLeadUpperTime(event_time);

    let resolvedCompanyId = company_id;
    if (!resolvedCompanyId || !Types.ObjectId.isValid(String(resolvedCompanyId))) {
      const existingMeta = await CompanyMetadata.findOne({
        company_name: { $regex: `^${company_name.trim()}$`, $options: 'i' },
      });
      resolvedCompanyId = existingMeta?._id || new Types.ObjectId();
    }

    const newLead = await DailyLead.create({
      lead_type: lead_type || 'positive',
      college_id: new Types.ObjectId(String(college_id)),
      coordinator_id: new Types.ObjectId(String(resolvedCoordinatorId)),
      company_id: new Types.ObjectId(String(resolvedCompanyId)),
      daily_tracker_id: daily_tracker_id && Types.ObjectId.isValid(String(daily_tracker_id)) ? new Types.ObjectId(String(daily_tracker_id)) : null,
      company_name: company_name.trim(),
      job_role: job_role?.trim() || '',
      ctc: ctc?.trim() || '',
      eligible_batch: eligible_batch?.trim() || '2026 Batch',
      event_time: timeStr,
      lead_date: targetDate,
      remarks: remarks?.trim() || '',
    });

    const populated = await DailyLead.findById(newLead._id)
      .populate('college_id', 'college_name college_code')
      .populate('coordinator_id', 'full_name official_email');

    return res.status(201).json({
      success: true,
      message: `${lead_type === 'jd_received' ? 'JD Received' : 'Positive Lead'} recorded successfully`,
      data: populated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create daily lead' },
    });
  }
});

// ── Helper: Format Time with Strict Uppercase AM/PM & Exact IST Conversion ──
function formatLeadUpperTime(timeInput?: string | Date | null): string {
  if (!timeInput) return '';
  if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();
    if (!trimmed || trimmed === '—' || trimmed === '-') return '';
    if (/(am|pm)/i.test(trimmed)) {
      return trimmed.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase()).trim();
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
      const istDate = new Date(d.getTime() + istOffsetMs);
      let hours = istDate.getUTCHours();
      const minutes = istDate.getUTCMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
    }
    return trimmed;
  }
  const d = timeInput;
  if (isNaN(d.getTime())) return '';
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffsetMs);
  let hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

// ── DL-3: PATCH /api/v1/daily-leads/:id
// Inline update of lead fields
app.patch('/api/v1/daily-leads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const patchData = req.body;

    const lead = await DailyLead.findById(id);
    if (!lead || lead.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Daily lead not found' },
      });
    }

    if (refuseForeignOwner(req, res, String(lead.coordinator_id), 'You can only edit your own leads.')) return;

    const allowedFields = [
      'company_name',
      'job_role',
      'ctc',
      'eligible_batch',
      'event_time',
      'remarks',
      'lead_type',
    ];

    allowedFields.forEach((f) => {
      if (patchData[f] !== undefined) {
        if (f === 'event_time' && patchData[f]) {
          lead.event_time = formatLeadUpperTime(patchData[f]);
        } else {
          (lead as any)[f] = patchData[f];
        }
      }
    });

    if (patchData.lead_date) {
      lead.lead_date = parseDateParam(String(patchData.lead_date));
    }

    if (patchData.college_id && Types.ObjectId.isValid(String(patchData.college_id))) {
      lead.college_id = new Types.ObjectId(String(patchData.college_id));
    }

    await lead.save();

    // ── Cascade Edits to already connected WeeklyTracker and DailyTracker ──
    (async () => {
      try {
        const escapedName = escapeRegex(lead.company_name.trim());
        const wtUpdate: any = {};
        if (patchData.company_name !== undefined) wtUpdate.company_name = lead.company_name.trim();
        if (patchData.job_role !== undefined) wtUpdate.job_role = lead.job_role?.trim() || '';
        if (patchData.ctc !== undefined) wtUpdate.ctc_lpa = lead.ctc?.trim() || '';
        if (patchData.eligible_batch !== undefined) wtUpdate.eligible_batch = lead.eligible_batch?.trim() || '';
        if (patchData.remarks !== undefined) wtUpdate.current_status_text = lead.remarks?.trim() || '';

        if (Object.keys(wtUpdate).length > 0) {
          wtUpdate.last_status_updated_at = new Date();
          wtUpdate.updated_at = new Date();
          await WeeklyTracker.updateMany(
            {
              $or: [
                ...(lead.daily_tracker_id ? [{ daily_tracker_id: lead.daily_tracker_id }] : []),
                {
                  college_id: lead.college_id,
                  company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                },
              ],
              is_deleted: false,
            },
            { $set: wtUpdate }
          );
        }

        // Also update linked DailyTracker if exists
        if (lead.daily_tracker_id && (patchData.company_name !== undefined || patchData.remarks !== undefined)) {
          await DailyTracker.updateOne(
            { _id: lead.daily_tracker_id, is_deleted: false },
            {
              $set: {
                ...(patchData.company_name !== undefined ? { company_name: lead.company_name.trim() } : {}),
                ...(patchData.remarks !== undefined ? { comments: lead.remarks.trim() } : {}),
              },
            }
          );
        }
      } catch (cascadeErr) {
        console.error('Cascade DL update error:', cascadeErr);
      }
    })();

    const updated = await DailyLead.findById(lead._id)
      .populate('college_id', 'college_name college_code')
      .populate('coordinator_id', 'full_name official_email');

    return res.status(200).json({
      success: true,
      message: 'Daily lead updated successfully',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update daily lead' },
    });
  }
});

// ── DL-4: POST /api/v1/daily-leads/:id/move-to-jd
// Move from Positives tab to JD Received tab
app.post('/api/v1/daily-leads/:id/move-to-jd', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { target_date } = req.body || {};
    const lead = await DailyLead.findById(id);

    if (!lead || lead.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Daily lead not found' },
      });
    }

    if (refuseForeignOwner(req, res, String(lead.coordinator_id), 'You can only move your own leads to JD Received.')) return;

    const leadDate = lead.lead_date ? new Date(lead.lead_date) : getTodayDate();
    const leadDateStr = leadDate.toISOString().split('T')[0];
    const effectiveTargetDate = target_date ? parseDateParam(String(target_date)) : getTodayDate();
    const targetDateStr = effectiveTargetDate.toISOString().split('T')[0];

    if (leadDateStr === targetDateStr) {
      // ── SAME DAY MOVE ──
      // Received JD on the same day: Move to JD Received and remove from Positives on this date.
      // Initial time is left empty as coordinator manually inputs the new time.
      lead.lead_type = 'jd_received';
      lead.is_moved_to_jd = true;
      lead.is_jd_received = true;
      lead.event_time = ''; // Initially empty as requested
      lead.lead_date = effectiveTargetDate;
      await lead.save();

      const updated = await DailyLead.findById(lead._id)
        .populate('college_id', 'college_name college_code')
        .populate('coordinator_id', 'full_name official_email');

      return res.status(200).json({
        success: true,
        message: `${lead.company_name} successfully moved to JD Received tab (removed from Positives)`,
        data: updated,
      });
    } else {
      // ── DIFFERENT DAY / FUTURE DATE ──
      // Positive gained earlier (e.g. today), but JD received after 2 days (future date):
      // Retain company details in BOTH Positives (original date) and JD Received (target date).
      lead.is_moved_to_jd = true;
      await lead.save();

      const existingJd = await DailyLead.findOne({
        lead_type: 'jd_received',
        college_id: lead.college_id,
        company_name: { $regex: `^${escapeRegex(lead.company_name.trim())}$`, $options: 'i' },
        lead_date: { $gte: effectiveTargetDate, $lt: new Date(effectiveTargetDate.getTime() + 24 * 60 * 60 * 1000) },
        is_deleted: false,
      });

      let jdLead = existingJd;
      if (!jdLead) {
        jdLead = await DailyLead.create({
          lead_type: 'jd_received',
          college_id: lead.college_id,
          coordinator_id: lead.coordinator_id,
          company_id: lead.company_id || null,
          daily_tracker_id: lead.daily_tracker_id || null,
          company_name: lead.company_name.trim(),
          job_role: lead.job_role || '',
          ctc: lead.ctc || '',
          eligible_batch: lead.eligible_batch || '2027',
          event_time: '', // Initially empty as requested
          lead_date: effectiveTargetDate,
          remarks: lead.remarks || 'JD Received from earlier Positive',
          is_jd_received: true,
          is_deleted: false,
        });
      }

      const populated = await DailyLead.findById(jdLead._id)
        .populate('college_id', 'college_name college_code')
        .populate('coordinator_id', 'full_name official_email');

      return res.status(200).json({
        success: true,
        message: `${lead.company_name} recorded in JD Received for ${targetDateStr} (retained in historical Positives)`,
        data: populated,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to move to JD' },
    });
  }
});

// ── DL-5: DELETE /api/v1/daily-leads/:id
// Soft delete lead record
app.delete('/api/v1/daily-leads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await DailyLead.findById(id);

    if (!lead || lead.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Daily lead not found' },
      });
    }

    if (refuseForeignOwner(req, res, String(lead.coordinator_id), 'You can only delete your own leads.')) return;

    lead.is_deleted = true;
    lead.deleted_at = new Date();
    await lead.save();

    // ── Cascade soft-delete matching WeeklyTracker and DailyTracker ──
    (async () => {
      try {
        const escapedName = escapeRegex(lead.company_name.trim());
        await WeeklyTracker.updateMany(
          {
            $or: [
              ...(lead.daily_tracker_id ? [{ daily_tracker_id: lead.daily_tracker_id }] : []),
              {
                college_id: lead.college_id,
                company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
              },
            ],
            is_deleted: false,
          },
          { $set: { is_deleted: true, deleted_at: new Date() } }
        );

        if (lead.daily_tracker_id) {
          await DailyTracker.updateOne(
            { _id: lead.daily_tracker_id, is_deleted: false },
            { $set: { is_deleted: true, deleted_at: new Date() } }
          );
        }
      } catch (cascadeErr) {
        console.error('Cascade DL delete error:', cascadeErr);
      }
    })();

    return res.status(200).json({
      success: true,
      message: `${lead.company_name} moved to Recycle Bin`,
      data: { id: lead._id, is_deleted: true },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete lead' },
    });
  }
});

// ── DL-5B: POST /api/v1/daily-leads/batch-delete
// Bulk soft-delete lead records with cross-module cascade
app.post('/api/v1/daily-leads/batch-delete', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'ids array is required' },
      });
    }

    const objectIds = ids
      .filter((id: string) => Types.ObjectId.isValid(id))
      .map((id: string) => new Types.ObjectId(id));

    const leadsToDelete = await DailyLead.find({ _id: { $in: objectIds } });

    await DailyLead.updateMany(
      { _id: { $in: objectIds } },
      { $set: { is_deleted: true, deleted_at: new Date() } }
    );

    // ── Cascade soft-delete matching WeeklyTracker and DailyTracker records ──
    (async () => {
      try {
        for (const lead of leadsToDelete) {
          const escapedName = escapeRegex(lead.company_name.trim());
          await WeeklyTracker.updateMany(
            {
              $or: [
                ...(lead.daily_tracker_id ? [{ daily_tracker_id: lead.daily_tracker_id }] : []),
                {
                  college_id: lead.college_id,
                  company_name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
                },
              ],
              is_deleted: false,
            },
            { $set: { is_deleted: true, deleted_at: new Date() } }
          );

          if (lead.daily_tracker_id) {
            await DailyTracker.updateOne(
              { _id: lead.daily_tracker_id, is_deleted: false },
              { $set: { is_deleted: true, deleted_at: new Date() } }
            );
          }
        }
      } catch (cascadeErr) {
        console.error('Cascade DL batch-delete error:', cascadeErr);
      }
    })();

    return res.status(200).json({
      success: true,
      message: `${objectIds.length} records moved to Recycle Bin`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to batch delete leads' },
    });
  }
});

// ── DL-6: GET /api/v1/daily-leads/summary
// Summary Strip counts: Positives count, JDs count, Active colleges count (Spec Section 7.3)
app.get('/api/v1/daily-leads/summary', async (req: Request, res: Response) => {
  try {
    const { date, college_id } = req.query;
    // Only scope coordinator_id if explicitly requested; if omitted, return team-wide counts matching the table
    const requestedCoordId = req.query.coordinator_id as string | undefined;
    const coordinator_id =
      requestedCoordId && requestedCoordId !== 'all' ? scopeToSelf(req, requestedCoordId) : undefined;

    const baseFilter: any = {
      is_deleted: false,
    };

    if (date && date !== 'all') {
      const targetDate = parseDateParam(String(date));
      const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
      baseFilter.lead_date = { $gte: targetDate, $lt: nextDate };
    }

    if (college_id && college_id !== 'all') {
      baseFilter.college_id = new Types.ObjectId(String(college_id));
    }

    if (coordinator_id && coordinator_id !== 'all') {
      baseFilter.coordinator_id = new Types.ObjectId(String(coordinator_id));
    }

    const [positivesCount, jdCount, activeColleges] = await Promise.all([
      DailyLead.countDocuments({ ...baseFilter, lead_type: 'positive' }),
      DailyLead.countDocuments({ ...baseFilter, lead_type: 'jd_received' }),
      DailyLead.distinct('college_id', baseFilter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        date: date || 'all',
        summary: {
          positives_count: positivesCount,
          jd_received_count: jdCount,
          active_colleges_count: activeColleges.length,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch summary' },
    });
  }
});

// ── DL-7: GET /api/v1/daily-leads/daily-tracker-positives
// Fetch positive calls from Daily Tracker for the "Copy from Daily Tracker" shortcut (Spec Section 11)
app.get('/api/v1/daily-leads/daily-tracker-positives', async (req: Request, res: Response) => {
  try {
    const { date, college_id } = req.query;
    const requestedCoordId = req.query.coordinator_id as string | undefined;
    const coordinator_id =
      requestedCoordId && requestedCoordId !== 'all' ? scopeToSelf(req, requestedCoordId) : undefined;

    const targetDate = date ? parseDateParam(String(date)) : getTodayDate();

    const filter: any = {
      session_date: targetDate,
      outcome_status: { $in: POSITIVE_OUTCOMES },
    };

    if (college_id && college_id !== 'all') {
      filter.college_id = new Types.ObjectId(String(college_id));
    }

    if (coordinator_id && coordinator_id !== 'all') {
      filter.coordinator_id = new Types.ObjectId(String(coordinator_id));
    }

    const positives = await DailyTracker.find(filter)
      .sort({ call_end_time: -1 })
      .populate('college_id', 'college_name college_code');

    return res.status(200).json({
      success: true,
      data: {
        total: positives.length,
        positives,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch daily tracker positives' },
    });
  }
});

// ── DL-8: POST /api/v1/daily-leads/sync-positives
// Ingest positive calls (invite_mail and jd_received) from Daily Tracker for the given date into Daily Leads
app.post('/api/v1/daily-leads/sync-positives', async (req: Request, res: Response) => {
  try {
    const { date, college_id, coordinator_id } = req.body;

    const targetDate = date ? parseDateParam(String(date)) : getTodayDate();
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    let syncedCount = 0;

    // Pull from DailyTracker calls for this date — Invite Mail is the sole
    // trigger for the Positives tab; JD Received fills when outcome is jd_received.
    // Daily Leads is a cross-college general overview, so when college_id is 'all' (or omitted),
    // positive calls from all colleges for this date are pulled into Daily Leads.
    const dtFilter: any = {
      $or: [
        { session_date: { $gte: targetDate, $lt: nextDate } },
        { call_start_time: { $gte: targetDate, $lt: nextDate } },
        { created_at: { $gte: targetDate, $lt: nextDate } },
      ],
      outcome_status: { $in: ['jd_received', PIPELINE_SYNC_OUTCOME] },
      is_deleted: { $ne: true },
    };
    if (college_id && college_id !== 'all' && Types.ObjectId.isValid(String(college_id))) {
      dtFilter.college_id = new Types.ObjectId(String(college_id));
    }

    const positiveCalls = await DailyTracker.find(dtFilter);

    for (const call of positiveCalls) {
      if (!call.company_name || !call.company_name.trim()) continue;
      const leadType = call.outcome_status === 'jd_received' ? 'jd_received' : 'positive';
      const escapedCompanyName = escapeRegex(call.company_name.trim());

      // If this positive was already moved to JD Received on this same date, do not resurrect it in Positives
      if (leadType === 'positive') {
        const alreadyMovedToJd = await DailyLead.findOne({
          company_name: { $regex: `^${escapedCompanyName}$`, $options: 'i' },
          college_id: call.college_id,
          lead_date: { $gte: targetDate, $lt: nextDate },
          lead_type: 'jd_received',
          is_deleted: { $ne: true },
        });

        if (alreadyMovedToJd) {
          continue;
        }
      }

      const existing = await DailyLead.findOne({
        $or: [
          { daily_tracker_id: call._id },
          {
            company_name: { $regex: `^${escapedCompanyName}$`, $options: 'i' },
            college_id: call.college_id,
            lead_date: { $gte: targetDate, $lt: nextDate },
            lead_type: leadType,
          },
        ],
        is_deleted: { $ne: true },
      });

      // Extract accurate call start time directly from Daily Tracker without random defaults
      const timeSource = call.call_start_time || call.created_at;
      const callTime = formatLeadUpperTime(timeSource);

      if (!existing) {
        await DailyLead.create({
          lead_type: leadType,
          college_id: call.college_id,
          coordinator_id: call.coordinator_id || (coordinator_id && Types.ObjectId.isValid(String(coordinator_id)) ? new Types.ObjectId(String(coordinator_id)) : new Types.ObjectId('6a847199fa3bf51271bc14eb')),
          company_id: call.company_id || null,
          daily_tracker_id: call._id,
          company_name: call.company_name.trim(),
          job_role: '',
          ctc: '',
          eligible_batch: '2027',
          event_time: callTime,
          lead_date: targetDate,
          remarks: call.comments || `From Daily Tracker: ${(call.outcome_status || '').replace(/_/g, ' ')}`,
          is_deleted: false,
        });
        syncedCount++;
      } else if (callTime && (!existing.event_time || existing.event_time === '10:00 AM')) {
        existing.event_time = callTime;
        await existing.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: syncedCount > 0
        ? `Successfully synced ${syncedCount} positive lead(s) from Daily Tracker for ${date || 'today'}`
        : `All positive leads from Daily Tracker for ${date || 'today'} are already up to date`,
      data: {
        synced_count: syncedCount,
        date: targetDate,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to sync positive leads' },
    });
  }
});

// ── DL-9: POST /api/v1/daily-leads/copy-to-jd
// Move or copy a selected positive company across selected target colleges into JD Received
app.post('/api/v1/daily-leads/copy-to-jd', async (req: Request, res: Response) => {
  try {
    const { date, company_name, college_ids, lead_id, job_role, ctc, eligible_batch } = req.body;
    const targetDate = date ? parseDateParam(String(date)) : getTodayDate();
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // 1. Single Company Multi-College / Focused College Flow
    if (company_name && Array.isArray(college_ids) && college_ids.length > 0) {
      const escapedCompanyName = escapeRegex(company_name.trim());

      // Find source positive lead for metadata reference
      let sourceLead: any = null;
      if (lead_id && Types.ObjectId.isValid(lead_id)) {
        sourceLead = await DailyLead.findById(lead_id);
      }
      if (!sourceLead) {
        sourceLead = await DailyLead.findOne({
          company_name: { $regex: `^${escapedCompanyName}$`, $options: 'i' },
          lead_type: 'positive',
          is_deleted: { $ne: true },
        }).sort({ lead_date: -1 });
      }

      const roleToUse = job_role || sourceLead?.job_role || '';
      const ctcToUse = ctc !== undefined ? ctc : (sourceLead?.ctc || '');
      const batchToUse = eligible_batch || sourceLead?.eligible_batch || '2027';
      // User directive: "when I move from positive to JD received tab the time need to be empty initially because I will manually put the new time"
      const timeToUse = '';

      const validCollegeIds = college_ids
        .filter((id: string) => Types.ObjectId.isValid(id))
        .map((id: string) => new Types.ObjectId(id));

      let copiedCount = 0;
      for (const targetCollegeId of validCollegeIds) {
        // Check if already present in JD Received for this college & target date
        let existing = await DailyLead.findOne({
          lead_type: 'jd_received',
          college_id: targetCollegeId,
          company_name: { $regex: `^${escapedCompanyName}$`, $options: 'i' },
          lead_date: { $gte: targetDate, $lt: nextDate },
          is_deleted: { $ne: true },
        });

        if (!existing) {
          await DailyLead.create({
            lead_type: 'jd_received',
            college_id: targetCollegeId,
            coordinator_id: sourceLead?.coordinator_id || (req as any).user?._id || new Types.ObjectId('6a847199fa3bf51271bc14eb'),
            company_id: sourceLead?.company_id || null,
            daily_tracker_id: sourceLead?.daily_tracker_id || null,
            company_name: company_name.trim(),
            job_role: roleToUse,
            ctc: ctcToUse,
            eligible_batch: batchToUse,
            event_time: timeToUse,
            lead_date: targetDate,
            remarks: 'JD Received from Positives',
            is_jd_received: true,
            is_deleted: false,
          });
          copiedCount++;
        }
      }

      // ── Check Same-Day vs Different-Day for Source Positive Lead ──
      if (sourceLead && !sourceLead.is_deleted) {
        const sourceLeadDate = sourceLead.lead_date ? new Date(sourceLead.lead_date) : getTodayDate();
        const sourceLeadDateStr = sourceLeadDate.toISOString().split('T')[0];
        const sourceCollegeIdStr = String(sourceLead.college_id?._id || sourceLead.college_id);

        const includesSourceCollege = validCollegeIds.some((cid) => String(cid) === sourceCollegeIdStr);

        if (sourceLeadDateStr === targetDateStr && includesSourceCollege) {
          // SAME DAY MOVE for this college:
          // Remove from Positives on this date because it is now in JD Received
          sourceLead.is_deleted = true;
          sourceLead.deleted_at = new Date();
          sourceLead.is_moved_to_jd = true;
          await sourceLead.save();
        } else {
          // DIFFERENT DAY / FUTURE DATE:
          // Keep historical positive intact on its original date
          sourceLead.is_moved_to_jd = true;
          await sourceLead.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: copiedCount > 0
          ? `Successfully transferred "${company_name}" to JD Received`
          : `"${company_name}" is already present in JD Received for selected college(s)`,
        data: {
          copied_count: copiedCount,
          total_colleges_selected: validCollegeIds.length,
          company_name,
        },
      });
    }

    // 2. Fallback: Bulk copy all positive leads matching college_ids
    const filter: any = {
      lead_type: 'positive',
      lead_date: { $gte: targetDate, $lt: nextDate },
      is_deleted: { $ne: true },
    };
    if (Array.isArray(college_ids) && college_ids.length > 0 && !college_ids.includes('all')) {
      const validCollegeIds = college_ids
        .filter((id: string) => Types.ObjectId.isValid(id))
        .map((id: string) => new Types.ObjectId(id));
      if (validCollegeIds.length > 0) {
        filter.college_id = { $in: validCollegeIds };
      }
    }

    const positiveLeads = await DailyLead.find(filter);
    let copiedCount = 0;
    for (const lead of positiveLeads) {
      const escapedLeadName = escapeRegex(lead.company_name.trim());
      const existing = await DailyLead.findOne({
        lead_type: 'jd_received',
        college_id: lead.college_id,
        company_name: { $regex: `^${escapedLeadName}$`, $options: 'i' },
        lead_date: { $gte: targetDate, $lt: nextDate },
        is_deleted: { $ne: true },
      });

      if (!existing) {
        await DailyLead.create({
          lead_type: 'jd_received',
          college_id: lead.college_id,
          coordinator_id: lead.coordinator_id,
          company_id: lead.company_id,
          daily_tracker_id: lead.daily_tracker_id,
          company_name: lead.company_name,
          job_role: lead.job_role || '',
          ctc: lead.ctc || '',
          eligible_batch: lead.eligible_batch || '2027',
          event_time: '',
          lead_date: targetDate,
          remarks: lead.remarks || 'JD Received from Positives',
          is_jd_received: true,
          is_deleted: false,
        });
        copiedCount++;
      }

      // Mark moved and soft-delete on same day
      lead.is_deleted = true;
      lead.deleted_at = new Date();
      lead.is_moved_to_jd = true;
      await lead.save();
    }

    return res.status(200).json({
      success: true,
      message: copiedCount > 0
        ? `Successfully transferred ${copiedCount} positive lead(s) to JD Received`
        : 'All selected positive leads are already in JD Received',
      data: {
        copied_count: copiedCount,
        total_positives_found: positiveLeads.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to copy leads to JD' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 06 — REPORTS & ANALYTICS ENDPOINTS
// Spec: Module_06_Reports_Analytics_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────

// ── RA-1: GET /api/v1/analytics/overview
// Live BI overview: KPI counters, conversion rates, and 4-category automated insights
app.get('/api/v1/analytics/overview', async (req: Request, res: Response) => {
  try {
    const { college_id, coordinator_id } = req.query;
    const academic_year = req.query.academic_year ?? (await getCurrentAcademicYear());

    const baseDtFilter: any = {};
    const baseWtFilter: any = { academic_year, is_deleted: false };
    const baseDlFilter: any = { is_deleted: false };

    if (college_id && college_id !== 'all') {
      const cId = new Types.ObjectId(String(college_id));
      baseDtFilter.college_id = cId;
      baseWtFilter.college_id = cId;
      baseDlFilter.college_id = cId;
    }

    if (coordinator_id) {
      const uId = new Types.ObjectId(String(coordinator_id));
      baseDtFilter.coordinator_id = uId;
      baseWtFilter.coordinator_id = uId;
      baseDlFilter.coordinator_id = uId;
    }

    // Parallel metric queries across M03, M04, M05
    const [
      totalCalls,
      positiveCalls,
      distinctCompaniesContacted,
      activeColleges,
      drivesCompleted,
      drivesInProgress,
      drivesPipeline,
      offersAgg,
      totalJdsReceived,
      followUpsDue,
    ] = await Promise.all([
      DailyTracker.countDocuments(baseDtFilter),
      DailyTracker.countDocuments({ ...baseDtFilter, outcome_status: { $in: POSITIVE_OUTCOMES } }),
      DailyTracker.distinct('company_name', baseDtFilter),
      DailyTracker.distinct('college_id', baseDtFilter),
      WeeklyTracker.countDocuments({ ...baseWtFilter, pipeline_section: 'completed' }),
      WeeklyTracker.countDocuments({ ...baseWtFilter, pipeline_section: 'in_progress' }),
      WeeklyTracker.countDocuments({ ...baseWtFilter, pipeline_section: 'pipeline' }),
      WeeklyTracker.aggregate([
        { $match: { ...baseWtFilter, pipeline_section: 'completed' } },
        { $group: { _id: null, totalOffers: { $sum: '$selected_count' } } },
      ]),
      DailyLead.countDocuments({ ...baseDlFilter, lead_type: 'jd_received' }),
      WeeklyTracker.countDocuments({
        ...baseWtFilter,
        follow_up_date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);

    const totalOffers = offersAgg[0]?.totalOffers || 0;
    const positiveResponseRate = totalCalls > 0 ? Math.round((positiveCalls / totalCalls) * 100) : 0;

    // Automated 4-Category Insights Engine (Spec Section 7.5 & 16)
    const insights = {
      coordinator_insights: [
        `High engagement: ${totalCalls} calls logged across active partner institutions.`,
        positiveResponseRate >= 20
          ? `Positive outreach conversion rate at ${positiveResponseRate}%, exceeding the 15% target benchmark.`
          : `Positive conversion rate is ${positiveResponseRate}%. Focus on tailored role outreach.`,
      ],
      company_insights: [
        `${distinctCompaniesContacted.length} unique corporate partners contacted this season.`,
        drivesCompleted > 0
          ? `${drivesCompleted} campus recruitment drives completed with ${totalOffers} student offers secured.`
          : `Active recruitment drives in pipeline are ramping up.`,
      ],
      college_insights: [
        `${activeColleges.length} colleges actively engaged in daily and weekly placement operations.`,
        drivesInProgress > 0
          ? `${drivesInProgress} recruitment drives currently in progress with active online tests and interviews.`
          : `No drives currently in progress; nurture pipeline leads.`,
      ],
      trend_insights: [
        `${totalJdsReceived} verified Job Descriptions received and shared with TPOs.`,
        followUpsDue > 0
          ? `Action required: ${followUpsDue} company follow-ups scheduled for today.`
          : `All scheduled daily follow-ups are up to date.`,
      ],
    };

    return res.status(200).json({
      success: true,
      data: {
        kpi: {
          total_calls: totalCalls,
          positive_responses: positiveCalls,
          positive_rate_pct: positiveResponseRate,
          companies_contacted: distinctCompaniesContacted.length,
          active_colleges: activeColleges.length,
          jd_received: totalJdsReceived,
          drives_completed: drivesCompleted,
          drives_in_progress: drivesInProgress,
          drives_pipeline: drivesPipeline,
          total_offers: totalOffers,
          follow_ups_due_today: followUpsDue,
        },
        insights,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch analytics overview' },
    });
  }
});

// ── RA-2: GET /api/v1/analytics/comparisons
// Period and College comparative metrics (Spec Section 7.3)
app.get('/api/v1/analytics/comparisons', async (req: Request, res: Response) => {
  try {
    const academic_year = req.query.academic_year ?? (await getCurrentAcademicYear());

    const colleges = await College.find({ status: 'active' }).limit(10);

    // Calculate per-college breakdown
    const collegeComparisons = await Promise.all(
      colleges.map(async (c) => {
        const [calls, positives, drives, offers] = await Promise.all([
          DailyTracker.countDocuments({ college_id: c._id }),
          DailyTracker.countDocuments({ college_id: c._id, outcome_status: { $in: POSITIVE_OUTCOMES } }),
          WeeklyTracker.countDocuments({ college_id: c._id, academic_year, is_deleted: false, pipeline_section: 'completed' }),
          WeeklyTracker.aggregate([
            { $match: { college_id: c._id, academic_year, is_deleted: false, pipeline_section: 'completed' } },
            { $group: { _id: null, sum: { $sum: '$selected_count' } } },
          ]),
        ]);

        return {
          college_id: c._id,
          college_name: c.college_name,
          college_code: c.college_code,
          calls,
          positives,
          drives_completed: drives,
          offers: offers[0]?.sum || 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        college_comparisons: collegeComparisons,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch comparisons' },
    });
  }
});

// ── RA-3: GET /api/v1/analytics/company-responsiveness
// Company Responsiveness Rankings & Follow-up status (Spec Section 7.4)
app.get('/api/v1/analytics/company-responsiveness', async (req: Request, res: Response) => {
  try {
    const { college_id } = req.query;
    const academic_year = req.query.academic_year ?? (await getCurrentAcademicYear());

    const wtFilter: any = { academic_year, is_deleted: false };
    if (college_id && college_id !== 'all') {
      wtFilter.college_id = new Types.ObjectId(String(college_id));
    }

    // Fetch top hiring companies from WeeklyTracker
    const topCompanies = await WeeklyTracker.find({ ...wtFilter, is_pinned_top: true })
      .sort({ created_at: -1 })
      .limit(10)
      .populate('college_id', 'college_name college_code');

    // Fetch pending follow-ups
    const pendingFollowUps = await WeeklyTracker.find({
      ...wtFilter,
      follow_up_date: { $exists: true, $ne: null },
    })
      .sort({ follow_up_date: 1 })
      .limit(15)
      .populate('college_id', 'college_name college_code');

    // Industry / Company Type breakdown
    const companyTypes = await WeeklyTracker.aggregate([
      { $match: wtFilter },
      { $group: { _id: '$company_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        top_companies: topCompanies,
        pending_follow_ups: pendingFollowUps,
        industry_distribution: companyTypes.map((t) => ({ type: t._id || 'General Corporate', count: t.count })),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch company responsiveness' },
    });
  }
});

// ── RA-4: GET /api/v1/reports/templates
// Returns the Standardized Report Templates (Spec Section 8.3)
app.get('/api/v1/reports/templates', (req: Request, res: Response) => {
  const templates = [
    {
      id: 'weekly_placement',
      title: 'Weekly Placement Report',
      audience: 'College Management & Internal Team',
      icon: '📊',
      description: 'Friday-to-Friday comprehensive report detailing completed companies, active drives, pipeline leads, follow-up summary, and key observations.',
      default_sections: ['kpi_summary', 'completed_companies', 'in_progress', 'pipeline', 'insights', 'remarks'],
    },
    {
      id: 'monthly_placement',
      title: 'Monthly Placement Report',
      audience: 'Executive Management Review',
      icon: '📈',
      description: 'Executive-level summary of monthly hiring KPIs, multi-college progress, highest CTC packages, and month-over-month comparisons.',
      default_sections: ['kpi_summary', 'completed_companies', 'charts', 'insights', 'remarks'],
    },
    {
      id: 'pending_tasks',
      title: 'Pending task placement report',
      audience: 'Institution Management & Operations',
      icon: '📋',
      description: 'Institutional pending tasks status report covering JD received dates, DB shared status, current recruitment stages, and actionable next steps.',
      default_sections: ['pending_tasks', 'remarks'],
    },
    {
      id: 'daily_positives',
      title: 'POSITIVES OF THE DAY',
      audience: 'Placement Team & Institutional Stakeholders',
      icon: '✨',
      description: 'Daily operational report tracking positive employer responses, salary packages, roles, batch eligibility, and discussion notes for the day.',
      default_sections: ['kpi_summary', 'daily_positives'],
    },
    {
      id: 'daily_jd_received',
      title: 'JD Received for the Day',
      audience: 'Placement Operations & Leadership',
      icon: '📑',
      description: 'Daily conversion report tracking all formal Job Descriptions (JDs) received, designated roles, CTC packages, and beneficiary institutions.',
      default_sections: ['kpi_summary', 'daily_jd_received'],
    },
    {
      id: 'active_leads',
      title: 'Active Leads Pipeline Report',
      audience: 'Executive Leadership & Placement Team',
      icon: '🚀',
      description: 'Comprehensive active corporate roster across JD received, positives, and active pipeline for graduating batch recruitment.',
      default_sections: ['kpi_summary', 'active_leads'],
    },
  ];

  return res.status(200).json({
    success: true,
    data: { templates },
  });
});

function extractCtcNumbersHelper(ctcStr: string | undefined | null): number[] {
  if (!ctcStr) return [];
  const clean = String(ctcStr).replace(/,/g, '');
  const matches = clean.match(/\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map(Number).filter((n) => !isNaN(n) && n > 0 && n < 250);
}

function matchesMinCtcHelper(
  ctcStr: string | undefined | null,
  minCtc: number | null | undefined,
  includeCompetitive: boolean = false
): boolean {
  if (minCtc === null || minCtc === undefined || minCtc <= 0) return true;
  const numbers = extractCtcNumbersHelper(ctcStr);
  if (numbers.length === 0) return includeCompetitive;
  return Math.max(...numbers) >= minCtc;
}

const SERVER_COLLEGE_LOGO_MAP: Record<string, string> = {
  // Nehru Group of Institutions / NCET
  NEHRU: '/college-logos/nehru.png',
  NCET: '/college-logos/nehru.png',
  'NEHRU GROUP': '/college-logos/nehru.png',
  'NEHRU GROUP OF INSTITUTIONS': '/college-logos/nehru.png',

  // Narayana Guru College of Engineering
  NGCE: '/college-logos/narayanaguru.png',
  NGC: '/college-logos/narayanaguru.png',
  NARAYANAGURU: '/college-logos/narayanaguru.png',
  'NARAYANA GURU': '/college-logos/narayanaguru.png',
  ACET: '/college-logos/acet.png',
  ACEW: '/college-logos/ACEW.jfif',
  AIHT: '/college-logos/aiht.png',
  AAA: '/college-logos/aaa.png',
  AMCET: '/college-logos/AMCET.png',
  'ANNAI MIRA': '/college-logos/annai mira.png',
  AUDISANKAR: '/college-logos/audisankar.png',
  AUDISANKARA: '/college-logos/audisankar.png',
  AVS: '/college-logos/avs.png',
  BHARATHIYAR: '/college-logos/bharathiyar institue.png',
  CHRIST: '/college-logos/christ.png',
  DSU: '/college-logos/dsu.png',
  EGS: '/college-logos/egs.png',
  GANESH: '/college-logos/ganesg.png',
  GANESG: '/college-logos/ganesg.png',
  GCT: '/college-logos/gnyanamani.png',
  GNYANAMANI: '/college-logos/gnyanamani.png',
  GNANAMANI: '/college-logos/gnyanamani.png',
  HITS: '/college-logos/hits.png',
  HINDUSTAN: '/college-logos/hits.png',
  IFET: '/college-logos/ifet.png',
  KAMARAJ: '/college-logos/kamaraj.png',
  KARPAGAM: '/college-logos/karpagam.png',
  KARUNYA: '/college-logos/karunya.png',
  KCT: '/college-logos/kumaraguru.png',
  KGISL: '/college-logos/kgisl.png',
  KIOT: '/college-logos/kiot.jfif',
  KIT: '/college-logos/kit.png',
  KLU: '/college-logos/klu.png',
  KALASALINGAM: '/college-logos/klu.png',
  KPR: '/college-logos/kpr.png',
  KUMARAGURU: '/college-logos/kumaraguru.png',
  LICET: '/college-logos/layola.png',
  LAYOLA: '/college-logos/layola.png',
  LOYOLA: '/college-logos/layola.png',
  MAREPHRAM: '/college-logos/marephraem.png',
  MAREPHRA: '/college-logos/marephraem.png',
  MAR: '/college-logos/marephraem.png',
  'MAR EPHRAEM': '/college-logos/marephraem.png',
  'MAR EPHREAM': '/college-logos/marephraem.png',
  MCET: '/college-logos/MCET.png',
  MAHALINGAM: '/college-logos/MCET.png',
  MEC: '/college-logos/MEC.png',
  MUTHAYAMMAL: '/college-logos/MEC.png',
  MKCE: '/college-logos/mkce.png',
  'M.KUMARASAMY': '/college-logos/mkce.png',
  NGP: '/college-logos/ngp.png',
  'DR. N.G.P.': '/college-logos/ngp.png',
  'DR. NGP': '/college-logos/ngp.png',
  NPR: '/college-logos/npr.png',
  PANIMALAR: '/college-logos/panimalar.png',
  PEC: '/college-logos/panimalar.png',
  PSG: '/college-logos/psg.png',
  PSNA: '/college-logos/psna.png',
  RATHINAM: '/college-logos/Rathinam - RTC.png',
  RTC: '/college-logos/Rathinam - RTC.png',
  SECE: '/college-logos/srieshwar.png',
  SETHU: '/college-logos/sethu institue.png',
  SIT: '/college-logos/sethu institue.png',
  SMVEC: '/college-logos/smvec.png',
  SONA: '/college-logos/sona.png',
  SRI_SHANMUGA: '/college-logos/sri shanmuga.png',
  'SRI SHANMUGA': '/college-logos/sri shanmuga.png',
  'SRI SHANMUGHA': '/college-logos/sri shanmuga.png',
  SRIESHWAR: '/college-logos/srieshwar.png',
  'SRI ESHWAR': '/college-logos/srieshwar.png',
  SRM: '/college-logos/srm.png',
  SSEI: '/college-logos/sri shanmuga.png',
  VAIGAI: '/college-logos/vaigai.png',
  VCE: '/college-logos/vaigai.png',
  VIT: '/college-logos/vit.png',
};

function resolveCollegeLogoUrl(targetCollege: any): string | null {
  if (!targetCollege) return null;
  const rawLogo = targetCollege.logo_url;
  if (
    rawLogo &&
    typeof rawLogo === 'string' &&
    rawLogo.trim() !== '' &&
    !rawLogo.includes('Infozianthead.png') &&
    !rawLogo.includes('clearbit')
  ) {
    return rawLogo.trim();
  }
  const code = (targetCollege.college_code || '').toUpperCase().trim();
  if (code && SERVER_COLLEGE_LOGO_MAP[code]) {
    return SERVER_COLLEGE_LOGO_MAP[code];
  }
  const name = (targetCollege.college_name || '').toLowerCase().trim();
  if (name.includes('nehru')) return '/college-logos/nehru.png';
  if (name.includes('narayana guru') || name.includes('narayanaguru')) return '/college-logos/narayanaguru.png';
  if (name.includes('hindustan') || name.includes('hits')) return '/college-logos/hits.png';
  if (name.includes('kalasalingam') || name.includes('klu')) return '/college-logos/klu.png';
  if (name.includes('karpagam')) return '/college-logos/karpagam.png';
  if (name.includes('karunya')) return '/college-logos/karunya.png';
  if (name.includes('kumaraguru') || name.includes('kct')) return '/college-logos/kumaraguru.png';
  if (name.includes('rathinam')) return '/college-logos/Rathinam - RTC.png';
  if (name.includes('ngp') || name.includes('n.g.p')) return '/college-logos/ngp.png';
  if (name.includes('kumarasamy') || name.includes('mkce')) return '/college-logos/mkce.png';
  if (name.includes('sethu')) return '/college-logos/sethu institue.png';
  if (name.includes('shanmuga') || name.includes('shanmugha') || name.includes('ssei')) return '/college-logos/sri shanmuga.png';
  if (name.includes('eshwar') || name.includes('srieshwar') || name.includes('sece')) return '/college-logos/srieshwar.png';
  if (name.includes('panimalar')) return '/college-logos/panimalar.png';
  if (name.includes('kamaraj')) return '/college-logos/kamaraj.png';
  if (name.includes('psna')) return '/college-logos/psna.png';
  if (name.includes('psg')) return '/college-logos/psg.png';
  if (name.includes('smvec') || name.includes('manakula')) return '/college-logos/smvec.png';
  if (name.includes('dsu') || name.includes('dhanalakshmi')) return '/college-logos/dsu.png';
  if (name.includes('kiot') || name.includes('knowledge')) return '/college-logos/kiot.jfif';
  if (name.includes('sona')) return '/college-logos/sona.png';
  if (name.includes('avs')) return '/college-logos/avs.png';
  if (name.includes('aaa')) return '/college-logos/aaa.png';
  if (name.includes('kgisl')) return '/college-logos/kgisl.png';
  if (name.includes('mar ephraem') || name.includes('mar ephream')) return '/college-logos/mar ephream.png';
  if (name.includes('akshaya') || name.includes('acet')) return '/college-logos/acet.png';
  if (name.includes('anand') || name.includes('aiht')) return '/college-logos/aiht.png';
  if (name.includes('npr')) return '/college-logos/npr.png';
  if (name.includes('vaigai')) return '/college-logos/vaigai.png';
  if (name.includes('ifet')) return '/college-logos/ifet.png';
  if (name.includes('egs') || name.includes('pillay')) return '/college-logos/egs.png';
  if (name.includes('gnyanamani') || name.includes('gnanamani')) return '/college-logos/gnyanamani.png';
  if (name.includes('christ')) return '/college-logos/christ.png';
  if (name.includes('srm')) return '/college-logos/srm.png';
  if (name.includes('vit') || name.includes('vellore')) return '/college-logos/vit.png';
  if (name.includes('mcet') || name.includes('mahalingam')) return '/college-logos/MCET.png';
  if (name.includes('mec') || name.includes('muthayammal')) return '/college-logos/MEC.png';
  if (name.includes('amcet') || name.includes('annai mira')) return '/college-logos/AMCET.png';
  if (name.includes('audisankar')) return '/college-logos/audisankar.png';
  if (name.includes('bharathiyar')) return '/college-logos/bharathiyar institue.png';
  if (name.includes('loyola') || name.includes('layola') || name.includes('licet')) return '/college-logos/layola.png';

  if (code && code !== 'IPOMS' && code !== 'COLLEGE' && code !== 'MULTI') {
    return `/college-logos/${code.toLowerCase()}.png`;
  }
  return null;
}

// ── RA-5: POST /api/v1/reports/generate
// Dynamic Report Generator reading live from M03, M04, and M05 (Spec Section 9.7 & 10.3)
app.post('/api/v1/reports/generate', async (req: Request, res: Response) => {
  try {
    const {
      template_type = 'weekly_placement',
      college_id,
      coordinator_id,
      academic_year = 'all',
      date_from,
      date_to,
      week_label = '',
      theme = 'blue',
      included_sections,
      included_kpi_cards,
      kpi_cards,
      custom_remarks,
      lead_sources,
      include_prepared_by,
      prepared_by,
      active_leads_columns,
      min_ctc,
      include_competitive_ctc = false,
      company_name_filter,
      company_type_filter,
      status_filter,
      custom_weekly_companies,
    } = req.body;

    const isMultiCollegeWeekly =
      template_type === 'weekly_placement' &&
      Boolean(req.body.is_multi_college || (Array.isArray(req.body.college_ids) && req.body.college_ids.length > 0) || college_id === 'all' || college_id === 'multi');

    const isConsolidatedAllowed =
      template_type === 'active_leads' ||
      template_type === 'daily_positives' ||
      template_type === 'daily_jd_received' ||
      isMultiCollegeWeekly;

    if (!isConsolidatedAllowed) {
      if (!college_id || college_id === 'all' || String(college_id).trim() === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Target Institution is required. Please select a specific college before generating the report.',
          },
        });
      }
    }

    let targetCollege: any = null;
    if (college_id && college_id !== 'all') {
      if (Types.ObjectId.isValid(String(college_id))) {
        targetCollege = await College.findById(college_id);
      }
      if (!targetCollege) {
        targetCollege = await College.findOne({
          $or: [
            { college_code: String(college_id).toUpperCase() },
            { college_name: String(college_id) },
          ],
        });
      }
    }

    let coordinator: any = null;
    if (coordinator_id) {
      if (Types.ObjectId.isValid(String(coordinator_id))) {
        coordinator = await User.findById(coordinator_id);
      }
      if (!coordinator) {
        coordinator = await User.findOne({
          $or: [
            { email: String(coordinator_id) },
            { full_name: String(coordinator_id) },
          ],
        });
      }
    }
    if (!coordinator && (req as any).user) {
      coordinator = (req as any).user;
    }
    if (!coordinator && targetCollege?._id) {
      coordinator = await User.findOne({
        assigned_college_ids: targetCollege._id,
        is_active: { $ne: false },
      });
    }

    // ── CASE 1: PENDING TASKS REPORT ───────────────────────────────────────────
    if (template_type === 'pending_tasks') {
      const highlightedIds = new Set((req.body.highlighted_task_ids || []).map(String));
      const highlightedIndices = new Set((req.body.highlighted_task_indices || []).map(Number));
      const colorMap = req.body.highlight_color_map || {};
      const defaultColor = req.body.default_highlight_color || '#fef08a';

      let pendingTasksData: any[] = [];
      if (Array.isArray(req.body.custom_pending_tasks) && req.body.custom_pending_tasks.length > 0) {
        pendingTasksData = req.body.custom_pending_tasks.map((t: any, idx: number) => {
          const statusVal = (t.status || t.current_status_text || t.current_status || t.action_to_be_taken || t.remarks || 'In Progress').trim();
          const roleVal = (t.role || t.job_role || '').trim();
          const ctcVal = (t.ctc || t.ctc_lpa || '').trim();
          return {
            _id: t._id || t.id,
            s_no: t.s_no || t.serial_no || idx + 1,
            company_name: t.company_name,
            role: roleVal,
            job_role: roleVal,
            ctc: ctcVal,
            ctc_lpa: ctcVal,
            status: statusVal,
            current_status: statusVal,
            action_to_be_taken: statusVal,
            remarks: t.remarks || statusVal,
            task_section: t.task_section || 'company_in_progress',
            is_highlighted: Boolean(t.is_highlighted || highlightedIds.has(String(t._id || t.id)) || highlightedIndices.has(idx)),
            highlight_color: t.highlight_color || colorMap[String(t._id || t.id)] || colorMap[idx] || defaultColor,
          };
        });
      } else {
        // Fallback: Query WeeklyTracker collection directly
        const wtFilter: any = { is_deleted: { $ne: true } };
        if (college_id && college_id !== 'all') {
          const queryIds: any[] = [];
          if (Types.ObjectId.isValid(String(college_id))) {
            queryIds.push(new Types.ObjectId(String(college_id)));
          }
          if (targetCollege?._id) {
            queryIds.push(targetCollege._id);
          }
          queryIds.push(String(college_id));
          wtFilter.college_id = { $in: queryIds };
        }
        if (academic_year && academic_year !== 'all') {
          wtFilter.academic_year = Number(academic_year) || academic_year;
        }

        const weeklyRows = await WeeklyTracker.find(wtFilter).sort({ order_index: 1, created_at: -1 });
        const allowedSections = req.body.included_task_sections || {
          drive_in_progress: true,
          companies_in_drive: true,
          company_in_progress: true,
        };

        const actionableRows = weeklyRows.filter((r) => {
          const sec = String(r.pipeline_section || '').toLowerCase();
          if (sec === 'drive_in_progress') {
            return allowedSections.drive_in_progress !== false;
          }
          if (sec === 'companies_in_drive' || sec === 'in_drive' || sec === 'upcoming_drives') {
            return allowedSections.companies_in_drive !== false;
          }
          if (sec === 'in_progress' || sec === 'pipeline' || sec === 'company_in_progress') {
            return allowedSections.company_in_progress !== false;
          }
          return false;
        });

        pendingTasksData = actionableRows.map((r, idx) => {
          const rowAny = r as any;
          const statusText = (r.current_status_text || rowAny.status || '').trim();
          const finalStatus = statusText || 'In Progress';
          const roleVal = (r.job_role || rowAny.role || '').trim();
          const ctcVal = (r.ctc_lpa || rowAny.ctc || '').trim();
          const isHl = highlightedIds.has(String(r._id)) || highlightedIndices.has(idx);
          const hlColor = colorMap[String(r._id)] || colorMap[idx] || defaultColor;

          let mappedSec = 'company_in_progress';
          const sec = String(r.pipeline_section || '').toLowerCase();
          if (sec === 'drive_in_progress') mappedSec = 'drive_in_progress';
          else if (sec === 'companies_in_drive' || sec === 'in_drive' || sec === 'upcoming_drives') mappedSec = 'companies_in_drive';
          else mappedSec = 'company_in_progress';

          return {
            _id: String(r._id),
            s_no: idx + 1,
            company_name: r.company_name,
            role: roleVal,
            job_role: roleVal,
            ctc: ctcVal,
            ctc_lpa: ctcVal,
            status: finalStatus,
            current_status: finalStatus,
            action_to_be_taken: finalStatus,
            remarks: statusText,
            task_section: mappedSec,
            is_highlighted: isHl,
            highlight_color: isHl ? hlColor : undefined,
          };
        });
      }

      const driveInProgList = pendingTasksData.filter((t) => t.task_section === 'drive_in_progress');
      const compInDriveList = pendingTasksData.filter((t) => t.task_section === 'companies_in_drive');
      const compInProgList = pendingTasksData.filter((t) => t.task_section === 'company_in_progress' || (!t.task_section && !driveInProgList.includes(t) && !compInDriveList.includes(t)));

      const reportDocument = {
        template_type: 'pending_tasks',
        report_title: 'Pending Task Placement Report',
        report_period: week_label,
        generated_by: coordinator?.full_name || 'A. Mohanaradha (Lead Placement Coordinator)',
        generated_date: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        theme: theme || 'blue',
        branding: {
          company_name: 'Infoziant',
          company_logo: '/infoziant-head.png',
          college_name: targetCollege?.college_name || (college_id === 'all' ? 'All Partner Institutions' : 'Target Institution'),
          college_code: targetCollege?.college_code || (college_id === 'all' ? 'IPOMS' : 'COLLEGE'),
          college_logo: resolveCollegeLogoUrl(targetCollege),
          confidential_notice: 'Prepared by Infoziant',
        },
        sections: {
          pending_tasks: pendingTasksData,
          drive_in_progress: driveInProgList,
          companies_in_drive: compInDriveList,
          company_in_progress: compInProgList,
        },
        remarks: custom_remarks || 'All pending action items are actively tracked with institutions and corporate HRs for prompt closure.',
        included_sections: {
          pending_tasks: true,
          drive_in_progress: driveInProgList.length > 0,
          companies_in_drive: compInDriveList.length > 0,
          company_in_progress: compInProgList.length > 0,
          remarks: true,
          ...(included_sections || {}),
        },
      };

      return res.status(200).json({
        success: true,
        message: 'Pending task placement report generated successfully',
        data: { report: reportDocument },
      });
    }

    // ── CASE 2: ACTIVE LEADS REPORT ────────────────────────────────────────────
    if (template_type === 'active_leads') {
      const isConsolidated = !college_id || college_id === 'all';
      const hasSpecificBatch = academic_year && academic_year !== 'all' && String(academic_year).trim() !== '';
      const selectedBatch = hasSpecificBatch ? String(academic_year).trim() : '';

      // Stream selection: 2 KPIs (JD Received Companies and Companies in Pipeline)
      const leadSources = {
        jd_received: req.body.lead_sources?.jd_received ?? req.body.lead_sources?.companies_received_jd ?? true,
        pipeline: req.body.lead_sources?.pipeline ?? req.body.lead_sources?.companies_in_pipeline ?? req.body.lead_sources?.weekly_tracker ?? true,
      };

      const normalizeCompanyName = (name: string): string => {
        return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      };

      // Pre-fetch all ACTIVE colleges to map college_id to college_code
      const activeColleges = await College.find({ status: 'active' }).lean();
      const activeCollegeIds = new Set(activeColleges.map((c) => String(c._id)));
      const activeCollegeObjectIds = Array.from(activeCollegeIds).map((id) => new Types.ObjectId(id));
      const collegeCodeMap = new Map<string, string>();
      for (const col of activeColleges) {
        collegeCodeMap.set(String(col._id), col.college_code || col.college_name || '');
      }

      // Map normalized company name -> Set of college codes
      const companyCollegesMap = new Map<string, Set<string>>();

      const addCompanyCollege = (rawName: string, collegeId: any) => {
        const norm = normalizeCompanyName(rawName);
        if (!norm) return;
        if (!collegeId || !activeCollegeIds.has(String(collegeId))) return; // STRICTLY ACTIVE COLLEGES ONLY
        const code = collegeCodeMap.get(String(collegeId));
        if (code) {
          if (!companyCollegesMap.has(norm)) {
            companyCollegesMap.set(norm, new Set());
          }
          companyCollegesMap.get(norm)!.add(code);
        }
      };

      // 1. Fetch WeeklyTracker rows across all partner colleges
      const wtFilter: any = {
        pipeline_section: {
          $in: [
            'in_progress',
            'drive_in_progress',
            'in_drive',
            'companies_in_drive',
            'upcoming_drives',
            'completed',
            'pipeline',
          ],
        },
        is_deleted: false,
      };
      if (hasSpecificBatch) {
        wtFilter.academic_year = { $in: [selectedBatch, Number(selectedBatch)] };
      }
      if (college_id && college_id !== 'all') {
        const cId = Types.ObjectId.isValid(String(college_id)) ? new Types.ObjectId(String(college_id)) : college_id;
        wtFilter.college_id = { $in: [cId, String(college_id)] };
      } else {
        wtFilter.college_id = { $in: activeCollegeObjectIds };
      }

      let wtRows = await WeeklyTracker.find(wtFilter).sort({ createdAt: -1 }).lean();
      if (wtRows.length === 0 && college_id && college_id !== 'all') {
        delete wtFilter.college_id;
        wtFilter.college_id = { $in: activeCollegeObjectIds };
        wtRows = await WeeklyTracker.find(wtFilter).sort({ createdAt: -1 }).lean();
      }

      // Also populate colleges from all weekly trackers
      for (const wt of wtRows) {
        addCompanyCollege(wt.company_name, wt.college_id);
      }

      // Also fetch DailyLead rows (for colleges & supplemental leads)
      const dlFilter: any = { is_deleted: false };
      if (hasSpecificBatch) {
        dlFilter.eligible_batch = { $regex: new RegExp(escapeRegex(selectedBatch), 'i') };
      }
      if (college_id && college_id !== 'all') {
        const cId = Types.ObjectId.isValid(String(college_id)) ? new Types.ObjectId(String(college_id)) : college_id;
        dlFilter.college_id = { $in: [cId, String(college_id)] };
      } else {
        dlFilter.college_id = { $in: activeCollegeObjectIds };
      }
      const dlRows = await DailyLead.find(dlFilter).sort({ createdAt: -1 }).lean();
      for (const dl of dlRows) {
        addCompanyCollege(dl.company_name, dl.college_id);
      }

      // Categorize companies into either 'jd_received' or 'pipeline'
      // JD Received covers: in_progress, in_drive, companies_in_drive, upcoming_drives, drive_in_progress, completed (and daily lead jd_received)
      // Pipeline covers: pipeline (and daily lead positive)
      const companyMap = new Map<string, {
        company_name: string;
        colleges: string;
        role: string;
        ctc: string;
        source: 'jd_received' | 'pipeline';
        tier: string;
        tier_badge: string;
      }>();

      const jdSections = new Set([
        'in_progress',
        'drive_in_progress',
        'in_drive',
        'companies_in_drive',
        'upcoming_drives',
        'completed',
      ]);

      for (const r of wtRows) {
        const raw = (r.company_name || '').trim();
        if (!raw) continue;
        const key = normalizeCompanyName(raw);
        const isJd = jdSections.has(r.pipeline_section);
        const roleStr = (r.job_role || (r as any).role || '').trim();
        const ctcStr = (r.ctc_lpa || (r as any).salary_package || (r as any).ctc || '').trim();

        if (!companyMap.has(key)) {
          companyMap.set(key, {
            company_name: raw,
            colleges: '',
            role: roleStr || 'Graduate Trainee',
            ctc: ctcStr || 'Competitive',
            source: isJd ? 'jd_received' : 'pipeline',
            tier: isJd ? 'JD Received Companies' : 'Companies in Pipeline',
            tier_badge: isJd ? '🔥 JD Received' : '📋 Pipeline',
          });
        } else {
          const existing = companyMap.get(key)!;
          // If existing was in pipeline but this row reached JD Received section, upgrade to JD Received
          if (existing.source === 'pipeline' && isJd) {
            existing.source = 'jd_received';
            existing.tier = 'JD Received Companies';
            existing.tier_badge = '🔥 JD Received';
          }
          if ((!existing.role || existing.role === 'Graduate Trainee') && roleStr) {
            existing.role = roleStr;
          }
          if ((!existing.ctc || existing.ctc === 'Competitive') && ctcStr) {
            existing.ctc = ctcStr;
          }
        }
      }

      // Also ingest from DailyLead
      for (const dl of dlRows) {
        const raw = (dl.company_name || '').trim();
        if (!raw) continue;
        const key = normalizeCompanyName(raw);
        const isJd = dl.lead_type === 'jd_received';
        const roleStr = (dl.job_role || (dl as any).role || '').trim();
        const ctcStr = (dl.ctc || '').trim();

        if (!companyMap.has(key)) {
          companyMap.set(key, {
            company_name: raw,
            colleges: '',
            role: roleStr || 'Graduate Trainee',
            ctc: ctcStr || 'Competitive',
            source: isJd ? 'jd_received' : 'pipeline',
            tier: isJd ? 'JD Received Companies' : 'Companies in Pipeline',
            tier_badge: isJd ? '🔥 JD Received' : '📋 Pipeline',
          });
        } else {
          const existing = companyMap.get(key)!;
          if (existing.source === 'pipeline' && isJd) {
            existing.source = 'jd_received';
            existing.tier = 'JD Received Companies';
            existing.tier_badge = '🔥 JD Received';
          }
          if ((!existing.role || existing.role === 'Graduate Trainee') && roleStr) {
            existing.role = roleStr;
          }
          if ((!existing.ctc || existing.ctc === 'Competitive') && ctcStr) {
            existing.ctc = ctcStr;
          }
        }
      }

      // Fallback: If companyMap is empty, fetch from ActiveLead collection
      if (companyMap.size === 0) {
        const alFilter: any = { is_deleted: { $ne: true } };
        if (hasSpecificBatch) {
          alFilter.academic_year = { $in: [selectedBatch, Number(selectedBatch)] };
        }
        const fallbackLeads = await ActiveLead.find(alFilter).sort({ company_name: 1 }).lean();
        for (const al of fallbackLeads) {
          const raw = (al.company_name || '').trim();
          if (!raw) continue;
          const key = normalizeCompanyName(raw);
          if (!companyMap.has(key)) {
            companyMap.set(key, {
              company_name: raw,
              colleges: '',
              role: (al.role || '').trim() || 'Graduate Trainee',
              ctc: (al.ctc || '').trim() || 'Competitive',
              source: 'pipeline',
              tier: 'Companies in Pipeline',
              tier_badge: '📋 Pipeline',
            });
          }
        }
      }

      // Attach formatted colleges list for each company
      for (const [key, item] of companyMap.entries()) {
        const collegesSet = companyCollegesMap.get(key);
        item.colleges = collegesSet && collegesSet.size > 0 ? Array.from(collegesSet).sort().join(', ') : '—';
      }

      // Filter by selected KPIs / streams
      const includeJd = !!leadSources.jd_received;
      const includePipeline = !!leadSources.pipeline;

      let allCategorizedCompanies = Array.from(companyMap.values());
      let activeLeadsList = allCategorizedCompanies.filter((c) => {
        if (c.source === 'jd_received' && includeJd) return true;
        if (c.source === 'pipeline' && includePipeline) return true;
        return false;
      });

      // Sort alphabetically by company name
      activeLeadsList.sort((a, b) => a.company_name.localeCompare(b.company_name));

      const countJd = activeLeadsList.filter((l) => l.source === 'jd_received').length;
      const countPipeline = activeLeadsList.filter((l) => l.source === 'pipeline').length;

      // Dynamic Title & Focus description
      let dynamicTitle = 'Active Leads Pipeline Report';
      let tierFocusLabel = 'Consolidated (JD Received & Pipeline)';
      if (includeJd && !includePipeline) {
        dynamicTitle = hasSpecificBatch
          ? `JD Received Companies — ${selectedBatch}`
          : `JD Received Companies`;
        tierFocusLabel = 'JD Received Companies (In-Progress • In Drive • Completed)';
      } else if (!includeJd && includePipeline) {
        dynamicTitle = hasSpecificBatch
          ? `Companies in Pipeline — ${selectedBatch}`
          : `Companies in Pipeline`;
        tierFocusLabel = 'Companies in Pipeline';
      } else if (hasSpecificBatch) {
        dynamicTitle = `Active Leads Pipeline Report — ${selectedBatch}`;
      }

      const reportDocument = {
        template_type: 'active_leads',
        report_title: dynamicTitle,
        report_period: week_label || (hasSpecificBatch ? selectedBatch : 'Consolidated'),
        include_prepared_by: include_prepared_by !== false,
        generated_by: (include_prepared_by === false) ? '' : (prepared_by || coordinator?.full_name || 'Placement Coordinator'),
        active_leads_columns: active_leads_columns || { colleges: true, role: true, ctc: true },
        generated_date: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        theme: theme || 'blue',
        branding: {
          company_name: 'Infoziant IT Solutions Inc.',
          company_logo: '/infoziant-head.png',
          college_name: targetCollege?.college_name || (isConsolidated ? 'All Partner Institutions' : 'Target Institution'),
          college_code: targetCollege?.college_code || (isConsolidated ? 'iPOMS' : 'COLLEGE'),
          college_logo: (isConsolidated || !targetCollege) ? null : resolveCollegeLogoUrl(targetCollege),
          confidential_notice: 'Prepared by Infoziant',
        },
        kpi_summary: {
          total_leads: activeLeadsList.length,
          graduating_year: hasSpecificBatch ? selectedBatch : 'All Batches',
          hot_leads_count: countJd,
          jd_received_count: countJd,
          pipeline_leads_count: countPipeline,
          pipeline_count: countPipeline,
          tier_focus: tierFocusLabel,
          selected_streams: {
            jd_received: includeJd,
            pipeline: includePipeline,
          },
        },
        sections: {
          active_leads: activeLeadsList.map((l, idx) => ({
            s_no: idx + 1,
            company_name: l.company_name,
            colleges: l.colleges || '—',
            role: l.role || '—',
            ctc: l.ctc || 'Competitive',
            source: l.source,
            tier: l.tier,
            tier_badge: l.tier_badge,
          })),
        },
        remarks: custom_remarks || `Comprehensive active corporate roster curated for ${hasSpecificBatch ? selectedBatch : 'all'} graduating campus recruitment engagements.`,
        included_sections: included_sections || {
          kpi_summary: true,
          active_leads: true,
          remarks: false,
        },
        included_kpi_cards: kpi_cards || included_kpi_cards || {
          total_leads: true,
          hot_leads_count: true,
          pipeline_leads_count: true,
          graduating_year: true,
        },
      };

      return res.status(200).json({
        success: true,
        message: 'Active leads report generated successfully',
        data: { report: reportDocument },
      });
    }

    // ── CASE: DAILY POSITIVES REPORT (Positives of the Day) ────────────────────
    if (template_type === 'daily_positives') {
      const isConsolidated = !college_id || college_id === 'all';
      const targetDateStr = req.body.date || req.body.selected_date || req.body.lead_date || date_from || '';

      let targetDate: Date;
      if (targetDateStr && targetDateStr !== 'all') {
        targetDate = parseDateParam(String(targetDateStr));
      } else {
        targetDate = new Date();
        targetDate.setUTCHours(0, 0, 0, 0);
      }
      const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

      const formattedDayLabel = targetDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const formattedFullDate = targetDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Pre-fetch all colleges and active coordinators for mapping
      const collegesList = await College.find({}).lean();
      const usersList = await User.find({ account_status: { $nin: ['inactive', 'deactivated', 'blocked'] } }).lean();
      const collegeCodeMap = new Map<string, string>();
      const collegeNameMap = new Map<string, string>();
      const collegeCoordinatorMap = new Map<string, string>();

      const OFFICIAL_COORDINATOR_COLLEGE_MAP: Record<string, string[]> = {
        'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
        'sujitha_s@infoziant.com': ['NEHRU', 'SONA', 'MAREPHRAM', 'KPR', 'MKCE', 'KARUNYA', 'AVS', 'AAA', 'KGISL', 'SSEI', 'HITS', 'EGS'],
        'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
        'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
        'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
        'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ'],
        'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
      };

      const userByEmail = new Map<string, any>();
      usersList.forEach((u) => userByEmail.set((u.official_email || '').toLowerCase(), u));

      for (const col of collegesList) {
        collegeCodeMap.set(String(col._id), col.college_code || col.college_name || '');
        collegeNameMap.set(String(col._id), col.college_name || '');
      }

      for (const [email, codes] of Object.entries(OFFICIAL_COORDINATOR_COLLEGE_MAP)) {
        const u = userByEmail.get(email.toLowerCase());
        if (u) {
          for (const col of collegesList) {
            if (codes.includes((col.college_code || '').toUpperCase())) {
              if (!collegeCoordinatorMap.has(String(col._id))) {
                collegeCoordinatorMap.set(String(col._id), u.full_name || u.username);
              }
            }
          }
        }
      }

      for (const u of usersList) {
        if (Array.isArray(u.assigned_college_ids)) {
          for (const cid of u.assigned_college_ids) {
            if (!collegeCoordinatorMap.has(String(cid))) {
              collegeCoordinatorMap.set(String(cid), u.full_name || u.username || 'Coordinator');
            }
          }
        }
      }

      let leadsData: any[] = [];
      if (Array.isArray(req.body.custom_daily_leads) && req.body.custom_daily_leads.length > 0) {
        leadsData = req.body.custom_daily_leads;
      } else {
        const query: any = {
          lead_type: 'positive',
          is_deleted: false,
        };

        if (targetDateStr !== 'all') {
          query.lead_date = { $gte: targetDate, $lt: nextDate };
        }

        if (college_id && college_id !== 'all') {
          const cId = Types.ObjectId.isValid(String(college_id)) ? new Types.ObjectId(String(college_id)) : college_id;
          query.college_id = { $in: [cId, String(college_id)] };
        }

        if (academic_year && academic_year !== 'all') {
          query.eligible_batch = { $regex: new RegExp(escapeRegex(String(academic_year).trim()), 'i') };
        }

        let rawLeads = await DailyLead.find(query)
          .sort({ lead_date: -1, createdAt: -1 })
          .populate('coordinator_id', 'full_name official_email username');

        if (rawLeads.length === 0 && academic_year && academic_year !== 'all') {
          const fallbackQuery = { ...query };
          delete fallbackQuery.eligible_batch;
          rawLeads = await DailyLead.find(fallbackQuery)
            .sort({ lead_date: -1, createdAt: -1 })
            .populate('coordinator_id', 'full_name official_email username');
        }

        if (rawLeads.length === 0 && targetDateStr === 'all') {
          rawLeads = await DailyLead.find({ lead_type: 'positive', is_deleted: false })
            .sort({ lead_date: -1, createdAt: -1 })
            .populate('coordinator_id', 'full_name official_email username');
        }

        leadsData = rawLeads.map((r: any, idx) => ({
          s_no: idx + 1,
          _id: String(r._id),
          company_name: (r.company_name || '').trim(),
          role: (r.job_role || r.role || '').trim() || 'Graduate Trainee',
          job_role: (r.job_role || r.role || '').trim() || 'Graduate Trainee',
          ctc: (r.ctc || '').trim() || 'Competitive',
          date: r.lead_date ? new Date(r.lead_date).toLocaleDateString('en-GB') : formattedDayLabel,
          lead_date: r.lead_date,
          time: r.event_time || '—',
          time_stamp: r.event_time || '—',
          event_time: r.event_time || '—',
          college_code: collegeCodeMap.get(String(r.college_id)) || '—',
          college_name: collegeNameMap.get(String(r.college_id)) || '',
          college_id: String(r.college_id),
          eligible_batch: (r.eligible_batch || '').trim() || '2026 Batch',
          batch: (r.eligible_batch || '').trim() || '2026 Batch',
          coordinator: (r.coordinator_id && typeof r.coordinator_id === 'object' && r.coordinator_id.full_name)
            ? r.coordinator_id.full_name
            : collegeCoordinatorMap.get(String(r.college_id)) || coordinator?.full_name || 'Placement Team',
          remarks: (r.remarks || '').trim(),
        }));
      }

      if (min_ctc && min_ctc > 0) {
        leadsData = leadsData.filter((l) => matchesMinCtcHelper(l.ctc, min_ctc, include_competitive_ctc));
      }

      leadsData = leadsData.map((l, idx) => ({ ...l, s_no: idx + 1 }));

      const distinctColleges = new Set(leadsData.map((l) => l.college_code).filter((c) => c && c !== '—'));
      const distinctCompanies = new Set(leadsData.map((l) => (l.company_name || '').toLowerCase()).filter(Boolean));

      let maxCtcVal = 0;
      leadsData.forEach((l) => {
        const nums = extractCtcNumbersHelper(l.ctc);
        if (nums.length > 0) {
          const maxInRow = Math.max(...nums);
          if (maxInRow > maxCtcVal) maxCtcVal = maxInRow;
        }
      });
      const topCtcFormatted = maxCtcVal > 0 ? `${maxCtcVal} LPA` : 'Competitive';

      const reportDocument = {
        template_type: 'daily_positives',
        report_title: 'POSITIVES OF THE DAY',
        report_period: targetDateStr === 'all' ? 'All Dates' : formattedFullDate,
        day_date: targetDateStr === 'all' ? 'Consolidated' : formattedDayLabel,
        include_prepared_by: false,
        generated_by: '',
        generated_date: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        theme: theme || 'emerald',
        branding: {
          company_name: 'Infoziant IT Solutions Inc.',
          company_logo: '/infoziant-head.png',
          college_name: targetCollege?.college_name || (isConsolidated ? 'All Partner Institutions' : 'Target Institution'),
          college_code: targetCollege?.college_code || (isConsolidated ? 'iPOMS' : 'COLLEGE'),
          college_logo: (isConsolidated || !targetCollege) ? null : resolveCollegeLogoUrl(targetCollege),
          confidential_notice: 'Prepared by Infoziant',
        },
        kpi_summary: {
          total_positives: leadsData.length,
          active_colleges_count: distinctColleges.size || (targetCollege ? 1 : 0),
          distinct_companies_count: distinctCompanies.size,
          highest_ctc: topCtcFormatted,
          graduating_year: academic_year && academic_year !== 'all' ? academic_year : '2027',
          report_date: formattedFullDate,
        },
        sections: {
          daily_positives: leadsData,
        },
        remarks: custom_remarks || `Daily placement operations summary tracking ${leadsData.length} confirmed positive employer interactions and prospective campus drive discussions for ${formattedFullDate}.`,
        included_sections: included_sections || {
          kpi_summary: true,
          daily_positives: true,
          remarks: false,
        },
        included_kpi_cards: kpi_cards || included_kpi_cards || {
          total_positives: true,
          active_colleges_count: true,
          distinct_companies_count: true,
          highest_ctc: true,
          graduating_year: true,
        },
      };

      return res.status(200).json({
        success: true,
        message: 'Positives of the day report generated successfully',
        data: { report: reportDocument },
      });
    }

    // ── CASE: DAILY JD RECEIVED REPORT (JD Received for the Day) ────────────────
    if (template_type === 'daily_jd_received') {
      const isConsolidated = !college_id || college_id === 'all';
      const targetDateStr = req.body.date || req.body.selected_date || req.body.lead_date || date_from || '';

      let targetDate: Date;
      if (targetDateStr && targetDateStr !== 'all') {
        targetDate = parseDateParam(String(targetDateStr));
      } else {
        targetDate = new Date();
        targetDate.setUTCHours(0, 0, 0, 0);
      }
      const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

      const formattedDayLabel = targetDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const formattedFullDate = targetDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Pre-fetch all colleges for code mapping and coordinators
      const collegesList = await College.find({}).lean();
      const collegeCodeMap = new Map<string, string>();
      const collegeNameMap = new Map<string, string>();
      for (const col of collegesList) {
        collegeCodeMap.set(String(col._id), col.college_code || col.college_name || '');
        collegeNameMap.set(String(col._id), col.college_name || '');
      }

      // Pre-fetch all users to map assigned college coordinators if coordinator_id is missing
      const usersList = await User.find({ account_status: { $nin: ['inactive', 'deactivated', 'blocked'] } }).lean();
      const collegeCoordinatorMap = new Map<string, string>();

      const OFFICIAL_COORDINATOR_COLLEGE_MAP: Record<string, string[]> = {
        'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
        'sujitha_s@infoziant.com': ['NEHRU', 'SONA', 'MAREPHRAM', 'KPR', 'MKCE', 'KARUNYA', 'AVS', 'AAA', 'KGISL', 'SSEI', 'HITS', 'EGS'],
        'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
        'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
        'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
        'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ'],
        'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
      };

      const userByEmail = new Map<string, any>();
      usersList.forEach((u) => userByEmail.set((u.official_email || '').toLowerCase(), u));

      for (const [email, codes] of Object.entries(OFFICIAL_COORDINATOR_COLLEGE_MAP)) {
        const u = userByEmail.get(email.toLowerCase());
        if (u) {
          for (const col of collegesList) {
            if (codes.includes((col.college_code || '').toUpperCase())) {
              if (!collegeCoordinatorMap.has(String(col._id))) {
                collegeCoordinatorMap.set(String(col._id), u.full_name || u.username);
              }
            }
          }
        }
      }

      for (const u of usersList) {
        if (Array.isArray(u.assigned_college_ids)) {
          for (const cid of u.assigned_college_ids) {
            if (!collegeCoordinatorMap.has(String(cid))) {
              collegeCoordinatorMap.set(String(cid), u.full_name || u.username || 'Coordinator');
            }
          }
        }
      }

      let leadsData: any[] = [];
      if (Array.isArray(req.body.custom_daily_leads) && req.body.custom_daily_leads.length > 0) {
        leadsData = req.body.custom_daily_leads;
      } else {
        const query: any = {
          lead_type: 'jd_received',
          is_deleted: false,
        };

        if (targetDateStr !== 'all') {
          query.lead_date = { $gte: targetDate, $lt: nextDate };
        }

        if (college_id && college_id !== 'all') {
          const cId = Types.ObjectId.isValid(String(college_id)) ? new Types.ObjectId(String(college_id)) : college_id;
          query.college_id = { $in: [cId, String(college_id)] };
        }

        if (academic_year && academic_year !== 'all') {
          query.eligible_batch = { $regex: new RegExp(escapeRegex(String(academic_year).trim()), 'i') };
        }

        let rawLeads = await DailyLead.find(query)
          .sort({ lead_date: -1, createdAt: -1 })
          .populate('coordinator_id', 'full_name official_email username');

        if (rawLeads.length === 0 && academic_year && academic_year !== 'all') {
          const fallbackQuery = { ...query };
          delete fallbackQuery.eligible_batch;
          rawLeads = await DailyLead.find(fallbackQuery)
            .sort({ lead_date: -1, createdAt: -1 })
            .populate('coordinator_id', 'full_name official_email username');
        }

        if (rawLeads.length === 0 && targetDateStr === 'all') {
          rawLeads = await DailyLead.find({ lead_type: 'jd_received', is_deleted: false })
            .sort({ lead_date: -1, createdAt: -1 })
            .populate('coordinator_id', 'full_name official_email username');
        }

        leadsData = rawLeads.map((r: any, idx) => ({
          s_no: idx + 1,
          _id: String(r._id),
          company_name: (r.company_name || '').trim(),
          role: (r.job_role || r.role || '').trim() || 'Graduate Trainee',
          job_role: (r.job_role || r.role || '').trim() || 'Graduate Trainee',
          ctc: (r.ctc || '').trim() || 'Competitive',
          date: r.lead_date ? new Date(r.lead_date).toLocaleDateString('en-GB') : formattedDayLabel,
          lead_date: r.lead_date,
          time: r.event_time || '—',
          time_stamp: r.event_time || '—',
          event_time: r.event_time || '—',
          college_code: collegeCodeMap.get(String(r.college_id)) || '—',
          college_name: collegeNameMap.get(String(r.college_id)) || '',
          college_id: String(r.college_id),
          eligible_batch: (r.eligible_batch || '').trim() || '2027',
          batch: (r.eligible_batch || '').trim() || '2027',
          coordinator: (r.coordinator_id && typeof r.coordinator_id === 'object' && r.coordinator_id.full_name)
            ? r.coordinator_id.full_name
            : collegeCoordinatorMap.get(String(r.college_id)) || coordinator?.full_name || 'Placement Team',
          remarks: (r.remarks || '').trim(),
        }));
      }

      if (min_ctc && min_ctc > 0) {
        leadsData = leadsData.filter((l) => matchesMinCtcHelper(l.ctc, min_ctc, include_competitive_ctc));
      }

      leadsData = leadsData.map((l, idx) => ({ ...l, s_no: idx + 1 }));

      const distinctColleges = new Set(leadsData.map((l) => l.college_code).filter((c) => c && c !== '—'));
      const distinctCompanies = new Set(leadsData.map((l) => (l.company_name || '').toLowerCase()).filter(Boolean));

      let maxCtcVal = 0;
      leadsData.forEach((l) => {
        const nums = extractCtcNumbersHelper(l.ctc);
        if (nums.length > 0) {
          const maxInRow = Math.max(...nums);
          if (maxInRow > maxCtcVal) maxCtcVal = maxInRow;
        }
      });
      const topCtcFormatted = maxCtcVal > 0 ? `${maxCtcVal} LPA` : 'Competitive';

      const reportDocument = {
        template_type: 'daily_jd_received',
        report_title: 'JD RECEIVED FOR THE DAY',
        report_period: targetDateStr === 'all' ? 'All Dates' : formattedFullDate,
        day_date: targetDateStr === 'all' ? 'Consolidated' : formattedDayLabel,
        include_prepared_by: false,
        generated_by: '',
        generated_date: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        theme: theme || 'blue',
        branding: {
          company_name: 'Infoziant IT Solutions Inc.',
          company_logo: '/infoziant-head.png',
          college_name: targetCollege?.college_name || (isConsolidated ? 'All Partner Institutions' : 'Target Institution'),
          college_code: targetCollege?.college_code || (isConsolidated ? 'iPOMS' : 'COLLEGE'),
          college_logo: (isConsolidated || !targetCollege) ? null : resolveCollegeLogoUrl(targetCollege),
          confidential_notice: 'Prepared by Infoziant',
        },
        kpi_summary: {
          total_jds: leadsData.length,
          active_colleges_count: distinctColleges.size || (targetCollege ? 1 : 0),
          distinct_companies_count: distinctCompanies.size,
          highest_ctc: topCtcFormatted,
          graduating_year: academic_year && academic_year !== 'all' ? academic_year : '2027',
          report_date: formattedFullDate,
        },
        sections: {
          daily_jd_received: leadsData,
        },
        remarks: custom_remarks || `Daily placement conversion summary recording ${leadsData.length} formal Job Descriptions received from corporate hiring partners for ${formattedFullDate}.`,
        included_sections: included_sections || {
          kpi_summary: true,
          daily_jd_received: true,
          remarks: false,
        },
        included_kpi_cards: kpi_cards || included_kpi_cards || {
          total_jds: true,
          active_colleges_count: true,
          distinct_companies_count: true,
          highest_ctc: true,
          graduating_year: true,
        },
      };

      return res.status(200).json({
        success: true,
        message: 'JD received for the day report generated successfully',
        data: { report: reportDocument },
      });
    }

    // ── CASE 3: MONTH-END REPORT (INDIVIDUAL COORDINATOR) ──────────────────────
    if (template_type === 'month_end' || template_type === 'monthly_placement') {
      // 1. Resolve Colleges Handled by Coordinator
      let handledColleges: any[] = [];
      if (coordinator?.assigned_college_ids && coordinator.assigned_college_ids.length > 0) {
        handledColleges = await College.find({
          _id: { $in: coordinator.assigned_college_ids },
          is_deleted: { $ne: true },
        }).select('college_name college_code location');
      }
      if (handledColleges.length === 0) {
        handledColleges = await College.find({ is_deleted: { $ne: true } }).select('college_name college_code location');
      }

      // Filter handledColleges if selected_college_ids or college_ids is explicitly provided
      const requestedCollegeIds = Array.isArray(req.body.selected_college_ids) && req.body.selected_college_ids.length > 0
        ? req.body.selected_college_ids
        : (Array.isArray(req.body.college_ids) && req.body.college_ids.length > 0 ? req.body.college_ids : null);

      if (requestedCollegeIds) {
        const selectedIdStrings = new Set(requestedCollegeIds.map((id: any) => String(id)));
        const filteredHandled = handledColleges.filter((col) => selectedIdStrings.has(String(col._id)));
        if (filteredHandled.length > 0) {
          handledColleges = filteredHandled;
        }
      }

      const collegeIdsToMatch: any[] = [];
      if (targetCollege?._id) collegeIdsToMatch.push(targetCollege._id);
      if (college_id && college_id !== 'all' && college_id !== 'multi' && Types.ObjectId.isValid(String(college_id))) {
        collegeIdsToMatch.push(new Types.ObjectId(String(college_id)));
      } else if (handledColleges.length > 0) {
        handledColleges.forEach(col => collegeIdsToMatch.push(col._id));
      }

      // 2. Fetch conversions (Exclusively from 'in_progress' section of Weekly Tracker for the target college)
      const wtFilterProgress: any = {
        is_deleted: { $ne: true },
        pipeline_section: 'in_progress',
      };
      if (collegeIdsToMatch.length > 0) {
        wtFilterProgress.college_id = { $in: collegeIdsToMatch };
      }

      const inProgressConversions = await WeeklyTracker.find(wtFilterProgress)
        .populate('college_id', 'college_name college_code')
        .sort({ created_at: -1, company_name: 1 });

      // Fetch matching pending tasks to pull exact jd_received_date from Pending Task section
      const pendingTasksForColleges = await PendingTask.find({
        is_deleted: { $ne: true },
        ...(collegeIdsToMatch.length > 0 ? { college_id: { $in: collegeIdsToMatch } } : {}),
      });

      const normalizeCompName = (name: string) =>
        (name || '')
          .toLowerCase()
          .replace(/\b(private\s+limited|pvt\.?\s*ltd\.?|ltd\.?|limited|services|technologies|solutions|corp|india|inc\.?)\b/gi, '')
          .replace(/[^a-z0-9]/gi, '')
          .trim();

      // Build Section 1: Company Conversions (from in_progress, pulling JD received date from Pending Task)
      const conversionsList = inProgressConversions.map((wt, idx) => {
        const wtName = (wt.company_name || '').toLowerCase().trim();
        const normWt = normalizeCompName(wt.company_name);

        const matchedPt = pendingTasksForColleges.find((pt) => {
          const ptName = (pt.company_name || '').toLowerCase().trim();
          const normPt = normalizeCompName(pt.company_name);
          return (
            ptName === wtName ||
            normPt === normWt ||
            (normPt.length > 3 && normWt.length > 3 && (normPt.includes(normWt) || normWt.includes(normPt))) ||
            ptName.includes(wtName) ||
            wtName.includes(ptName)
          );
        });

        let formattedJdDate = '';
        if (matchedPt?.jd_received_date) {
          formattedJdDate = new Date(matchedPt.jd_received_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
        }

        return {
          s_no: idx + 1,
          company_name: wt.company_name,
          role: wt.job_role || (wt as any).role || 'Software Engineer',
          ctc: wt.ctc_lpa || 'Competitive',
          college_name: (wt.college_id as any)?.college_name || targetCollege?.college_name || 'Target Institution',
          jd_received_date: formattedJdDate,
        };
      });

      // 3. Fetch Companies in Drive (Exclusively from 'in_drive' / 'companies_in_drive' section of Weekly Tracker)
      const wtFilterInDrive: any = {
        is_deleted: { $ne: true },
        pipeline_section: { $in: ['in_drive', 'companies_in_drive'] },
      };
      if (collegeIdsToMatch.length > 0) {
        wtFilterInDrive.college_id = { $in: collegeIdsToMatch };
      }

      const inDriveCompanies = await WeeklyTracker.find(wtFilterInDrive)
        .populate('college_id', 'college_name college_code')
        .sort({ drive_date: 1, created_at: -1, company_name: 1 });

      // Build Section 2: Companies in Drive (Exact mirror of Weekly Tracker in_drive section: S.No, Company Name, Role, CTC, Status)
      const companiesInDriveList = inDriveCompanies.map((wt, idx) => ({
        s_no: idx + 1,
        company_name: wt.company_name,
        role: wt.job_role || (wt as any).role || 'Software Engineer',
        ctc: wt.ctc_lpa || 'Competitive',
        status: wt.current_status_text || (wt.drive_date ? `Drive on ${new Date(wt.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Drive in progress'),
        college_name: (wt.college_id as any)?.college_name || targetCollege?.college_name || 'Target Institution',
      }));

      // 4. Fetch Companies on Hold by College / TPO
      const wtFilterOnHoldCollege: any = {
        is_deleted: { $ne: true },
        pipeline_section: { $in: ['on_hold_by_college', 'rejected_by_college'] },
      };
      if (collegeIdsToMatch.length > 0) {
        wtFilterOnHoldCollege.college_id = { $in: collegeIdsToMatch };
      }

      const onHoldCollegeCompanies = await WeeklyTracker.find(wtFilterOnHoldCollege)
        .populate('college_id', 'college_name college_code')
        .sort({ created_at: -1, company_name: 1 });

      const onHoldByCollegeList = onHoldCollegeCompanies.map((wt, idx) => ({
        s_no: idx + 1,
        company_name: wt.company_name,
        role: wt.job_role || (wt as any).role || 'Software Engineer',
        ctc: wt.ctc_lpa || 'Competitive',
        status: wt.current_status_text || (wt as any).remarks || 'On Hold by College / TPO',
        remarks: (wt as any).remarks || wt.current_status_text || 'On Hold by College / TPO',
        college_name: (wt.college_id as any)?.college_name || targetCollege?.college_name || 'Target Institution',
      }));

      // 5. Fetch Companies on Hold by HR
      const wtFilterOnHoldHr: any = {
        is_deleted: { $ne: true },
        pipeline_section: 'on_hold_by_hr',
      };
      if (collegeIdsToMatch.length > 0) {
        wtFilterOnHoldHr.college_id = { $in: collegeIdsToMatch };
      }

      const onHoldHrCompanies = await WeeklyTracker.find(wtFilterOnHoldHr)
        .populate('college_id', 'college_name college_code')
        .sort({ created_at: -1, company_name: 1 });

      const onHoldByHrList = onHoldHrCompanies.map((wt, idx) => ({
        s_no: idx + 1,
        company_name: wt.company_name,
        role: wt.job_role || (wt as any).role || 'Software Engineer',
        ctc: wt.ctc_lpa || 'Competitive',
        status: wt.current_status_text || (wt as any).remarks || 'On Hold from Corporate / HR',
        remarks: (wt as any).remarks || wt.current_status_text || 'On Hold from Corporate / HR',
        college_name: (wt.college_id as any)?.college_name || targetCollege?.college_name || 'Target Institution',
      }));

      // 6. Fetch Completed Drives to calculate Total Offers Received & Completed Companies Section
      const wtFilterCompleted: any = {
        is_deleted: { $ne: true },
        pipeline_section: 'completed',
      };
      if (collegeIdsToMatch.length > 0) {
        wtFilterCompleted.college_id = { $in: collegeIdsToMatch };
      }

      const completedDrives = await WeeklyTracker.find(wtFilterCompleted)
        .populate('college_id', 'college_name college_code')
        .sort({ created_at: -1, company_name: 1 });
      const totalOffersReceived = completedDrives.reduce((sum, d) => sum + (Number(d.selected_count) || 0), 0);

      const completedCompaniesList = completedDrives.map((wt, idx) => ({
        s_no: idx + 1,
        company_name: wt.company_name,
        role: wt.job_role || (wt as any).role || 'Software Engineer',
        job_role: wt.job_role || (wt as any).role || 'Software Engineer',
        ctc: wt.ctc_lpa || 'Competitive',
        ctc_lpa: wt.ctc_lpa || 'Competitive',
        status: wt.current_status_text || 'Drive Completed',
        current_status_text: wt.current_status_text || 'Drive Completed',
        offers_received: Number(wt.selected_count) || 0,
        selected_count: Number(wt.selected_count) || 0,
        college_name: (wt.college_id as any)?.college_name || targetCollege?.college_name || 'Target Institution',
      }));

      // ── Calling Activity Summary — real calls + duration per handled college
      // for the report's month, straight from Daily Tracker (user-requested,
      // perf/security session, 22 Sep 2026). Month bounds come from date_from/
      // date_to when the wizard's month picker sends them; falls back to the
      // current IST calendar month so an older client that doesn't send them
      // yet still gets a real (if less exact) answer, never a silently empty one.
      let monthRangeStart: Date;
      let monthRangeEnd: Date;
      const parsedFrom = date_from ? new Date(String(date_from) + 'T00:00:00Z') : null;
      const parsedTo = date_to ? new Date(String(date_to) + 'T23:59:59Z') : null;
      if (parsedFrom && !isNaN(parsedFrom.getTime()) && parsedTo && !isNaN(parsedTo.getTime())) {
        monthRangeStart = parsedFrom;
        monthRangeEnd = parsedTo;
      } else {
        const todayIst = getTodayDate();
        monthRangeStart = new Date(Date.UTC(todayIst.getUTCFullYear(), todayIst.getUTCMonth(), 1, 0, 0, 0));
        monthRangeEnd = new Date(Date.UTC(todayIst.getUTCFullYear(), todayIst.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      }

      // Deliberately NOT narrowed to collegeIdsToMatch like the other sections —
      // the user asked for "how many calls per college handled by the user", i.e.
      // this coordinator's whole monthly picture, not just whichever single
      // institution the rest of the report currently targets.
      const callingActivityRows = await Promise.all(
        handledColleges.map(async (col, idx) => {
          const rows = await DailyTracker.find({
            coordinator_id: coordinator._id,
            college_id: col._id,
            is_skipped: { $ne: true },
            $or: [
              { session_date: { $gte: monthRangeStart, $lte: monthRangeEnd } },
              { created_at: { $gte: monthRangeStart, $lte: monthRangeEnd } },
            ],
          }).select('duration_seconds call_start_time call_end_time').lean();

          let durationSecs = 0;
          for (const row of rows) {
            if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
              durationSecs += row.duration_seconds;
            } else if (row.call_start_time && row.call_end_time) {
              const s = new Date(row.call_start_time).getTime();
              const e = new Date(row.call_end_time).getTime();
              if (e > s) durationSecs += Math.floor((e - s) / 1000);
            }
          }

          return {
            s_no: idx + 1,
            college_name: col.college_name,
            college_code: col.college_code,
            total_calls: rows.length,
            total_duration_seconds: durationSecs,
            total_duration_formatted: formatDurationClock(durationSecs).formatted,
          };
        })
      );

      const callingActivityTotals = callingActivityRows.reduce(
        (acc, r) => ({
          calls: acc.calls + r.total_calls,
          seconds: acc.seconds + r.total_duration_seconds,
        }),
        { calls: 0, seconds: 0 }
      );

      let monthName = 'August';
      if (week_label) {
        const cleaned = String(week_label).trim();
        if (/jan/i.test(cleaned)) monthName = 'January';
        else if (/feb/i.test(cleaned)) monthName = 'February';
        else if (/mar/i.test(cleaned)) monthName = 'March';
        else if (/apr/i.test(cleaned)) monthName = 'April';
        else if (/may/i.test(cleaned)) monthName = 'May';
        else if (/jun/i.test(cleaned)) monthName = 'June';
        else if (/jul/i.test(cleaned)) monthName = 'July';
        else if (/aug/i.test(cleaned)) monthName = 'August';
        else if (/sep/i.test(cleaned)) monthName = 'September';
        else if (/oct/i.test(cleaned)) monthName = 'October';
        else if (/nov/i.test(cleaned)) monthName = 'November';
        else if (/dec/i.test(cleaned)) monthName = 'December';
        else if (cleaned.length > 0) {
          monthName = cleaned.split(' ')[0];
        }
      }

      const reportDocument = {
        template_type: 'month_end',
        report_title: `${monthName} Month Placement Operations Report`,
        report_period: `${monthName} 2026`,
        generated_by: coordinator?.full_name || 'Placement Coordinator',
        generated_date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
        theme: theme || 'blue',
        branding: {
          company_name: 'Infoziant IT Solutions Inc.',
          company_logo: '/infoziant-head.png',
          college_name: targetCollege?.college_name || (college_id === 'all' ? 'All Handled Institutions' : 'Target Institution'),
          college_code: targetCollege?.college_code || (college_id === 'all' ? 'IPOMS' : 'COLLEGE'),
          college_logo: resolveCollegeLogoUrl(targetCollege),
          confidential_notice: `Prepared by Infoziant • ${coordinator?.full_name || 'Placement Coordinator'}`,
          prepared_by: coordinator?.full_name || 'Placement Coordinator',
          coordinator_name: coordinator?.full_name || 'Placement Coordinator',
        },
        kpi_summary: {
          total_conversion_count: conversionsList.length + companiesInDriveList.length,
          total_companies_scheduled: companiesInDriveList.length,
          total_offers_moved: totalOffersReceived,
          total_calls_this_month: callingActivityTotals.calls,
          total_hours_dedicated: formatDurationClock(callingActivityTotals.seconds).formatted,
        },
        sections: {
          completed_companies: completedCompaniesList,
          company_conversions: conversionsList,
          companies_in_drive: companiesInDriveList,
          company_drives_scheduled: companiesInDriveList,
          on_hold_by_college: onHoldByCollegeList,
          on_hold_by_hr: onHoldByHrList,
          calling_activity: callingActivityRows,
        },
        calling_activity_totals: {
          total_calls: callingActivityTotals.calls,
          total_duration_formatted: formatDurationClock(callingActivityTotals.seconds).formatted,
        },
        remarks: custom_remarks || 'All scheduled month-end campus drives and JD received companies have been reviewed. Follow-ups with corporate HRs remain on track.',
        included_sections: included_sections || {
          kpi_summary: true,
          completed_companies: true,
          company_conversions: true,
          companies_in_drive: true,
          company_drives_scheduled: true,
          on_hold_by_college: true,
          on_hold_by_hr: true,
          calling_activity: true,
          remarks: false,
        },
        included_kpi_cards: kpi_cards || {
          total_conversion_count: true,
          total_companies_scheduled: true,
          total_offers_moved: true,
        },
      };

      return res.status(200).json({
        success: true,
        message: 'Month-end report generated successfully',
        data: { report: reportDocument },
      });
    }

    // ── CASE 4: WEEKLY PLACEMENT REPORT (DEFAULT) ──────────────────────────────
    if (isMultiCollegeWeekly) {
      let targetCollegesList: any[] = [];
      if (Array.isArray(req.body.college_ids) && req.body.college_ids.length > 0) {
        const queryIds: any[] = [];
        const codeQueries: string[] = [];
        req.body.college_ids.forEach((id: any) => {
          if (Types.ObjectId.isValid(String(id))) {
            queryIds.push(new Types.ObjectId(String(id)));
          } else if (typeof id === 'string') {
            codeQueries.push(id.toUpperCase());
          }
        });
        targetCollegesList = await College.find({
          $or: [
            { _id: { $in: queryIds } },
            { college_code: { $in: codeQueries } },
          ],
          is_deleted: { $ne: true },
        }).sort({ college_name: 1 });
      } else {
        targetCollegesList = await College.find({
          is_deleted: { $ne: true },
          account_status: { $ne: 'inactive' },
        }).sort({ college_name: 1 });
      }

      // Query weekly tracker for each college
      const colleges_data = await Promise.all(
        targetCollegesList.map(async (col) => {
          const cFilter: any = {
            college_id: col._id,
            is_deleted: { $ne: true },
          };
          if (academic_year && academic_year !== 'all') {
            cFilter.academic_year = { $in: [academic_year, Number(academic_year), String(academic_year)] };
          }

          let [cCompleted, cDriveInProgress, cInDrive, cInProgress] = await Promise.all([
            WeeklyTracker.find({ ...cFilter, pipeline_section: 'completed' }).sort({ created_at: -1 }),
            WeeklyTracker.find({ ...cFilter, pipeline_section: 'drive_in_progress' }).sort({ created_at: -1 }),
            WeeklyTracker.find({ ...cFilter, pipeline_section: { $in: ['in_drive', 'companies_in_drive', 'upcoming_drives'] } }).sort({ drive_date: 1, created_at: -1 }),
            WeeklyTracker.find({ ...cFilter, pipeline_section: 'in_progress' }).sort({ created_at: -1 }),
          ]);

          if (cCompleted.length === 0 && cDriveInProgress.length === 0 && cInDrive.length === 0 && cInProgress.length === 0 && cFilter.academic_year) {
            delete cFilter.academic_year;
            [cCompleted, cDriveInProgress, cInDrive, cInProgress] = await Promise.all([
              WeeklyTracker.find({ ...cFilter, pipeline_section: 'completed' }).sort({ created_at: -1 }),
              WeeklyTracker.find({ ...cFilter, pipeline_section: 'drive_in_progress' }).sort({ created_at: -1 }),
              WeeklyTracker.find({ ...cFilter, pipeline_section: { $in: ['in_drive', 'companies_in_drive', 'upcoming_drives'] } }).sort({ drive_date: 1, created_at: -1 }),
              WeeklyTracker.find({ ...cFilter, pipeline_section: 'in_progress' }).sort({ created_at: -1 }),
            ]);
          }

          if (min_ctc && Number(min_ctc) > 0) {
            const mVal = Number(min_ctc);
            const inclComp = Boolean(include_competitive_ctc);
            cCompleted = cCompleted.filter((r) => matchesMinCtcHelper(r.ctc_lpa, mVal, inclComp));
            cDriveInProgress = cDriveInProgress.filter((r) => matchesMinCtcHelper(r.ctc_lpa, mVal, inclComp));
            cInDrive = cInDrive.filter((r) => matchesMinCtcHelper(r.ctc_lpa, mVal, inclComp));
            cInProgress = cInProgress.filter((r) => matchesMinCtcHelper(r.ctc_lpa, mVal, inclComp));
          }

          const totalOffers = cCompleted.reduce((sum, r) => sum + (r.selected_count || 0), 0);

          return {
            college_id: String(col._id),
            college_name: col.college_name,
            college_code: col.college_code || '',
            location: col.location || '',
            completed_companies: cCompleted.map((r, idx) => ({
              s_no: idx + 1,
              company_name: r.company_name,
              job_role: r.job_role || '—',
              company_type: r.company_type || '—',
              ctc_lpa: r.ctc_lpa || 'Competitive',
              selected_count: r.selected_count || 0,
              current_status_text: r.current_status_text || 'Completed',
              follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            })),
            drive_in_progress: cDriveInProgress.map((r, idx) => ({
              s_no: idx + 1,
              company_name: r.company_name,
              job_role: r.job_role || '—',
              company_type: r.company_type || '—',
              ctc_lpa: r.ctc_lpa || 'Competitive',
              status: r.current_status_text || 'Drive in progress',
              current_status_text: r.current_status_text || 'Drive in progress',
              drive_date: r.drive_date ? new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
              follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            })),
            companies_in_drive: cInDrive.map((r, idx) => ({
              s_no: idx + 1,
              company_name: r.company_name,
              job_role: r.job_role || '—',
              company_type: r.company_type || '—',
              ctc_lpa: r.ctc_lpa || 'Competitive',
              status: r.current_status_text || (r.drive_date ? `Drive on ${new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Upcoming Drive'),
              current_status_text: r.current_status_text || (r.drive_date ? `Drive on ${new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Upcoming Drive'),
              drive_date: r.drive_date ? new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
              follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            })),
            upcoming_drives: cInDrive.map((r, idx) => ({
              s_no: idx + 1,
              company_name: r.company_name,
              job_role: r.job_role || '—',
              company_type: r.company_type || '—',
              ctc_lpa: r.ctc_lpa || 'Competitive',
              status: r.current_status_text || (r.drive_date ? `Drive on ${new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Upcoming Drive'),
              current_status_text: r.current_status_text || (r.drive_date ? `Drive on ${new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Upcoming Drive'),
              drive_date: r.drive_date ? new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
              follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            })),
            in_progress: cInProgress.map((r, idx) => ({
              s_no: idx + 1,
              company_name: r.company_name,
              job_role: r.job_role || '—',
              company_type: r.company_type || '—',
              ctc_lpa: r.ctc_lpa || 'To be finalized',
              current_status_text: r.current_status_text || 'In Progress',
              follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (r.drive_date ? new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Scheduled'),
            })),
            total_completed: cCompleted.length,
            total_drive_in_progress: cDriveInProgress.length,
            total_in_drive: cInDrive.length,
            total_upcoming_drives: cInDrive.length,
            total_in_progress: cInProgress.length,
            total_offers: totalOffers,
          };
        })
      );

      const totalCompletedDrives = colleges_data.reduce((sum, c) => sum + c.total_completed, 0);
      const totalDriveInProgressDrives = colleges_data.reduce((sum, c) => sum + (c.total_drive_in_progress || 0), 0);
      const totalInDriveDrives = colleges_data.reduce((sum, c) => sum + (c.total_in_drive || 0), 0);
      const totalInProgressDrives = colleges_data.reduce((sum, c) => sum + c.total_in_progress, 0);
      const totalOffersMoved = colleges_data.reduce((sum, c) => sum + c.total_offers, 0);

      const reportDocument = {
        template_type: 'weekly_placement',
        is_multi_college: true,
        colleges_data,
        report_title: 'Consolidated Weekly Placement Report',
        report_period: (week_label && !String(week_label).toLowerCase().includes('cumulative')) ? String(week_label).trim() : '',
        include_prepared_by: include_prepared_by !== false,
        generated_by: (include_prepared_by === false) ? '' : (prepared_by || coordinator?.full_name || 'Placement Coordinator'),
        generated_date: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        theme: theme || 'blue',
        branding: {
          company_name: 'Infoziant IT Solutions Inc.',
          company_logo: '/infoziant-head.png',
          college_name: `Consolidated Partner Institutions (${colleges_data.length} Colleges)`,
          college_code: 'iPOMS',
          college_logo: null,
          confidential_notice: 'Prepared by Infoziant',
        },
        kpi_summary: {
          total_colleges: colleges_data.length,
          drives_completed: totalCompletedDrives,
          drive_in_progress: totalDriveInProgressDrives,
          drives_in_drive: totalInDriveDrives,
          upcoming_drives: totalInDriveDrives,
          drives_in_progress: totalInProgressDrives,
          total_offers: totalOffersMoved,
        },
        included_sections: included_sections || {
          kpi_summary: true,
          completed_companies: true,
          drive_in_progress: true,
          companies_in_drive: true,
          upcoming_drives: true,
          in_progress: true,
          remarks: true,
        },
        included_kpi_cards: kpi_cards || included_kpi_cards || {
          total_colleges: true,
          drives_completed: true,
          drive_in_progress: true,
          drives_in_progress: true,
          total_offers: true,
        },
        remarks: custom_remarks || 'Consolidated weekly recruitment operations summary covering partner institutions. Ongoing evaluation rounds and completed placements are reflected per campus.',
      };

      return res.status(200).json({
        success: true,
        message: 'Consolidated multi-college weekly report generated successfully',
        data: { report: reportDocument },
      });
    }

    // Filter bases
    const wtFilter: any = { is_deleted: { $ne: true } };
    const dtFilter: any = {};
    const dlFilter: any = { is_deleted: { $ne: true } };

    if (academic_year && academic_year !== 'all') {
      const yearQueries: any[] = [academic_year, Number(academic_year), String(academic_year)].filter(Boolean);
      wtFilter.academic_year = { $in: yearQueries };
    }

    if (college_id && college_id !== 'all') {
      const queryCollegeIds: any[] = [];
      if (Types.ObjectId.isValid(String(college_id))) {
        queryCollegeIds.push(new Types.ObjectId(String(college_id)));
      }
      if (targetCollege?._id) {
        queryCollegeIds.push(targetCollege._id);
      }
      queryCollegeIds.push(String(college_id));

      wtFilter.college_id = { $in: queryCollegeIds };
      dtFilter.college_id = { $in: queryCollegeIds };
      dlFilter.college_id = { $in: queryCollegeIds };
    }

    // Parallel fetch of pipeline sections & operational metrics
    let [
      completedRows,
      driveInProgressRows,
      inDriveRows,
      inProgressRows,
      pipelineRows,
      topCompaniesRows,
      rejectedCompaniesRows,
      onHoldByCollegeRows,
      onHoldByHrRows,
      totalCalls,
      positiveCalls,
      notHiringCalls,
      totalJds,
    ] = await Promise.all([
      WeeklyTracker.find({ ...wtFilter, pipeline_section: 'completed' }).sort({ created_at: -1 }),
      WeeklyTracker.find({ ...wtFilter, pipeline_section: 'drive_in_progress' }).sort({ created_at: -1 }),
      WeeklyTracker.find({ ...wtFilter, pipeline_section: { $in: ['in_drive', 'companies_in_drive', 'upcoming_drives'] } }).sort({ drive_date: 1, created_at: -1, company_name: 1 }),
      WeeklyTracker.find({ ...wtFilter, pipeline_section: 'in_progress' }).sort({ created_at: -1 }),
      WeeklyTracker.find({ ...wtFilter, pipeline_section: { $in: ['pipeline', 'top_companies'] } }).sort({ created_at: -1 }),
      WeeklyTracker.find({
        ...wtFilter,
        $or: [{ pipeline_section: 'top_companies' }, { is_pinned_top: true }],
      }).sort({ created_at: -1 }),
      WeeklyTracker.find({
        ...wtFilter,
        pipeline_section: { $in: ['rejected_companies', 'rejected_by_hr'] },
      }).sort({ created_at: -1 }),
      WeeklyTracker.find({
        ...wtFilter,
        pipeline_section: { $in: ['on_hold_by_college', 'rejected_by_college'] },
      }).sort({ created_at: -1 }),
      WeeklyTracker.find({
        ...wtFilter,
        pipeline_section: 'on_hold_by_hr',
      }).sort({ created_at: -1 }),
      DailyTracker.countDocuments(dtFilter),
      DailyTracker.countDocuments({ ...dtFilter, outcome_status: { $in: POSITIVE_OUTCOMES } }),
      DailyTracker.countDocuments({ ...dtFilter, outcome_status: { $in: ['not_hiring', 'hiring_freezed'] } }),
      DailyLead.countDocuments({ ...dlFilter, lead_type: 'jd_received' }),
    ]);

    // Fallback: If 0 rows found and an academic year filter was applied, search all records for that college
    if (
      completedRows.length === 0 &&
      driveInProgressRows.length === 0 &&
      inDriveRows.length === 0 &&
      inProgressRows.length === 0 &&
      pipelineRows.length === 0 &&
      topCompaniesRows.length === 0 &&
      rejectedCompaniesRows.length === 0 &&
      onHoldByCollegeRows.length === 0 &&
      onHoldByHrRows.length === 0 &&
      wtFilter.academic_year
    ) {
      const fallbackFilter = { ...wtFilter };
      delete fallbackFilter.academic_year;
      const [fCompleted, fDriveInProgress, fInDrive, fInProgress, fPipeline, fTopCompanies, fRejectedCompanies, fOnHoldByCollege, fOnHoldByHr] = await Promise.all([
        WeeklyTracker.find({ ...fallbackFilter, pipeline_section: 'completed' }).sort({ created_at: -1 }),
        WeeklyTracker.find({ ...fallbackFilter, pipeline_section: 'drive_in_progress' }).sort({ created_at: -1 }),
        WeeklyTracker.find({ ...fallbackFilter, pipeline_section: { $in: ['in_drive', 'companies_in_drive', 'upcoming_drives'] } }).sort({ drive_date: 1, created_at: -1, company_name: 1 }),
        WeeklyTracker.find({ ...fallbackFilter, pipeline_section: 'in_progress' }).sort({ created_at: -1 }),
        WeeklyTracker.find({ ...fallbackFilter, pipeline_section: { $in: ['pipeline', 'top_companies'] } }).sort({ created_at: -1 }),
        WeeklyTracker.find({
          ...fallbackFilter,
          $or: [{ pipeline_section: 'top_companies' }, { is_pinned_top: true }],
        }).sort({ created_at: -1 }),
        WeeklyTracker.find({
          ...fallbackFilter,
          pipeline_section: { $in: ['rejected_companies', 'rejected_by_hr'] },
        }).sort({ created_at: -1 }),
        WeeklyTracker.find({
          ...fallbackFilter,
          pipeline_section: { $in: ['on_hold_by_college', 'rejected_by_college'] },
        }).sort({ created_at: -1 }),
        WeeklyTracker.find({
          ...fallbackFilter,
          pipeline_section: 'on_hold_by_hr',
        }).sort({ created_at: -1 }),
      ]);
      completedRows = fCompleted;
      driveInProgressRows = fDriveInProgress;
      inDriveRows = fInDrive;
      inProgressRows = fInProgress;
      pipelineRows = fPipeline;
      topCompaniesRows = fTopCompanies;
      rejectedCompaniesRows = fRejectedCompanies;
      onHoldByCollegeRows = fOnHoldByCollege;
      onHoldByHrRows = fOnHoldByHr;
    }

    // Apply frontend-selected rows or server-side CTC/column filters if provided
    if (custom_weekly_companies && typeof custom_weekly_companies === 'object') {
      if (Array.isArray(custom_weekly_companies.completed)) completedRows = custom_weekly_companies.completed;
      if (Array.isArray(custom_weekly_companies.drive_in_progress)) driveInProgressRows = custom_weekly_companies.drive_in_progress;
      if (Array.isArray(custom_weekly_companies.in_drive)) inDriveRows = custom_weekly_companies.in_drive;
      if (Array.isArray(custom_weekly_companies.upcoming_drives)) inDriveRows = custom_weekly_companies.upcoming_drives;
      if (Array.isArray(custom_weekly_companies.in_progress)) inProgressRows = custom_weekly_companies.in_progress;
      if (Array.isArray(custom_weekly_companies.pipeline)) pipelineRows = custom_weekly_companies.pipeline;
      if (Array.isArray(custom_weekly_companies.top_companies)) topCompaniesRows = custom_weekly_companies.top_companies;
      if (Array.isArray(custom_weekly_companies.rejected_companies)) rejectedCompaniesRows = custom_weekly_companies.rejected_companies;
      if (Array.isArray(custom_weekly_companies.on_hold_by_college)) onHoldByCollegeRows = custom_weekly_companies.on_hold_by_college;
      if (Array.isArray(custom_weekly_companies.on_hold_by_hr)) onHoldByHrRows = custom_weekly_companies.on_hold_by_hr;
    } else if (min_ctc || company_name_filter || company_type_filter || status_filter) {
      const minCtcVal = min_ctc ? Number(min_ctc) : null;
      const inclComp = Boolean(include_competitive_ctc);
      const nameQ = (company_name_filter || '').toLowerCase().trim();
      const typeQ = (company_type_filter || '').toLowerCase().trim();
      const statusQ = (status_filter || '').toLowerCase().trim();

      const filterItem = (r: any) => {
        if (minCtcVal && !matchesMinCtcHelper(r.ctc_lpa || r.ctc, minCtcVal, inclComp)) return false;
        if (nameQ && !(r.company_name || '').toLowerCase().includes(nameQ)) return false;
        if (typeQ && typeQ !== 'all' && !(r.company_type || '').toLowerCase().includes(typeQ)) return false;
        if (statusQ && statusQ !== 'all') {
          const text = ((r.current_status_text || r.status || '') + ' ' + (r.remarks || '')).toLowerCase();
          if (!text.includes(statusQ)) return false;
        }
        return true;
      };

      completedRows = completedRows.filter(filterItem);
      driveInProgressRows = driveInProgressRows.filter(filterItem);
      inDriveRows = inDriveRows.filter(filterItem);
      inProgressRows = inProgressRows.filter(filterItem);
      pipelineRows = pipelineRows.filter(filterItem);
      topCompaniesRows = topCompaniesRows.filter(filterItem);
      rejectedCompaniesRows = rejectedCompaniesRows.filter(filterItem);
      onHoldByCollegeRows = onHoldByCollegeRows.filter(filterItem);
      onHoldByHrRows = onHoldByHrRows.filter(filterItem);
    }

    const totalOffers = completedRows.reduce((sum, r) => sum + (r.selected_count || 0), 0);

    // Build the Generated Report Document Schema
    const reportDocument = {
      template_type,
      min_ctc: min_ctc ? Number(min_ctc) : null,
      filter_applied: min_ctc ? `CTC ≥ ${min_ctc} LPA` : (company_name_filter ? `Company: ${company_name_filter}` : undefined),
      report_title:
        template_type === 'weekly_placement'
          ? 'Weekly Placement Report'
          : template_type === 'monthly_placement'
          ? `Monthly Placement Review — ${academic_year} Season`
          : 'Placement Operations Report',
      report_period: (week_label && !String(week_label).toLowerCase().includes('cumulative')) ? String(week_label).trim() : '',
      include_prepared_by: include_prepared_by !== false,
      generated_by: (include_prepared_by === false) ? '' : (prepared_by || coordinator?.full_name || 'Placement Coordinator'),
      active_leads_columns: active_leads_columns || { colleges: true, role: true, ctc: true },
      generated_date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      theme: theme || 'blue',
      branding: {
        company_name: 'Infoziant IT Solutions Inc.',
        company_logo: '/infoziant-head.png',
        college_name: targetCollege?.college_name || 'Consolidated Partner Institutions',
        college_code: targetCollege?.college_code || 'iPOMS',
        college_logo: resolveCollegeLogoUrl(targetCollege),
        confidential_notice: 'Prepared by Infoziant',
      },
      kpi_summary: {
        total_calls: totalCalls,
        positive_responses: positiveCalls,
        not_hiring: notHiringCalls,
        jds_received: totalJds,
        drives_completed: completedRows.length,
        drive_in_progress: driveInProgressRows.length,
        drives_in_drive: inDriveRows.length,
        upcoming_drives: inDriveRows.length,
        drives_in_progress: inProgressRows.length,
        pipeline_leads: pipelineRows.length,
        top_companies_count: topCompaniesRows.length,
        rejected_companies_count: rejectedCompaniesRows.length,
        on_hold_by_college_count: onHoldByCollegeRows.length,
        on_hold_by_hr_count: onHoldByHrRows.length,
        total_offers: totalOffers,
      },
      sections: {
        completed_companies: completedRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || '—',
          company_type: r.company_type || 'Software / IT',
          ctc_lpa: r.ctc_lpa || 'Competitive',
          selected_count: r.selected_count || 0,
          current_status_text: r.current_status_text || 'Completed',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
        drive_in_progress: driveInProgressRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || (r as any).role || '—',
          company_type: r.company_type || 'Software / IT',
          ctc_lpa: r.ctc_lpa || 'Competitive',
          status: r.current_status_text || 'Drive in progress',
          current_status_text: r.current_status_text || 'Drive in progress',
          drive_date: r.drive_date ? new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
        companies_in_drive: inDriveRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || (r as any).role || '—',
          company_type: r.company_type || 'Software / IT',
          ctc_lpa: r.ctc_lpa || 'Competitive',
          status: r.current_status_text || (r.drive_date ? `Drive on ${new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Upcoming Drive'),
          current_status_text: r.current_status_text || (r.drive_date ? `Drive on ${new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Upcoming Drive'),
          drive_date: r.drive_date ? new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
        upcoming_drives: inDriveRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || (r as any).role || '—',
          company_type: r.company_type || 'Software / IT',
          ctc_lpa: r.ctc_lpa || 'Competitive',
          status: r.current_status_text || (r.drive_date ? `Drive on ${new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Upcoming Drive'),
          current_status_text: r.current_status_text || (r.drive_date ? `Drive on ${new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Upcoming Drive'),
          drive_date: r.drive_date ? new Date(r.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
        in_progress: inProgressRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || '—',
          company_type: r.company_type || 'Software / IT',
          ctc_lpa: r.ctc_lpa || 'To be finalized',
          current_status_text: r.current_status_text || 'In Progress',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Scheduled',
        })),
        pipeline: pipelineRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || '—',
          company_type: r.company_type || 'Corporate',
          ctc_lpa: r.ctc_lpa || 'Awaiting JD',
          current_status_text: r.current_status_text || 'Pipeline',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
        top_companies: topCompaniesRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || '—',
          company_type: r.company_type || 'Corporate',
          ctc_lpa: r.ctc_lpa || 'Competitive',
          current_status_text: r.current_status_text || 'Target Top Company',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
        rejected_companies: rejectedCompaniesRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || '—',
          company_type: r.company_type || 'Corporate',
          ctc_lpa: r.ctc_lpa || '—',
          current_status_text: r.current_status_text || 'Rejected Company',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
        on_hold_by_college: onHoldByCollegeRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || '—',
          company_type: r.company_type || 'Corporate',
          ctc_lpa: r.ctc_lpa || '—',
          current_status_text: r.current_status_text || 'On Hold By College',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
        on_hold_by_hr: onHoldByHrRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || '—',
          company_type: r.company_type || 'Corporate',
          ctc_lpa: r.ctc_lpa || '—',
          current_status_text: r.current_status_text || 'On Hold By HR',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
        rejected_by_college: onHoldByCollegeRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role || '—',
          company_type: r.company_type || 'Corporate',
          ctc_lpa: r.ctc_lpa || '—',
          current_status_text: r.current_status_text || 'On Hold By College',
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        })),
      },
      insights: [
        `Operational Velocity: Contacted corporate leads resulted in ${completedRows.length} completed drives with ${totalOffers} offers placed.`,
        `Active Drives: ${inDriveRows.length} companies currently conducting evaluation rounds and tests.`,
        `Active Pipeline: ${inProgressRows.length} drives currently underway with technical rounds in progress.`,
        `Targeting: ${topCompaniesRows.length} premium top companies lined up for high CTC recruitment drives.`,
        `Lead Conversion: ${totalJds} Job Descriptions secured and circulated to students for registration.`,
      ],
      remarks: custom_remarks || 'All recruitment drives are proceeding as per placement schedule. Follow-ups with upcoming product companies remain active.',
      included_sections: included_sections || {
        kpi_summary: true,
        completed_companies: true,
        drive_in_progress: true,
        companies_in_drive: true,
        upcoming_drives: true,
        in_progress: true,
        pipeline: true,
        top_companies: true,
        rejected_companies: true,
        on_hold_by_college: true,
        on_hold_by_hr: true,
        rejected_by_college: true,
        insights: true,
        remarks: true,
      },
      included_kpi_cards: kpi_cards || included_kpi_cards || {
        total_calls: true,
        positive_responses: true,
        not_hiring: true,
        jds_received: true,
      },
    };

    return res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: { report: reportDocument },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to generate report' },
    });
  }
});

// ── RA-6: POST /api/v1/reports/presets
// Save Custom Builder Configuration Preset (Spec Section 12)
app.post('/api/v1/reports/presets', async (req: Request, res: Response) => {
  try {
    const {
      template_type,
      preset_name,
      college_id,
      coordinator_id,
      academic_year,
      filters,
      included_sections,
      custom_remarks,
      theme,
    } = req.body;

    if (!template_type || !preset_name || !coordinator_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'template_type, preset_name, and coordinator_id are required' },
      });
    }

    const preset = await ReportLibrary.create({
      template_type,
      preset_name: preset_name.trim(),
      college_id: college_id && college_id !== 'all' ? new Types.ObjectId(String(college_id)) : null,
      coordinator_id: new Types.ObjectId(String(coordinator_id)),
      academic_year: academic_year ?? (await getCurrentAcademicYear()),
      filters: filters || {},
      included_sections: included_sections || {},
      custom_remarks: custom_remarks?.trim() || '',
      theme: theme || 'blue',
    });

    const populated = await ReportLibrary.findById(preset._id)
      .populate('college_id', 'college_name college_code')
      .populate('coordinator_id', 'full_name official_email');

    return res.status(201).json({
      success: true,
      message: 'Report preset saved to library successfully',
      data: populated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to save report preset' },
    });
  }
});

// ── RA-7: GET /api/v1/reports/presets
// List Saved Report Presets
app.get('/api/v1/reports/presets', async (req: Request, res: Response) => {
  try {
    const { template_type, college_id, coordinator_id } = req.query;

    const filter: any = { is_deleted: false };
    if (template_type) filter.template_type = template_type;
    if (college_id && college_id !== 'all') filter.college_id = new Types.ObjectId(String(college_id));
    if (coordinator_id) filter.coordinator_id = new Types.ObjectId(String(coordinator_id));

    const presets = await ReportLibrary.find(filter)
      .sort({ created_at: -1 })
      .populate('college_id', 'college_name college_code')
      .populate('coordinator_id', 'full_name official_email');

    return res.status(200).json({
      success: true,
      data: {
        total: presets.length,
        presets,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch presets' },
    });
  }
});

// ── RA-8: DELETE /api/v1/reports/presets/:id
// Soft delete a report preset
app.delete('/api/v1/reports/presets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const preset = await ReportLibrary.findById(id);

    if (!preset || preset.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report preset not found' },
      });
    }

    preset.is_deleted = true;
    preset.deleted_at = new Date();
    await preset.save();

    return res.status(200).json({
      success: true,
      message: `Preset "${preset.preset_name}" deleted from library`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete preset' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 07 — ROLE-BASED DASHBOARD & ASSIGNED WORK ENDPOINTS
// Spec: Module_07_Role_Based_Dashboard_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Time-Aware Personalized Greeting (Spec Section 7.1).
 *
 * Returns a `period` token rather than an emoji glyph. Two reasons: the client
 * owns the icon system (drawn lucide icons, one consistent stroke — an emoji is
 * a font-dependent glyph, not an icon), and shipping emoji through the JSON
 * response was rendering as mojibake ("ð") wherever the
 * transport charset disagreed with the source file's encoding.
 */
type GreetingPeriod =
  | 'midnight'
  | 'wee_hours'
  | 'dawn'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'early_evening'
  | 'dusk'
  | 'evening'
  | 'night';

function getTimeGreeting(fullName: string): { greeting: string; period: GreetingPeriod; subtext: string } {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;
  const rawFirst = fullName.split(' ')[0] || fullName;
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);

  // 1. Midnight: 12:00 AM to 12:59 AM (0 to < 60 mins)
  if (totalMinutes < 60) {
    return {
      greeting: `Midnight Check-In, ${firstName}`,
      period: 'midnight',
      subtext: 'Start of a new calendar date — reviewing overnight placement queues.',
    };
  }
  // 2. Wee hours / Early morning: 1:00 AM to 4:59 AM (60 to < 300 mins)
  else if (totalMinutes < 300) {
    return {
      greeting: `Working In The Wee Hours, ${firstName}`,
      period: 'wee_hours',
      subtext: 'The very early dark hours — quiet time for strategic operations.',
    };
  }
  // 3. Dawn / Daybreak: 5:00 AM to 5:59 AM (300 to < 360 mins)
  else if (totalMinutes < 360) {
    return {
      greeting: `Dawn & Daybreak Greetings, ${firstName}`,
      period: 'dawn',
      subtext: 'First early light in the sky — gearing up for fresh campus drives.',
    };
  }
  // 4. Morning / Sunrise: 6:00 AM to 11:59 AM (360 to < 720 mins)
  else if (totalMinutes < 720) {
    return {
      greeting: `Good Morning, ${firstName}`,
      period: 'morning',
      subtext: 'The start of the day — active outreach across partner colleges.',
    };
  }
  // 5. Noon / Midday: 12:00 PM to 12:59 PM (720 to < 780 mins)
  else if (totalMinutes < 780) {
    return {
      greeting: `Good Midday, ${firstName}`,
      period: 'midday',
      subtext: 'Midday check — reviewing morning call logs and afternoon targets.',
    };
  }
  // 6. Afternoon: 1:00 PM to 4:59 PM (780 to < 1020 mins)
  else if (totalMinutes < 1020) {
    return {
      greeting: `Good Afternoon, ${firstName}`,
      period: 'afternoon',
      subtext: 'Mid-day corporate follow-ups and candidate interview rounds.',
    };
  }
  // 7. Twilight: 5:00 PM to 5:59 PM (1020 to < 1080 mins)
  else if (totalMinutes < 1080) {
    return {
      greeting: `Good Twilight, ${firstName}`,
      period: 'early_evening',
      subtext: 'Twilight transitions — wrapping up afternoon outreach and preparing evening reports.',
    };
  }
  // 8. Dusk / Twilight: 6:00 PM to 6:59 PM (1080 to < 1140 mins)
  else if (totalMinutes < 1140) {
    return {
      greeting: `Good Evening (Dusk), ${firstName}`,
      period: 'dusk',
      subtext: 'Dusk operational review — the sunset twilight before nightfall.',
    };
  }
  // 9. Evening: 7:00 PM to 7:59 PM (1140 to < 1200 mins)
  else if (totalMinutes < 1200) {
    return {
      greeting: `Good Evening, ${firstName}`,
      period: 'evening',
      subtext: 'Wrapping up today\'s call logs and positive corporate leads.',
    };
  }
  // 10. Night: 8:00 PM to 11:59 PM (1200 to 1439 mins)
  else {
    return {
      greeting: `Good Night, ${firstName}`,
      period: 'night',
      subtext: 'Night review — ensure all daily logs and tracker rows are finalized.',
    };
  }
}

/**
 * Campus Outcome Mix buckets (user decision, 21 Sep 2026). Every one of the 12
 * CallOutcome values maps somewhere, so a campus's segments always sum to its
 * call count. Positive stays invite_mail only, matching POSITIVE_OUTCOMES and
 * every other dashboard/report. Rows with no outcome chosen yet are 'pending'.
 */
type OutcomeBucket = 'positive' | 'not_hiring' | 'negative' | 'follow_up' | 'other_progress' | 'pending';
const OUTCOME_BUCKET: Record<string, OutcomeBucket> = {
  invite_mail: 'positive',
  not_hiring: 'not_hiring',
  hiring_freezed: 'not_hiring',
  no_response: 'negative',
  invalid: 'negative',
  in_connect: 'negative',
  hiring_completed: 'negative',
  follow_up: 'follow_up',
  call_back: 'follow_up',
  jd_received: 'other_progress',
  hiring: 'other_progress',
  drive_completed: 'other_progress',
};

/**
 * Determines whether a DailyTracker row represents a completed call.
 * A call is completed ONLY when its status/outcome is set (and not empty/pending),
 * or when duration_seconds > 0, or when call start/end times are recorded.
 * Loaded/uncalled rows with no status updated are NOT counted as completed calls.
 */
function isTrackerRowCompleted(row: any): boolean {
  if (!row) return false;
  if (row.is_skipped) return false;

  const status = String(row.outcome_status || '').trim().toLowerCase();
  if (status !== '' && status !== 'null' && status !== 'undefined' && status !== 'pending') {
    return true;
  }

  if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
    return true;
  }

  if (row.call_start_time || row.call_end_time) {
    return true;
  }

  return false;
}

/**
 * Returns the timestamp when a call's status update or completion occurred.
 * Priority order: call_end_time -> call_start_time -> last_saved_at -> updated_at -> created_at -> session_date
 */
function getTrackerCompletionTimestamp(row: any): Date {
  const ts = row.call_end_time || row.call_start_time || row.last_saved_at || row.updated_at || row.created_at || row.session_date;
  return ts ? new Date(ts) : new Date();
}

// ── DB-1: GET /api/v1/dashboard/coordinator
// Coordinator Dashboard (Spec Section 5.1 & 7) — "What should I do today?"
app.get('/api/v1/dashboard/coordinator', async (req: Request, res: Response) => {
  try {
    // Ownership scoping: a coordinator is pinned to their own id no matter what
    // the query string asks for. Only a Team Leader / Administrator may name
    // someone else. Trusting `?coordinator_id=` outright let any coordinator
    // read any other's dashboard, which Module 07 §11 explicitly forbids.
    const coordinatorId = scopeToSelf(req, req.query.coordinator_id as string | undefined);

    let coordinator: any = null;
    if (coordinatorId) {
      coordinator = await User.findById(coordinatorId);
    }
    if (!coordinator) {
      coordinator = await User.findOne({ role_code: 'placement_coordinator' }) || {
        _id: new Types.ObjectId(),
        full_name: 'A. Mohanaradha',
        role_code: 'placement_coordinator',
      };
    }

    const greetingData = getTimeGreeting(coordinator.full_name);

    // Fetch Priority Notification (CEO / Director / TL broadcast)
    const priorityNotification = {
      id: 'notif-1',
      sender_name: 'CEO Office / Placement Director',
      sender_role: 'director',
      title: 'Priority Focus: Core Engineering Campus Drives',
      message: 'Please prioritize AAA College of Engineering and Technology follow-ups for scheduled technical interviews today.',
      priority: 'high',
      created_at: new Date(),
    };

    // Fetch Active Assigned Work items (sorted by priority high > medium > low)
    const activeAssignments = await AssignedWork.find({
      assigned_to_coordinator_id: coordinator._id,
      is_completed: false,
      is_deleted: false,
    })
      .sort({ priority: 1, created_at: -1 })
      .populate('sender_tl_id', 'full_name official_email')
      .populate('college_id', 'college_name college_code');

    // Fetch Assigned / Supervised College (Priority College)
    const priorityCollege = await College.findOne({ status: 'active' });

    // Today's Date Filter
    const today = getTodayDate();

    // Company pipeline stage counts. WeeklyTracker.pipeline_section is the
    // single source of truth for where a company sits in the funnel — the same
    // field the Weekly Placement Report groups by, so the dashboard headline
    // and the report a coordinator exports can never disagree.
    const pipelineFilter = { coordinator_id: coordinator._id, is_deleted: false };
    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(today);
    dayEnd.setHours(23, 59, 59, 999);

    const [todayTrackerRows, todayJds, pendingFollowUps] = await Promise.all([
      DailyTracker.find({
        coordinator_id: coordinator._id,
        $or: [
          { session_date: { $gte: dayStart, $lte: dayEnd } },
          { created_at: { $gte: dayStart, $lte: dayEnd } },
          { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1, day: today.getUTCDate() },
        ],
      }).select('duration_seconds call_start_time call_end_time outcome_status created_at updated_at last_saved_at session_date is_skipped').lean(),
      DailyLead.countDocuments({
        coordinator_id: coordinator._id,
        lead_type: 'jd_received',
        is_deleted: false,
      }),
      WeeklyTracker.countDocuments({
        coordinator_id: coordinator._id,
        is_deleted: false,
        follow_up_date: {
          $gte: dayStart,
          $lte: dayEnd,
        },
      }),
    ]);

    let totalDurationSeconds = 0;
    const completedTrackerRows = todayTrackerRows.filter((r) => isTrackerRowCompleted(r));
    const todayCalls = completedTrackerRows.length;
    let todayPositives = 0;
    const todayOutcomes = {
      positive: 0,
      not_hiring: 0,
      negative: 0,
      follow_up: 0,
    };

    // When each call actually happened, bucketed by IST hour (0-23). Drives the
    // dashboard's hourly rhythm bars. Explicit +05:30 rather than getHours(),
    // matching positiveSyncReminder.ts — getHours() would silently report UTC
    // hours (5.5h off) the moment this runs on a server that isn't set to IST.
    const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
    const hourlyCalls: number[] = new Array(24).fill(0);
    const hourlyPositives: number[] = new Array(24).fill(0);

    for (const row of completedTrackerRows) {
      let dur = 0;
      if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
        dur = row.duration_seconds;
      } else if (row.call_start_time && row.call_end_time) {
        const startMs = new Date(row.call_start_time).getTime();
        const endMs = new Date(row.call_end_time).getTime();
        if (endMs > startMs) {
          dur = Math.floor((endMs - startMs) / 1000);
        }
      }
      totalDurationSeconds += dur;
      const isPositive = row.outcome_status && POSITIVE_OUTCOMES.includes(row.outcome_status as any);
      if (isPositive) {
        todayPositives++;
      }

      const b = OUTCOME_BUCKET[String(row.outcome_status || '')];
      if (b === 'positive') todayOutcomes.positive++;
      else if (b === 'not_hiring') todayOutcomes.not_hiring++;
      else if (b === 'negative') todayOutcomes.negative++;
      else if (b === 'follow_up') todayOutcomes.follow_up++;

      const stamp = getTrackerCompletionTimestamp(row);
      const t = stamp.getTime();
      if (!isNaN(t)) {
        const hour = new Date(t + IST_OFFSET_MS).getUTCHours();
        hourlyCalls[hour]++;
        if (isPositive) {
          hourlyPositives[hour]++;
        }
      }
    }

    const clockDurationInfo = formatDurationClock(totalDurationSeconds);
    const avgDurationSeconds = todayCalls > 0 ? Math.round(totalDurationSeconds / todayCalls) : 0;
    const avgDurationInfo = formatDurationClock(avgDurationSeconds);

    // Company funnel — "how many companies are at each stage, and how many did
    // I actually speak to today". `companies_talked_today` counts DISTINCT
    // companies, not call rows: three calls chasing one HR is one company
    // reached, and counting rows would flatter the number.
    const [companiesCompleted, companiesInProgress, companiesPipeline, companiesTalkedToday] =
      await Promise.all([
        WeeklyTracker.countDocuments({ ...pipelineFilter, pipeline_section: 'completed' }),
        WeeklyTracker.countDocuments({ ...pipelineFilter, pipeline_section: 'in_progress' }),
        WeeklyTracker.countDocuments({ ...pipelineFilter, pipeline_section: 'pipeline' }),
        DailyTracker.distinct('company_name', {
          coordinator_id: coordinator._id,
          is_skipped: false,
          outcome_status: { $nin: [null, ''] },
          $or: [
            { session_date: { $gte: dayStart, $lte: dayEnd } },
            { created_at: { $gte: dayStart, $lte: dayEnd } },
            { year: today.getUTCFullYear(), month: today.getUTCMonth() + 1, day: today.getUTCDate() },
          ],
        }).then((names) => names.filter(Boolean).length),
      ]);

    // Top 3 Focused Tasks for Today (Spec Section 7.5)
    const todayTasks = [
      {
        id: 'task-1',
        title: 'Complete 30 Daily Tracker Call Logs',
        progress: `${todayCalls} / 30 Calls`,
        completed: todayCalls >= 30,
        target_route: '/tracker',
      },
      {
        id: 'task-2',
        title: `Follow up with scheduled corporate leads (${pendingFollowUps} pending)`,
        progress: `${pendingFollowUps} Due Today`,
        completed: pendingFollowUps === 0,
        target_route: '/weekly-tracker',
      },
      {
        id: 'task-3',
        title: 'Finalize and Submit Daily Leads Register',
        progress: `${todayJds} JDs in hand`,
        completed: false,
        target_route: '/daily-leads',
      },
    ];

    // Operational Insights
    const insights = [
      `Active workload: ${activeAssignments.length} pending assigned tasks from Team Leader.`,
      `Today's Positive Rate: ${todayCalls > 0 ? Math.round((todayPositives / todayCalls) * 100) : 0}% outreach success.`,
      pendingFollowUps > 0 ? `${pendingFollowUps} high-priority company follow-ups scheduled for today.` : 'All scheduled follow-ups are clear for today.',
    ];

    return res.status(200).json({
      success: true,
      data: {
        coordinator: {
          id: coordinator._id,
          name: coordinator.full_name,
          role: coordinator.role_code,
        },
        greeting: greetingData,
        priority_notification: priorityNotification,
        assigned_work: activeAssignments,
        priority_college: priorityCollege
          ? {
              id: priorityCollege._id,
              name: priorityCollege.college_name,
              code: priorityCollege.college_code,
              calls_today: todayCalls,
              pending_follow_ups: pendingFollowUps,
            }
          : null,
        today_tasks: todayTasks,
        clock_duration: {
          today_seconds: totalDurationSeconds,
          today_formatted: clockDurationInfo.formatted,
          hours: clockDurationInfo.hours,
          minutes: clockDurationInfo.minutes,
          seconds: clockDurationInfo.seconds,
          today_calls_count: todayCalls,
          avg_call_duration_seconds: avgDurationSeconds,
          avg_call_duration_formatted: avgDurationInfo.formatted,
          positive_calls_count: todayPositives,
          outcomes: todayOutcomes,
          // 24 slots, index = IST hour. Real counts only — an empty day is all
          // zeros, never a placeholder shape.
          hourly_calls: hourlyCalls,
          hourly_positives: hourlyPositives,
        },
        kpi_summary: {
          // Company funnel — the coordinator's headline numbers.
          companies_completed: companiesCompleted,
          companies_in_progress: companiesInProgress,
          companies_pipeline: companiesPipeline,
          companies_talked_today: companiesTalkedToday,
          // Call-level activity, retained for the day-progress rail.
          calls_assigned: 30,
          calls_completed: todayCalls,
          positive_responses: todayPositives,
          jds_received: todayJds,
          pending_follow_ups: pendingFollowUps,
          today_call_duration_seconds: totalDurationSeconds,
          today_call_duration_formatted: clockDurationInfo.formatted,
        },
        insights,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch coordinator dashboard' },
    });
  }
});

// ── DB-1.1: GET /api/v1/dashboard/coordinator/clock-duration
// Dedicated calling time & hourly rhythm for any specific date
app.get('/api/v1/dashboard/coordinator/clock-duration', async (req: Request, res: Response) => {
  try {
    const coordinatorId = scopeToSelf(req, req.query.coordinator_id as string | undefined);
    const dateParam = (req.query.date as string) || '';

    let coordinator: any = null;
    if (coordinatorId) {
      coordinator = await User.findById(coordinatorId);
    }
    if (!coordinator) {
      coordinator = (await User.findOne({ role_code: 'placement_coordinator' })) || {
        _id: new Types.ObjectId(),
        full_name: 'A. Mohanaradha',
        role_code: 'placement_coordinator',
      };
    }

    // Determine requested date (IST midnight bounds)
    let targetDate = getTodayDate();
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split('-').map(Number);
      targetDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    }

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const targetYear = targetDate.getUTCFullYear();
    const targetMonth = targetDate.getUTCMonth() + 1;
    const targetDay = targetDate.getUTCDate();

    // Query daily tracker rows for this coordinator and date
    const trackerRows = await DailyTracker.find({
      coordinator_id: coordinator._id,
      $or: [
        { session_date: { $gte: dayStart, $lte: dayEnd } },
        { created_at: { $gte: dayStart, $lte: dayEnd } },
        { year: targetYear, month: targetMonth, day: targetDay },
      ],
    })
      .populate('college_id', 'college_name college_code')
      .select('duration_seconds call_start_time call_end_time outcome_status created_at updated_at last_saved_at session_date college_id is_skipped')
      .lean();

    let totalDurationSeconds = 0;
    const completedTrackerRows = trackerRows.filter((r) => isTrackerRowCompleted(r));
    const totalCalls = completedTrackerRows.length;
    let positiveCalls = 0;
    const dayOutcomes = {
      positive: 0,
      not_hiring: 0,
      negative: 0,
      follow_up: 0,
    };
    const hourlyCalls = new Array(24).fill(0);
    const hourlyPositives = new Array(24).fill(0);
    const collegeMap = new Map<string, { college_id: string; college_name: string; college_code: string; duration_seconds: number; calls_count: number; positive_count: number }>();

    for (const row of completedTrackerRows) {
      let dur = 0;
      if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
        dur = row.duration_seconds;
      } else if (row.call_start_time && row.call_end_time) {
        const startMs = new Date(row.call_start_time).getTime();
        const endMs = new Date(row.call_end_time).getTime();
        if (endMs > startMs) {
          dur = Math.floor((endMs - startMs) / 1000);
        }
      }
      totalDurationSeconds += dur;
      const isPositive = row.outcome_status && POSITIVE_OUTCOMES.includes(row.outcome_status as any);
      if (isPositive) {
        positiveCalls++;
      }

      const b = OUTCOME_BUCKET[String(row.outcome_status || '')];
      if (b === 'positive') dayOutcomes.positive++;
      else if (b === 'not_hiring') dayOutcomes.not_hiring++;
      else if (b === 'negative') dayOutcomes.negative++;
      else if (b === 'follow_up') dayOutcomes.follow_up++;

      const stamp = getTrackerCompletionTimestamp(row);
      const t = stamp.getTime();
      if (!isNaN(t)) {
        const hour = new Date(t + IST_OFFSET_MS).getUTCHours();
        hourlyCalls[hour]++;
        if (isPositive) {
          hourlyPositives[hour]++;
        }
      }

      if (row.college_id) {
        const cId = (row.college_id as any)._id?.toString() || row.college_id.toString();
        const cName = (row.college_id as any).college_name || 'Partner College';
        const cCode = (row.college_id as any).college_code || '';
        const existing = collegeMap.get(cId) || {
          college_id: cId,
          college_name: cName,
          college_code: cCode,
          duration_seconds: 0,
          calls_count: 0,
          positive_count: 0,
        };
        existing.duration_seconds += dur;
        existing.calls_count++;
        if (isPositive) existing.positive_count++;
        collegeMap.set(cId, existing);
      }
    }

    const clockDurationInfo = formatDurationClock(totalDurationSeconds);
    const avgDurationSeconds = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0;
    const avgDurationInfo = formatDurationClock(avgDurationSeconds);

    return res.status(200).json({
      success: true,
      data: {
        date: dateParam || targetDate.toISOString().slice(0, 10),
        today_seconds: totalDurationSeconds,
        today_formatted: clockDurationInfo.formatted,
        hours: clockDurationInfo.hours,
        minutes: clockDurationInfo.minutes,
        seconds: clockDurationInfo.seconds,
        today_calls_count: totalCalls,
        avg_call_duration_seconds: avgDurationSeconds,
        avg_call_duration_formatted: avgDurationInfo.formatted,
        positive_calls_count: positiveCalls,
        outcomes: dayOutcomes,
        hourly_calls: hourlyCalls,
        hourly_positives: hourlyPositives,
        college_breakdown: Array.from(collegeMap.values()),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch clock duration' },
    });
  }
});

// ── DB-1.2: GET /api/v1/dashboard/coordinator/duration-history
// Monthly Breakdown & Yearly Transformation Aggregations
app.get('/api/v1/dashboard/coordinator/duration-history', async (req: Request, res: Response) => {
  try {
    const coordinatorId = scopeToSelf(req, req.query.coordinator_id as string | undefined);
    const view = (req.query.view as string) || 'monthly';
    const reqYear = parseInt(req.query.year as string, 10) || 2026;
    const reqMonth = parseInt(req.query.month as string, 10) || 9; // default September 2026

    let coordinator: any = null;
    if (coordinatorId) {
      coordinator = await User.findById(coordinatorId);
    }
    if (!coordinator) {
      coordinator = (await User.findOne({ role_code: 'placement_coordinator' })) || {
        _id: new Types.ObjectId(),
        full_name: 'A. Mohanaradha',
        role_code: 'placement_coordinator',
      };
    }

    if (view === 'monthly') {
      const daysInMonth = new Date(Date.UTC(reqYear, reqMonth, 0)).getUTCDate();
      const monthStart = new Date(Date.UTC(reqYear, reqMonth - 1, 1, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(reqYear, reqMonth - 1, daysInMonth, 23, 59, 59, 999));

      const trackerRows = await DailyTracker.find({
        coordinator_id: coordinator._id,
        $or: [
          { session_date: { $gte: monthStart, $lte: monthEnd } },
          { created_at: { $gte: monthStart, $lte: monthEnd } },
          { year: reqYear, month: reqMonth },
        ],
      })
        .populate('college_id', 'college_name college_code')
        .select('duration_seconds session_date created_at day year month outcome_status college_id')
        .lean();

      const daysData: Array<{
        day: number;
        date: string;
        day_of_week: string;
        is_weekend: boolean;
        duration_seconds: number;
        duration_formatted: string;
        calls_count: number;
        positive_count: number;
      }> = [];

      const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const collegeMap = new Map<string, { college_id: string; college_name: string; college_code: string; duration_seconds: number; calls_count: number; positive_count: number }>();

      let totalMonthSeconds = 0;
      let totalMonthCalls = 0;
      let totalMonthPositives = 0;
      let workingDaysCount = 0;
      let activeDaysCount = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dObj = new Date(Date.UTC(reqYear, reqMonth - 1, d));
        const dowIndex = dObj.getUTCDay();
        const dow = dayOfWeekNames[dowIndex];
        const isWeekend = dowIndex === 0 || dowIndex === 6;
        if (!isWeekend) workingDaysCount++;

        const dayRows = trackerRows.filter((r) => {
          if (!isTrackerRowCompleted(r)) return false;
          if (r.day === d && (!r.month || r.month === reqMonth) && (!r.year || r.year === reqYear)) return true;
          if (r.session_date) {
            const dt = new Date(r.session_date);
            if (dt.getUTCDate() === d && dt.getUTCMonth() + 1 === reqMonth && dt.getUTCFullYear() === reqYear) return true;
            const istDt = new Date(dt.getTime() + IST_OFFSET_MS);
            if (istDt.getUTCDate() === d && istDt.getUTCMonth() + 1 === reqMonth && istDt.getUTCFullYear() === reqYear) return true;
          }
          if (r.created_at) {
            const cd = new Date(r.created_at);
            const istCd = new Date(cd.getTime() + IST_OFFSET_MS);
            if (istCd.getUTCDate() === d && istCd.getUTCMonth() + 1 === reqMonth && istCd.getUTCFullYear() === reqYear) return true;
          }
          return false;
        });

        let daySeconds = 0;
        let dayCalls = dayRows.length;
        let dayPositives = 0;

        for (const row of dayRows) {
          let dur = 0;
          if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
            dur = row.duration_seconds;
          }
          daySeconds += dur;
          const isPos = row.outcome_status && POSITIVE_OUTCOMES.includes(row.outcome_status as any);
          if (isPos) dayPositives++;

          if (row.college_id) {
            const cId = (row.college_id as any)._id?.toString() || row.college_id.toString();
            const cName = (row.college_id as any).college_name || 'Partner College';
            const cCode = (row.college_id as any).college_code || '';
            const cItem = collegeMap.get(cId) || {
              college_id: cId,
              college_name: cName,
              college_code: cCode,
              duration_seconds: 0,
              calls_count: 0,
              positive_count: 0,
            };
            cItem.duration_seconds += dur;
            cItem.calls_count++;
            if (isPos) cItem.positive_count++;
            collegeMap.set(cId, cItem);
          }
        }

        totalMonthSeconds += daySeconds;
        totalMonthCalls += dayCalls;
        totalMonthPositives += dayPositives;
        if (dayCalls > 0 || daySeconds > 0) activeDaysCount++;

        const dateStr = `${reqYear}-${String(reqMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        daysData.push({
          day: d,
          date: dateStr,
          day_of_week: dow,
          is_weekend: isWeekend,
          duration_seconds: daySeconds,
          duration_formatted: formatDurationClock(daySeconds).formatted,
          calls_count: dayCalls,
          positive_count: dayPositives,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          year: reqYear,
          month: reqMonth,
          month_name: new Date(Date.UTC(reqYear, reqMonth - 1, 1)).toLocaleString('en-US', { month: 'long' }),
          days: daysData,
          college_distribution: Array.from(collegeMap.values()).sort((a, b) => b.duration_seconds - a.duration_seconds),
          summary: {
            total_duration_seconds: totalMonthSeconds,
            total_duration_formatted: formatDurationClock(totalMonthSeconds).formatted,
            total_calls: totalMonthCalls,
            positive_calls: totalMonthPositives,
            working_days_count: workingDaysCount,
            active_days_count: activeDaysCount,
            avg_workday_seconds: workingDaysCount > 0 ? Math.round(totalMonthSeconds / workingDaysCount) : 0,
          },
        },
      });
    }

    // Yearly Transformation View (Baseline: September 2026 onwards)
    const startYear = parseInt(req.query.start_year as string, 10) || 2026;
    const startMonth = parseInt(req.query.start_month as string, 10) || 9;

    const monthsData: Array<{
      year: number;
      month: number;
      month_label: string;
      total_duration_seconds: number;
      total_duration_formatted: string;
      total_calls: number;
      positive_calls: number;
      trend_pct: number | null;
      top_college?: { name: string; duration_formatted: string } | null;
    }> = [];

    let prevMonthSeconds: number | null = null;
    let totalYearSeconds = 0;
    let totalYearCalls = 0;

    for (let i = 0; i < 12; i++) {
      let curMonth = startMonth + i;
      let curYear = startYear;
      while (curMonth > 12) {
        curMonth -= 12;
        curYear += 1;
      }

      const daysInM = new Date(Date.UTC(curYear, curMonth, 0)).getUTCDate();
      const mStart = new Date(Date.UTC(curYear, curMonth - 1, 1, 0, 0, 0));
      const mEnd = new Date(Date.UTC(curYear, curMonth - 1, daysInM, 23, 59, 59, 999));

      const rows = await DailyTracker.find({
        coordinator_id: coordinator._id,
        $or: [
          { session_date: { $gte: mStart, $lte: mEnd } },
          { year: curYear, month: curMonth },
        ],
      })
        .populate('college_id', 'college_name college_code')
        .select('duration_seconds outcome_status college_id')
        .lean();

      const completedRows = rows.filter((r) => isTrackerRowCompleted(r));
      let mSecs = 0;
      let mCalls = completedRows.length;
      let mPos = 0;
      const cMap = new Map<string, { name: string; seconds: number }>();

      for (const r of completedRows) {
        let dur = 0;
        if (typeof r.duration_seconds === 'number' && r.duration_seconds > 0) dur = r.duration_seconds;
        mSecs += dur;
        if (r.outcome_status && POSITIVE_OUTCOMES.includes(r.outcome_status as any)) mPos++;

        if (r.college_id) {
          const name = (r.college_id as any).college_name || 'Partner College';
          const prev = cMap.get(name) || { name, seconds: 0 };
          prev.seconds += dur;
          cMap.set(name, prev);
        }
      }

      totalYearSeconds += mSecs;
      totalYearCalls += mCalls;

      let trendPct: number | null = null;
      if (prevMonthSeconds !== null) {
        if (prevMonthSeconds > 0) {
          trendPct = Math.round(((mSecs - prevMonthSeconds) / prevMonthSeconds) * 100);
        } else if (mSecs > 0) {
          trendPct = 100;
        } else {
          trendPct = 0;
        }
      }
      prevMonthSeconds = mSecs;

      const topC = Array.from(cMap.values()).sort((a, b) => b.seconds - a.seconds)[0];
      const mName = new Date(Date.UTC(curYear, curMonth - 1, 1)).toLocaleString('en-US', { month: 'short' });

      monthsData.push({
        year: curYear,
        month: curMonth,
        month_label: `${mName} ${curYear}`,
        total_duration_seconds: mSecs,
        total_duration_formatted: formatDurationClock(mSecs).formatted,
        total_calls: mCalls,
        positive_calls: mPos,
        trend_pct: trendPct,
        top_college: topC ? { name: topC.name, duration_formatted: formatDurationClock(topC.seconds).formatted } : null,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        baseline_start: `${startYear}-${String(startMonth).padStart(2, '0')}`,
        months: monthsData,
        summary: {
          overall_duration_seconds: totalYearSeconds,
          overall_duration_formatted: formatDurationClock(totalYearSeconds).formatted,
          overall_calls: totalYearCalls,
          months_tracked: monthsData.filter((m) => m.total_calls > 0).length,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch duration history' },
    });
  }
});

// ── GET /api/v1/dashboard/college-kpis
// Coordinator Per-College Focus KPI Cards (Min 1, Max 3 Colleges)
app.get('/api/v1/dashboard/college-kpis', async (req: Request, res: Response) => {
  try {
    const coordinatorId = scopeToSelf(req, req.query.coordinator_id as string | undefined);
    const collegeIdsQuery = req.query.college_ids as string | undefined;

    let coordinator: any = null;
    if (coordinatorId) {
      coordinator = await User.findById(coordinatorId);
    }
    if (!coordinator) {
      coordinator = await User.findOne({ role_code: 'placement_coordinator' }) || {
        _id: new Types.ObjectId(),
        full_name: 'A. Mohanaradha',
      };
    }

    let targetCollegeIds: string[] = [];
    if (collegeIdsQuery) {
      targetCollegeIds = collegeIdsQuery
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);
    }

    // If no college IDs provided, return empty list (no forced default selection)
    if (targetCollegeIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          colleges: [],
          total_selected: 0,
        },
      });
    }

    // ONLY 'invite_mail' is considered as positive out of all call outcomes (user rule)
    const POSITIVE_STATUSES = ['invite_mail'];
    const NEGATIVE_STATUSES = ['invalid', 'no_response', 'hiring_freezed', 'call_back'];
    const NOT_HIRING_STATUSES = ['not_hiring'];

    const sessionDateParam = req.query.date as string | undefined;
    const isAllTime = req.query.all_time === 'true';
    const targetSessionDate = sessionDateParam ? parseDateParam(sessionDateParam) : buildSessionDate();

    const kpiResults = await Promise.all(
      targetCollegeIds.map(async (cIdStr) => {
        let college: any = null;
        if (Types.ObjectId.isValid(cIdStr)) {
          college = await College.findById(cIdStr);
        }
        if (!college) {
          const strippedCode = cIdStr.replace(/^col_/, '');
          college = await College.findOne({
            $or: [
              { college_code: new RegExp(`^${escapeRegex(cIdStr)}$`, 'i') },
              { college_code: new RegExp(`^${escapeRegex(strippedCode)}$`, 'i') },
              { college_name: new RegExp(`^${escapeRegex(cIdStr)}$`, 'i') },
            ],
          });
        }
        if (!college) return null;

        const cObjectId = college._id;
        const coordinatorBaseFilter: any = {
          college_id: cObjectId,
          coordinator_id: coordinator._id,
        };

        // Daily outreach filter for today (resets every morning at 12:00 AM)
        const dailyFilter: any = {
          ...coordinatorBaseFilter,
          ...(isAllTime ? {} : { session_date: targetSessionDate }),
        };

        const [
          totalCalls,
          totalPositives,
          totalNegatives,
          totalNotHiring,
          activeLeadsCount,
          weeklyPipelineCount,
        ] = await Promise.all([
          // Total Calls Made (Today's Daily Outreach)
          DailyTracker.countDocuments({
            ...dailyFilter,
            is_skipped: { $ne: true },
          }),
          // Positives (Today)
          DailyTracker.countDocuments({
            ...dailyFilter,
            outcome_status: { $in: POSITIVE_STATUSES },
          }),
          // Negatives (Today)
          DailyTracker.countDocuments({
            ...dailyFilter,
            outcome_status: { $in: NEGATIVE_STATUSES },
          }),
          // Not Hiring (Today)
          DailyTracker.countDocuments({
            ...dailyFilter,
            outcome_status: { $in: NOT_HIRING_STATUSES },
          }),
          // Daily Leads (Open active leads)
          DailyLead.countDocuments({
            ...coordinatorBaseFilter,
            is_deleted: false,
          }),
          // Weekly in progress/pipeline
          WeeklyTracker.countDocuments({
            ...coordinatorBaseFilter,
            is_deleted: false,
          }),
        ]);

        const positiveRate = totalCalls > 0 ? Math.round((totalPositives / totalCalls) * 100) : 0;

        // One grouped read over exactly the rows totalCalls counted, bucketed
        // with OUTCOME_BUCKET — so the mix can never disagree with the total.
        const outcomeGroups = await DailyTracker.aggregate([
          { $match: { ...dailyFilter, is_skipped: { $ne: true } } },
          { $group: { _id: '$outcome_status', n: { $sum: 1 } } },
        ]);
        const outcomeMix: Record<OutcomeBucket, number> = {
          positive: 0, not_hiring: 0, negative: 0, follow_up: 0, other_progress: 0, pending: 0,
        };
        for (const g of outcomeGroups) {
          const bucket: OutcomeBucket = g._id ? (OUTCOME_BUCKET[g._id] ?? 'other_progress') : 'pending';
          outcomeMix[bucket] += g.n;
        }

        return {
          college_id: college._id,
          college_name: college.college_name,
          college_code: college.college_code,
          outcome_mix: outcomeMix,
          location: college.location || '',
          logo_url: (college as any).logo_url || '',
          total_calls: totalCalls,
          total_positives: totalPositives,
          total_negatives: totalNegatives,
          total_not_hiring: totalNotHiring,
          active_leads: activeLeadsCount,
          weekly_pipeline: weeklyPipelineCount,
          positive_rate: positiveRate,
        };
      })
    );

    const validKpis = kpiResults.filter(Boolean);

    return res.status(200).json({
      success: true,
      data: {
        session_date: targetSessionDate,
        is_daily_refresh: !isAllTime,
        colleges: validKpis,
        total_selected: validKpis.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch college KPIs' },
    });
  }
});

// ── GET /api/v1/dashboard/monthly-calls
// Calls & Duration per day, per campus, for one calendar month (Day 1 to 30/31)
app.get('/api/v1/dashboard/monthly-calls', async (req: Request, res: Response) => {
  try {
    const coordinatorId = scopeToSelf(req, req.query.coordinator_id as string | undefined);
    if (!coordinatorId || !Types.ObjectId.isValid(coordinatorId)) {
      return res.status(400).json({ success: false, error: { code: 'COORDINATOR_REQUIRED', message: 'No coordinator resolved for this request.' } });
    }
    const coordinatorObjId = new Types.ObjectId(coordinatorId);

    const today = getTodayDate();
    let year = today.getUTCFullYear();
    let monthIdx = today.getUTCMonth();
    const monthParam = String(req.query.month || '');
    const m = monthParam.match(/^(\d{4})-(\d{1,2})$/);
    if (m) {
      year = parseInt(m[1], 10);
      monthIdx = Math.min(11, Math.max(0, parseInt(m[2], 10) - 1));
    }
    const monthStart = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0));
    const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
    const isCurrentMonth = year === today.getUTCFullYear() && monthIdx === today.getUTCMonth();
    const todayDay = today.getUTCDate();

    const callingUserId = (req as any).user?.userId || coordinatorId;
    let callingUser: any = null;
    if (callingUserId && Types.ObjectId.isValid(callingUserId)) {
      callingUser = await User.findById(callingUserId).populate('assigned_college_ids', 'college_name college_code');
    }

    const userName = (callingUser?.full_name || '').toLowerCase();
    const userEmail = (callingUser?.official_email || (req as any).user?.email || '').toLowerCase();
    const userRoles = ((req as any).user?.roles || callingUser?.role_codes || []).map((r: any) => String(r).toUpperCase());

    // Only Malvika Kumar and Sujitha (along with Admins and Team Leaders with full college access)
    // view all colleges org-wide in the monthly call trend. Placement coordinators only view their respective colleges.
    const isAllCollegesLeader =
      Boolean(callingUser?.has_all_colleges_access) ||
      userName.includes('malvika') ||
      userName.includes('malavika') ||
      userName.includes('sujitha') ||
      userEmail.includes('malavika') ||
      userEmail.includes('malvika') ||
      userEmail.includes('sujitha') ||
      userRoles.includes('ADMINISTRATOR') ||
      userRoles.includes('ADMIN') ||
      userRoles.includes('SUPER_ADMIN');

    const rawIds = String(req.query.college_ids || '').trim();
    let targetColleges: any[] = [];

    if (rawIds && rawIds !== 'all') {
      const ids = rawIds.split(',').map((s) => s.trim()).filter(Boolean);
      targetColleges = (
        await Promise.all(
          ids.map(async (idOrCode) => {
            let college: any = null;
            if (Types.ObjectId.isValid(idOrCode)) college = await College.findById(idOrCode);
            if (!college) {
              const stripped = idOrCode.replace(/^col_/, '');
              college = await College.findOne({
                college_code: { $in: [new RegExp(`^${escapeRegex(idOrCode)}$`, 'i'), new RegExp(`^${escapeRegex(stripped)}$`, 'i')] },
              });
            }
            return college;
          })
        )
      ).filter(Boolean);
    } else if (isAllCollegesLeader) {
      // Malvika Kumar, Sujitha, and Administrators see all active colleges
      targetColleges = await College.find({ status: { $ne: 'deleted' } }).sort({ college_code: 1 });
    } else {
      // Placement Coordinators: ONLY show their respective assigned/allocated colleges
      if (callingUser && Array.isArray(callingUser.assigned_college_ids) && callingUser.assigned_college_ids.length > 0) {
        targetColleges = callingUser.assigned_college_ids;
      }

      if (targetColleges.length === 0) {
        // Resolve default official allocations by coordinator email / username / name
        let codes = DEFAULT_OFFICIAL_COORDINATOR_ALLOCATIONS[userEmail] ||
                    DEFAULT_OFFICIAL_COORDINATOR_ALLOCATIONS[userName] ||
                    DEFAULT_OFFICIAL_COORDINATOR_ALLOCATIONS[(callingUser?.username || '').toLowerCase()];

        if (!codes) {
          for (const [key, val] of Object.entries(DEFAULT_OFFICIAL_COORDINATOR_ALLOCATIONS)) {
            if ((userEmail && userEmail.includes(key)) || (userName && userName.includes(key))) {
              codes = val;
              break;
            }
          }
        }

        if (codes && codes.length > 0) {
          targetColleges = await College.find({
            college_code: { $in: codes },
            status: { $ne: 'deleted' },
          }).sort({ college_code: 1 });
        }
      }

      if (targetColleges.length === 0 && callingUserId && Types.ObjectId.isValid(callingUserId)) {
        targetColleges = await College.find({
          assigned_coordinator_ids: new Types.ObjectId(callingUserId),
          status: { $ne: 'deleted' },
        }).sort({ college_code: 1 });
      }

      if (targetColleges.length === 0 && callingUserId) {
        const loggedCollegeIds = await DailyTracker.distinct('college_id', {
          $or: [
            { coordinator_id: callingUserId },
            ...(Types.ObjectId.isValid(callingUserId) ? [{ coordinator_id: new Types.ObjectId(callingUserId) }] : []),
          ],
        });
        if (loggedCollegeIds.length > 0) {
          targetColleges = await College.find({
            _id: { $in: loggedCollegeIds },
            status: { $ne: 'deleted' },
          }).sort({ college_code: 1 });
        }
      }
    }

    const series = (
      (
        await Promise.all(
          targetColleges.map(async (college) => {
            if (!college) return null;

            const rows = await DailyTracker.find({
              $or: [
                { college_id: college._id },
                { college_id: college._id.toString() },
              ],
              is_skipped: { $ne: true },
              $and: [
                {
                  $or: [
                    { session_date: { $gte: monthStart, $lt: nextMonthStart } },
                    { created_at: { $gte: monthStart, $lt: nextMonthStart } },
                    { year: year, month: monthIdx + 1 },
                  ],
                },
              ],
            }).select('duration_seconds session_date created_at day month year call_start_time call_end_time outcome_status').lean();

            const dailyCalls: number[] = new Array(daysInMonth).fill(0);
            // Per-day outcome counts, same buckets as the outcome mix. Only the four
            // the dashboard shows; Other Progress / no outcome stay inside calls.
            const shownBuckets = ['positive', 'not_hiring', 'negative', 'follow_up'] as const;
            const dailyOutcomes: Record<(typeof shownBuckets)[number], number[]> = {
              positive: new Array(daysInMonth).fill(0),
              not_hiring: new Array(daysInMonth).fill(0),
              negative: new Array(daysInMonth).fill(0),
              follow_up: new Array(daysInMonth).fill(0),
            };
            // Summed in seconds, rounded once per day — rounding each call first
            // would turn ten 20-second calls into 0m.
            const dailyDurationSecs: number[] = new Array(daysInMonth).fill(0);

            for (const row of rows) {
              let d: number | null = null;
              if (typeof row.day === 'number' && row.day >= 1 && row.day <= daysInMonth) {
                if ((!row.year || row.year === year) && (!row.month || row.month === (monthIdx + 1))) {
                  d = row.day;
                }
              }
              if (!d) {
                if (row.session_date) {
                  const dt = new Date(row.session_date);
                  if (!isNaN(dt.getTime())) {
                    if (dt.getUTCFullYear() === year && (dt.getUTCMonth() + 1) === (monthIdx + 1)) {
                      d = dt.getUTCDate();
                    } else {
                      const istDt = new Date(dt.getTime() + IST_OFFSET_MS);
                      if (istDt.getUTCFullYear() === year && (istDt.getUTCMonth() + 1) === (monthIdx + 1)) {
                        d = istDt.getUTCDate();
                      }
                    }
                  }
                }
                if (!d && row.created_at) {
                  const cd = new Date(row.created_at);
                  if (!isNaN(cd.getTime())) {
                    const istCd = new Date(cd.getTime() + IST_OFFSET_MS);
                    if (istCd.getUTCFullYear() === year && (istCd.getUTCMonth() + 1) === (monthIdx + 1)) {
                      d = istCd.getUTCDate();
                    } else {
                      d = cd.getUTCDate();
                    }
                  }
                }
              }

              if (d && d >= 1 && d <= daysInMonth) {
                dailyCalls[d - 1]++;
                const bucket = OUTCOME_BUCKET[String((row as any).outcome_status || '')];
                if (bucket && bucket in dailyOutcomes) {
                  dailyOutcomes[bucket as keyof typeof dailyOutcomes][d - 1]++;
                }
                let durSec = 0;
                if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
                  durSec = row.duration_seconds;
                } else if (row.call_start_time && row.call_end_time) {
                  const s = new Date(row.call_start_time).getTime();
                  const e = new Date(row.call_end_time).getTime();
                  if (e > s) durSec = Math.floor((e - s) / 1000);
                }
                dailyDurationSecs[d - 1] += durSec;
              }
            }

            const dailyDurationMins = dailyDurationSecs.map((sec) => Math.round(sec / 60));

            return {
              college_id: college._id,
              college_name: college.college_name,
              college_code: college.college_code,
              daily: dailyCalls,
              daily_duration: dailyDurationMins,
              daily_outcomes: dailyOutcomes,
              total: dailyCalls.reduce((a, b) => a + b, 0),
              total_duration_minutes: dailyDurationMins.reduce((a, b) => a + b, 0),
            };
          })
        )
      ).filter(Boolean) as any[]
    ).sort((a: any, b: any) => {
      // Descending order: highest calls count first -> lowest -> zero calls
      if (b.total !== a.total) {
        return b.total - a.total;
      }
      if ((b.total_duration_minutes || 0) !== (a.total_duration_minutes || 0)) {
        return (b.total_duration_minutes || 0) - (a.total_duration_minutes || 0);
      }
      return (a.college_code || '').localeCompare(b.college_code || '');
    });

    return res.status(200).json({
      success: true,
      data: {
        month: `${year}-${String(monthIdx + 1).padStart(2, '0')}`,
        days_in_month: daysInMonth,
        is_current_month: isCurrentMonth,
        today_day: isCurrentMonth ? todayDay : null,
        is_last_day_of_month: isCurrentMonth && todayDay === daysInMonth,
        series,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch monthly calls' },
    });
  }
});

// ── Real-Time Presence Heartbeat ──
// Presence, judged from the last heartbeat. The client pings every 10s, so "online" means
// the tab was heard from in the last 45s (~4 missed beats of slack) - it used to be 3
// *minutes* with a floor() on whole minutes, so a coordinator who closed the tab, lost power
// or network stayed listed as "active right now" for up to ~4 minutes. Beyond 45s but within
// 3 min they show as "away" (e.g. a backgrounded tab the browser is throttling), then offline.
const PRESENCE_ONLINE_MS = 45_000;
const PRESENCE_AWAY_MS = 3 * 60_000;
function presenceFromLastActive(lastActiveMs: number, nowMs: number): { status: 'online' | 'away' | 'offline'; label: string } {
  const age = nowMs - lastActiveMs;
  if (age <= PRESENCE_ONLINE_MS) return { status: 'online', label: 'Online' };
  if (age <= PRESENCE_AWAY_MS) return { status: 'away', label: 'Away' };
  return { status: 'offline', label: 'Offline' };
}

// Sent by the browser on tab close / navigation away (pagehide, keepalive) so a coordinator
// who simply closes the tab drops off the live list immediately instead of after a timeout.
// The next heartbeat (e.g. after a mere refresh) flips them straight back online.
app.post('/api/v1/users/offline', async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.userId;
    if (uid) {
      await User.findByIdAndUpdate(uid, { $set: { is_online: false, logged_out_at: new Date() } });
    }
  } catch {}
  return res.status(200).json({ success: true });
});

app.post('/api/v1/users/heartbeat', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = req.body?.user_id;
    if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'secret');
        userId = decoded.userId || decoded.id;
      } catch {}
    }
    if (!userId) {
      return res.status(200).json({ success: false, message: 'Unauthenticated' });
    }

    const {
      college_id,
      college_name,
      college_code,
      college_location,
      current_page,
    } = req.body || {};

    const updateDoc: any = {
      last_active_at: new Date(),
      is_online: true,
      logged_out_at: null,
    };

    const resolvedAcronym = resolveOfficialCollegeAcronym(college_code || college_name || college_id);

    let col: any = null;
    if (college_id && mongoose.Types.ObjectId.isValid(college_id)) {
      try {
        col = await College.findById(college_id).select('college_code college_name location');
      } catch {}
    }
    if (!col && (college_id || college_name || college_code || resolvedAcronym)) {
      const searchCode = (resolvedAcronym || college_code || '').toUpperCase();
      const searchName = (college_name || '').trim();
      try {
        col = await College.findOne({
          $or: [
            ...(searchCode ? [{ college_code: searchCode }] : []),
            ...(searchName ? [{ college_name: searchName }] : []),
            ...(searchName ? [{ college_name: new RegExp(`^${searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }] : []),
          ],
        }).select('college_code college_name location');
      } catch {}
    }

    if (col) {
      updateDoc.active_college_id = col._id;
      updateDoc.active_college_code = (col.college_code || resolvedAcronym || '').toUpperCase();
      updateDoc.active_college_name = col.college_name;
      if (col.location) updateDoc.active_college_location = col.location;
    } else if (resolvedAcronym) {
      updateDoc.active_college_code = resolvedAcronym;
      if (college_name) updateDoc.active_college_name = college_name;
    } else if (college_name) {
      updateDoc.active_college_name = college_name;
    }

    // Safety guard: Ensure user can only broadcast active colleges belonging to their assigned focus
    const user = await User.findById(userId).populate('assigned_college_ids', 'college_name college_code location');
    if (user) {
      const isSujitha = user.official_email === 'sujitha_s@infoziant.com' || user.username === 'sujitha' || /sujitha/i.test(user.full_name);
      const isSystemAdmin = user.role_codes?.some((r: string) => r.toUpperCase().includes('ADMIN'));
      const assignedCols = (user.assigned_college_ids as any[]) || [];

      // Sujitha S CANNOT be active in MCET (MCET is handled by Tamil Selvi / Seshmitha)
      if (isSujitha && (updateDoc.active_college_code === 'MCET' || /mahalingam|mcet/i.test(updateDoc.active_college_name || ''))) {
        const primary = assignedCols.find((c: any) => c.college_code === 'NEHRU' || c.college_code === 'HITS') || assignedCols[0];
        if (primary) {
          updateDoc.active_college_id = primary._id;
          updateDoc.active_college_code = primary.college_code || 'NEHRU';
          updateDoc.active_college_name = primary.college_name || '';
          updateDoc.active_college_location = primary.location || '';
        }
      } else if (!isSystemAdmin && assignedCols.length > 0 && updateDoc.active_college_code) {
        const assignedCodes = assignedCols.map((ac: any) => (ac.college_code || '').toUpperCase()).filter(Boolean);
        const reqCode = (updateDoc.active_college_code || '').toUpperCase();
        const isMatched = assignedCodes.includes(reqCode) || assignedCols.some((ac: any) => String(ac._id) === String(updateDoc.active_college_id));
        if (!isMatched) {
          const primary = assignedCols[0];
          if (primary) {
            updateDoc.active_college_id = primary._id;
            updateDoc.active_college_code = primary.college_code || '';
            updateDoc.active_college_name = primary.college_name || '';
            updateDoc.active_college_location = primary.location || '';
          }
        }
      }
    }

    if (college_location !== undefined && !updateDoc.active_college_location) {
      updateDoc.active_college_location = college_location;
    }
    if (current_page !== undefined) {
      updateDoc.current_page = current_page;
    }

    await User.findByIdAndUpdate(userId, updateDoc);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DB-2: GET /api/v1/dashboard/team-leader
// Team Leader Dashboard (Spec Section 5.2) — Coordinator Profile Online Activity & Live Performance Matrix
app.get('/api/v1/dashboard/team-leader', async (req: Request, res: Response) => {
  try {
    // Ensure Sujitha (Team Leader) has her official focus colleges: HITS, NEHRU, KPR, SONA (Sujitha does NOT handle MCET)
    const sujithaUser = await User.findOne({
      $or: [
        { official_email: 'sujitha_s@infoziant.com' },
        { username: 'sujitha' },
        { full_name: /sujitha/i },
      ],
      is_deleted: false,
    });
    if (sujithaUser) {
      const sujithaColleges = await College.find({
        $or: [
          { college_code: { $in: ['HITS', 'NEHRU', 'KPR', 'SONA'] } },
          { college_name: { $in: [/hindustan/i, /nehru/i, /^KPR Institute/i, /^SONA/i] } },
        ],
        status: 'active',
      });
      const targetIds = sujithaColleges.map((c) => c._id);
      // Defaults are only a STARTING point: applied when the user has no colleges at all.
      // This used to overwrite assigned_college_ids on every boot / dashboard load / tracker
      // page load, so any focus change a user saved in Active College Focus was silently
      // reverted to the hardcoded list the next time any of those ran (24 Sep 2026).
      if (!sujithaUser.assigned_college_ids || sujithaUser.assigned_college_ids.length === 0) {
        sujithaUser.assigned_college_ids = targetIds;
      }
      const mcetCol = await College.findOne({
        $or: [{ college_code: 'MCET' }, { college_name: /mahalingam/i }]
      });
      const isMcetActive =
        sujithaUser.active_college_code?.toUpperCase() === 'MCET' ||
        (sujithaUser.active_college_name && /mahalingam|mcet/i.test(sujithaUser.active_college_name)) ||
        (mcetCol && sujithaUser.active_college_id && String(sujithaUser.active_college_id) === String(mcetCol._id));

      if (isMcetActive) {
        const primary = sujithaColleges.find(c => c.college_code === 'NEHRU' || c.college_code === 'HITS') || sujithaColleges[0];
        if (primary) {
          sujithaUser.active_college_id = primary._id;
          sujithaUser.active_college_code = primary.college_code;
          sujithaUser.active_college_name = primary.college_name;
          sujithaUser.active_college_location = primary.location || '';
        }
      }
      await sujithaUser.save();
    }

    // Ensure Tamil Selvi (Seshmitha Tamilselvi R) has her official focus colleges: MCET, MEC
    const tamilUser = await User.findOne({
      $or: [
        { official_email: 'seshmitha_tamil@icl.today' },
        { username: 'seshmitha' },
        { full_name: /tamil/i },
      ],
      is_deleted: false,
    });
    if (tamilUser) {
      const tamilColleges = await College.find({
        $or: [
          { college_code: { $in: ['MCET', 'MEC'] } },
          { college_name: { $in: [/mahalingam/i, /muthayammal/i] } },
        ],
        status: 'active',
      });
      const targetTamilIds = tamilColleges.map((c) => c._id);
      if (!tamilUser.assigned_college_ids || tamilUser.assigned_college_ids.length === 0) {
        tamilUser.assigned_college_ids = targetTamilIds; // starting default only — see Sujitha note above
      }
      if (!tamilUser.account_status) tamilUser.account_status = 'active';
      await tamilUser.save();
    }

    // Ensure Megala Devi P S has her official focus colleges: NGP, KAMARAJ, MAREPHRAM
    const megalaUser = await User.findOne({
      $or: [
        { official_email: 'megaladevi_ps@infoziant.com' },
        { username: 'megaladevi' },
        { username: 'megala' },
        { full_name: /megala/i },
      ],
      is_deleted: false,
    });
    if (megalaUser) {
      const megalaColleges = await College.find({
        $or: [
          { college_code: { $in: ['NGP', 'KAMARAJ', 'MAREPHRAM', 'MAREPHRA'] } },
          { college_name: { $in: [/N\.?G\.?P\.?/i, /kamaraj/i, /ephraem/i, /ephram/i] } },
        ],
        status: 'active',
      });
      const targetMegalaIds = megalaColleges.map((c) => c._id);
      if (!megalaUser.assigned_college_ids || megalaUser.assigned_college_ids.length === 0) {
        megalaUser.assigned_college_ids = targetMegalaIds; // starting default only — see Sujitha note above
      }
      if (!megalaUser.account_status) megalaUser.account_status = 'active';
      await megalaUser.save();
    }

    const coordinators = await User.find({
      $or: [
        { role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR', 'TEAM_LEADER', 'TEAM_LEAD'] } },
        { official_email: 'sujitha_s@infoziant.com' },
        { username: 'sujitha' },
        { official_email: 'seshmitha_tamil@icl.today' },
        { username: 'seshmitha' },
        { full_name: /tamil/i },
      ],
      account_status: { $in: ['active', 'on_leave', 'partial_working'] },
      is_deleted: false,
    })
      .populate('assigned_college_ids', 'college_name college_code')
      .sort({ full_name: 1 });

    // Who is actually looking at this dashboard right now. Previously unused here —
    // targetLeader below fell back to Sujitha by hardcoded email whenever no
    // `?coordinator_id=` was passed, which the frontend never sends, so every
    // Team Leader's "Dedicated Calling Time" widget was silently showing Sujitha's
    // numbers instead of their own (found while wiring up Malvika Kumar's dashboard,
    // 22 Sep 2026 — same failure shape as the other "screen told the user something
    // untrue" bugs already recorded in this file).
    const viewerId = (req as any).user?.userId;
    const viewingUser = viewerId ? coordinators.find((c) => String(c._id) === String(viewerId)) : null;

    // A Team Leader with has_all_colleges_access (e.g. Malvika Kumar) is meant to
    // cover every college automatically, including ones added after her account was
    // created — self-heals her stored assigned_college_ids to match reality on every
    // dashboard load rather than needing a script re-run each time a college is added.
    let viewerCollegeIds: any[] = [];
    const viewerHasFullAccess = Boolean(viewingUser?.has_all_colleges_access);
    if (viewingUser && viewerHasFullAccess) {
      const allActiveColleges = await College.find({ status: 'active' })
        .select('college_name college_code')
        .sort({ college_name: 1 });
      viewerCollegeIds = allActiveColleges;
      const currentIds = new Set((viewingUser.assigned_college_ids || []).map((c: any) => String(c._id || c)));
      const freshIds = allActiveColleges.map((c) => String(c._id));
      const isStale = freshIds.length !== currentIds.size || freshIds.some((id) => !currentIds.has(id));
      if (isStale) {
        await User.findByIdAndUpdate(viewingUser._id, {
          assigned_college_ids: allActiveColleges.map((c) => c._id),
        });
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const nowMs = Date.now();

    // College Activity Today — org-wide calls + duration per college, today only,
    // for a full-access Team Leader (Malvika Kumar, 22 Sep 2026) in place of a
    // personal calling-time clock, since she doesn't place calls herself. Only
    // colleges with at least one real call today are included — the user was
    // explicit that an inactive college shouldn't get a bar at all, so 21 colleges
    // reduces to however many genuinely had activity (could be 3, could be 15).
    // Naturally resets at midnight with no separate job: it's always "today's"
    // window, so the next day's first load already reflects the new day.
    let todayCollegeActivity: Array<{
      college_id: string; college_code: string; college_name: string;
      calls: number; duration_seconds: number; duration_formatted: string;
    }> = [];
    if (viewerHasFullAccess) {
      const activityAgg = await DailyTracker.aggregate([
        {
          $match: {
            is_skipped: { $ne: true },
            $or: [
              { session_date: { $gte: todayStart, $lte: todayEnd } },
              { created_at: { $gte: todayStart, $lte: todayEnd } },
            ],
          },
        },
        {
          $group: {
            _id: '$college_id',
            calls: { $sum: 1 },
            duration_seconds: { $sum: { $ifNull: ['$duration_seconds', 0] } },
          },
        },
      ]);
      const collegeIds = activityAgg.map((a) => a._id).filter(Boolean);
      const activityColleges = await College.find({ _id: { $in: collegeIds } }).select('college_name college_code');
      const collegeById = new Map(activityColleges.map((c) => [String(c._id), c]));
      todayCollegeActivity = activityAgg
        .filter((a) => a.calls > 0 && collegeById.has(String(a._id)))
        .map((a) => {
          const col = collegeById.get(String(a._id))!;
          const resolvedCode = resolveOfficialCollegeAcronym(col.college_code || col.college_name);
          return {
            college_id: String(a._id),
            college_code: resolvedCode || col.college_code,
            college_name: col.college_name,
            calls: a.calls,
            duration_seconds: a.duration_seconds || 0,
            duration_formatted: formatDurationClock(a.duration_seconds || 0).formatted,
          };
        })
        .sort((a, b) => b.calls - a.calls);
    }

    // Per-coordinator live profile & activity telemetry
    const teamMatrix = await Promise.all(
      coordinators.map(async (c) => {
        const [todayTrackerRows, jds, pendingWork, latestCall] = await Promise.all([
          DailyTracker.find({
            coordinator_id: c._id,
            $or: [
              { session_date: { $gte: todayStart, $lte: todayEnd } },
              { created_at: { $gte: todayStart, $lte: todayEnd } },
              { year: todayStart.getUTCFullYear(), month: todayStart.getUTCMonth() + 1, day: todayStart.getUTCDate() },
            ],
          }).select('duration_seconds call_start_time call_end_time outcome_status').lean(),
          DailyLead.countDocuments({
            coordinator_id: c._id,
            lead_type: 'jd_received',
            is_deleted: false,
            $or: [
              { lead_date: { $gte: todayStart, $lte: todayEnd } },
              { created_at: { $gte: todayStart, $lte: todayEnd } },
            ],
          }),
          AssignedWork.countDocuments({ assigned_to_coordinator_id: c._id, is_completed: false, is_deleted: false }),
          DailyTracker.findOne({ coordinator_id: c._id })
            .sort({ session_date: -1, created_at: -1 })
            .populate('college_id', 'college_name college_code')
            .select('company_name session_date outcome_status created_at college_id'),
        ]);

        const completedTrackerRows = todayTrackerRows.filter((r) => isTrackerRowCompleted(r));
        const positives = completedTrackerRows.filter((r) => r.outcome_status === 'invite_mail').length;

        let coordinatorDuration = 0;
        const calls = completedTrackerRows.length;
        for (const row of completedTrackerRows) {
          let dur = 0;
          if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
            dur = row.duration_seconds;
          } else if (row.call_start_time && row.call_end_time) {
            const sMs = new Date(row.call_start_time).getTime();
            const eMs = new Date(row.call_end_time).getTime();
            if (eMs > sMs) dur = Math.floor((eMs - sMs) / 1000);
          }
          coordinatorDuration += dur;
        }
        const coordDurInfo = formatDurationClock(coordinatorDuration);

        // Determine real-time online status and last activity
        let lastActiveTime: Date | null = c.last_active_at ? new Date(c.last_active_at) : null;
        let lastActivitySummary = 'No activity logged today';

        if (latestCall?.session_date) {
          const callTime = new Date(latestCall.session_date);
          if (!lastActiveTime || callTime > lastActiveTime) {
            lastActiveTime = callTime;
          }
          const company = latestCall.company_name || 'Partner Company';
          const college = (latestCall.college_id as any)?.college_code || (latestCall.college_id as any)?.college_name || '';
          lastActivitySummary = `Logged call for ${company}${college ? ` (${college})` : ''}`;
        } else if (c.last_login_at && !lastActiveTime) {
          lastActiveTime = new Date(c.last_login_at);
          lastActivitySummary = 'Signed in to portal';
        }

        let onlineStatus: 'online' | 'away' | 'offline' | 'on_leave' | 'partial_working' = 'offline';
        let onlineStatusLabel = 'Offline';

        const isExplicitLoggedOut = c.is_online === false || (Boolean(c.logged_out_at) && (!c.last_login_at || new Date(c.logged_out_at as any) >= new Date(c.last_login_at as any)));

        if (c.account_status === 'on_leave') {
          onlineStatus = 'on_leave';
          onlineStatusLabel = 'On Leave';
        } else if (c.account_status === 'partial_working') {
          onlineStatus = 'partial_working';
          onlineStatusLabel = 'Partial Working';
        } else if (isExplicitLoggedOut) {
          onlineStatus = 'offline';
          onlineStatusLabel = 'Offline';
        } else if (c.last_active_at) {
          const p = presenceFromLastActive(new Date(c.last_active_at).getTime(), nowMs);
          onlineStatus = p.status;
          onlineStatusLabel = p.label;
        }

        // Active college is ONLY populated when the coordinator is currently actively ONLINE
        let activeCollegeData: any = null;
        if (onlineStatus === 'online') {
          const isSujitha = c.official_email === 'sujitha_s@infoziant.com' || c.username === 'sujitha' || /sujitha/i.test(c.full_name);
          const isTamil = c.official_email === 'seshmitha_tamil@icl.today' || c.username === 'seshmitha' || /tamil/i.test(c.full_name);

          let code = resolveOfficialCollegeAcronym(c.active_college_code || c.active_college_name || c.active_college_id);
          let colName = c.active_college_name || '';
          let colId = c.active_college_id ? String(c.active_college_id) : '';
          let colLoc = c.active_college_location || '';

          // Sujitha S CANNOT be active in MCET (MCET is handled by Tamil Selvi / Seshmitha)
          if (isSujitha && (code === 'MCET' || /mahalingam|mcet/i.test(colName))) {
            const assignedCols = (c.assigned_college_ids as any[]) || [];
            const primary = assignedCols.find((col) => col.college_code === 'NEHRU' || col.college_code === 'HITS') || assignedCols[0];
            if (primary) {
              code = primary.college_code || 'NEHRU';
              colName = primary.college_name || '';
              colId = String(primary._id || '');
              colLoc = primary.location || '';
            } else {
              code = 'NEHRU';
            }
          }

          if (!code && c.assigned_college_ids) {
            const matchCol = (c.assigned_college_ids as any[])?.find(
              (col) => col.college_name === colName || String(col._id) === colId
            );
            if (matchCol?.college_code) {
              code = matchCol.college_code.toUpperCase();
              if (!colName) colName = matchCol.college_name;
              if (!colId) colId = String(matchCol._id);
            }
          }

          if (isSujitha && (code === 'MCET' || /mahalingam|mcet/i.test(colName))) {
            code = 'NEHRU';
            colName = 'Nehru Institute of Engineering and Technology';
          }

          if (code || colName || colId) {
            activeCollegeData = {
              college_id: colId,
              college_code: code,
              college_name: colName,
              location: colLoc,
            };
            if (isSujitha && (activeCollegeData.college_code === 'MCET' || /mahalingam|mcet/i.test(activeCollegeData.college_name || ''))) {
              activeCollegeData.college_code = 'NEHRU';
              activeCollegeData.college_name = 'Nehru Institute of Engineering and Technology';
            }
          }
        }

        const isTeamLeader = c.role_codes?.includes('TEAM_LEADER') || c.role_codes?.includes('TEAM_LEAD') || c.official_email === 'sujitha_s@infoziant.com' || c.username === 'sujitha';

        return {
          coordinator_id: c._id,
          name: c.full_name,
          username: c.username,
          email: c.official_email,
          mobile: c.primary_mobile || '',
          role: isTeamLeader ? 'team_leader' : 'coordinator',
          role_label: isTeamLeader ? 'Team Leader' : 'Coordinator',
          profile_photo_url: c.profile_photo_url || '',
          account_status: c.account_status,
          presence_status: c.presence_status || 'available',
          assigned_colleges: c.assigned_college_ids || [],
          last_login_at: c.last_login_at,
          last_active_at: lastActiveTime,
          last_activity_summary: lastActivitySummary,
          online_status: onlineStatus,
          online_status_label: onlineStatusLabel,
          active_college: activeCollegeData,
          current_page: c.current_page || '',
          calls_today: calls,
          today_call_duration_seconds: coordinatorDuration,
          today_call_duration_formatted: coordDurInfo.formatted,
          hours: coordDurInfo.hours,
          minutes: coordDurInfo.minutes,
          seconds: coordDurInfo.seconds,
          positive_leads: positives,
          jds_received: jds,
          pending_assigned_work: pendingWork,
          performance_status: calls >= 25 ? 'on_track' : calls > 0 ? 'active' : 'pending',
        };
      })
    );

    const totalDispatchedAssignments = await AssignedWork.countDocuments({ is_deleted: false });
    const completedAssignments = await AssignedWork.countDocuments({ is_completed: true, is_deleted: false });

    // Count online coordinators and calling durations
    const onlineCount = teamMatrix.filter((m) => m.online_status === 'online').length;
    const activeTodayCount = teamMatrix.filter((m) => m.calls_today > 0 || m.online_status === 'online' || m.online_status === 'away').length;

    const totalTeamDurationSeconds = teamMatrix.reduce((acc, curr) => acc + (curr.today_call_duration_seconds || 0), 0);
    const teamDurationInfo = formatDurationClock(totalTeamDurationSeconds);
    const activeCallingCoordinatorsCount = teamMatrix.filter((c) => (c.today_call_duration_seconds || 0) > 0 || (c.calls_today || 0) > 0).length;

    // Leader Dedicated Calling Clock — an explicit ?coordinator_id= (one Team
    // Leader inspecting another's numbers) wins when present; otherwise defaults
    // to the actual logged-in viewer (see viewingUser above), not a hardcoded
    // Sujitha fallback, so each Team Leader sees their own clock by default.
    const targetLeader =
      (req.query.coordinator_id ? coordinators.find(c => String(c._id) === String(req.query.coordinator_id)) : null) ||
      viewingUser ||
      sujithaUser ||
      coordinators.find((c) => c.role_codes?.includes('TEAM_LEADER') || c.role_codes?.includes('TEAM_LEAD')) ||
      coordinators[0];

    let leaderDurationSeconds = 0;
    let leaderTodayCalls = 0;
    let leaderTodayPositives = 0;
    const leaderHourlyCalls: number[] = new Array(24).fill(0);
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const POSITIVE_OUTCOMES = ['invite_mail', 'positive', 'callback_requested', 'jd_received'];

    if (targetLeader) {
      const leaderRows = await DailyTracker.find({
        coordinator_id: targetLeader._id,
        $or: [
          { session_date: { $gte: todayStart, $lte: todayEnd } },
          { created_at: { $gte: todayStart, $lte: todayEnd } },
          { year: todayStart.getUTCFullYear(), month: todayStart.getUTCMonth() + 1, day: todayStart.getUTCDate() },
        ],
      }).select('duration_seconds call_start_time call_end_time outcome_status created_at updated_at last_saved_at session_date is_skipped').lean();

      const completedLeaderRows = leaderRows.filter((r) => isTrackerRowCompleted(r));
      leaderTodayCalls = completedLeaderRows.length;
      for (const row of completedLeaderRows) {
        let dur = 0;
        if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
          dur = row.duration_seconds;
        } else if (row.call_start_time && row.call_end_time) {
          const sMs = new Date(row.call_start_time).getTime();
          const eMs = new Date(row.call_end_time).getTime();
          if (eMs > sMs) dur = Math.floor((eMs - sMs) / 1000);
        }
        leaderDurationSeconds += dur;
        if (row.outcome_status && POSITIVE_OUTCOMES.includes(row.outcome_status as any)) {
          leaderTodayPositives++;
        }
        const stamp = getTrackerCompletionTimestamp(row);
        const t = stamp.getTime();
        if (!isNaN(t)) {
          leaderHourlyCalls[new Date(t + IST_OFFSET_MS).getUTCHours()]++;
        }
      }
    }

    const leaderClockDurationInfo = formatDurationClock(leaderDurationSeconds);
    const leaderAvgSeconds = leaderTodayCalls > 0 ? Math.round(leaderDurationSeconds / leaderTodayCalls) : 0;
    const leaderAvgInfo = formatDurationClock(leaderAvgSeconds);

    return res.status(200).json({
      success: true,
      data: {
        greeting: {
          greeting: 'Team Operations Command Center 👔',
          subtext: 'Real-time coordinator monitoring, profile online activity, task dispatch, and drive velocity.',
        },
        coordinator: targetLeader
          ? {
              id: targetLeader._id,
              name: targetLeader.full_name,
              role: 'team_leader',
            }
          : { name: 'Sujitha S', role: 'team_leader' },
        clock_duration: {
          today_seconds: leaderDurationSeconds,
          today_formatted: leaderClockDurationInfo.formatted,
          hours: leaderClockDurationInfo.hours,
          minutes: leaderClockDurationInfo.minutes,
          seconds: leaderClockDurationInfo.seconds,
          today_calls_count: leaderTodayCalls,
          avg_call_duration_seconds: leaderAvgSeconds,
          avg_call_duration_formatted: leaderAvgInfo.formatted,
          positive_calls_count: leaderTodayPositives,
          hourly_calls: leaderHourlyCalls,
        },
        online_summary: {
          total_coordinators: coordinators.length,
          currently_online: onlineCount,
          active_today: activeTodayCount,
        },
        team_call_duration: {
          total_seconds: totalTeamDurationSeconds,
          total_formatted: teamDurationInfo.formatted,
          hours: teamDurationInfo.hours,
          minutes: teamDurationInfo.minutes,
          seconds: teamDurationInfo.seconds,
          active_calling_coordinators: activeCallingCoordinatorsCount,
        },
        // A Team Leader shouldn't see their own row in the list of people they're
        // monitoring — exclude the viewer, not anyone else (this table stays
        // team-wide for everyone else, e.g. Sujitha still sees Malvika and vice
        // versa; each just doesn't see themselves).
        team_matrix: viewerId ? teamMatrix.filter((m) => String(m.coordinator_id) !== String(viewerId)) : teamMatrix,
        viewer_has_full_access: viewerHasFullAccess,
        viewer_college_ids: viewerHasFullAccess ? viewerCollegeIds.map((c) => String(c._id)) : [],
        today_college_activity: todayCollegeActivity,
        assignments_overview: {
          total_dispatched: totalDispatchedAssignments,
          completed: completedAssignments,
          active_pending: totalDispatchedAssignments - completedAssignments,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch team leader dashboard' },
    });
  }
});

// ── DB-3: GET /api/v1/dashboard/admin
// Administrator / Executive Dashboard (Spec Section 5.3 & Chapter 3 Screen 5) — "How is the complete placement operation progressing?"
app.get('/api/v1/dashboard/admin', async (req: Request, res: Response) => {
  try {
    const [
      totalCalls,
      totalPositives,
      totalJds,
      totalDrives,
      totalOffersAgg,
      totalColleges,
      totalUsers,
      totalCompaniesInDb,
      totalAssignedWork,
      settingsDoc,
      missingMobilesCount,
      missingEmailsCount,
    ] = await Promise.all([
      DailyTracker.countDocuments({}),
      DailyTracker.countDocuments({ outcome_status: { $in: POSITIVE_OUTCOMES } }),
      DailyLead.countDocuments({ lead_type: 'jd_received', is_deleted: false }),
      WeeklyTracker.countDocuments({ pipeline_section: 'completed', is_deleted: false }),
      WeeklyTracker.aggregate([
        { $match: { pipeline_section: 'completed', is_deleted: false } },
        { $group: { _id: null, sum: { $sum: '$selected_count' } } },
      ]),
      College.countDocuments({ status: 'active' }),
      User.countDocuments({ is_deleted: false }),
      CompanyMetadata.countDocuments({ is_deleted: false }),
      AssignedWork.countDocuments({ is_deleted: false }),
      SystemSettings.findOne({}),
      CompanyMetadata.countDocuments({
        $or: [{ mobile_number: { $exists: false } }, { mobile_number: '' }, { mobile_number: null }],
        is_deleted: false,
      }),
      CompanyMetadata.countDocuments({
        $or: [{ email_id: { $exists: false } }, { email_id: '' }, { email_id: null }],
        is_deleted: false,
      }),
    ]);

    const totalOffers = totalOffersAgg[0]?.sum || 0;
    const positiveRate = totalCalls > 0 ? Math.round((totalPositives / totalCalls) * 100) : 0;

    // Distinct companies contacted
    const distinctCompaniesContacted = (await DailyTracker.distinct('company_name')).length;

    // Data Quality Score: 100 - penalties for missing data
    const totalDataPoints = (totalCompaniesInDb || 1) * 2; // email + mobile
    const missingDataPoints = missingMobilesCount + missingEmailsCount;
    const metadataQualityPct = Math.max(10, Math.min(100, Math.round(((totalDataPoints - missingDataPoints) / totalDataPoints) * 100)));

    // ── All Active Colleges for Leaderboard ──
    const allColleges = await College.find({ status: 'active' }).sort({ college_name: 1 }).lean();
    
    // Fetch all active users to map assigned coordinators with presence telemetry
    const allCoordinators = await User.find({ is_deleted: false, account_status: 'active' })
      .select('_id full_name official_email primary_mobile role_codes assigned_college_ids is_active is_password_locked failed_login_attempts profile_photo_url last_active_at logged_out_at is_online active_college_id active_college_name active_college_code active_college_location current_page last_login_at account_status')
      .lean();

    // Aggregations per college
    const collegeStatsMap = new Map<string, { calls: number; positives: number; jds: number; drives: number; offers: number; topCtc: number; activePipeline: number }>();

    const [dailyStatsByCollege, weeklyStatsByCollege, leadsByCollege] = await Promise.all([
      DailyTracker.aggregate([
        {
          $group: {
            _id: '$college_id',
            calls: { $sum: 1 },
            positives: {
              $sum: { $cond: [{ $in: ['$outcome_status', POSITIVE_OUTCOMES] }, 1, 0] },
            },
          },
        },
      ]),
      WeeklyTracker.aggregate([
        { $match: { is_deleted: false } },
        {
          $group: {
            _id: '$college_id',
            drives: {
              $sum: { $cond: [{ $eq: ['$pipeline_section', 'completed'] }, 1, 0] },
            },
            offers: {
              $sum: { $cond: [{ $eq: ['$pipeline_section', 'completed'] }, '$selected_count', 0] },
            },
            activePipeline: {
              $sum: { $cond: [{ $in: ['$pipeline_section', ['pipeline', 'in_progress', 'top_companies']] }, 1, 0] },
            },
            topCtc: { $max: '$ctc_lpa' },
          },
        },
      ]),
      DailyLead.aggregate([
        { $match: { lead_type: 'jd_received', is_deleted: false } },
        { $group: { _id: '$college_id', count: { $sum: 1 } } },
      ]),
    ]);

    dailyStatsByCollege.forEach((d: any) => {
      const id = String(d._id);
      const existing = collegeStatsMap.get(id) || { calls: 0, positives: 0, jds: 0, drives: 0, offers: 0, topCtc: 0, activePipeline: 0 };
      existing.calls = d.calls;
      existing.positives = d.positives;
      collegeStatsMap.set(id, existing);
    });

    weeklyStatsByCollege.forEach((w: any) => {
      const id = String(w._id);
      const existing = collegeStatsMap.get(id) || { calls: 0, positives: 0, jds: 0, drives: 0, offers: 0, topCtc: 0, activePipeline: 0 };
      existing.drives = w.drives;
      existing.offers = w.offers || 0;
      existing.activePipeline = w.activePipeline || 0;
      existing.topCtc = w.topCtc || 0;
      collegeStatsMap.set(id, existing);
    });

    leadsByCollege.forEach((l: any) => {
      const id = String(l._id);
      const existing = collegeStatsMap.get(id) || { calls: 0, positives: 0, jds: 0, drives: 0, offers: 0, topCtc: 0, activePipeline: 0 };
      existing.jds = l.count;
      collegeStatsMap.set(id, existing);
    });

    const unassignedCollegesList: any[] = [];

    const leaderboard = allColleges.map((c) => {
      const cIdStr = String(c._id);
      const stats = collegeStatsMap.get(cIdStr) || { calls: 0, positives: 0, jds: 0, drives: 0, offers: 0, topCtc: 0, activePipeline: 0 };
      
      // Find assigned coordinators
      const assigned = allCoordinators.filter((u: any) => 
        Array.isArray(u.assigned_college_ids) && u.assigned_college_ids.some((cid: any) => String(cid) === cIdStr)
      ).map((u: any) => ({
        id: u._id,
        name: u.full_name,
        email: u.official_email,
      }));

      if (assigned.length === 0) {
        unassignedCollegesList.push({
          college_id: c._id,
          college_name: c.college_name,
          college_code: c.college_code,
        });
      }

      return {
        college_id: c._id,
        college_name: c.college_name,
        college_code: c.college_code,
        tpo_name: (c as any).tpo_name || 'Placement Office',
        tpo_contact_mobile: (c as any).tpo_contact_mobile || '',
        assigned_coordinators: assigned,
        calls: stats.calls,
        positives: stats.positives,
        jds_in_hand: stats.jds,
        active_pipeline: stats.activePipeline,
        drives_completed: stats.drives,
        total_offers: stats.offers,
        top_ctc_lpa: stats.topCtc || 0,
      };
    });

    // ── Workforce & Coordinator Calling Telemetry Snapshot ──
    const coordinatorUsers = allCoordinators.filter((u: any) =>
      u.role_codes?.includes('PLACEMENT_COORDINATOR') || u.role_codes?.includes('COORDINATOR')
    );

    const adminTodayStart = new Date();
    adminTodayStart.setHours(0, 0, 0, 0);
    const adminTodayEnd = new Date();
    adminTodayEnd.setHours(23, 59, 59, 999);

    const [coordinatorCallsAgg, todayAllTrackerRows] = await Promise.all([
      DailyTracker.aggregate([
        {
          $group: {
            _id: '$coordinator_id',
            calls: { $sum: 1 },
            positives: {
              $sum: { $cond: [{ $in: ['$outcome_status', POSITIVE_OUTCOMES] }, 1, 0] },
            },
          },
        },
      ]),
      DailyTracker.find({
        $or: [
          { session_date: { $gte: adminTodayStart, $lte: adminTodayEnd } },
          { created_at: { $gte: adminTodayStart, $lte: adminTodayEnd } },
          { year: adminTodayStart.getUTCFullYear(), month: adminTodayStart.getUTCMonth() + 1, day: adminTodayStart.getUTCDate() },
        ],
      }).select('coordinator_id duration_seconds call_start_time call_end_time outcome_status').lean(),
    ]);

    const coordStatsMap = new Map<string, { calls: number; positives: number }>();
    coordinatorCallsAgg.forEach((c: any) => {
      coordStatsMap.set(String(c._id), { calls: c.calls, positives: c.positives });
    });

    let globalTodayDurationSeconds = 0;
    const coordTodayStatsMap = new Map<string, { seconds: number; calls: number; positives: number }>();

    for (const row of todayAllTrackerRows) {
      let dur = 0;
      if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
        dur = row.duration_seconds;
      } else if (row.call_start_time && row.call_end_time) {
        const sMs = new Date(row.call_start_time).getTime();
        const eMs = new Date(row.call_end_time).getTime();
        if (eMs > sMs) dur = Math.floor((eMs - sMs) / 1000);
      }
      globalTodayDurationSeconds += dur;

      const cId = String(row.coordinator_id);
      const prev = coordTodayStatsMap.get(cId) || { seconds: 0, calls: 0, positives: 0 };
      prev.seconds += dur;
      prev.calls += 1;
      if (row.outcome_status && POSITIVE_OUTCOMES.includes(row.outcome_status as any)) {
        prev.positives += 1;
      }
      coordTodayStatsMap.set(cId, prev);
    }

    const globalDurationInfo = formatDurationClock(globalTodayDurationSeconds);

    const lockedAccountsList: any[] = [];
    const nowMs = Date.now();

    const workforce = coordinatorUsers.map((u: any) => {
      const uIdStr = String(u._id);
      const cStats = coordStatsMap.get(uIdStr) || { calls: 0, positives: 0 };
      const todayStats = coordTodayStatsMap.get(uIdStr) || { seconds: 0, calls: 0, positives: 0 };
      const durInfo = formatDurationClock(todayStats.seconds);
      const assignedCount = Array.isArray(u.assigned_college_ids) ? u.assigned_college_ids.length : 0;
      const isLocked = !!u.is_password_locked || (u.failed_login_attempts >= 4) || (u.is_profile_locked === true);

      if (isLocked) {
        lockedAccountsList.push({
          user_id: u._id,
          name: u.full_name,
          email: u.official_email,
          reason: u.is_password_locked ? 'Password limit locked' : '3-strike login lockout',
        });
      }

      // Real-time online status calculations
      let lastActiveTime: Date | null = u.last_active_at ? new Date(u.last_active_at) : null;
      if (u.last_login_at && !lastActiveTime) {
        lastActiveTime = new Date(u.last_login_at);
      }

      let onlineStatus: 'online' | 'away' | 'offline' | 'on_leave' | 'partial_working' = 'offline';
      let onlineStatusLabel = 'Offline';

      const isExplicitLoggedOut = u.is_online === false || (Boolean(u.logged_out_at) && (!u.last_login_at || new Date(u.logged_out_at as any) >= new Date(u.last_login_at as any)));

      if (u.account_status === 'on_leave') {
        onlineStatus = 'on_leave';
        onlineStatusLabel = 'On Leave';
      } else if (u.account_status === 'partial_working') {
        onlineStatus = 'partial_working';
        onlineStatusLabel = 'Partial Working';
      } else if (isExplicitLoggedOut) {
        onlineStatus = 'offline';
        onlineStatusLabel = 'Offline';
      } else if (u.last_active_at) {
        const p = presenceFromLastActive(new Date(u.last_active_at).getTime(), nowMs);
        onlineStatus = p.status;
        onlineStatusLabel = p.label;
      }

      // Active college is ONLY populated when the coordinator is currently actively ONLINE
      const activeCollegeData = (onlineStatus === 'online') && (u.active_college_name || u.active_college_code || u.active_college_id)
        ? {
            college_id: u.active_college_id ? String(u.active_college_id) : '',
            college_code: resolveOfficialCollegeAcronym(u.active_college_code || u.active_college_name || u.active_college_id),
            college_name: u.active_college_name || '',
            location: u.active_college_location || '',
          }
        : null;

      return {
        coordinator_id: u._id,
        name: u.full_name,
        email: u.official_email,
        mobile: u.primary_mobile,
        profile_photo_url: u.profile_photo_url || null,
        assigned_colleges_count: assignedCount,
        calls_logged: cStats.calls,
        positives_secured: cStats.positives,
        calls_today: todayStats.calls,
        today_call_duration_seconds: todayStats.seconds,
        today_call_duration_formatted: durInfo.formatted,
        hours: durInfo.hours,
        minutes: durInfo.minutes,
        seconds: durInfo.seconds,
        is_active: u.is_active !== false,
        is_locked: isLocked,
        is_overloaded: assignedCount > 4,
        is_unassigned: assignedCount === 0,
        online_status: onlineStatus,
        online_status_label: onlineStatusLabel,
        active_college: activeCollegeData,
        last_active_at: lastActiveTime,
      };
    });

    // Coordinator calling duration leaderboard
    const coordinatorDurationLeaderboard = [...workforce].sort(
      (a, b) => b.today_call_duration_seconds - a.today_call_duration_seconds || b.calls_today - a.calls_today
    );

    // ── Stale Pipeline Alerts (WeeklyTracker records with follow-ups older than 7 days) ──
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stalePipelineCount = await WeeklyTracker.countDocuments({
      is_deleted: false,
      pipeline_section: { $in: ['pipeline', 'in_progress', 'top_companies'] },
      $or: [
        { follow_up_date: { $lte: new Date() } },
        { updated_at: { $lte: sevenDaysAgo } },
      ],
    });

    // ── Recent Positive Conversions Feed ──
    const recentLeads = await DailyLead.find({ lead_type: { $in: ['positive', 'jd_received'] }, is_deleted: false })
      .sort({ created_at: -1 })
      .limit(6)
      .populate('college_id', 'college_name college_code')
      .populate('coordinator_id', 'full_name official_email')
      .lean();

    const recentConversions = recentLeads.map((l: any) => ({
      lead_id: l._id,
      company_name: l.company_name,
      hr_name: l.hr_name,
      job_role: l.job_role || 'Software Engineer / Graduate Trainee',
      package_lpa: l.package_lpa || 'Competitive',
      lead_type: l.lead_type,
      college_name: (l.college_id as any)?.college_name || 'General Institution',
      college_code: (l.college_id as any)?.college_code || 'ALL',
      coordinator_name: (l.coordinator_id as any)?.full_name || 'Placement Team',
      date: (l as any).created_at || new Date(),
    }));

    // ── Module 10 System Telemetry & Maintenance Status ──
    const weeklyPipelineCount = await WeeklyTracker.countDocuments({ is_deleted: false });
    const dailyLeadsCount = await DailyLead.countDocuments({ is_deleted: false });

    const systemTelemetry = {
      db_status: 'connected',
      db_name: 'ipoms_db',
      total_collections: 12,
      total_records: {
        companies: totalCompaniesInDb,
        calls: totalCalls,
        weekly_pipeline: weeklyPipelineCount,
        daily_leads: dailyLeadsCount,
        colleges: totalColleges,
        users: totalUsers,
        assigned_work: totalAssignedWork,
      },
      midnight_cron_active: true,
      last_sync: new Date().toISOString(),
      maintenance_mode_enabled: settingsDoc?.maintenance_mode_enabled || false,
      maintenance_reason: settingsDoc?.maintenance_reason || '',
      academic_year: settingsDoc?.academic_year || '2026-2027',
      season_name: settingsDoc?.season_name || 'Campus Recruitment Season 2026-27',
    };

    // ── 5-Stage Recruitment Funnel ──
    const funnelStages = [
      { stage: 'Companies In Repository', count: totalCompaniesInDb, pct: 100, color: 'primary' },
      { stage: 'Corporate Outreach (Calls)', count: totalCalls, pct: totalCompaniesInDb > 0 ? Math.min(100, Math.round((distinctCompaniesContacted / totalCompaniesInDb) * 100)) : 0, color: 'indigo' },
      { stage: 'Positive Responses', count: totalPositives, pct: totalCalls > 0 ? positiveRate : 0, color: 'cyan' },
      { stage: 'Confirmed JDs In Hand', count: totalJds, pct: totalPositives > 0 ? Math.round((totalJds / totalPositives) * 100) : 0, color: 'warning' },
      { stage: 'Drives Conducted', count: totalDrives, pct: totalJds > 0 ? Math.round((totalDrives / totalJds) * 100) : 0, color: 'purple' },
      { stage: 'Student Offers Placed', count: totalOffers, pct: totalDrives > 0 ? 100 : 0, color: 'success' },
    ];

    // ── Recent System Audit Trail ──
    const recentAuditLogs = await AuditLog.find({})
      .sort({ created_at: -1 })
      .limit(8)
      .lean();

    const criticalAlerts = {
      unassigned_colleges_count: unassignedCollegesList.length,
      unassigned_colleges: unassignedCollegesList,
      locked_accounts_count: lockedAccountsList.length,
      locked_accounts: lockedAccountsList,
      stale_pipeline_count: stalePipelineCount,
      missing_mobiles_count: missingMobilesCount,
      missing_emails_count: missingEmailsCount,
    };

    return res.status(200).json({
      success: true,
      data: {
        greeting: {
          greeting: 'Executive Placement Command Center',
          subtext: 'Consolidated institutional performance, recruitment funnels, and operational compliance across partner institutions.',
          period: 'morning',
        },
        macro_kpis: {
          total_calls: totalCalls,
          positive_rate_pct: positiveRate,
          positive_calls: totalPositives,
          jds_in_hand: totalJds,
          drives_conducted: totalDrives,
          total_offers_placed: totalOffers,
          active_partner_colleges: totalColleges,
          portal_users: totalUsers,
          metadata_quality_pct: metadataQualityPct,
          distinct_companies_contacted: distinctCompaniesContacted,
        },
        funnel_stages: funnelStages,
        leaderboard,
        global_calling_duration: {
          today_seconds: globalTodayDurationSeconds,
          today_formatted: globalDurationInfo.formatted,
          hours: globalDurationInfo.hours,
          minutes: globalDurationInfo.minutes,
          seconds: globalDurationInfo.seconds,
          total_calls_today: todayAllTrackerRows.length,
          active_calling_coordinators: Array.from(coordTodayStatsMap.values()).filter((v) => v.calls > 0 || v.seconds > 0).length,
        },
        coordinator_duration_leaderboard: coordinatorDurationLeaderboard,
        workforce_snapshot: {
          total_coordinators: coordinatorUsers.length,
          active_today: workforce.filter((w) => w.calls_today > 0 || w.calls_logged > 0).length || coordinatorUsers.length,
          total_calling_duration_seconds: globalTodayDurationSeconds,
          total_calling_duration_formatted: globalDurationInfo.formatted,
          coordinators: workforce,
        },
        critical_alerts: criticalAlerts,
        recent_conversions: recentConversions,
        system_telemetry: systemTelemetry,
        audit_logs: recentAuditLogs,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch admin dashboard' },
    });
  }
});

// ── DB-4: POST /api/v1/assigned-work
// Team Leader creates and dispatches Assigned Work to a Coordinator (Spec Section 9 & 10)
app.post('/api/v1/assigned-work', async (req: Request, res: Response) => {
  try {
    const {
      sender_tl_id,
      assigned_to_coordinator_id,
      college_id,
      company_name,
      hr_name,
      hr_mobile,
      hr_email,
      task_description,
      priority = 'high',
    } = req.body;

    if (!sender_tl_id || !assigned_to_coordinator_id || !college_id || !company_name || !task_description) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'sender_tl_id, assigned_to_coordinator_id, college_id, company_name, and task_description are required',
        },
      });
    }

    const assignment = await AssignedWork.create({
      sender_tl_id: new Types.ObjectId(String(sender_tl_id)),
      assigned_to_coordinator_id: new Types.ObjectId(String(assigned_to_coordinator_id)),
      college_id: new Types.ObjectId(String(college_id)),
      company_name: company_name.trim(),
      hr_name: hr_name?.trim() || '',
      hr_mobile: hr_mobile?.trim() || '',
      hr_email: hr_email?.trim().toLowerCase() || '',
      task_description: task_description.trim(),
      priority,
      status: 'assigned',
    });

    const populated = await AssignedWork.findById(assignment._id)
      .populate('sender_tl_id', 'full_name official_email')
      .populate('assigned_to_coordinator_id', 'full_name official_email')
      .populate('college_id', 'college_name college_code');

    return res.status(201).json({
      success: true,
      message: 'Work assignment dispatched to coordinator dashboard successfully',
      data: populated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create work assignment' },
    });
  }
});

// ── DB-5: GET /api/v1/assigned-work
// List Active Assigned Work (filtered by coordinator or TL)
app.get('/api/v1/assigned-work', async (req: Request, res: Response) => {
  try {
    const { tl_id, is_completed } = req.query;
    // Pinned to the caller's own id unless they're a supervisor — otherwise
    // any coordinator could read another's assigned work by passing a
    // different ?coordinator_id=. See scopeToSelf() in routePolicy.ts.
    const coordinator_id = scopeToSelf(req, req.query.coordinator_id as string | undefined);

    const filter: any = { is_deleted: false };
    if (coordinator_id) filter.assigned_to_coordinator_id = new Types.ObjectId(String(coordinator_id));
    if (tl_id) filter.sender_tl_id = new Types.ObjectId(String(tl_id));
    if (is_completed !== undefined) filter.is_completed = is_completed === 'true';

    const assignments = await AssignedWork.find(filter)
      .sort({ priority: 1, created_at: -1 })
      .populate('sender_tl_id', 'full_name official_email')
      .populate('assigned_to_coordinator_id', 'full_name official_email')
      .populate('college_id', 'college_name college_code');

    return res.status(200).json({
      success: true,
      data: {
        total: assignments.length,
        assignments,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch assigned work' },
    });
  }
});

// ── DB-6: POST /api/v1/assigned-work/:id/load-to-metadata
// Metadata Merge Engine — Signature Feature (Spec Section 12 & 15)
app.post('/api/v1/assigned-work/:id/load-to-metadata', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await AssignedWork.findById(id)
      .populate('sender_tl_id', 'full_name')
      .populate('assigned_to_coordinator_id', 'full_name');

    if (!assignment || assignment.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assigned work item not found' },
      });
    }

    const { company_name, hr_name, hr_mobile, hr_email } = assignment;
    const tlName = (assignment.sender_tl_id as any)?.full_name || 'Team Leader';
    const coordName = (assignment.assigned_to_coordinator_id as any)?.full_name || 'Coordinator';

    // 1. Search for existing company in CompanyMetadata (Case-Insensitive)
    let company = await CompanyMetadata.findOne({
      company_name: { $regex: new RegExp(`^${escapeRegex(company_name.trim())}$`, 'i') },
      is_deleted: false,
    });

    let mergeResultCase = 1;

    if (!company) {
      // Case 1: Company does not exist -> Create an entirely new company record with sequential serial_number
      const highestDoc = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } })
        .sort({ serial_number: -1 })
        .select('serial_number');
      const nextSerial = (highestDoc?.serial_number || 0) + 1;

      company = await CompanyMetadata.create({
        serial_number: nextSerial,
        company_name: company_name.trim(),
        hr_name: hr_name?.trim() || '',
        primary_mobile: hr_mobile?.trim() || '',
        mobile_numbers: hr_mobile ? [hr_mobile.trim()] : [],
        primary_email: hr_email?.trim().toLowerCase() || '',
        email_ids: hr_email ? [hr_email.trim().toLowerCase()] : [],
        notes: `[Metadata Merge] Added via Assigned Work by ${coordName} (Assigned by ${tlName} on ${new Date().toLocaleDateString('en-IN')})`,
      });
      mergeResultCase = 1;
    } else {
      // Company exists -> Check HR, Mobile, Email hierarchy
      const existingHrName = (company.hr_name || '').trim().toLowerCase();
      const incomingHrName = (hr_name || '').trim().toLowerCase();

      if (incomingHrName && existingHrName === incomingHrName) {
        // Case 3 & 4: Same HR -> Append new Mobile & Email without duplicates
        let updated = false;

        if (hr_mobile && !company.mobile_numbers.includes(hr_mobile.trim())) {
          company.mobile_numbers.push(hr_mobile.trim());
          if (!company.primary_mobile) company.primary_mobile = hr_mobile.trim();
          updated = true;
          mergeResultCase = 3;
        }

        if (hr_email && !company.email_ids.includes(hr_email.trim().toLowerCase())) {
          company.email_ids.push(hr_email.trim().toLowerCase());
          if (!company.primary_email) company.primary_email = hr_email.trim().toLowerCase();
          updated = true;
          mergeResultCase = 4;
        }

        if (updated) {
          company.notes = `${company.notes || ''}\n[Metadata Merge] Updated contact info from Assigned Work by ${coordName} on ${new Date().toLocaleDateString('en-IN')}`;
          await company.save();
        }
      } else {
        // Case 2: Different HR contact -> update primary or append notes
        if (!company.hr_name) company.hr_name = hr_name?.trim() || '';
        if (hr_mobile && !company.mobile_numbers.includes(hr_mobile.trim())) {
          company.mobile_numbers.push(hr_mobile.trim());
        }
        if (hr_email && !company.email_ids.includes(hr_email.trim().toLowerCase())) {
          company.email_ids.push(hr_email.trim().toLowerCase());
        }
        company.notes = `${company.notes || ''}\n[Metadata Merge] Additional HR: ${hr_name} (${hr_mobile} / ${hr_email}) added by ${coordName} on ${new Date().toLocaleDateString('en-IN')}`;
        await company.save();
        mergeResultCase = 2;
      }
    }

    // Mark Assigned Work as loaded to metadata
    assignment.is_loaded_to_metadata = true;
    assignment.status = 'loaded_to_metadata';
    await assignment.save();

    return res.status(200).json({
      success: true,
      message: `Company contact successfully merged into Metadata Database (Case ${mergeResultCase})`,
      data: {
        assignment_id: assignment._id,
        company_id: company._id,
        company_name: company.company_name,
        merge_case: mergeResultCase,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Metadata merge engine failed' },
    });
  }
});

// ── DB-7: PATCH /api/v1/assigned-work/:id/complete
// Coordinator marks assignment completed -> immediately hides from active dashboard (Spec Section 9 & 10)
app.patch('/api/v1/assigned-work/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await AssignedWork.findById(id);

    if (!assignment || assignment.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assigned work item not found' },
      });
    }

    assignment.is_completed = true;
    assignment.status = 'completed';
    assignment.completed_at = new Date();
    await assignment.save();

    return res.status(200).json({
      success: true,
      message: `Assignment for "${assignment.company_name}" completed and hidden from dashboard`,
      data: assignment,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to complete assignment' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 08 — NOTIFICATIONS & ENTERPRISE ALERTS ENGINE ENDPOINTS
// Spec: Chapter 05 Database Engineering & API Specifications — Section 5.2.8
// ─────────────────────────────────────────────────────────────────────────────

// ── NT-1: GET /api/v1/notifications
// Fetch active notifications for logged-in user (Top 100 Cap, Spec Section 5.2.8.5)
app.get('/api/v1/notifications', async (req: Request, res: Response) => {
  try {
    const { college_id, tab = 'all', notification_type } = req.query;
    // Pinned to the caller's own id unless they're a supervisor — otherwise
    // passing a colleague's ?user_id= reads notifications targeted at them,
    // including their per-user read/response state. See scopeToSelf() in
    // routePolicy.ts (built for coordinator_id, applies the same way here).
    const user_id = scopeToSelf(req, req.query.user_id as string | undefined);

    const uId = user_id ? new Types.ObjectId(String(user_id)) : null;
    const cId = college_id && college_id !== 'all' ? new Types.ObjectId(String(college_id)) : null;

    // Audience targeting query filter
    const audienceConditions: any[] = [{ audience_type: 'everyone' }];
    if (uId) {
      audienceConditions.push({ target_user_ids: uId });
    }
    if (cId) {
      audienceConditions.push({ target_college_id: cId });
    }

    const queryFilter: any = {
      is_deleted: false,
      $or: audienceConditions,
    };

    if (notification_type) {
      queryFilter.notification_type = notification_type;
    }

    // Fetch active notifications capped at Top 100
    const notifications = await Notification.find(queryFilter)
      .sort({ priority: 1, created_at: -1 })
      .limit(100)
      .populate('sender_id', 'full_name official_email')
      .populate('target_college_id', 'college_name college_code');

    // Calculate per-user read and response state
    const processed = notifications.map((n) => {
      const userStatus = uId
        ? n.recipient_statuses.find((s) => s.user_id?.toString() === uId.toString())
        : null;

      const isRead = userStatus ? userStatus.status === 'read' : false;
      const userResponse = userStatus ? userStatus.response : null;

      return {
        _id: n._id,
        notification_type: n.notification_type,
        sender_id: n.sender_id,
        sender_role: n.sender_role,
        audience_type: n.audience_type,
        target_college: n.target_college_id,
        title: n.title,
        message: n.message,
        icon_type: n.icon_type,
        priority: n.priority,
        action_url: n.action_url,
        attachment_url: n.attachment_url,
        expires_at: n.expires_at,
        requires_acknowledgment: n.requires_acknowledgment,
        created_at: n.created_at,
        is_read: isRead,
        user_response: userResponse,
        total_recipients: n.recipient_statuses.length,
        attendees_count: n.recipient_statuses.filter((s) => s.response === 'will_attend').length,
        acknowledged_count: n.recipient_statuses.filter((s) => s.response === 'acknowledged').length,
      };
    });

    // Tab filtering
    let filtered = processed;
    if (tab === 'unread') {
      filtered = processed.filter((n) => !n.is_read);
    } else if (tab === 'announcement') {
      filtered = processed.filter((n) => n.notification_type === 'announcement');
    } else if (tab === 'meeting') {
      filtered = processed.filter((n) => n.notification_type === 'meeting');
    } else if (tab === 'assignment') {
      filtered = processed.filter((n) => n.notification_type === 'assignment');
    }

    const unreadCount = processed.filter((n) => !n.is_read).length;

    return res.status(200).json({
      success: true,
      data: {
        total: filtered.length,
        unread_count: unreadCount,
        notifications: filtered,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch notifications' },
    });
  }
});

// ── NT-2: POST /api/v1/notifications
// Broadcast alert or announcement to target audience (Spec Section 5.2.8.4)
app.post('/api/v1/notifications', async (req: Request, res: Response) => {
  try {
    const {
      notification_type = 'announcement',
      sender_id,
      sender_role = 'team_leader',
      audience_type = 'everyone',
      target_user_ids = [],
      target_college_id,
      title,
      message,
      icon_type = 'announcement',
      priority = 'medium',
      action_url,
      attachment_url,
      expires_at,
      requires_acknowledgment = false,
    } = req.body;

    if (!sender_id || !title || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sender_id, title, and message are required' },
      });
    }

    // Determine target users to populate initial recipient statuses
    let targetUsers: any[] = [];
    if (audience_type === 'individual' && target_user_ids.length > 0) {
      targetUsers = target_user_ids.map((id: string) => ({ user_id: new Types.ObjectId(id), status: 'sent' }));
    } else if (audience_type === 'everyone') {
      const allUsers = await User.find({ is_deleted: false }).select('_id');
      targetUsers = allUsers.map((u) => ({ user_id: u._id, status: 'sent' }));
    } else {
      const allUsers = await User.find({ is_deleted: false }).select('_id');
      targetUsers = allUsers.map((u) => ({ user_id: u._id, status: 'sent' }));
    }

    const notification = await Notification.create({
      notification_type,
      sender_id: new Types.ObjectId(String(sender_id)),
      sender_role,
      audience_type,
      target_user_ids: target_user_ids.map((id: string) => new Types.ObjectId(String(id))),
      target_college_id: target_college_id && target_college_id !== 'all' ? new Types.ObjectId(String(target_college_id)) : null,
      title: title.trim(),
      message: message.trim(),
      icon_type,
      priority,
      action_url: action_url || null,
      attachment_url: attachment_url || null,
      expires_at: expires_at ? new Date(expires_at) : null,
      requires_acknowledgment: !!requires_acknowledgment,
      recipient_statuses: targetUsers,
    });

    const populated = await Notification.findById(notification._id)
      .populate('sender_id', 'full_name official_email')
      .populate('target_college_id', 'college_name college_code');

    return res.status(201).json({
      success: true,
      message: 'Notification broadcast successfully dispatched',
      data: populated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to broadcast notification' },
    });
  }
});

// ── NT-3: PATCH /api/v1/notifications/:id/read
// Mark notification as read for current user
app.patch('/api/v1/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const notification = await Notification.findById(id);
    if (!notification || notification.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      });
    }

    if (user_id) {
      const uIdStr = String(user_id);
      const recipient = notification.recipient_statuses.find((s) => s.user_id?.toString() === uIdStr);
      if (recipient) {
        recipient.status = 'read';
        recipient.read_at = new Date();
      } else {
        notification.recipient_statuses.push({
          user_id: new Types.ObjectId(uIdStr),
          status: 'read',
          read_at: new Date(),
        });
      }
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to mark notification as read' },
    });
  }
});

// ── NT-4: PATCH /api/v1/notifications/mark-all-read
// Mark all notifications as read for current user
app.patch('/api/v1/notifications/mark-all-read', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'user_id is required' },
      });
    }

    const uId = new Types.ObjectId(String(user_id));
    const now = new Date();

    await Notification.updateMany(
      { is_deleted: false, 'recipient_statuses.user_id': uId },
      {
        $set: {
          'recipient_statuses.$[elem].status': 'read',
          'recipient_statuses.$[elem].read_at': now,
        },
      },
      {
        arrayFilters: [{ 'elem.user_id': uId }],
      }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to mark all as read' },
    });
  }
});

// ── NT-5: PATCH /api/v1/notifications/:id/acknowledge
// Acknowledge or submit Meeting Attendance ("acknowledged", "will_attend", "cannot_attend")
app.patch('/api/v1/notifications/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id, response } = req.body;

    if (!user_id || !response) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'user_id and response are required' },
      });
    }

    const notification = await Notification.findById(id);
    if (!notification || notification.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' },
      });
    }

    const uIdStr = String(user_id);
    let recipient = notification.recipient_statuses.find((s) => s.user_id?.toString() === uIdStr);
    const now = new Date();

    if (recipient) {
      recipient.status = 'read';
      recipient.read_at = recipient.read_at || now;
      recipient.response = response;
      recipient.responded_at = now;
    } else {
      notification.recipient_statuses.push({
        user_id: new Types.ObjectId(uIdStr),
        status: 'read',
        read_at: now,
        response,
        responded_at: now,
      });
    }

    await notification.save();

    return res.status(200).json({
      success: true,
      message: `Response "${response}" recorded successfully`,
      data: {
        notification_id: notification._id,
        response,
        responded_at: now,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to record acknowledgment' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 02 — MASTER METADATA DATABASE MANAGEMENT ENDPOINTS
// Spec: Module_02_Master_Company_Database_Specification_v1.0.md & Chapter 05 Section 5.2.1
// ─────────────────────────────────────────────────────────────────────────────

// ── MD-0: GET /api/v1/metadata/empty-mobiles
// Retrieve all contacts in metadata directory with empty or missing mobile numbers
app.get('/api/v1/metadata/empty-mobiles', async (req: Request, res: Response) => {
  try {
    const emptyFilter = {
      is_deleted: false,
      $or: [
        { primary_mobile: { $exists: false } },
        { primary_mobile: null },
        { primary_mobile: '' },
        { primary_mobile: { $regex: '^[\\s\\-\\.]*$' } },
      ],
    };

    const companies = await CompanyMetadata.find(emptyFilter)
      .sort({ serial_number: 1, _id: 1 })
      .select('serial_number company_name hr_name hr_designation primary_mobile mobile_numbers primary_email email_ids company_type location notes created_at');

    return res.status(200).json({
      success: true,
      data: {
        total: companies.length,
        companies,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch empty mobile contacts' },
    });
  }
});

// ── MD-0.1: ALL /api/v1/metadata/import-unique-companies
// Loads unique_companies_list.xlsx into Master Metadata and establishes it as the sole Recent Data batch
app.all('/api/v1/metadata/import-unique-companies', async (req: Request, res: Response) => {
  try {
    const result = await importUniqueCompaniesList();
    return res.status(200).json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'IMPORT_ERROR', message: error.message || 'Failed to import unique companies' },
    });
  }
});

// ── MD-0.2: ALL /api/v1/metadata/export-missing-excel
// Exports all contacts with missing mobiles into C:\Projects\iPOMS\missing.xlsx
app.all('/api/v1/metadata/export-missing-excel', async (req: Request, res: Response) => {
  try {
    const result = await generateMissingMobilesExcel();
    return res.status(200).json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'EXPORT_ERROR', message: error.message || 'Failed to export missing mobiles Excel' },
    });
  }
});

// ── MD-0.3: ALL /api/v1/metadata/renumber
// Ensures continuous, unbroken sequential numbering 1..N across all metadata
app.all('/api/v1/metadata/renumber', async (req: Request, res: Response) => {
  try {
    const result = await renumberCompanyMetadata();
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'RENUMBER_ERROR', message: error.message || 'Failed to renumber metadata' },
    });
  }
});

// ── MD-1: GET /api/v1/metadata
// Searchable company & HR catalog with starts-with search, type filter, range selection (from_sno to_sno), pagination & recycle bin toggle
app.get('/api/v1/metadata', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      q = '',
      type,
      is_deleted = 'false',
      from_sno,
      to_sno,
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    let limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 50));

    const filter: any = {
      is_deleted: is_deleted === 'true',
    };

    // Range Selection by Serial Number (e.g. S.No 25 till 70 or 1 till 40)
    const fromSnoNum = from_sno ? parseInt(String(from_sno), 10) : undefined;
    const toSnoNum = to_sno ? parseInt(String(to_sno), 10) : undefined;

    if ((fromSnoNum !== undefined && !isNaN(fromSnoNum)) || (toSnoNum !== undefined && !isNaN(toSnoNum))) {
      filter.serial_number = {};
      if (fromSnoNum !== undefined && !isNaN(fromSnoNum) && fromSnoNum > 0) {
        filter.serial_number.$gte = fromSnoNum;
      }
      if (toSnoNum !== undefined && !isNaN(toSnoNum) && toSnoNum > 0) {
        filter.serial_number.$lte = toSnoNum;
      }

      // If user provided a custom range (e.g. 25 till 70 = 46 contacts) and limit was not explicitly overridden,
      // expand limitNum to show the full range batch in one smooth view (up to 500 contacts)
      if (req.query.limit === undefined && fromSnoNum && toSnoNum && toSnoNum >= fromSnoNum) {
        const rangeSize = toSnoNum - fromSnoNum + 1;
        if (rangeSize > 0 && rangeSize <= 500) {
          limitNum = rangeSize;
        }
      }
    }

    const skip = (pageNum - 1) * limitNum;

    // Starts-with search (Spec Section 8: search by company name starts-with or mobile)
    if (q && String(q).trim() !== '') {
      const queryStr = String(q).trim();
      const isPhone = /^[0-9+]+$/.test(queryStr);

      if (isPhone) {
        filter.$or = [
          { primary_mobile: { $regex: queryStr, $options: 'i' } },
          { contact_numbers: { $regex: queryStr, $options: 'i' } },
          { mobile_numbers: { $regex: queryStr, $options: 'i' } },
        ];
      } else {
        // Starts-with regex
        const safeQuery = escapeRegex(queryStr);
        const startsWithRegex = new RegExp(`^${safeQuery}`, 'i');
        const containsRegex = new RegExp(safeQuery, 'i');
        filter.$or = [
          { company_name: startsWithRegex },
          { hr_contact_name: containsRegex },
          { hr_name: containsRegex },
          { email_ids: containsRegex },
          { primary_email: containsRegex },
        ];
      }
    }

    if (type && type !== 'all') {
      filter.company_type = type;
    }

    const isRecent = req.query.recent === 'true';
    if (isRecent) {
      // Recent data selects the latest 100 companies in the directory
      const highestDoc = await CompanyMetadata.findOne({ is_deleted: false }).sort({ serial_number: -1 }).select('serial_number');
      const maxSerial = highestDoc?.serial_number || 100;
      const recentThreshold = Math.max(1, maxSerial - 99);
      if (!filter.serial_number) {
        filter.serial_number = { $gte: recentThreshold };
      } else {
        filter.serial_number.$gte = Math.max(filter.serial_number.$gte || recentThreshold, recentThreshold);
      }
    }

    // In Recent Data view, sort descending so the most recently added companies appear at the top
    const sortOrder: any = isRecent
      ? { serial_number: -1, _id: -1 }
      : { serial_number: 1, _id: 1 };

    const total = await CompanyMetadata.countDocuments(filter);
    const companies = await CompanyMetadata.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      success: true,
      data: {
        total,
        page: pageNum,
        totalPages,
        limit: limitNum,
        from_sno: fromSnoNum,
        to_sno: toSnoNum,
        companies,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch metadata companies' },
    });
  }
});

// ── MD-2: POST /api/v1/metadata
// Add new company / HR contact with intelligent duplicate pre-validation (Spec Section 7 & 11)
app.post('/api/v1/metadata', async (req: Request, res: Response) => {
  try {
    const {
      company_name,
      hr_name = '',
      hr_designation = '',
      primary_mobile = '',
      mobile_numbers = [],
      primary_email = '',
      email_ids = [],
      company_type = 'other',
      notes = '',
      force_save = false,
    } = req.body;

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Company Name is mandatory' },
      });
    }

    const trimmedCompany = company_name.trim();
    const trimmedHr = hr_name.trim();
    const trimmedMobile = primary_mobile.trim();
    const trimmedEmail = primary_email.trim().toLowerCase();

    if (!trimmedMobile && !trimmedEmail && (!mobile_numbers || mobile_numbers.length === 0) && (!email_ids || email_ids.length === 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one contact method (Mobile Number or Email ID) is required' },
      });
    }

    // Duplicate Check (Spec Section 7 & 11)
    if (!force_save && trimmedMobile) {
      const existing = await CompanyMetadata.findOne({
        is_deleted: false,
        company_name: { $regex: new RegExp(`^${escapeRegex(trimmedCompany)}$`, 'i') },
        hr_name: { $regex: new RegExp(`^${escapeRegex(trimmedHr)}$`, 'i') },
        $or: [
          { primary_mobile: trimmedMobile },
          { mobile_numbers: trimmedMobile },
        ],
      });

      if (existing) {
        const existingEmail = (existing.primary_email || '').toLowerCase();
        const isEmailExact = existingEmail === trimmedEmail;

        if (isEmailExact) {
          // Exact duplicate — block save (Spec Section 7)
          return res.status(409).json({
            success: false,
            error: {
              code: 'EXACT_DUPLICATE',
              message: `Exact duplicate found: "${trimmedCompany}" with HR "${trimmedHr}" and mobile "${trimmedMobile}" already exists.`,
              existing_record: existing,
            },
          });
        } else {
          // Possible duplicate (different email) — warning required (Spec Section 7 & 11)
          return res.status(409).json({
            success: false,
            error: {
              code: 'POSSIBLE_DUPLICATE',
              message: `Possible duplicate found: Same company, HR, and phone already exist with email "${existing.primary_email}".`,
              existing_record: existing,
            },
          });
        }
      }
    }

    // Build all mobile and email arrays
    const allMobiles = Array.from(new Set([trimmedMobile, ...mobile_numbers].filter(Boolean)));
    const allEmails = Array.from(new Set([trimmedEmail, ...email_ids].filter(Boolean)));

    const highestDoc = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } }).sort({ serial_number: -1 }).select('serial_number');
    const nextSerial = (highestDoc?.serial_number || 0) + 1;

    const created = await CompanyMetadata.create({
      serial_number: nextSerial,
      company_name: trimmedCompany,
      hr_name: trimmedHr,
      hr_designation: hr_designation.trim(),
      primary_mobile: trimmedMobile,
      mobile_numbers: allMobiles,
      primary_email: trimmedEmail,
      email_ids: allEmails,
      company_type: (company_type || 'IT / Software & Technology').trim(),
      notes: notes.trim(),
      is_deleted: false,
    });

    return res.status(201).json({
      success: true,
      message: `Company "${trimmedCompany}" created successfully in Master Metadata Database`,
      data: created,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create metadata record' },
    });
  }
});

// ── MD-3: PATCH /api/v1/metadata/:id
// Update company / HR contact details
app.patch('/api/v1/metadata/:id', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid metadata ID format' },
      });
    }

    const {
      company_name,
      hr_name,
      hr_designation,
      primary_mobile,
      mobile_numbers,
      primary_email,
      email_ids,
      company_type,
      notes,
    } = req.body;

    const record = await CompanyMetadata.findById(id);
    if (!record || record.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Metadata record not found' },
      });
    }

    if (company_name !== undefined) record.company_name = company_name.trim();
    if (hr_name !== undefined) record.hr_name = hr_name.trim();
    if (hr_designation !== undefined) record.hr_designation = hr_designation.trim();
    if (primary_mobile !== undefined) {
      record.primary_mobile = primary_mobile.trim();
      record.mobile_numbers = Array.from(new Set([record.primary_mobile, ...(mobile_numbers || record.mobile_numbers)].filter(Boolean)));
    }
    if (primary_email !== undefined) {
      record.primary_email = primary_email.trim().toLowerCase();
      record.email_ids = Array.from(new Set([record.primary_email, ...(email_ids || record.email_ids)].filter(Boolean)));
    }
    if (company_type !== undefined) record.company_type = company_type.trim();
    if (notes !== undefined) record.notes = notes.trim();

    await record.save();

    return res.status(200).json({
      success: true,
      message: `Metadata for "${record.company_name}" updated successfully`,
      data: record,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update metadata record' },
    });
  }
});

// ── MD-6A: DELETE /api/v1/metadata/purge-all
// Empty Recycle Bin: Permanently purge all soft-deleted records from database at once
app.delete('/api/v1/metadata/purge-all', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isCoordOnly = user?.roles?.some((r: string) => ['PLACEMENT_COORDINATOR', 'COORDINATOR'].includes(r)) &&
      !user?.roles?.some((r: string) => ['ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD'].includes(r));

    if (isCoordOnly) {
      const isMohana =
        (user?.email || '').toLowerCase().includes('mohanaradha') ||
        (user?.fullName || '').toLowerCase().includes('mohana');
      if (!isMohana) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access Denied: Only A. Mohanaradha among coordinators has authorization to permanently purge records from the Master Metadata Database.',
          },
        });
      }
    }

    const result = await CompanyMetadata.deleteMany({ is_deleted: true });

    return res.status(200).json({
      success: true,
      message: `Successfully emptied Recycle Bin. ${result.deletedCount} metadata record(s) permanently purged from database.`,
      deleted_count: result.deletedCount,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to empty recycle bin' },
    });
  }
});

// ── MD-4: DELETE /api/v1/metadata/:id
// Soft delete record to Recycle Bin (Spec Section 17)
app.delete('/api/v1/metadata/:id', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req: Request, res: Response) => {
  try {
    // Only Mohanaradha among coordinators has rights to delete from metadata
    const user = (req as any).user;
    const isCoordOnly = user?.roles?.some((r: string) => ['PLACEMENT_COORDINATOR', 'COORDINATOR'].includes(r)) &&
      !user?.roles?.some((r: string) => ['ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD'].includes(r));

    if (isCoordOnly) {
      const isMohana =
        (user?.email || '').toLowerCase().includes('mohanaradha') ||
        (user?.fullName || '').toLowerCase().includes('mohana');
      if (!isMohana) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access Denied: Only A. Mohanaradha among coordinators has authorization to delete from the Master Metadata Database.',
          },
        });
      }
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid metadata ID format' },
      });
    }

    const record = await CompanyMetadata.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Metadata record not found' },
      });
    }

    record.is_deleted = true;
    record.deleted_at = new Date();
    record.deleted_by = (req as any).user?.userId ? new Types.ObjectId((req as any).user.userId) : null;
    await record.save();

    return res.status(200).json({
      success: true,
      message: `Company "${record.company_name}" moved to Recycle Bin`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to soft delete metadata record' },
    });
  }
});

// ── MD-5: POST /api/v1/metadata/:id/restore
// Restore record from Recycle Bin (Spec Section 17)
app.post('/api/v1/metadata/:id/restore', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid metadata ID format' },
      });
    }

    const record = await CompanyMetadata.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Metadata record not found' },
      });
    }

    // A coordinator may only restore what they themselves deleted; Admin and
    // Team Leader (isSupervisor) may restore anything. Records deleted before
    // this field existed have deleted_by=null, which reads as "unowned" and
    // is refused for a non-supervisor — the same fail-closed default as
    // refuseForeignOwner uses everywhere else.
    if (refuseForeignOwner(req, res, record.deleted_by ? String(record.deleted_by) : undefined,
      'You can only restore records you deleted yourself.')) return;

    record.is_deleted = false;
    record.deleted_at = null;
    record.deleted_by = null;
    await record.save();

    return res.status(200).json({
      success: true,
      message: `Company "${record.company_name}" successfully restored from Recycle Bin`,
      data: record,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to restore metadata record' },
    });
  }
});

// ── MD-6: DELETE /api/v1/metadata/:id/purge
// Permanently purge record from database (Spec Section 17)
app.delete('/api/v1/metadata/:id/purge', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req: Request, res: Response) => {
  try {
    // Only Mohanaradha among coordinators has rights to permanently purge
    const user = (req as any).user;
    const isCoordOnly = user?.roles?.some((r: string) => ['PLACEMENT_COORDINATOR', 'COORDINATOR'].includes(r)) &&
      !user?.roles?.some((r: string) => ['ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD'].includes(r));

    if (isCoordOnly) {
      const isMohana =
        (user?.email || '').toLowerCase().includes('mohanaradha') ||
        (user?.fullName || '').toLowerCase().includes('mohana');
      if (!isMohana) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access Denied: Only A. Mohanaradha among coordinators has authorization to permanently purge records from the Master Metadata Database.',
          },
        });
      }
    }

    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid metadata ID format' },
      });
    }

    const record = await CompanyMetadata.findByIdAndDelete(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Metadata record not found' },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Company "${record.company_name}" permanently purged from database`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to purge metadata record' },
    });
  }
});

// ── MD-7: POST /api/v1/metadata/bulk-import
// Bulk paste / Excel import endpoint with row-by-row intelligent deduplication & append merging
app.post('/api/v1/metadata/bulk-import', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req: Request, res: Response) => {
  try {
    const { rows = [] } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rows array is required and cannot be empty' },
      });
    }

    let insertedCount = 0;
    let mergedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const details: Array<{ row_number: number; company_name: string; status: 'inserted' | 'merged' | 'skipped' | 'error'; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      const cName = (r.company_name || '').trim();
      const hName = (r.hr_name || '').trim();
      const rawMobile = (r.primary_mobile || r.mobile || '').trim();
      const rawEmail = (r.primary_email || r.email || '').trim().toLowerCase();
      const cType = (r.company_type || 'other').trim().toLowerCase();

      if (!cName) {
        details.push({ row_number: rowNum, company_name: 'Unknown', status: 'error', message: 'Missing Company Name' });
        errorCount++;
        continue;
      }

      // Parse and clean all mobile numbers in the row (supports comma, semicolon, slash separated)
      const incomingMobiles = rawMobile
        ? rawMobile.split(/[,;\/]+/).map((s: string) => s.trim()).filter((s: string) => s.length >= 5)
        : [];

      // Parse and clean all emails in the row
      const incomingEmails = rawEmail
        ? rawEmail.split(/[,;\/]+/).map((s: string) => s.trim().toLowerCase()).filter((s: string) => s.includes('@'))
        : [];

      // Check if company already exists in database (case-insensitive)
      const existing = await CompanyMetadata.findOne({
        is_deleted: false,
        company_name: { $regex: new RegExp(`^${escapeRegex(cName)}$`, 'i') },
      });

      if (existing) {
        // Collect all existing mobile numbers for this company
        const existingMobiles = Array.from(
          new Set([existing.primary_mobile, ...(existing.mobile_numbers || [])].map((m) => (m || '').trim()).filter(Boolean))
        );

        // Collect all existing emails for this company
        const existingEmails = Array.from(
          new Set([existing.primary_email, ...(existing.email_ids || [])].map((e) => (e || '').trim().toLowerCase()).filter(Boolean))
        );

        // Check for new mobile numbers not already recorded
        const newMobiles = incomingMobiles.filter((m: string) => !existingMobiles.includes(m));
        // Check for new emails not already recorded
        const newEmails = incomingEmails.filter((e: string) => !existingEmails.includes(e));

        // RULE 1: If incoming has phone numbers and ALL of them already exist in the company -> EXACT DUPLICATE -> SKIP
        if (incomingMobiles.length > 0 && newMobiles.length === 0) {
          skippedCount++;
          details.push({
            row_number: rowNum,
            company_name: cName,
            status: 'skipped',
            message: `Exact duplicate: Mobile number (${incomingMobiles.join(', ')}) already exists for this company`,
          });
          continue;
        }

        // RULE 2: If company exists and has NEW mobile number(s) or NEW email(s) -> APPEND / MERGE into existing row
        if (newMobiles.length > 0 || newEmails.length > 0) {
          let updated = false;

          // Append new mobile numbers
          if (newMobiles.length > 0) {
            const combinedMobiles = Array.from(new Set([...existingMobiles, ...newMobiles]));
            existing.mobile_numbers = combinedMobiles;
            if (!existing.primary_mobile) {
              existing.primary_mobile = combinedMobiles[0];
            }
            updated = true;
          }

          // Append new email IDs
          if (newEmails.length > 0) {
            const combinedEmails = Array.from(new Set([...existingEmails, ...newEmails]));
            existing.email_ids = combinedEmails;
            if (!existing.primary_email) {
              existing.primary_email = combinedEmails[0];
            }
            updated = true;
          }

          // Update HR name if currently blank
          if (!existing.hr_name && hName) {
            existing.hr_name = hName;
            updated = true;
          }

          if (updated) {
            existing.updated_at = new Date();
            await existing.save();
            mergedCount++;
            details.push({
              row_number: rowNum,
              company_name: cName,
              status: 'merged',
              message: `Appended ${newMobiles.length ? `${newMobiles.join(', ')} to mobile numbers` : ''}${newMobiles.length && newEmails.length ? ' and ' : ''}${newEmails.length ? `${newEmails.join(', ')} to emails` : ''}`,
            });
            continue;
          }
        }

        // If no new mobile/email but company exists with no numbers
        skippedCount++;
        details.push({
          row_number: rowNum,
          company_name: cName,
          status: 'skipped',
          message: 'Company already exists in directory with no new contact details to append',
        });
      } else {
        // RULE 4: Brand new company -> INSERT
        const highestDoc = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } }).sort({ serial_number: -1 }).select('serial_number');
        const nextSerial = (highestDoc?.serial_number || 0) + 1;

        await CompanyMetadata.create({
          serial_number: nextSerial,
          company_name: cName,
          hr_name: hName,
          primary_mobile: incomingMobiles[0] || (rawMobile || ''),
          mobile_numbers: incomingMobiles.length > 0 ? incomingMobiles : (rawMobile ? [rawMobile] : []),
          primary_email: incomingEmails[0] || (rawEmail || ''),
          email_ids: incomingEmails.length > 0 ? incomingEmails : (rawEmail ? [rawEmail] : []),
          company_type: cType || 'other',
          is_deleted: false,
          created_at: new Date(),
          updated_at: new Date(),
        });

        insertedCount++;
        details.push({
          row_number: rowNum,
          company_name: cName,
          status: 'inserted',
          message: 'Created new company contact record',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk import completed: ${insertedCount} inserted, ${mergedCount} merged/appended, ${skippedCount} duplicates skipped.`,
      data: {
        total_processed: rows.length,
        inserted_count: insertedCount,
        merged_count: mergedCount,
        skipped_count: skippedCount,
        error_count: errorCount,
        details,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to process bulk import' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 01 & 09 — USER MANAGEMENT, ROLES & SYSTEM SETTINGS ENDPOINTS
// Spec: Module_01_User_Management_Specification_v1.0.md & Module_09_Settings_Configuration_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────

// ── US-1: GET /api/v1/users
// List users with search, role filtering, pagination and populated colleges
app.get('/api/v1/users', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { q, role, status, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (q && String(q).trim() !== '') {
      const qStr = String(q).trim();
      const regex = new RegExp(escapeRegex(qStr), 'i');
      filter.$or = [
        { full_name: regex },
        { username: regex },
        { official_email: regex },
        { primary_mobile: regex },
      ];
    }

    if (role && role !== 'all') {
      filter.role_codes = role;
    }

    if (status && status !== 'all') {
      if (status === 'deactivated') {
        filter.$or = [{ is_deleted: true }, { account_status: 'deactivated' }];
      } else {
        filter.account_status = status;
        filter.is_deleted = false;
      }
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ full_name: 1 })
      .skip(skip)
      .limit(limitNum)
      .select('-password_hash')
      .populate('assigned_college_ids', 'college_name college_code')
      .populate('role_ids', 'role_name role_code permissions');

    return res.status(200).json({
      success: true,
      data: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
        users,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch users' },
    });
  }
});

// ── US-2: POST /api/v1/users
// Create new user (with bcrypt password hashing & role association)
app.post('/api/v1/users', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER'), async (req: Request, res: Response) => {
  try {
    const {
      full_name,
      username,
      official_email,
      personal_email = '',
      password = 'Password@123',
      // Canonical code, not the legacy `COORDINATOR` alias — defaulting to the
      // alias re-introduced the exact role-code drift `fixRoleCodes` cleaned up,
      // leaving new accounts with a role absent from the `roles` collection.
      role_codes = ['PLACEMENT_COORDINATOR'],
      assigned_college_ids = [],
      primary_mobile = '',
      employee_id = '',
      account_status = 'active',
    } = req.body;

    if (!full_name || !username || !official_email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'full_name, username, and official_email are mandatory' },
      });
    }

    const emailLower = official_email.trim().toLowerCase();
    const isStaffEmail = emailLower.endsWith('@infoziant.com') || emailLower.endsWith('@icl.today');
    if (!isStaffEmail) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DOMAIN', message: 'Official email must end with @infoziant.com or @icl.today' },
      });
    }

    // A Team Leader may create coordinators, never an administrator or
    // another Team Leader.
    if (refuseRoleEscalation(req, res, role_codes)) return;

    // Check duplicate username or email
    const existing = await User.findOne({
      $or: [
        { username: username.trim().toLowerCase() },
        { official_email: official_email.trim().toLowerCase() },
      ],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this username or official email already exists',
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Find role ObjectIds
    const roles = await Role.find({ role_code: { $in: role_codes } });
    const roleIds = roles.map((r) => r._id);

    const user = await User.create({
      full_name: full_name.trim(),
      username: username.trim().toLowerCase(),
      official_email: official_email.trim().toLowerCase(),
      personal_email: personal_email.trim().toLowerCase(),
      password_hash,
      role_codes,
      role_ids: roleIds,
      assigned_college_ids: assigned_college_ids.map((id: string) => new Types.ObjectId(id)),
      primary_mobile: primary_mobile.trim(),
      employee_id: employee_id.trim(),
      account_status,
      presence_status: 'available',
      is_deleted: false,
    });

    const populated = await User.findById(user._id)
      .select('-password_hash')
      .populate('assigned_college_ids', 'college_name college_code')
      .populate('role_ids', 'role_name role_code');

    return res.status(201).json({
      success: true,
      message: `User account for "${full_name}" created successfully`,
      data: populated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create user' },
    });
  }
});

// ── US-3: PATCH /api/v1/users/:id
// Update user profile, password, role, assigned colleges, or account status
app.patch('/api/v1/users/:id', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      personal_email,
      primary_mobile,
      secondary_mobile,
      alternate_mobile,
      employee_id,
      linkedin_profile,
      date_of_birth,
      date_of_joining,
      is_profile_locked,
      assigned_college_ids,
      role_codes,
      account_status,
      presence_status,
      password,
      has_all_colleges_access,
    } = req.body;

    const user = await User.findById(id);
    if (!user || user.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    // Two separate escalation paths have to be closed here, not one:
    //   1. granting yourself a role you may not grant, and
    //   2. editing an account that already outranks you — otherwise a Team
    //      Leader could demote or lock out the Administrator instead.
    if (refuseRoleEscalation(req, res, role_codes)) return;

    const grantable = assignableRoles(req);
    const targetRoles = (user.role_codes || []).map(normalizeRole).filter(Boolean) as string[];
    if (targetRoles.some((r) => !grantable.includes(r as any))) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_PRIVILEGED_TARGET',
          message: 'You do not have permission to modify this account.',
        },
      });
    }

    if (full_name !== undefined) user.full_name = full_name.trim();
    if (personal_email !== undefined) user.personal_email = personal_email.trim().toLowerCase();
    if (primary_mobile !== undefined) user.primary_mobile = primary_mobile.trim();
    if (secondary_mobile !== undefined) user.secondary_mobile = secondary_mobile.trim();
    if (alternate_mobile !== undefined) user.alternate_mobile = alternate_mobile.trim();
    if (employee_id !== undefined) user.employee_id = employee_id.trim();
    if (linkedin_profile !== undefined) user.linkedin_profile = linkedin_profile.trim();
    if (date_of_birth !== undefined) user.date_of_birth = date_of_birth ? new Date(date_of_birth) : null;
    if (date_of_joining !== undefined) user.date_of_joining = date_of_joining ? new Date(date_of_joining) : null;
    if (is_profile_locked !== undefined) {
      user.is_profile_locked = Boolean(is_profile_locked);
      if (!is_profile_locked) {
        user.profile_locked_at = null;
      } else {
        user.profile_locked_at = user.profile_locked_at || new Date();
      }
    }
    if (account_status !== undefined) user.account_status = account_status;
    if (presence_status !== undefined) user.presence_status = presence_status;

    if (assigned_college_ids !== undefined) {
      user.assigned_college_ids = assigned_college_ids.map((cId: string) => new Types.ObjectId(cId));
    }

    // Administrator-only — grants a Team Leader oversight of every college, present
    // and future, rather than a fixed list (see the User model comment). A Team
    // Leader editing another account must not be able to grant this to themselves
    // or anyone else.
    if (has_all_colleges_access !== undefined) {
      const requesterRoles = (req as any).user?.roles || [];
      const requesterIsAdmin = requesterRoles.includes('ADMINISTRATOR') || requesterRoles.includes('ADMIN');
      if (!requesterIsAdmin) {
        return res.status(403).json({
          success: false,
          error: { code: 'ADMIN_ONLY_FIELD', message: 'Only an Administrator may change all-colleges access.' },
        });
      }
      user.has_all_colleges_access = Boolean(has_all_colleges_access);
    }

    if (role_codes !== undefined) {
      user.role_codes = role_codes;
      const roles = await Role.find({ role_code: { $in: role_codes } });
      user.role_ids = roles.map((r) => r._id);
    }

    if (password && password.trim()) {
      const trimmedPassword = password.trim();
      if (!isPasswordValid(trimmedPassword)) {
        return res.status(400).json({
          success: false,
          error: { code: 'PASSWORD_POLICY', message: firstPasswordError(trimmedPassword) || 'Password does not meet the policy.' },
        });
      }
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(trimmedPassword, salt);
      user.last_password_changed_at = new Date();
    }

    await user.save();

    const populated = await User.findById(user._id)
      .select('-password_hash')
      .populate('assigned_college_ids', 'college_name college_code')
      .populate('role_ids', 'role_name role_code');

    return res.status(200).json({
      success: true,
      message: `User profile for "${user.full_name}" updated successfully`,
      data: populated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update user' },
    });
  }
});

// ── GET /api/v1/profile/:id — Fetch personal profile
app.get('/api/v1/profile/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Here :id IS the owner's own id (a profile is keyed by user id), unlike
    // the daily-tracker rows below where :id addresses a row and its owner
    // must be read from the fetched document instead.
    if (refuseForeignOwner(req, res, id, 'You can only access your own profile.')) return;

    const user = await User.findById(id)
      .select('-password_hash')
      .populate('assigned_college_ids', 'college_name college_code')
      .populate('role_ids', 'role_name role_code');

    if (!user || user.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to load profile' },
    });
  }
});

// ── PATCH /api/v1/profile/:id — Self-service profile update with 30-day photo change rule
app.patch('/api/v1/profile/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (refuseForeignOwner(req, res, id, 'You can only access your own profile.')) return;

    const {
      primary_mobile,
      secondary_mobile,
      alternate_mobile,
      personal_email,
      residential_address,
      address_line,
      pincode,
      city,
      state,
      linkedin_profile,
      date_of_birth,
      date_of_joining,
      profile_photo_url,
      password,
    } = req.body;

    const user = await User.findById(id);
    if (!user || user.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    const isCurrentlyLocked = Boolean(user.is_profile_locked);

    // If profile is already locked, protect the 5 immutable fields from modification
    if (!isCurrentlyLocked) {
      if (primary_mobile !== undefined && String(primary_mobile).trim()) user.primary_mobile = String(primary_mobile).trim();
      if (personal_email !== undefined && String(personal_email).trim()) user.personal_email = String(personal_email).trim().toLowerCase();
      if (linkedin_profile !== undefined && String(linkedin_profile).trim()) user.linkedin_profile = String(linkedin_profile).trim();
      if (date_of_birth !== undefined && date_of_birth) user.date_of_birth = new Date(date_of_birth);
      if (date_of_joining !== undefined && date_of_joining) user.date_of_joining = new Date(date_of_joining);
    }

    // Editable contact & location fields
    if (alternate_mobile !== undefined) {
      user.alternate_mobile = String(alternate_mobile).trim();
      user.secondary_mobile = String(alternate_mobile).trim();
    } else if (secondary_mobile !== undefined) {
      user.secondary_mobile = String(secondary_mobile).trim();
      user.alternate_mobile = String(secondary_mobile).trim();
    }
    if (residential_address !== undefined) user.residential_address = String(residential_address).trim();
    if (address_line !== undefined) user.address_line = String(address_line).trim();
    if (pincode !== undefined) user.pincode = String(pincode).trim();
    if (city !== undefined) user.city = String(city).trim();
    if (state !== undefined) user.state = String(state).trim();

    // Monthly Profile Photo Update Rule: 5 changes allowed per calendar month
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    if (user.last_photo_change_month !== currentMonthStr) {
      user.monthly_photo_changes_count = 0;
      user.last_photo_change_month = currentMonthStr;
    }

    if (profile_photo_url !== undefined && profile_photo_url !== user.profile_photo_url) {
      if (profile_photo_url === '') {
        user.profile_photo_url = '';
      } else {
        const photoStr = String(profile_photo_url).trim();
        if (/^(javascript|data|vbscript):/i.test(photoStr) || !/^https?:\/\//i.test(photoStr)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PHOTO_URL',
              message: 'Invalid profile photo URL. Please provide a valid, secure HTTP(S) image URL.',
            },
          });
        }
        if ((user.monthly_photo_changes_count || 0) >= 5) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'PHOTO_MONTHLY_LIMIT_EXCEEDED',
              message: 'Monthly Limit Reached: You are allowed to change your profile photo a maximum of 5 times per month. You can update your photo again next month.',
              monthly_photo_changes_count: user.monthly_photo_changes_count,
            },
          });
        }
        user.profile_photo_url = photoStr;
        user.monthly_photo_changes_count = (user.monthly_photo_changes_count || 0) + 1;
        user.last_photo_change_month = currentMonthStr;
        user.photo_last_updated_at = new Date();
      }
    }

    // 2-Per-Month Password Update Rule (3rd attempt locks profile)
    if (user.last_password_change_month !== currentMonthStr) {
      user.monthly_password_changes_count = 0;
      user.last_password_change_month = currentMonthStr;
    }

    if (password && String(password).trim()) {
      const trimmedPassword = String(password).trim();
      if (!isPasswordValid(trimmedPassword)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PASSWORD_POLICY',
            message: firstPasswordError(trimmedPassword) || 'Password does not meet the policy.',
          },
        });
      }

      const isUserAdmin = (user.role_codes || []).some((r: string) => r === 'ADMINISTRATOR' || r === 'ADMIN');

      if (!isUserAdmin && (user.is_password_locked || user.account_status === 'blocked')) {
        return res.status(403).json({
          success: false,
          is_locked: true,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Your account is locked due to exceeding monthly password update limits. Please contact your Administrator to release your account.',
          },
        });
      }

      if (!isUserAdmin && (user.monthly_password_changes_count || 0) >= 2) {
        user.is_password_locked = true;
        user.account_status = 'blocked';
        user.password_locked_at = new Date();
        await user.save();
        return res.status(403).json({
          success: false,
          is_locked: true,
          error: {
            code: 'PASSWORD_MONTHLY_LIMIT_EXCEEDED',
            message: 'Security Alert: You have exceeded the maximum limit of 2 password changes for this month (3rd attempt). Your profile and account are now locked. An Administrator must release your account from the admin dashboard.',
          },
        });
      }

      const salt = await bcrypt.genSalt(12);
      user.password_hash = await bcrypt.hash(trimmedPassword, salt);
      user.last_password_changed_at = new Date();
      if (!isUserAdmin) {
        user.monthly_password_changes_count = (user.monthly_password_changes_count || 0) + 1;
        user.last_password_change_month = currentMonthStr;
      }
    }

    // Lock profile permanently once personal fields are updated
    const touchedPersonalFields =
      primary_mobile !== undefined ||
      alternate_mobile !== undefined ||
      secondary_mobile !== undefined ||
      personal_email !== undefined ||
      residential_address !== undefined ||
      address_line !== undefined ||
      pincode !== undefined ||
      city !== undefined ||
      state !== undefined ||
      linkedin_profile !== undefined ||
      date_of_birth !== undefined ||
      date_of_joining !== undefined;

    if (touchedPersonalFields) {
      user.is_profile_locked = true;
      user.profile_locked_at = user.profile_locked_at || new Date();
    }

    await user.save();

    const populated = await User.findById(user._id)
      .select('-password_hash')
      .populate('assigned_college_ids', 'college_name college_code')
      .populate('role_ids', 'role_name role_code');

    return res.status(200).json({
      success: true,
      message: touchedPersonalFields
        ? 'Profile updated and locked successfully!'
        : 'Password updated successfully!',
      data: populated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update profile' },
    });
  }
});

// ── PATCH /api/v1/users/:id/unlock-profile — Administrator unlocks coordinator's profile
app.patch('/api/v1/users/:id/unlock-profile', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || user.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    user.is_profile_locked = false;
    user.profile_locked_at = null;
    user.is_password_locked = false;
    user.password_locked_at = null;
    user.account_status = 'active';
    user.failed_login_attempts = 0;
    user.monthly_password_changes_count = 0;
    await user.save();

    await writeAudit({
      action: 'STATUS_CHANGE',
      result: 'SUCCESS',
      entityType: 'User',
      entityId: user._id,
      performedBy: (req as any).user?._id || null,
      performedByRole: (req as any).user?.role_codes?.[0] || 'ADMINISTRATOR',
      performedByEmail: (req as any).user?.email || '',
      module: 'UserManagement',
      severity: 'warning',
      summary: `Account and profile unlocked for ${user.full_name} (${user.official_email}) by administrator.`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: `Profile and password editing unlocked for ${user.full_name}. Their account status is active and monthly limit reset.`,
      data: user,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to unlock profile' },
    });
  }
});

// ── US-4: DELETE /api/v1/users/:id
// Soft delete / deactivate user (with 7-day restore window)
app.delete('/api/v1/users/:id', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user || user.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    user.is_deleted = true;
    user.deleted_at = new Date();
    user.account_status = 'deactivated';
    await user.save();

    await writeAudit({
      action: 'STATUS_CHANGE',
      result: 'SUCCESS',
      entityType: 'User',
      entityId: user._id,
      performedBy: (req as any).user?._id || null,
      performedByRole: (req as any).user?.role_codes?.[0] || 'ADMINISTRATOR',
      performedByEmail: (req as any).user?.email || '',
      module: 'UserManagement',
      severity: 'warning',
      summary: `User "${user.full_name}" (${user.official_email}) deactivated. Restorable by administrator within 7 days.`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: `User account "${user.full_name}" has been deactivated. You can restore this account anytime within 1 week (7 days).`,
      data: user,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to deactivate user' },
    });
  }
});

// ── US-5: PATCH /api/v1/users/:id/restore — Administrator restores deactivated user within 1 week (7 days)
app.patch('/api/v1/users/:id/restore', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    if (!user.is_deleted && user.account_status !== 'deactivated') {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_NOT_DEACTIVATED', message: 'User is already active' },
      });
    }

    // Check 7 days (1 week) window
    if (user.deleted_at) {
      const msDiff = Date.now() - new Date(user.deleted_at).getTime();
      const daysDiff = msDiff / (1000 * 60 * 60 * 24);
      if (daysDiff > 7) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'RESTORE_WINDOW_EXPIRED',
            message: 'Restore window expired: Deactivated user accounts can only be restored within 7 days (1 week).',
          },
        });
      }
    }

    user.is_deleted = false;
    user.deleted_at = null;
    user.account_status = 'active';
    await user.save();

    await writeAudit({
      action: 'STATUS_CHANGE',
      result: 'SUCCESS',
      entityType: 'User',
      entityId: user._id,
      performedBy: (req as any).user?._id || null,
      performedByRole: (req as any).user?.role_codes?.[0] || 'ADMINISTRATOR',
      performedByEmail: (req as any).user?.email || '',
      module: 'UserManagement',
      severity: 'info',
      summary: `Deactivated user "${user.full_name}" successfully restored to Active by administrator.`,
      req,
    });

    const populated = await User.findById(user._id)
      .select('-password_hash')
      .populate('assigned_college_ids', 'college_name college_code')
      .populate('role_ids', 'role_name role_code');

    return res.status(200).json({
      success: true,
      message: `User account "${user.full_name}" has been successfully restored to Active status!`,
      data: populated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to restore user' },
    });
  }
});

// ── RO-1: GET /api/v1/roles
// List all system roles and permissions matrix (Spec Section 8)
app.get('/api/v1/roles', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const roles = await Role.find({ status: 'active' }).sort({ role_code: 1 });
    return res.status(200).json({
      success: true,
      data: {
        total: roles.length,
        roles,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch roles' },
    });
  }
});

// ── RO-2: PATCH /api/v1/roles/:id
// Update role permissions
app.patch('/api/v1/roles/:id', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions, description } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Role not found' },
      });
    }

    if (permissions !== undefined) role.permissions = permissions;
    if (description !== undefined) role.description = description.trim();

    await role.save();

    return res.status(200).json({
      success: true,
      message: `Permissions updated for role "${role.role_name}"`,
      data: role,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update role' },
    });
  }
});

// ── ST-1: GET /api/v1/settings
// Fetch global system settings (creates default if none exist)
app.get('/api/v1/settings', authenticateJWT, async (req: Request, res: Response) => {
  try {
    let settings = await SystemSettings.findOne({});
    if (!settings) {
      settings = await SystemSettings.create({
        academic_year: '2025-2026',
        graduating_batch_year: 2026,
        season_name: 'Campus Recruitment Season 2025-26',
        daily_calling_target: 30,
        working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        org_name: 'Infoziant Placement Operations',
        org_support_email: 'support@infoziant.com',
        org_support_phone: '+91 98401 23456',
      });
    }

    // Maintenance mode is time-windowed: the toggle can be left on but only
    // actually bite while now() is inside [start_time, end_time]. Compute the
    // effective state here so both the settings screen and the enforcement
    // middleware agree on what "currently in effect" means.
    // ── Real System Health & Telemetry Calculation ──
    const now = new Date();
    const isDbConnected = mongoose.connection.readyState === 1;

    const maintenanceInEffect =
      !!settings.maintenance_mode_enabled &&
      (!settings.maintenance_start_time || new Date(settings.maintenance_start_time) <= now) &&
      (!settings.maintenance_end_time || new Date(settings.maintenance_end_time) >= now);

    // ── Headcount & Organization Snapshot ──
    const [
      totalUsers,
      totalCoordinators,
      partialWorkingUsers,
      onLeaveUsers,
      blockedUsers,
      deactivatedUsers,
      totalCompanies,
      totalColleges,
      totalHrContacts,
      reportsGeneratedCount,
      totalCallsCount,
      totalWeeklyCount,
      totalDailyLeadsCount,
      totalActiveLeadsCount,
    ] = await Promise.all([
      User.countDocuments({ is_deleted: false }),
      User.countDocuments({ is_deleted: false, role_codes: 'PLACEMENT_COORDINATOR' }),
      User.countDocuments({ is_deleted: false, account_status: 'partial_working' }),
      User.countDocuments({ is_deleted: false, account_status: 'on_leave' }),
      User.countDocuments({ is_deleted: false, $or: [{ account_status: 'blocked' }, { is_password_locked: true }] }),
      User.countDocuments({ $or: [{ is_deleted: true }, { account_status: 'deactivated' }] }),
      CompanyMetadata.countDocuments({ is_deleted: false }),
      College.countDocuments({ status: 'active' }),
      CompanyMetadata.countDocuments({ is_deleted: false, hr_name: { $exists: true, $ne: '' } }),
      ReportLibrary.countDocuments({ is_deleted: false }),
      DailyTracker.countDocuments({ is_deleted: false }),
      WeeklyTracker.countDocuments({ is_deleted: false }),
      DailyLead.countDocuments({ is_deleted: false }),
      ActiveLead.countDocuments({ is_deleted: false }),
    ]);

    // ── Data Quality Aggregations ──
    const [duplicateCompanyGroups, missingMobilesCount, missingEmailsCount, missingHrCount] = await Promise.all([
      CompanyMetadata.aggregate([
        { $match: { is_deleted: false } },
        { $group: { _id: { $toLower: { $trim: { input: '$company_name' } } }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ]),
      CompanyMetadata.countDocuments({
        is_deleted: false,
        $or: [{ mobile_number: { $exists: false } }, { mobile_number: '' }, { mobile_number: null }],
      }),
      CompanyMetadata.countDocuments({
        is_deleted: false,
        $or: [{ email_id: { $exists: false } }, { email_id: '' }, { email_id: null }],
      }),
      CompanyMetadata.countDocuments({
        is_deleted: false,
        $or: [{ hr_name: { $exists: false } }, { hr_name: '' }, { hr_name: null }],
      }),
    ]);

    const duplicateCompaniesCount = duplicateCompanyGroups.length;
    const totalDefects = (missingMobilesCount * 0.4) + (missingEmailsCount * 0.3) + (missingHrCount * 0.2) + (duplicateCompaniesCount * 0.1);
    const qualityScorePct = totalCompanies > 0 ? Math.max(10, Math.min(100, Math.round(100 - (totalDefects / totalCompanies) * 100))) : 100;

    // Determine Dynamic Health Status Banner
    let healthStatus: 'healthy' | 'attention_required' | 'action_required' = 'healthy';
    let healthMessage = 'All systems normal — database connected, nightly jobs active, data quality optimal.';

    if (!isDbConnected) {
      healthStatus = 'action_required';
      healthMessage = 'Critical Alert: Database connection lost or degraded. Immediate inspection required.';
    } else if (maintenanceInEffect) {
      healthStatus = 'attention_required';
      healthMessage = `Maintenance Active: ${settings.maintenance_reason || 'Scheduled system maintenance in progress.'}`;
    } else if (qualityScorePct < 80 || duplicateCompaniesCount > 5) {
      healthStatus = 'attention_required';
      healthMessage = `Attention Required: Data quality index at ${qualityScorePct}% with ${duplicateCompaniesCount} duplicate companies. Review recommended.`;
    }

    const totalDocs = totalCompanies + totalCallsCount + totalWeeklyCount + totalDailyLeadsCount + totalActiveLeadsCount + totalUsers + totalColleges + reportsGeneratedCount;
    const estimatedDbSizeMb = (totalDocs * 0.0025).toFixed(2);

    // Real 7-day growth, not the hardcoded 4.8/6.2/12.5 this used to return
    // regardless of actual data (verified live before this fix: identical
    // numbers on every load). "Recent added / everything before that window"
    // — there's no historical snapshot table to diff against, so this is the
    // honest signal actually available from created_at timestamps, not a
    // fabricated trend line.
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const growthPct = (recent: number, total: number) => {
      const prior = total - recent;
      return prior > 0 ? Math.round((recent / prior) * 1000) / 10 : 0;
    };
    const [recentCompanies, recentHrContacts, recentReports] = await Promise.all([
      CompanyMetadata.countDocuments({ is_deleted: false, created_at: { $gte: sevenDaysAgo } }),
      CompanyMetadata.countDocuments({
        is_deleted: false,
        created_at: { $gte: sevenDaysAgo },
        hr_name: { $exists: true, $ne: '' },
      }),
      ReportLibrary.countDocuments({ is_deleted: false, created_at: { $gte: sevenDaysAgo } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        settings,
        system_health: {
          status: healthStatus,
          status_message: healthMessage,
          db_connected: isDbConnected,
          db_name: mongoose.connection.name || 'ipoms_db',
          db_readyState: mongoose.connection.readyState,
          last_cron_time: '23:59:59 IST (Automated)',
          last_checked_at: now.toISOString(),
          storage_status: 'Operational',
          maintenance_in_effect: maintenanceInEffect,
        },
        organization_snapshot: {
          total_users: totalUsers,
          total_coordinators: totalCoordinators,
          active_today: totalCoordinators - onLeaveUsers - blockedUsers - deactivatedUsers,
          partial_working: partialWorkingUsers,
          on_leave: onLeaveUsers,
          blocked: blockedUsers,
          deactivated: deactivatedUsers,
          total_colleges: totalColleges,
          total_companies: totalCompanies,
          total_hr_contacts: totalHrContacts,
        },
        data_quality: {
          quality_score_pct: qualityScorePct,
          duplicate_companies_count: duplicateCompaniesCount,
          missing_mobiles_count: missingMobilesCount,
          missing_emails_count: missingEmailsCount,
          missing_hr_contacts_count: missingHrCount,
          total_companies: totalCompanies,
        },
        storage_summary: {
          total_documents_count: totalDocs,
          estimated_db_size_mb: estimatedDbSizeMb,
          reports_generated_count: reportsGeneratedCount,
          images_count: totalUsers,
          breakdown: {
            companies: totalCompanies,
            calls: totalCallsCount,
            weekly_pipeline: totalWeeklyCount,
            daily_leads: totalDailyLeadsCount,
            active_leads: totalActiveLeadsCount,
            users: totalUsers,
            colleges: totalColleges,
            reports: reportsGeneratedCount,
          },
        },
        database_growth: {
          companies_growth_pct: growthPct(recentCompanies, totalCompanies),
          hr_contacts_growth_pct: growthPct(recentHrContacts, totalHrContacts),
          reports_growth_pct: growthPct(recentReports, reportsGeneratedCount),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch system settings' },
    });
  }
});

// ── ST-2: PATCH /api/v1/settings
// Update global system settings
app.patch('/api/v1/settings', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const {
      academic_year,
      graduating_batch_year,
      season_name,
      daily_calling_target,
      working_days,
      org_name,
      org_support_email,
      org_support_phone,
      maintenance_mode_enabled,
      maintenance_affected_roles,
      maintenance_reason,
      maintenance_start_time,
      maintenance_end_time,
    } = req.body;

    let settings = await SystemSettings.findOne({});
    if (!settings) {
      settings = new SystemSettings({});
    }

    if (academic_year !== undefined) {
      settings.academic_year = academic_year.trim();
      clearAcademicYearCache();
    }
    if (graduating_batch_year !== undefined) {
      settings.graduating_batch_year = Number(graduating_batch_year);
      clearAcademicYearCache();
    }
    if (season_name !== undefined) settings.season_name = season_name.trim();
    if (daily_calling_target !== undefined) settings.daily_calling_target = Number(daily_calling_target);
    if (working_days !== undefined) settings.working_days = working_days;
    if (org_name !== undefined) settings.org_name = org_name.trim();
    if (org_support_email !== undefined) settings.org_support_email = org_support_email.trim().toLowerCase();
    if (org_support_phone !== undefined) settings.org_support_phone = org_support_phone.trim();

    if (maintenance_mode_enabled !== undefined) settings.maintenance_mode_enabled = !!maintenance_mode_enabled;
    if (maintenance_affected_roles !== undefined) settings.maintenance_affected_roles = maintenance_affected_roles;
    if (maintenance_reason !== undefined) settings.maintenance_reason = maintenance_reason.trim();
    if (maintenance_start_time !== undefined) settings.maintenance_start_time = maintenance_start_time ? new Date(maintenance_start_time) : null;
    if (maintenance_end_time !== undefined) settings.maintenance_end_time = maintenance_end_time ? new Date(maintenance_end_time) : null;

    await settings.save();

    await writeAudit({
      action: 'STATUS_CHANGE',
      result: 'SUCCESS',
      entityType: 'SystemSettings',
      entityId: settings._id,
      performedBy: (req as any).user?._id || null,
      performedByRole: (req as any).user?.role_codes?.[0] || 'ADMINISTRATOR',
      performedByEmail: (req as any).user?.email || '',
      module: 'SystemAdmin',
      severity: maintenance_mode_enabled ? 'critical' : 'info',
      summary: `System settings updated: Maintenance=${settings.maintenance_mode_enabled}`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: settings,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update system settings' },
    });
  }
});

// Inspect Weekly Report Excel File
app.get('/api/v1/weekly-tracker-import/inspect', async (req: Request, res: Response) => {
  try {
    const candidatePaths = [
      'C:\\Users\\admin\\Downloads\\Weekly .xlsx',
      'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH (1).xlsx',
      'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx',
      'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx',
    ];
    const filePath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
    const workbook = xlsx.readFile(filePath);
    const targetSheet = String(req.query.sheet || '').trim();
    if (targetSheet && workbook.Sheets[targetSheet]) {
      const rawData: any[][] = xlsx.utils.sheet_to_json(workbook.Sheets[targetSheet], { header: 1 });
      return res.json({
        success: true,
        sheetName: targetSheet,
        totalRows: rawData.length,
        rows: rawData,
      });
    }
    const summary = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rawData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      return {
        sheetName,
        totalRows: rawData.length,
        sampleRows: rawData.filter((r) => r && r.length > 0).slice(0, 30),
      };
    });
    return res.json({ success: true, sheetNames: workbook.SheetNames, sheets: summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

interface ParsedWeeklyEntry {
  section: PipelineSection;
  sNo: number;
  companyName: string;
  role: string;
  ctc: string;
  status: string;
  offersReceived?: number;
  followUpDate?: string;
  batch?: string;
}

const SECTION_HEADERS_MAP: { pattern: RegExp; section: PipelineSection }[] = [
  { pattern: /companies\s+completed/i, section: 'completed' },
  { pattern: /companies\s+in\s+progress/i, section: 'in_progress' },
  { pattern: /companies\s+in\s+pipeline/i, section: 'pipeline' },
  { pattern: /top\s+companies/i, section: 'top_companies' },
  { pattern: /companies\s+on\s+hold\s+by\s+hr|rejected\s+companies/i, section: 'rejected_by_hr' },
  { pattern: /companies\s+on\s+hold\s+by\s+college|rejected\s+by\s+college/i, section: 'rejected_by_college' },
];

function parseWeeklySheet(sheet: xlsx.WorkSheet): ParsedWeeklyEntry[] {
  const rawRows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const entries: ParsedWeeklyEntry[] = [];

  let currentSection: PipelineSection | null = null;
  let headerMap: { [key: string]: number } = {};

  for (let r = 0; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const strRow = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
    const joinedRow = strRow.join(' ').trim();

    if (!joinedRow) continue;

    // Check if section header
    let detectedSection: PipelineSection | null = null;
    for (const mapping of SECTION_HEADERS_MAP) {
      if (mapping.pattern.test(joinedRow)) {
        detectedSection = mapping.section;
        break;
      }
    }

    if (detectedSection) {
      currentSection = detectedSection;
      headerMap = {};
      continue;
    }

    // Check if column definition header
    if (
      strRow.some((c) => /s\.?\s*no|si\.?\s*no/i.test(c)) &&
      strRow.some((c) => /company/i.test(c))
    ) {
      headerMap = {};
      strRow.forEach((colName, colIdx) => {
        const lower = colName.toLowerCase().trim();
        if (/s\.?\s*no|si\.?\s*no/i.test(lower)) headerMap['sNo'] = colIdx;
        else if (/company\s*name|company/i.test(lower)) headerMap['companyName'] = colIdx;
        else if (/role/i.test(lower)) headerMap['role'] = colIdx;
        else if (/ctc/i.test(lower)) headerMap['ctc'] = colIdx;
        else if (/status/i.test(lower)) headerMap['status'] = colIdx;
        else if (/offers|no\s+of\s+offers/i.test(lower)) headerMap['offers'] = colIdx;
        else if (/follow\s*up/i.test(lower)) headerMap['followUp'] = colIdx;
        else if (/batch/i.test(lower)) headerMap['batch'] = colIdx;
      });
      continue;
    }

    // Skip summary / stats table at bottom
    if (/status\s+count|total\s+status|in\s+progress\s+count|pipeline\s+count|completed\s+count/i.test(joinedRow)) {
      continue;
    }

    if (currentSection) {
      const sNoVal = headerMap['sNo'] !== undefined ? strRow[headerMap['sNo']] : strRow[0];
      const companyVal = headerMap['companyName'] !== undefined ? strRow[headerMap['companyName']] : strRow[1];
      const roleVal = headerMap['role'] !== undefined ? strRow[headerMap['role']] : strRow[2];
      const ctcVal = headerMap['ctc'] !== undefined ? strRow[headerMap['ctc']] : strRow[3];
      const statusVal = headerMap['status'] !== undefined ? strRow[headerMap['status']] : strRow[4];
      const offersVal = headerMap['offers'] !== undefined ? strRow[headerMap['offers']] : '';
      const followUpVal = headerMap['followUp'] !== undefined ? strRow[headerMap['followUp']] : '';
      const batchVal = headerMap['batch'] !== undefined ? strRow[headerMap['batch']] : '';

      const cleanCompany = (companyVal || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanCompany || cleanCompany === '#VALUE!' || cleanCompany.length < 2) {
        continue;
      }

      const cleanRole = (roleVal || 'Graduate Trainee').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      const lowerComp = cleanCompany.toLowerCase();
      const lowerRole = cleanRole.toLowerCase();

      if (
        lowerComp === 'status' ||
        lowerComp === 'count' ||
        lowerComp === 'total' ||
        lowerComp === 's.no' ||
        lowerComp === 'si.no' ||
        lowerComp === 'company name' ||
        lowerComp === 'role' ||
        lowerComp === 'ctc' ||
        lowerComp === 'in progress' ||
        lowerComp === 'pipeline' ||
        lowerComp === 'completed' ||
        lowerComp === 'top companies' ||
        lowerRole === 'count' ||
        lowerRole === 'role' ||
        lowerComp.startsWith('status count') ||
        lowerComp.startsWith('total status') ||
        lowerComp.startsWith('in progress count') ||
        lowerComp.startsWith('pipeline count') ||
        lowerComp.startsWith('completed count')
      ) {
        continue;
      }

      let offersNum = 0;
      if (offersVal && !isNaN(Number(offersVal))) {
        offersNum = Number(offersVal);
      }

      let cleanCtc = (ctcVal || '').replace(/[\t\r\n]+/g, ' ').trim();
      if (cleanCtc.toLowerCase() === 'not mentioned' || cleanCtc === '-') {
        cleanCtc = '';
      }

      const cleanStatus = (statusVal || 'In discussion with HR').replace(/[\t\r\n]+/g, ' ').trim();

      let parsedFollowUpDate: string = '';
      if (followUpVal) {
        const num = Number(followUpVal);
        if (!isNaN(num) && num > 40000 && num < 60000) {
          const d = new Date(Math.round((num - 25569) * 86400 * 1000));
          parsedFollowUpDate = d.toISOString().split('T')[0];
        } else {
          parsedFollowUpDate = String(followUpVal).trim();
        }
      }

      let finalSection: PipelineSection = currentSection;
      if (
        currentSection === 'rejected_by_hr' &&
        /rejected by (the )?college|response from (the )?college|college in connect|low package|bda role|tpo/i.test(cleanStatus)
      ) {
        finalSection = 'rejected_by_college';
      }

      entries.push({
        section: finalSection,
        sNo: Number(sNoVal) || entries.length + 1,
        companyName: cleanCompany,
        role: cleanRole || 'Graduate Trainee',
        ctc: cleanCtc,
        status: cleanStatus,
        offersReceived: offersNum,
        followUpDate: parsedFollowUpDate,
        batch: batchVal || '2026 Batch',
      });
    }
  }

  return entries;
}

// Import a Single Sheet for a College
app.all('/api/v1/weekly-tracker-import/sheet', async (req: Request, res: Response) => {
  try {
    const sheetName = String(req.query.name || req.body?.sheetName || '').trim();
    if (!sheetName) {
      return res.status(400).json({ success: false, error: 'Sheet name is required (e.g. ?name=KIOT)' });
    }

    const candidatePaths = [
      'C:\\Users\\admin\\Downloads\\Weekly .xlsx',
      'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH (1).xlsx',
      'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx',
      'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx',
    ];
    const filePath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
    const workbook = xlsx.readFile(filePath);

    const matchedSheetKey = workbook.SheetNames.find(
      (s) => s.trim().toLowerCase() === sheetName.trim().toLowerCase()
    );

    if (!matchedSheetKey) {
      return res.status(404).json({
        success: false,
        error: `Sheet '${sheetName}' not found. Available sheets: ${workbook.SheetNames.join(', ')}`,
      });
    }

    const sheet = workbook.Sheets[matchedSheetKey];
    const parsedEntries = parseWeeklySheet(sheet);

    // Match College in DB
    const normalizedKey = sheetName.trim().toUpperCase();
    let college = await College.findOne({
      $or: [
        { college_code: normalizedKey },
        { college_code: new RegExp(`^${normalizedKey}$`, 'i') },
        { college_name: new RegExp(normalizedKey, 'i') },
      ],
    });

    if (!college) {
      const ALIAS_MAP: Record<string, string> = {
        ACHARIYA: 'ACET',
        KARPAGAM: 'KARPAGAM',
        'MAR EPHRAEM': 'MAR',
        EGS: 'EGS',
      };
      const mappedCode = ALIAS_MAP[normalizedKey];
      if (mappedCode) {
        college = await College.findOne({ college_code: mappedCode });
      }
    }

    if (!college) {
      college = await College.findOne();
    }

    if (!college) {
      return res.status(404).json({ success: false, error: `No college record found for sheet '${sheetName}'.` });
    }

    // Find Coordinator
    let coordinator = await User.findOne({
      $or: [{ username: 'megaladevi' }, { role_codes: 'PLACEMENT_COORDINATOR' }],
    });
    if (!coordinator) {
      coordinator = await User.findOne();
    }

    // Remove existing entries for this college to prevent duplicate entries
    await WeeklyTracker.deleteMany({
      college_id: college._id,
      academic_year: 2026,
    });

    const sectionsBreakdown: Record<string, number> = {
      completed: 0,
      in_progress: 0,
      pipeline: 0,
      top_companies: 0,
      rejected_by_hr: 0,
      rejected_by_college: 0,
    };

    for (const entry of parsedEntries) {
      if (entry.companyName.toLowerCase() === 'status' || entry.companyName.toLowerCase() === 'count') {
        continue;
      }
      const compMeta = await CompanyMetadata.findOne({
        company_name: new RegExp(`^${escapeRegex(entry.companyName.trim())}$`, 'i'),
        is_deleted: false,
      });
      const resolvedCompId = compMeta?._id || new Types.ObjectId();

      await WeeklyTracker.create({
        academic_year: 2026,
        college_id: college._id,
        coordinator_id: coordinator?._id,
        company_id: resolvedCompId,
        company_name: entry.companyName.trim(),
        job_role: entry.role || 'Graduate Trainee',
        ctc_lpa: entry.ctc || '',
        eligible_batch: entry.batch?.includes('Batch') ? entry.batch : `${entry.batch || 2026} Batch`,
        pipeline_section: entry.section,
        is_pinned_top: entry.section === 'top_companies',
        current_status_text: entry.status || 'Active engagement',
        selected_count: entry.offersReceived || 0,
        registered_count: entry.offersReceived ? entry.offersReceived * 10 : 0,
        shortlisted_count: entry.offersReceived ? entry.offersReceived * 2 : 0,
        is_deleted: false,
      });

      sectionsBreakdown[entry.section] = (sectionsBreakdown[entry.section] || 0) + 1;
    }

    const totalValid = Object.values(sectionsBreakdown).reduce((a, b) => a + b, 0);
    const validEntries = parsedEntries.filter(
      (e) => e.companyName.toLowerCase() !== 'status' && e.companyName.toLowerCase() !== 'count'
    );

    console.log(`✅ [Weekly Import] Imported ${totalValid} rows for ${college.college_name} (${matchedSheetKey}):`, sectionsBreakdown);

    return res.json({
      success: true,
      data: {
        sheetName: matchedSheetKey,
        collegeName: college.college_name,
        collegeCode: college.college_code,
        totalInserted: totalValid,
        sectionsBreakdown,
        entries: validEntries,
      },
    });
  } catch (err: any) {
    console.error('❌ Weekly import error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Reload All 2027 Batch Weekly Tracker Data from Excel (Skipping Pending Sheet)
app.all('/api/v1/weekly-tracker-import/reload-all-2027', async (req: Request, res: Response) => {
  try {
    const customPath = req.query.file ? String(req.query.file) : undefined;
    const result = await reloadWeeklyTrackerFrom2027Workbook(customPath);
    return res.json(result);
  } catch (err: any) {
    console.error('❌ Weekly tracker reload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Reload Meta Database from Excel
app.all('/api/v1/metadata/reload', async (req: Request, res: Response) => {
  try {
    const customPath = req.query.file ? String(req.query.file) : undefined;
    const result = await reloadMetaDatabaseFromFile(customPath);
    return res.json(result);
  } catch (err: any) {
    console.error('❌ Meta Database reload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Centralized 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// 5. Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: { code: 'ORIGIN_NOT_ALLOWED', message: 'This origin is not permitted to access the API.' },
    });
  }
  console.error('❌ [Unhandled Server Error]:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

// Ensure system roles and default user accounts exist with full credentials and college associations
const ensureDefaultAccounts = async () => {
  try {
    // 1. Ensure Roles
    // TPO removed 29 Aug 2026 — no frontend experience was ever built for it,
    // so the account type was unusable. See the RoleCode comment in
    // routePolicy.ts for the full reasoning and how to bring it back.
    const systemRoles = [
      { role_code: 'ADMINISTRATOR', role_name: 'Administrator', description: 'Master administrator with full system governance' },
      { role_code: 'TEAM_LEADER', role_name: 'Team Leader', description: 'Placement supervisor and team manager' },
      { role_code: 'PLACEMENT_COORDINATOR', role_name: 'Placement Coordinator', description: 'Campus placement coordinator' },
    ];

    const roleMap: Record<string, any> = {};
    for (const r of systemRoles) {
      let roleDoc = await Role.findOne({ role_code: r.role_code });
      if (!roleDoc) {
        roleDoc = await Role.create({ ...r, status: 'active', is_system_role: true });
      }
      roleMap[r.role_code] = roleDoc._id;
    }

    // 2. Fetch Colleges
    const allColleges = await College.find({ is_deleted: { $ne: true } });
    const collegeIds = allColleges.map((c) => c._id);

    // 3. Hash Default Password
    const defaultPassword = 'iPOMS@123';
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    // 4. Strictly purge all unapproved/legacy coordinator and user credentials
    const allowedUsernames = [
      'placement_management',
      'sujitha',
      'mohanaradha',
      'thirisha',
      'malavika',
      'lizenya',
      'megaladevi',
      'seshmitha',
    ];
    if (RESET_ACCOUNTS_ON_BOOT) {
      const purgeResult = await User.deleteMany({
        username: { $nin: allowedUsernames },
      });
      if (purgeResult.deletedCount > 0) {
        console.log(`🧹 [iPOMS] Successfully purged ${purgeResult.deletedCount} unauthorized/legacy user account(s) from database.`);
      }
    }

    // 5. Official Production Roster (1 Admin, 1 Team Leader, 6 Coordinators)
    const defaultUsers = [
      {
        full_name: 'Administrator',
        username: 'placement_management',
        official_email: 'placement_management@infoziant.com',
        primary_mobile: '6381481720',
        role_codes: ['ADMINISTRATOR'],
      },
      {
        full_name: 'Sujitha S',
        username: 'sujitha',
        official_email: 'sujitha_s@infoziant.com',
        primary_mobile: '9629461666',
        role_codes: ['TEAM_LEADER'],
      },
      {
        full_name: 'A.Mohanaradha',
        username: 'mohanaradha',
        official_email: 'mohanaradha_a@infoziant.com',
        primary_mobile: '6381481720',
        role_codes: ['PLACEMENT_COORDINATOR'],
      },
      {
        full_name: 'Thirisha R',
        username: 'thirisha',
        official_email: 'thirisha_r@infoziant.com',
        primary_mobile: '8667248316',
        role_codes: ['PLACEMENT_COORDINATOR'],
      },
      {
        full_name: 'Malavika Ramesh T K',
        username: 'malavika',
        official_email: 'malavika_ramesh@infoziant.com',
        primary_mobile: '9345229869',
        role_codes: ['PLACEMENT_COORDINATOR'],
      },
      {
        full_name: 'Lizenya R',
        username: 'lizenya',
        official_email: 'lizenya_r@infoziant.com',
        primary_mobile: '6379848576',
        role_codes: ['PLACEMENT_COORDINATOR'],
      },
      {
        full_name: 'Megala Devi P S',
        username: 'megaladevi',
        official_email: 'megaladevi_ps@infoziant.com',
        primary_mobile: '9976214361',
        role_codes: ['PLACEMENT_COORDINATOR'],
      },
      {
        full_name: 'Seshmitha Tamilselvi R',
        username: 'seshmitha',
        official_email: 'seshmitha_tamil@icl.today',
        primary_mobile: '9500270419',
        role_codes: ['PLACEMENT_COORDINATOR'],
      },
    ];

    const allUserIds: any[] = [];
    const createdUserIds: any[] = [];

    for (const u of defaultUsers) {
      const roleIds = u.role_codes.map((rc) => roleMap[rc]).filter(Boolean);
      let userDoc = await User.findOne({
        $or: [{ official_email: u.official_email.toLowerCase() }, { username: u.username.toLowerCase() }],
      });

      if (userDoc) {
        // Link any missing role IDs if empty
        if (!userDoc.role_ids || userDoc.role_ids.length === 0) {
          const ownRoleCodes = userDoc.role_codes?.length ? userDoc.role_codes : u.role_codes;
          const repaired = ownRoleCodes.map((rc: string) => roleMap[rc]).filter(Boolean);
          if (repaired.length > 0) {
            userDoc.role_ids = repaired;
            await userDoc.save();
            console.log(`🔧 [Accounts] Relinked role_ids for ${userDoc.official_email} (${ownRoleCodes.join(', ')}).`);
          }
        }
        // Assign default colleges only if user has no assigned colleges and is Admin
        if (collegeIds.length > 0 && (!userDoc.assigned_college_ids || userDoc.assigned_college_ids.length === 0)) {
          if (u.role_codes.includes('ADMINISTRATOR') || u.role_codes.includes('ADMIN')) {
            userDoc.assigned_college_ids = collegeIds as any;
            await userDoc.save();
          }
        }

        if (RESET_ACCOUNTS_ON_BOOT) {
          console.warn(`⚠️  [Accounts] RESET_ACCOUNTS_ON_BOOT=true — resetting ${u.official_email} to seed defaults.`);
          userDoc.full_name = u.full_name;
          userDoc.username = u.username.toLowerCase();
          userDoc.official_email = u.official_email.toLowerCase();
          userDoc.primary_mobile = u.primary_mobile;
          userDoc.password_hash = passwordHash;
          userDoc.role_ids = roleIds;
          userDoc.role_codes = u.role_codes;
          if (u.role_codes.includes('ADMINISTRATOR') || u.role_codes.includes('ADMIN')) {
            userDoc.assigned_college_ids = collegeIds as any;
          }
          userDoc.account_status = 'active';
          userDoc.is_email_verified = true;
          userDoc.must_change_password = false;
          userDoc.failed_login_attempts = 0;
          userDoc.is_deleted = false;
          userDoc.is_password_locked = false;
          userDoc.is_profile_locked = false;
          await userDoc.save();
        }
        allUserIds.push(userDoc._id);
      } else {
        const isAdmin = u.role_codes.includes('ADMINISTRATOR') || u.role_codes.includes('ADMIN');
        const created = await User.create({
          full_name: u.full_name,
          username: u.username.toLowerCase(),
          official_email: u.official_email.toLowerCase(),
          primary_mobile: u.primary_mobile,
          password_hash: passwordHash,
          role_ids: roleIds,
          role_codes: u.role_codes,
          assigned_college_ids: isAdmin ? collegeIds : [],
          account_status: 'active',
          presence_status: 'available',
          is_email_verified: true,
          must_change_password: false,
          failed_login_attempts: 0,
          is_deleted: false,
          is_password_locked: false,
          is_profile_locked: false,
        });
        allUserIds.push(created._id);
        createdUserIds.push(created._id);
      }
    }

    // 5. Official focus college allocations
    // Sujitha handles: HITS, NEHRU, KPR (partially with Mohanaradha), SONA, MAREPHRA
    // Mohanaradha handles: KARPAGAM, AIHT, ACET, KPR (partially with Sujitha)
    const DEFAULT_COORDINATOR_COLLEGE_MAP: Record<string, string[]> = {
      'sujitha_s@infoziant.com': ['NEHRU', 'KPR', 'HITS', 'SONA'],
      'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
      'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
      'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
      'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
      'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ', 'MAREPHRAM'],
      'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
    };

    // Ensure Master Admin has all colleges with weekly_focus_locked = false
    const adminUsers = await User.find({
      role_codes: { $in: ['ADMINISTRATOR', 'ADMIN'] },
      is_deleted: false,
    });
    const adminUserIds = adminUsers.map((u) => u._id);

    if (collegeIds.length > 0 && adminUserIds.length > 0) {
      await College.updateMany(
        { _id: { $in: collegeIds } },
        { $addToSet: { assigned_coordinator_ids: { $each: adminUserIds } } }
      );
      await User.updateMany(
        { _id: { $in: adminUserIds } },
        { $set: { assigned_college_ids: collegeIds, weekly_focus_locked: false } }
      );
    }

    // Ensure Team Leader and coordinators have their official focus colleges mapped and locked
    const activeCollegesList = await College.find({ status: 'active' });
    const codeMap = new Map<string, any>();
    activeCollegesList.forEach((c) => codeMap.set(c.college_code.toUpperCase(), c._id));
    const currentWeekMonday = getWeekMondayKey();

    for (const [email, codes] of Object.entries(DEFAULT_COORDINATOR_COLLEGE_MAP)) {
      const coordUser = await User.findOne({ official_email: email.toLowerCase(), is_deleted: false });
      if (coordUser) {
        const isTL = coordUser.role_codes?.includes('TEAM_LEADER') || coordUser.official_email === 'sujitha_s@infoziant.com';
        const maxLimit = isTL ? 5 : 4;
        const mappedIds = codes.map((c) => codeMap.get(c.toUpperCase())).filter(Boolean).slice(0, maxLimit);
        // Defaults are only a STARTING point: applied when the user has no colleges at all.
        // This used to overwrite assigned_college_ids on every boot / dashboard load / tracker
        // page load, so any focus change a user saved in Active College Focus was silently
        // reverted to the hardcoded list the next time any of those ran (24 Sep 2026).
        const seedDefaults = !coordUser.assigned_college_ids || coordUser.assigned_college_ids.length === 0;
        if (seedDefaults) {
          coordUser.assigned_college_ids = mappedIds;
          coordUser.weekly_focus_locked = true;
          coordUser.weekly_focus_week_key = currentWeekMonday;
          if (!coordUser.weekly_focus_locked_at) coordUser.weekly_focus_locked_at = new Date();
        }

        // If Sujitha has MCET, correct it to NEHRU immediately in MongoDB!
        if (isTL && (coordUser.active_college_code === 'MCET' || (coordUser.active_college_name && /mahalingam|mcet/i.test(coordUser.active_college_name)))) {
          const primaryId = codeMap.get('NEHRU') || mappedIds[0];
          const primaryCol = activeCollegesList.find(c => String(c._id) === String(primaryId));
          coordUser.active_college_id = primaryId;
          coordUser.active_college_code = primaryCol?.college_code || 'NEHRU';
          coordUser.active_college_name = primaryCol?.college_name || 'Nehru Institute of Engineering and Technology';
          coordUser.active_college_location = primaryCol?.location || '';
        }
        await coordUser.save();
        if (seedDefaults) {
          await College.updateMany(
            { _id: { $in: mappedIds } },
            { $addToSet: { assigned_coordinator_ids: coordUser._id } }
          );
        }
      }
    }

    // 6. Ensure Mohanaradha has assigned colleges: ACET, AIHT, KARPAGAM, KPR
    // and re-attribute all DailyTracker rows for these institutions created under Administrator to Mohanaradha
    const mohanaDoc = await User.findOne({
      $or: [
        { official_email: 'mohanaradha_a@infoziant.com' },
        { username: 'mohanaradha' },
        { full_name: /mohanaradha/i },
      ],
      is_deleted: false,
    });

    if (mohanaDoc) {
      const targetCollegeCodes = ['ACET', 'AIHT', 'KARPAGAM', 'KPR'];
      const targetCollegeDocs = await College.find({
        college_code: { $in: targetCollegeCodes },
      });
      const targetCollegeIds = targetCollegeDocs.map((c) => c._id);

      if (targetCollegeIds.length > 0) {
        if (!mohanaDoc.assigned_college_ids || mohanaDoc.assigned_college_ids.length === 0) {
          mohanaDoc.assigned_college_ids = targetCollegeIds; // starting default only — see note in sync-coordinators
          mohanaDoc.weekly_focus_locked = true;
          mohanaDoc.weekly_focus_week_key = currentWeekMonday;
          await mohanaDoc.save();
        }

        const acetDoc = targetCollegeDocs.find((c) => c.college_code === 'ACET');
        if (acetDoc) {
          await DailyTracker.updateMany(
            { college_id: acetDoc._id },
            { $set: { coordinator_id: mohanaDoc._id } }
          );
        }

        const adminUsersList = await User.find({
          role_codes: { $in: ['ADMINISTRATOR', 'ADMIN'] },
        }).select('_id');
        const adminIds = adminUsersList.map((u) => u._id);

        await DailyTracker.updateMany(
          {
            college_id: { $in: targetCollegeIds },
            $or: [
              { coordinator_id: { $in: adminIds } },
              { coordinator_id: { $exists: false } },
              { coordinator_id: null },
            ],
          },
          { $set: { coordinator_id: mohanaDoc._id } }
        );
      }
    }

    if (createdUserIds.length > 0) {
      console.log(`✅ [iPOMS] Created ${createdUserIds.length} missing default account(s) with password: ${defaultPassword}`);
    }
    console.log(`✅ [iPOMS] Default accounts verified (${allUserIds.length} present). Leadership linked to all colleges; Mohanaradha linked to ACET, AIHT, KARPAGAM, KPR.`);
  } catch (err) {
    console.error('❌ Error in ensureDefaultAccounts:', err);
  }
};

// Ensure all existing CompanyMetadata records have valid sequential serial numbers
const ensureCompanyMetadataSerialNumbers = async () => {
  try {
    const unnumberedCount = await CompanyMetadata.countDocuments({
      $or: [{ serial_number: { $exists: false } }, { serial_number: null }, { serial_number: 0 }],
    });
    if (unnumberedCount > 0) {
      console.log(`🔧 [iPOMS] Found ${unnumberedCount} company metadata records without serial number. Assigning sequential serial numbers...`);
      const highestDoc = await CompanyMetadata.findOne({ serial_number: { $gt: 0 } }).sort({ serial_number: -1 }).select('serial_number');
      let currentSerial = highestDoc?.serial_number || 0;
      const unnumberedDocs = await CompanyMetadata.find({
        $or: [{ serial_number: { $exists: false } }, { serial_number: null }, { serial_number: 0 }],
      }).sort({ created_at: 1, _id: 1 }).select('_id');
      for (const doc of unnumberedDocs) {
        currentSerial += 1;
        // updateOne (not doc.save()) so this only ever touches serial_number.
        // save() re-validates the WHOLE document, so a record with a pre-existing
        // bad value on an unrelated field (e.g. company_type imported from Weekly
        // Tracker's free-text field, which isn't in this schema's enum) aborted
        // this entire loop on the first bad doc — every doc after it silently
        // never got numbered. A targeted $set can't trip on fields it never reads.
        await CompanyMetadata.updateOne({ _id: doc._id }, { $set: { serial_number: currentSerial } });
      }
      console.log(`✅ [iPOMS] Successfully assigned serial numbers up to #${currentSerial}.`);
    }
  } catch (err) {
    console.error('❌ Error in ensureCompanyMetadataSerialNumbers:', err);
  }
};

// Boot Server and Connect Database
const startServer = async () => {
  await connectDatabase();

  // ── Demo seeding — OPT-IN ONLY ────────────────────────────────────────────
  // Each of these five routines starts by emptying its collection:
  //   seedMasterDailyLeads            -> DailyLead.deleteMany({lead_type:'positive'})
  //   seedAugustAllCollegesJdReceived -> DailyLead.deleteMany({lead_type:'jd_received'})
  //   seedActiveLeadsFromMasterPositives -> ActiveLead.deleteMany({})
  //   reloadWeeklyTrackerFrom2027Workbook -> WeeklyTracker.deleteMany({})
  //   reloadMetaDatabaseFromFile      -> CompanyMetadata.deleteMany({})  (all 3,560)
  // They are demo/reset tooling, not migrations. Running them on boot meant every
  // restart destroyed real coordinator work, so they are now off by default and
  // must be requested explicitly with SEED_ON_BOOT=true.
  if (SEED_ON_BOOT) {
    console.warn('⚠️  [Seed] SEED_ON_BOOT=true — replacing daily leads, active leads, weekly tracker and company metadata with seed data.');
    await seedMasterDailyLeads();
    await seedAugustAllCollegesJdReceived();
    await seedActiveLeadsFromMasterPositives();
    await reloadWeeklyTrackerFrom2027Workbook();
    await reloadMetaDatabaseFromFile();
    // These two also wipe-and-rebuild: each deletes every WeeklyTracker row for
    // its college, then re-inserts a hardcoded snapshot. They ran unguarded on
    // every boot (and on every file save under ts-node-dev --respawn), silently
    // reverting real coordinator edits. Run them deliberately instead:
    //   npm run seed:nehru   /   npm run seed:hits
    await updateNehruWeeklyTracker();
    await updateHitsWeeklyTracker();
  } else {
    console.log('🌱 [Seed] Boot seeding skipped — existing data left intact. (Set SEED_ON_BOOT=true to reseed demo data.)');
  }

  await ensureDefaultAccounts();
  await ensureCompanyMetadataSerialNumbers();
  await syncActiveCollegesRoster();

  // ── Reconcile legacy top companies records ──
  try {
    await WeeklyTracker.updateMany(
      { pipeline_section: 'top_companies', is_deleted: false },
      { $set: { is_pinned_top: true, pipeline_section: 'pipeline' } }
    );
  } catch (err: any) {
    console.error('Failed to reconcile legacy top_companies records:', err);
  }

  // ── Reconcile same-day moved positive leads ──
  try {
    const jdLeads = await DailyLead.find({ lead_type: 'jd_received', is_deleted: { $ne: true } });
    for (const jd of jdLeads) {
      if (!jd.lead_date || !jd.company_name) continue;
      const startDay = new Date(jd.lead_date);
      startDay.setUTCHours(0, 0, 0, 0);
      const endDay = new Date(startDay.getTime() + 24 * 60 * 60 * 1000);

      await DailyLead.updateMany(
        {
          _id: { $ne: jd._id },
          company_name: { $regex: `^${escapeRegex(jd.company_name.trim())}$`, $options: 'i' },
          college_id: jd.college_id,
          lead_type: 'positive',
          lead_date: { $gte: startDay, $lt: endDay },
          is_deleted: { $ne: true },
        },
        {
          $set: { is_deleted: true, deleted_at: new Date(), is_moved_to_jd: true },
        }
      );
    }
  } catch (err) {
    console.error('Reconcile same-day moved leads error:', err);
  }

  // Always ensure official active college roster (21 colleges including MAREPHRAM) is synchronized on boot
  await syncActiveCollegesRoster();

  app.listen(PORT, () => {
    console.log(`🚀 [iPOMS API] Server running on http://localhost:${PORT}`);
    console.log(`📡 [iPOMS API] Health probe: http://localhost:${PORT}/api/v1/health`);
    console.log(`🔍 [iPOMS API] Company Search: http://localhost:${PORT}/api/v1/companies/search?q=10`);
    console.log(`📋 [iPOMS API] DT Today: http://localhost:${PORT}/api/v1/daily-tracker/today`);
    console.log(`📊 [iPOMS API] DT KPI:   http://localhost:${PORT}/api/v1/daily-tracker/kpi`);
  });

  // Start midnight finalization cron job (Spec Section 14)
  startFinalizationJob();
  // Same-day positive-call safety net: 8 PM reminder email, 10 PM auto-sync
  // fallback (user-requested, 6 Sep 2026 — see jobs/positiveSyncReminder.ts)
  startPositiveSyncReminderJob();
};

startServer().catch((err) => {
  // Without this, a throw anywhere in boot (a malformed seed workbook, an
  // unreachable database) surfaced as an unhandled rejection and the process
  // stayed alive with no listener — the API just silently never came up.
  console.error('❌ [iPOMS API] Fatal error during startup — server did not start:', err);
  process.exit(1);
});
