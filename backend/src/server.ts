// iPOMS Backend Server - August 2026 Segregation Active
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import { connectDatabase } from './config/database';
import { CompanyMetadata } from './models/CompanyMetadata';
import { User } from './models/User';
import { Role } from './models/Role';
import { College } from './models/College';
import { DailyTracker, POSITIVE_OUTCOMES } from './models/DailyTracker';
import { WeeklyTracker, PIPELINE_SECTIONS, PipelineSection } from './models/WeeklyTracker';
import { DailyLead, LEAD_TYPES, LeadType } from './models/DailyLead';
import { ReportLibrary, REPORT_TEMPLATE_TYPES, ReportTemplateType, REPORT_THEMES, ReportTheme } from './models/ReportLibrary';
import { AssignedWork, ASSIGNMENT_PRIORITIES, AssignmentPriority, ASSIGNMENT_STATUSES, AssignmentStatus } from './models/AssignedWork';
import { Notification, NOTIFICATION_TYPES, NotificationType, AUDIENCE_TYPES, AudienceType, SENDER_ROLES, SenderRole } from './models/Notification';
import { PendingTask } from './models/PendingTask';
import { SystemSettings } from './models/SystemSettings';
import { Types } from 'mongoose';
import { startFinalizationJob } from './jobs/finalizeDailyTracker';
import { registerAuthRoutes } from './lib/authRoutes';
import { registerActiveLeadRoutes, syncLeadFromDailyTracker } from './lib/activeLeadRoutes';
import { registerPendingTaskRoutes } from './lib/pendingTaskRoutes';
import { seedAugustAllCollegesPositives } from './lib/seedAugustAllCollegesPositives';
import { seedAugustAllCollegesJdReceived } from './lib/seedAugustAllCollegesJdReceived';
import { authenticateJWT, authorizeRoles, AuthUserPayload } from './lib/authMiddleware';
import { authorizeRoute, scopeToSelf, isSupervisor, refuseForeignOwner } from './lib/routePolicy';
import { isPasswordValid, firstPasswordError } from './lib/passwordPolicy';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'ipoms_dev_access_secret_super_secure_key_2026';

const allowedOrigins = [
  CORS_ORIGIN,
  'http://localhost:3000',
  'http://localhost',
  'capacitor://localhost',
  'https://localhost',
];

// Middleware stack
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.') || origin.startsWith('http://10.0.2.2')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev to avoid mobile emulator blocks
    },
    credentials: true,
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

// Build session_date as midnight UTC for a given local date string (YYYY-MM-DD) or today
function buildSessionDate(dateStr?: string): Date {
  const d = dateStr ? new Date(dateStr) : new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function getTodayDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
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

// ─────────────────────────────────────────────────────────────────────────────
// CORE INFRASTRUCTURE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Health Check Endpoint
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'HEALTHY',
    service: 'iPOMS Core Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/health/daily-leads-diagnostics', async (req: Request, res: Response) => {
  try {
    if (req.query.resync === 'true') {
      await seedAugustAllCollegesPositives();
      await seedAugustAllCollegesJdReceived();
    }
    let ngceCollege = await College.findOne({ college_code: 'NGCE' });
    if (!ngceCollege) {
      ngceCollege = await College.create({
        college_name: 'Narayana Guru College of Engineering',
        college_code: 'NGCE',
        location: 'Kanyakumari / Coimbatore, Tamil Nadu',
        departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
        is_deleted: false,
      });
    }
    await College.deleteMany({ college_code: { $in: ['MAR', 'NGC'] } });
    if (ngceCollege) {
      await DailyLead.updateMany(
        { company_name: { $in: ['Merlin Automation', 'sasken', 'Avinya Infinity Solutions Pvt Ltd', 'BIBUS India', 'SSHRD GROUP', 'DEEPFACTS'] } },
        { $set: { college_id: ngceCollege._id } }
      );
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

// 2. Authentication Login Endpoint
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
  if (req.path === '/health' || req.path.startsWith('/auth')) {
    return next();
  }
  return authenticateJWT(req, res, next);
});

app.use('/api/v1', authorizeRoute);

// Register Active Leads routes
registerActiveLeadRoutes(app);

// Register Pending Task routes
registerPendingTaskRoutes(app);

// 3. High-Speed Company Search Endpoint (Searches across 3,550+ companies in < 10ms)
app.get('/api/v1/companies/search', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const filter: any = { is_deleted: false };

    if (query) {
      filter.$or = [
        { company_name: { $regex: query, $options: 'i' } },
        { hr_name: { $regex: query, $options: 'i' } },
        { primary_mobile: { $regex: query } },
        { primary_email: { $regex: query, $options: 'i' } },
      ];
    }

    const [companies, totalCount] = await Promise.all([
      CompanyMetadata.find(filter)
        .sort({ serial_number: 1, company_name: 1 })
        .skip(skip)
        .limit(limit)
        .select('serial_number company_name hr_name hr_designation primary_mobile primary_email company_type'),
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
    // Ensure NGCE college is active and available in roster
    const ngceExists = await College.findOne({ college_code: 'NGCE' });
    if (!ngceExists) {
      await College.create({
        college_name: 'Narayana Guru College of Engineering',
        college_code: 'NGCE',
        location: 'Kanyakumari / Coimbatore, Tamil Nadu',
        departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
        status: 'active',
        is_deleted: false,
      });
    }

    const scopedFilter: any = { status: 'active' };
    if (!isSupervisor(req) && req.user) {
      scopedFilter.assigned_coordinator_ids = req.user.userId;
    }

    let colleges = await College.find(scopedFilter)
      .sort({ college_code: 1 })
      .populate('assigned_coordinator_ids', 'full_name official_email primary_mobile');

    // Fallback, not a permanent state: no college in this database currently
    // has anyone in `assigned_coordinator_ids` — the "Team Leader assigns
    // colleges" workflow (Module 08 §17) has no endpoint anywhere in this
    // codebase yet, so real assignment data may not exist for a long while.
    // Scoping strictly here would leave every coordinator with an empty,
    // unusable dropdown with no way for them or an admin to fix it. Until
    // that assignment tooling exists, a coordinator with zero assignments
    // falls back to the full active roster; a coordinator who DOES have real
    // assignments is scoped normally above. Remove this fallback once
    // colleges can actually be assigned to coordinators.
    if (colleges.length === 0 && !isSupervisor(req)) {
      colleges = await College.find({ status: 'active' })
        .sort({ college_code: 1 })
        .populate('assigned_coordinator_ids', 'full_name official_email primary_mobile');
    }

    // First-run seeding safety net — only for supervisors, and only when the
    // (unfiltered, since isSupervisor skips the filter above) roster is truly
    // empty, so a coordinator with zero assignments never triggers a global seed.
    if (colleges.length === 0 && isSupervisor(req)) {
      const defaultColleges = [
        { college_name: 'Chennai Institute of Technology', college_code: 'CIT', location: 'Chennai, Tamil Nadu', departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'] },
        { college_name: 'Anna University - CEG Campus', college_code: 'AU-CEG', location: 'Chennai, Tamil Nadu', departments: ['CSE', 'IT', 'ECE', 'EEE', 'CIVIL'] },
        { college_name: 'PSG College of Technology', college_code: 'PSG', location: 'Coimbatore, Tamil Nadu', departments: ['CSE', 'IT', 'Robotics', 'ECE', 'EEE'] },
        { college_name: 'Sri Krishna College of Engineering & Technology', college_code: 'SKCET', location: 'Coimbatore, Tamil Nadu', departments: ['CSE', 'IT', 'AI & DS', 'ECE'] },
        { college_name: 'SSN College of Engineering', college_code: 'SSN', location: 'Chennai, Tamil Nadu', departments: ['CSE', 'IT', 'ECE', 'EEE', 'BME'] },
        { college_name: 'Rajalakshmi Engineering College', college_code: 'REC', location: 'Chennai, Tamil Nadu', departments: ['CSE', 'IT', 'AI & ML', 'ECE', 'MECH'] },
        { college_name: 'Kumaraguru College of Technology', college_code: 'KCT', location: 'Coimbatore, Tamil Nadu', departments: ['CSE', 'IT', 'ECE', 'MECH', 'AERO'] },
        { college_name: 'Vel Tech Rangarajan Dr. Sagunthala R&D Institute', college_code: 'VELTECH', location: 'Chennai, Tamil Nadu', departments: ['CSE', 'AI & DS', 'IT', 'ECE'] },
        { college_name: 'Thiagarajar College of Engineering', college_code: 'TCE', location: 'Madurai, Tamil Nadu', departments: ['CSE', 'IT', 'ECE', 'EEE', 'CIVIL'] },
        { college_name: 'Kongu Engineering College', college_code: 'KEC', location: 'Perundurai, Erode', departments: ['CSE', 'IT', 'ECE', 'MECH', 'CHEMICAL'] },
      ];
      await College.insertMany(defaultColleges);
      colleges = await College.find(scopedFilter)
        .sort({ college_code: 1 })
        .populate('assigned_coordinator_ids', 'full_name official_email primary_mobile');
    }

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
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to fetch colleges',
      },
    });
  }
});

// 5. Coordinators List Endpoint
app.get('/api/v1/coordinators', async (req: Request, res: Response) => {
  try {
    const coordinators = await User.find({
      role_codes: 'PLACEMENT_COORDINATOR',
      account_status: 'active',
      is_deleted: false,
    }).select('full_name official_email primary_mobile presence_status');

    return res.status(200).json({
      success: true,
      data: {
        total: coordinators.length,
        coordinators,
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
// Load today's active (non-finalized) tracker rows for a coordinator+college
app.get('/api/v1/daily-tracker/today', async (req: Request, res: Response) => {
  try {
    const college_id = req.query.college_id as string | undefined;
    // A coordinator is pinned to their own id regardless of what the query
    // string asks for; a Team Leader/Admin may name any coordinator. Without
    // this, every daily-tracker route trusted `coordinator_id` verbatim from
    // the client — the same IDOR class already fixed on the dashboard.
    const coordinator_id = scopeToSelf(req, req.query.coordinator_id as string | undefined);

    if (!coordinator_id || !college_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and college_id are required' },
      });
    }

    const today = buildSessionDate();
    const rows = await DailyTracker.find({
      coordinator_id: new Types.ObjectId(String(coordinator_id)),
      college_id: new Types.ObjectId(String(college_id)),
      session_date: today,
      is_finalized: false,
    }).sort({ created_at: 1 });

    // Auto-clean any unfinalized duplicate rows created in the same session
    const seenKeys = new Set<string>();
    const uniqueRows: any[] = [];
    const duplicateIdsToDelete: any[] = [];

    for (const row of rows) {
      const key = `${row.company_id || row.company_name}_${row.mobile_number}`;
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

    const enriched = uniqueRows.map((row, idx) => ({
      ...row.toObject ? row.toObject() : row,
      serial_no: idx + 1,
      duration_formatted: row.duration_seconds != null ? formatDuration(row.duration_seconds) : null,
    }));

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

// ── DT-3: PATCH /api/v1/daily-tracker/:id
// Auto-save a single row — start_time, outcome, comments
app.patch('/api/v1/daily-tracker/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { call_start_time, outcome_status, comments, follow_up_date, follow_up_month } = req.body;

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

    // Auto-sync into Active Leads if outcome indicates positive / hiring / follow up / invite
    if (row.outcome_status && row.company_name) {
      syncLeadFromDailyTracker({
        company_name: row.company_name,
        call_outcome: row.outcome_status,
        remarks: row.comments,
        coordinator_id: row.coordinator_id,
        college_id: row.college_id,
        daily_tracker_id: row._id,
      }).catch((e) => console.error('Auto-lead sync error:', e));
    }

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
// Delete a contact row from today's daily tracker
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

    await DailyTracker.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: `${row.company_name} removed from today's calling sheet`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete row' },
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

// ── DT-6: GET /api/v1/daily-tracker/history
// Fetch a past day's tracker in read-only mode
app.get('/api/v1/daily-tracker/history', async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const coordinator_id = scopeToSelf(req, req.query.coordinator_id as string | undefined);

    if (!coordinator_id || !date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and date (YYYY-MM-DD) are required' },
      });
    }

    const sessionDate = buildSessionDate(String(date));
    const rows = await DailyTracker.find({
      coordinator_id: new Types.ObjectId(String(coordinator_id)),
      session_date: sessionDate,
    }).sort({ created_at: 1 });

    const enriched = rows.map((row, idx) => ({
      ...row.toObject(),
      serial_no: idx + 1,
      duration_formatted: row.duration_seconds != null ? formatDuration(row.duration_seconds) : null,
      is_read_only: true,
    }));

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

// ── DT-7: GET /api/v1/daily-tracker/kpi
// Live KPI counts for today
app.get('/api/v1/daily-tracker/kpi', async (req: Request, res: Response) => {
  try {
    const college_id = req.query.college_id as string | undefined;
    const coordinator_id = scopeToSelf(req, req.query.coordinator_id as string | undefined);

    if (!coordinator_id || !college_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and college_id are required' },
      });
    }

    const today = buildSessionDate();
    const baseFilter = {
      coordinator_id: new Types.ObjectId(String(coordinator_id)),
      college_id: new Types.ObjectId(String(college_id)),
      session_date: today,
      is_finalized: false,
    };

    const [total, completed, noResponse, followUp, positive] = await Promise.all([
      DailyTracker.countDocuments({ ...baseFilter, is_skipped: false }),
      DailyTracker.countDocuments({ ...baseFilter, outcome_status: { $ne: null }, is_skipped: false }),
      DailyTracker.countDocuments({ ...baseFilter, outcome_status: 'no_response', is_skipped: false }),
      DailyTracker.countDocuments({ ...baseFilter, outcome_status: 'follow_up', is_skipped: false }),
      DailyTracker.countDocuments({ ...baseFilter, outcome_status: { $in: POSITIVE_OUTCOMES }, is_skipped: false }),
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

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 04 — WEEKLY TRACKER ENDPOINTS
// Spec: Module_04_Weekly_Tracker_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────

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
    const { college_id, academic_year, search, company_type } = req.query;

    if (!college_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'college_id is required' },
      });
    }

    const year = Number(academic_year) || 2026;
    const filter: any = {
      college_id: new Types.ObjectId(String(college_id)),
      academic_year: year,
      is_deleted: false,
    };

    if (company_type && company_type !== 'all') {
      filter.company_type = company_type;
    }

    if (search) {
      const q = String(search).trim();
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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Dynamic partition into the 7 standard operational sections
    const followUpsDueToday: any[] = [];
    const completed: any[] = [];
    const inProgress: any[] = [];
    const pipeline: any[] = [];
    const topCompanies: any[] = [];
    const rejectedByHr: any[] = [];
    const rejectedByCollege: any[] = [];

    rows.forEach((row) => {
      const r = row.toObject();

      // Top Companies override
      if (row.is_pinned_top || row.pipeline_section === 'top_companies') {
        topCompanies.push(r);
      }

      // Check for follow-up due today / overdue (excluding completed/rejected)
      if (
        row.follow_up_date &&
        new Date(row.follow_up_date) <= todayEnd &&
        !['completed', 'rejected_by_hr', 'rejected_by_college'].includes(row.pipeline_section)
      ) {
        followUpsDueToday.push(r);
      }

      // Primary section placement
      switch (row.pipeline_section) {
        case 'completed':
          completed.push(r);
          break;
        case 'in_progress':
          inProgress.push(r);
          break;
        case 'rejected_by_hr':
          rejectedByHr.push(r);
          break;
        case 'rejected_by_college':
          rejectedByCollege.push(r);
          break;
        case 'top_companies':
          // Already in top companies
          break;
        case 'pipeline':
        default:
          pipeline.push(r);
          break;
      }
    });

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
          in_progress: {
            title: 'Companies In Progress',
            order: 2,
            summary_metric: `${inProgress.length} Active Operations • Drives Scheduled`,
            rows: inProgress,
          },
          pipeline: {
            title: 'Companies in Pipeline',
            order: 3,
            summary_metric: `${pipeline.length} Total Leads • Awaiting JD`,
            rows: pipeline,
          },
          top_companies: {
            title: 'Top Companies',
            order: 4,
            summary_metric: `${topCompanies.length} Priority Hiring Partners`,
            rows: topCompanies,
          },
          rejected_by_hr: {
            title: 'Rejected by HR',
            order: 5,
            summary_metric: `${rejectedByHr.length} Employer Declines`,
            rows: rejectedByHr,
          },
          rejected_by_college: {
            title: 'Rejected by College',
            order: 6,
            summary_metric: `${rejectedByCollege.length} Institutional Declines`,
            rows: rejectedByCollege,
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

// ── WT-1X: GET /api/v1/weekly-tracker/export-xlsx
// Export all 6 sections to a single-sheet styled XLSX workbook with college acronym tab name
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

    const year = Number(academic_year) || 2026;
    const filter: any = {
      college_id: new Types.ObjectId(String(college_id)),
      academic_year: year,
      is_deleted: false,
    };

    if (company_type && company_type !== 'all') {
      filter.company_type = company_type;
    }

    if (search) {
      const q = String(search).trim();
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
    const inProgress = rows.filter((r) => r.pipeline_section === 'in_progress');
    const pipeline = rows.filter((r) => r.pipeline_section === 'pipeline');
    const topCompanies = rows.filter((r) => r.is_pinned_top || r.pipeline_section === 'top_companies');
    const rejectedByHr = rows.filter((r) => r.pipeline_section === 'rejected_by_hr');
    const rejectedByCollege = rows.filter((r) => r.pipeline_section === 'rejected_by_college');

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
      { key: 'extra', width: 18 },
      { key: 'remarks', width: 28 },
    ];

    // ── Main Header Title Banner ──
    const titleRow = sheet.addRow([`${collegeName} (${collegeCode}) - Weekly Placement Tracker`]);
    sheet.mergeCells(`A${titleRow.number}:G${titleRow.number}`);
    titleRow.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Navy Blue
    };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.height = 32;

    const subTitleRow = sheet.addRow([`Academic Season ${year} | Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`]);
    sheet.mergeCells(`A${subTitleRow.number}:G${subTitleRow.number}`);
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
      sheet.mergeCells(`A${secHeader.number}:G${secHeader.number}`);
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
      colHeaders.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      colHeaders.height = 22;

      // Rows
      if (sectionRows.length === 0) {
        const emptyRow = sheet.addRow(['', 'No companies listed in this section', '', '', '', '', '']);
        sheet.mergeCells(`B${emptyRow.number}:G${emptyRow.number}`);
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
            r.pipeline_section === 'completed'
              ? (r.selected_count !== undefined ? String(r.selected_count) : '-')
              : (r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN') : '-'),
            r.remarks || r.cdc_reference || '-',
          ]);
          rowData.font = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
          rowData.alignment = { vertical: 'middle' };
          rowData.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
          rowData.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
          rowData.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
          rowData.height = 20;

          // Apply light borders
          for (let c = 1; c <= 7; c++) {
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

    // 2. Companies in Progress (Blue Banner)
    renderSection('2. COMPANIES IN PROGRESS', inProgress, 'FF2563EB', 'Follow-up / Drive Date');

    // 3. Companies in Pipeline (Indigo Banner)
    renderSection('3. COMPANIES IN PIPELINE', pipeline, 'FF4F46E5', 'Timeline');

    // 4. Top Companies (Amber Banner)
    renderSection('4. TOP COMPANIES', topCompanies, 'FFD97706', 'Package / Tier');

    // 5. Companies Rejected by HR (Rose / Coral Banner)
    renderSection('5. COMPANIES REJECTED BY HR', rejectedByHr, 'FFE11D48', 'Reason');

    // 6. Companies Rejected by TPO (Slate / Purple Banner)
    renderSection('6. COMPANIES REJECTED BY TPO', rejectedByCollege, 'FF64748B', 'Reason');

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
      selected_count,
    } = req.body;

    if (!college_id || !coordinator_id || !company_name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'college_id, coordinator_id, and company_name are required' },
      });
    }

    // If company_id is not provided, look up or find in company_metadata
    let resolvedCompanyId = company_id;
    if (!resolvedCompanyId) {
      const existingMeta = await CompanyMetadata.findOne({
        company_name: { $regex: `^${company_name.trim()}$`, $options: 'i' },
      });
      resolvedCompanyId = existingMeta?._id || new Types.ObjectId();
    }

    const effectiveSection = pipeline_section === 'follow_ups_due_today' ? 'in_progress' : (pipeline_section || 'pipeline');
    const effectiveFollowUp = pipeline_section === 'follow_ups_due_today' && !follow_up_date ? new Date() : (follow_up_date ? new Date(follow_up_date) : null);
    const { startFriday, endThursday, weekNumber } = getFridayWeekBounds();

    const newDrive = await WeeklyTracker.create({
      academic_year: 2026,
      college_id: new Types.ObjectId(String(college_id)),
      coordinator_id: new Types.ObjectId(String(coordinator_id)),
      company_id: new Types.ObjectId(String(resolvedCompanyId)),
      company_name: company_name.trim(),
      job_role: job_role?.trim() || 'Graduate Trainee',
      cdc_reference: cdc_reference?.trim() || '',
      company_type: company_type?.trim() || 'Software / IT',
      ctc_lpa: ctc_lpa?.trim() || '',
      eligible_batch: eligible_batch?.trim() || '2026 Batch',
      pipeline_section: effectiveSection,
      current_status_text: current_status_text?.trim() || 'Invite email sent, awaiting JD',
      follow_up_date: effectiveFollowUp,
      drive_date: drive_date ? new Date(drive_date) : null,
      selected_count: Number(selected_count) || 0,
      week_number: weekNumber,
      week_start_date: startFriday,
      week_end_date: endThursday,
      is_pinned_top: pipeline_section === 'top_companies',
    });

    return res.status(201).json({
      success: true,
      message: 'Recruitment drive record created successfully',
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

    // Apply allowed updates
    const allowedFields = [
      'company_name',
      'job_role',
      'cdc_reference',
      'company_type',
      'ctc_lpa',
      'eligible_batch',
      'current_status_text',
      'follow_up_date',
      'drive_date',
      'registered_count',
      'shortlisted_count',
      'selected_count',
      'pipeline_section',
      'is_pinned_top',
    ];

    allowedFields.forEach((field) => {
      if (patchData[field] !== undefined) {
        if (['follow_up_date', 'drive_date'].includes(field)) {
          (row as any)[field] = patchData[field] ? new Date(patchData[field]) : null;
        } else {
          (row as any)[field] = patchData[field];
        }
      }
    });

    row.last_status_updated_at = new Date();
    await row.save();

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

    row.pipeline_section = pipeline_section;
    if (current_status_text) {
      row.current_status_text = current_status_text;
    }
    row.last_status_updated_at = new Date();
    await row.save();

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

// ── WT-6: DELETE /api/v1/weekly-tracker/:id
// Soft delete record to recycle bin
app.delete('/api/v1/weekly-tracker/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await WeeklyTracker.findById(id);

    if (!row || row.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Weekly tracker record not found' },
      });
    }

    row.is_deleted = true;
    row.deleted_at = new Date();
    await row.save();

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
      { $set: { is_deleted: true, deleted_at: new Date() } }
    );

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

    const year = Number(academic_year) || 2026;
    const baseFilter = {
      college_id: new Types.ObjectId(String(college_id)),
      academic_year: year,
      is_deleted: false,
    };

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      pipelineCount,
      inProgressCount,
      completedRows,
      topCount,
      rejectedHrCount,
      rejectedCollegeCount,
      followUpsDueCount,
    ] = await Promise.all([
      WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'pipeline' }),
      WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'in_progress' }),
      WeeklyTracker.find({ ...baseFilter, pipeline_section: 'completed' }).select('selected_count'),
      WeeklyTracker.countDocuments({ ...baseFilter, $or: [{ pipeline_section: 'top_companies' }, { is_pinned_top: true }] }),
      WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'rejected_by_hr' }),
      WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'rejected_by_college' }),
      WeeklyTracker.countDocuments({
        ...baseFilter,
        follow_up_date: { $ne: null, $lte: todayEnd },
        pipeline_section: { $nin: ['completed', 'rejected_by_hr', 'rejected_by_college'] },
      }),
    ]);

    const totalOffers = completedRows.reduce((sum, r) => sum + (r.selected_count || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        kpi: {
          pipeline: pipelineCount,
          in_progress: inProgressCount,
          completed: completedRows.length,
          total_offers: totalOffers,
          top_companies: topCount,
          follow_ups_due_today: followUpsDueCount,
          rejected: rejectedHrCount + rejectedCollegeCount,
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
// Ingest un-promoted positive outcome rows from Daily Tracker into Weekly Tracker Pipeline
app.post('/api/v1/weekly-tracker/sync-daily-positives', async (req: Request, res: Response) => {
  try {
    const { college_id, coordinator_id } = req.body;

    if (!college_id || !coordinator_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'college_id and coordinator_id are required' },
      });
    }

    const { startFriday, endThursday, weekNumber } = getFridayWeekBounds();

    // Find positive calls from daily tracker that are not yet created in weekly tracker
    const positiveDailyRows = await DailyTracker.find({
      college_id: new Types.ObjectId(String(college_id)),
      coordinator_id: new Types.ObjectId(String(coordinator_id)),
      outcome_status: { $in: POSITIVE_OUTCOMES },
    });

    let syncedCount = 0;

    for (const dRow of positiveDailyRows) {
      // Check if already present in weekly_tracker
      const existing = await WeeklyTracker.findOne({
        college_id: dRow.college_id,
        company_name: { $regex: `^${dRow.company_name.trim()}$`, $options: 'i' },
        is_deleted: false,
      });

      if (!existing) {
        await WeeklyTracker.create({
          academic_year: 2026,
          college_id: dRow.college_id,
          coordinator_id: dRow.coordinator_id,
          company_id: dRow.company_id,
          daily_tracker_id: dRow._id,
          company_name: dRow.company_name,
          job_role: 'Graduate Trainee',
          cdc_reference: '',
          company_type: 'Software / IT',
          ctc_lpa: '',
          eligible_batch: '2026 Batch',
          pipeline_section: 'pipeline',
          current_status_text: `Invite email sent (${(dRow.outcome_status || 'positive').replace(/_/g, ' ')})`,
          follow_up_date: dRow.follow_up_date || null,
          week_number: weekNumber,
          week_start_date: startFriday,
          week_end_date: endThursday,
        });
        syncedCount++;
      }

      // Mark daily row as promoted
      if (!dRow.is_promoted_to_weekly) {
        dRow.is_promoted_to_weekly = true;
        await dRow.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `${syncedCount} positive lead(s) synced into Weekly Tracker pipeline`,
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
    const { date, college_id, coordinator_id, lead_type, search } = req.query;

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
      const q = String(search).trim();
      filter.$or = [
        { company_name: { $regex: q, $options: 'i' } },
        { job_role: { $regex: q, $options: 'i' } },
        { remarks: { $regex: q, $options: 'i' } },
        { ctc: { $regex: q, $options: 'i' } },
      ];
    }

    // Ensure NGCE college exists and has its leads mapped
    let ngceCollege = await College.findOne({ college_code: 'NGCE' });
    if (!ngceCollege) {
      ngceCollege = await College.create({
        college_name: 'Narayana Guru College of Engineering',
        college_code: 'NGCE',
        location: 'Kanyakumari / Coimbatore, Tamil Nadu',
        departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
        is_deleted: false,
      });
    }
    await DailyLead.updateMany(
      { company_name: { $in: ['Merlin Automation', 'sasken', 'Avinya Infinity Solutions Pvt Ltd', 'BIBUS India', 'SSHRD GROUP', 'DEEPFACTS'] } },
      { $set: { college_id: ngceCollege._id } }
    );

    // Ensure August positives across all colleges are seeded on first load
    const totalAugustCount = await DailyLead.countDocuments({ lead_type: 'positive', is_deleted: false });
    if (totalAugustCount === 0) {
      await seedAugustAllCollegesPositives();
    }

    const totalAugustJdCount = await DailyLead.countDocuments({ lead_type: 'jd_received', is_deleted: false });
    if (totalAugustJdCount === 0) {
      await seedAugustAllCollegesJdReceived();
    }

    const leads = await DailyLead.find(filter)
      .sort({ lead_date: -1, created_at: -1 })
      .populate('college_id', 'college_name college_code')
      .populate('coordinator_id', 'full_name official_email');

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

    let resolvedCoordinatorId = coordinator_id || (req as any).user?._id || (req as any).user?.id;
    if (!resolvedCoordinatorId || !Types.ObjectId.isValid(String(resolvedCoordinatorId))) {
      const fallbackUser = await User.findOne({ is_active: { $ne: false } });
      resolvedCoordinatorId = fallbackUser?._id;
    }

    if (!resolvedCoordinatorId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Coordinator ID is required to attribute lead ownership' },
      });
    }

    const targetDate = lead_date ? parseDateParam(String(lead_date)) : getTodayDate();
    const timeStr = event_time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

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
      job_role: job_role?.trim() || 'Graduate Trainee',
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
        (lead as any)[f] = patchData[f];
      }
    });

    if (patchData.lead_date) {
      lead.lead_date = parseDateParam(String(patchData.lead_date));
    }

    await lead.save();

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
// 1-Click Move from Positives tab to JD Received tab (Spec Section 6.3 & 11)
app.post('/api/v1/daily-leads/:id/move-to-jd', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await DailyLead.findById(id);

    if (!lead || lead.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Daily lead not found' },
      });
    }

    lead.lead_type = 'jd_received';
    lead.is_moved_to_jd = true;
    lead.event_time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    await lead.save();

    const updated = await DailyLead.findById(lead._id)
      .populate('college_id', 'college_name college_code')
      .populate('coordinator_id', 'full_name official_email');

    return res.status(200).json({
      success: true,
      message: `${lead.company_name} successfully moved to JD Received tab`,
      data: updated,
    });
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

    lead.is_deleted = true;
    lead.deleted_at = new Date();
    await lead.save();

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

// ── DL-6: GET /api/v1/daily-leads/summary
// Summary Strip counts: Positives count, JDs count, Active colleges count (Spec Section 7.3)
app.get('/api/v1/daily-leads/summary', async (req: Request, res: Response) => {
  try {
    const { date, college_id, coordinator_id } = req.query;

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

    const totalAugustCount = await DailyLead.countDocuments({ lead_type: 'positive', is_deleted: false });
    if (totalAugustCount === 0) {
      await seedAugustAllCollegesPositives();
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
    const { date, college_id, coordinator_id } = req.query;

    const targetDate = date ? parseDateParam(String(date)) : getTodayDate();

    const filter: any = {
      session_date: targetDate,
      outcome_status: { $in: POSITIVE_OUTCOMES },
    };

    if (college_id && college_id !== 'all') {
      filter.college_id = new Types.ObjectId(String(college_id));
    }

    if (coordinator_id) {
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

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 06 — REPORTS & ANALYTICS ENDPOINTS
// Spec: Module_06_Reports_Analytics_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────

// ── RA-1: GET /api/v1/analytics/overview
// Live BI overview: KPI counters, conversion rates, and 4-category automated insights
app.get('/api/v1/analytics/overview', async (req: Request, res: Response) => {
  try {
    const { college_id, coordinator_id, academic_year = '2026' } = req.query;

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
    const { academic_year = '2026' } = req.query;

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
    const { college_id, academic_year = '2026' } = req.query;

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
// Returns the 3 Standardized Report Templates (Spec Section 8.3)
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
      title: 'Pending Tasks Report',
      audience: 'Institution Management & Operations',
      icon: '📋',
      description: 'Institutional pending tasks status report covering JD received dates, DB shared status, current recruitment stages, and actionable next steps.',
      default_sections: ['kpi_summary', 'pending_tasks', 'insights', 'remarks'],
    },
  ];

  return res.status(200).json({
    success: true,
    data: { templates },
  });
});

// ── RA-5: POST /api/v1/reports/generate
// Dynamic Report Generator reading live from M03, M04, and M05 (Spec Section 9.7 & 10.3)
app.post('/api/v1/reports/generate', async (req: Request, res: Response) => {
  try {
    const {
      template_type = 'weekly_placement',
      college_id,
      coordinator_id,
      academic_year = '2026',
      date_from,
      date_to,
      week_label = 'Week 30: 18 Jul - 24 Jul 2026',
      theme = 'blue',
      included_sections,
      custom_remarks,
    } = req.body;

    let targetCollege: any = null;
    if (college_id && college_id !== 'all') {
      targetCollege = await College.findById(college_id);
    }

    const coordinator = coordinator_id ? await User.findById(coordinator_id) : null;

    // Filter bases
    const wtFilter: any = { academic_year, is_deleted: false };
    const dtFilter: any = {};
    const dlFilter: any = { is_deleted: false };
    const ptFilter: any = { is_deleted: false };

    if (college_id && college_id !== 'all') {
      const cId = new Types.ObjectId(String(college_id));
      wtFilter.college_id = cId;
      dtFilter.college_id = cId;
      dlFilter.college_id = cId;
      ptFilter.college_id = cId;
    }

    if (coordinator_id) {
      const uId = new Types.ObjectId(String(coordinator_id));
      dtFilter.coordinator_id = uId;
      wtFilter.coordinator_id = uId;
      dlFilter.coordinator_id = uId;
    }

    // Parallel fetch of pipeline sections & operational metrics
    const [
      completedRows,
      inProgressRows,
      pipelineRows,
      topCompaniesRows,
      totalCalls,
      positiveCalls,
      totalJds,
      pendingTasksList,
    ] = await Promise.all([
      WeeklyTracker.find({ ...wtFilter, pipeline_section: 'completed' }).sort({ created_at: -1 }),
      WeeklyTracker.find({ ...wtFilter, pipeline_section: 'in_progress' }).sort({ created_at: -1 }),
      WeeklyTracker.find({ ...wtFilter, pipeline_section: 'pipeline' }).sort({ created_at: -1 }),
      WeeklyTracker.find({ ...wtFilter, is_pinned_top: true }).sort({ created_at: -1 }),
      DailyTracker.countDocuments(dtFilter),
      DailyTracker.countDocuments({ ...dtFilter, outcome_status: { $in: POSITIVE_OUTCOMES } }),
      DailyLead.countDocuments({ ...dlFilter, lead_type: 'jd_received' }),
      PendingTask.find(ptFilter).sort({ serial_no: 1, created_at: -1 }),
    ]);

    const totalOffers = completedRows.reduce((sum, r) => sum + (r.selected_count || 0), 0);

    let ptSharedCount = 0;
    let ptPendingCount = 0;
    let ptDrivesScheduled = 0;
    const now = new Date();
    for (const pt of pendingTasksList) {
      if (pt.db_shared_date) ptSharedCount++;
      else ptPendingCount++;
      if (pt.drive_date && new Date(pt.drive_date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        ptDrivesScheduled++;
      }
    }

    // Build the Generated Report Document Schema
    const reportDocument = {
      template_type,
      report_title:
        template_type === 'weekly_placement'
          ? 'Weekly Report'
          : template_type === 'monthly_placement'
          ? `Monthly Placement Review — ${academic_year} Season`
          : template_type === 'pending_tasks'
          ? `Placement Pending Tasks Report — ${targetCollege?.college_name || 'All Colleges'}`
          : 'Placement Operations Report',
      report_period: week_label,
      generated_by: coordinator?.full_name || 'A. Mohanaradha (Lead Placement Coordinator)',
      generated_date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      theme: theme || 'blue',
      branding: {
        company_name: 'Infoziant IT Solutions Inc.',
        company_logo: '/infoziant-logo.png',
        college_name: targetCollege?.college_name || 'Consolidated Partner Institutions',
        college_code: targetCollege?.college_code || 'iPOMS',
        college_logo: targetCollege?.college_website ? `https://logo.clearbit.com/${targetCollege.college_website.replace(/https?:\/\//, '')}` : null,
        confidential_notice: 'CONFIDENTIAL — Prepared by Infoziant Placement Operations for Institutional Management.',
      },
      kpi_summary: {
        total_calls: totalCalls,
        positive_responses: positiveCalls,
        jds_received: totalJds,
        drives_completed: completedRows.length,
        drives_in_progress: inProgressRows.length,
        pipeline_leads: pipelineRows.length,
        total_offers: totalOffers,
        total_pending_tasks: pendingTasksList.length,
        db_shared_count: ptSharedCount,
        db_pending_count: ptPendingCount,
        drives_scheduled: ptDrivesScheduled,
      },
      sections: {
        completed_companies: completedRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role,
          company_type: r.company_type || 'Software / IT',
          ctc_lpa: r.ctc_lpa || 'Competitive',
          selected_count: r.selected_count || 0,
          current_status_text: r.current_status_text,
        })),
        in_progress: inProgressRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role,
          company_type: r.company_type || 'Software / IT',
          ctc_lpa: r.ctc_lpa || 'To be finalized',
          current_status_text: r.current_status_text,
          follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toISOString().split('T')[0] : 'Scheduled',
        })),
        pipeline: pipelineRows.map((r, i) => ({
          s_no: i + 1,
          company_name: r.company_name,
          job_role: r.job_role,
          company_type: r.company_type || 'Corporate',
          ctc_lpa: r.ctc_lpa || 'Awaiting JD',
          current_status_text: r.current_status_text,
        })),
        pending_tasks: pendingTasksList.map((pt, i) => ({
          s_no: pt.serial_no || i + 1,
          company_name: pt.company_name,
          jd_received_date: pt.jd_received_date ? new Date(pt.jd_received_date).toLocaleDateString('en-IN') : '—',
          db_shared_date: pt.db_shared_date ? new Date(pt.db_shared_date).toLocaleDateString('en-IN') : '—',
          db_shared_status: pt.db_shared_date ? 'Shared' : 'Pending',
          current_status: pt.current_status || '—',
          action_to_be_taken: pt.action_to_be_taken || '—',
          drive_date: pt.drive_date ? new Date(pt.drive_date).toLocaleDateString('en-IN') : '—',
          remarks: pt.remarks || '',
        })),
      },
      insights: [
        template_type === 'pending_tasks'
          ? `Pending Tasks Velocity: ${pendingTasksList.length} companies tracked, with ${ptSharedCount} databases shared and ${ptPendingCount} pending.`
          : `Operational Velocity: Contacted corporate leads resulted in ${completedRows.length} completed drives with ${totalOffers} offers placed.`,
        template_type === 'pending_tasks'
          ? `Drive Scheduling: ${ptDrivesScheduled} upcoming campus recruitment drives scheduled.`
          : `Active Pipeline: ${inProgressRows.length} drives currently underway with technical rounds in progress.`,
        template_type === 'pending_tasks'
          ? `Action items recorded for swift coordinator follow-ups.`
          : `Lead Conversion: ${totalJds} Job Descriptions secured and circulated to students for registration.`,
      ],
      remarks: custom_remarks || 'All recruitment drives are proceeding as per placement schedule. Follow-ups with upcoming product companies remain active.',
      included_sections: included_sections || {
        kpi_summary: true,
        completed_companies: true,
        in_progress: true,
        pipeline: true,
        pending_tasks: true,
        charts: true,
        insights: true,
        remarks: true,
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
      academic_year = '2026',
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
      academic_year,
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

    const [todayCalls, todayPositives, todayJds, pendingFollowUps] = await Promise.all([
      DailyTracker.countDocuments({
        coordinator_id: coordinator._id,
        call_date: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      }),
      DailyTracker.countDocuments({
        coordinator_id: coordinator._id,
        outcome_status: { $in: POSITIVE_OUTCOMES },
        call_date: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      }),
      DailyLead.countDocuments({
        coordinator_id: coordinator._id,
        lead_type: 'jd_received',
        is_deleted: false,
      }),
      WeeklyTracker.countDocuments({
        coordinator_id: coordinator._id,
        is_deleted: false,
        follow_up_date: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);

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
          call_date: { $gte: dayStart, $lt: dayEnd },
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
        .filter((s) => Types.ObjectId.isValid(s))
        .slice(0, 3);
    }

    // If no college IDs provided, resolve up to 3 active colleges
    if (targetCollegeIds.length === 0) {
      const activeCols = await College.find({ status: { $ne: 'inactive' }, is_deleted: { $ne: true } })
        .sort({ college_code: 1 })
        .limit(3);
      targetCollegeIds = activeCols.map((c) => c._id.toString());
    }

    const POSITIVE_STATUSES = ['hiring', 'invite_mail', 'follow_up', 'jd_received', 'drive_completed', 'in_connect'];
    const NEGATIVE_STATUSES = ['invalid', 'no_response', 'hiring_freezed', 'call_back'];
    const NOT_HIRING_STATUSES = ['not_hiring'];

    const kpiResults = await Promise.all(
      targetCollegeIds.map(async (cIdStr) => {
        const cObjectId = new Types.ObjectId(cIdStr);
        const college = await College.findById(cObjectId);
        if (!college) return null;

        const coordinatorBaseFilter: any = {
          college_id: cObjectId,
          coordinator_id: coordinator._id,
        };

        const [
          totalCalls,
          totalPositives,
          totalNegatives,
          totalNotHiring,
          activeLeadsCount,
          weeklyPipelineCount,
        ] = await Promise.all([
          // Total Calls Made
          DailyTracker.countDocuments({
            ...coordinatorBaseFilter,
            is_skipped: { $ne: true },
          }),
          // Positives (Hiring, Invite Email, Follow Up, JD Received, Drive Completed)
          DailyTracker.countDocuments({
            ...coordinatorBaseFilter,
            outcome_status: { $in: POSITIVE_STATUSES },
          }),
          // Negatives (Invalid, No Response, Freeze)
          DailyTracker.countDocuments({
            ...coordinatorBaseFilter,
            outcome_status: { $in: NEGATIVE_STATUSES },
          }),
          // Not Hiring
          DailyTracker.countDocuments({
            ...coordinatorBaseFilter,
            outcome_status: { $in: NOT_HIRING_STATUSES },
          }),
          // Daily Leads
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

        return {
          college_id: college._id,
          college_name: college.college_name,
          college_code: college.college_code,
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

// ── DB-2: GET /api/v1/dashboard/team-leader
// Team Leader Dashboard (Spec Section 5.2) — "How is my team performing today?"
app.get('/api/v1/dashboard/team-leader', async (req: Request, res: Response) => {
  try {
    const coordinators = await User.find({ is_deleted: false }).limit(10);
    const today = getTodayDate();

    // Per-coordinator live activity matrix
    const teamMatrix = await Promise.all(
      coordinators.map(async (c) => {
        const [calls, positives, jds, pendingWork] = await Promise.all([
          DailyTracker.countDocuments({
            coordinator_id: c._id,
            call_date: {
              $gte: new Date(today.setHours(0, 0, 0, 0)),
              $lt: new Date(today.setHours(23, 59, 59, 999)),
            },
          }),
          DailyTracker.countDocuments({
            coordinator_id: c._id,
            outcome_status: { $in: POSITIVE_OUTCOMES },
          }),
          DailyLead.countDocuments({ coordinator_id: c._id, lead_type: 'jd_received', is_deleted: false }),
          AssignedWork.countDocuments({ assigned_to_coordinator_id: c._id, is_completed: false, is_deleted: false }),
        ]);

        return {
          coordinator_id: c._id,
          name: c.full_name,
          email: c.official_email,
          calls_today: calls,
          positive_leads: positives,
          jds_received: jds,
          pending_assigned_work: pendingWork,
          status: calls >= 25 ? 'on_track' : calls > 0 ? 'active' : 'pending',
        };
      })
    );

    const totalDispatchedAssignments = await AssignedWork.countDocuments({ is_deleted: false });
    const completedAssignments = await AssignedWork.countDocuments({ is_completed: true, is_deleted: false });

    return res.status(200).json({
      success: true,
      data: {
        greeting: {
          greeting: 'Team Operations Command Center 👔',
          subtext: 'Real-time coordinator monitoring, task dispatch, and drive coordination.',
        },
        team_matrix: teamMatrix,
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
// Administrator / Executive Dashboard (Spec Section 5.3) — "How is the complete placement operation progressing?"
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
    ]);

    const totalOffers = totalOffersAgg[0]?.sum || 0;
    const positiveRate = totalCalls > 0 ? Math.round((totalPositives / totalCalls) * 100) : 0;

    // College Placement Leaderboard
    const colleges = await College.find({ status: 'active' }).limit(5);
    const leaderboard = await Promise.all(
      colleges.map(async (c) => {
        const [calls, drives, offers] = await Promise.all([
          DailyTracker.countDocuments({ college_id: c._id }),
          WeeklyTracker.countDocuments({ college_id: c._id, pipeline_section: 'completed', is_deleted: false }),
          WeeklyTracker.aggregate([
            { $match: { college_id: c._id, pipeline_section: 'completed', is_deleted: false } },
            { $group: { _id: null, sum: { $sum: '$selected_count' } } },
          ]),
        ]);

        return {
          college_id: c._id,
          college_name: c.college_name,
          college_code: c.college_code,
          calls,
          drives_completed: drives,
          total_offers: offers[0]?.sum || 0,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        greeting: {
          greeting: 'Executive Placement Command Center 👑',
          subtext: 'Consolidated institutional performance, placement KPIs, and operational compliance.',
        },
        macro_kpis: {
          total_calls: totalCalls,
          positive_rate_pct: positiveRate,
          jds_in_hand: totalJds,
          drives_conducted: totalDrives,
          total_offers_placed: totalOffers,
          active_partner_colleges: totalColleges,
          portal_users: totalUsers,
        },
        leaderboard,
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
    const { coordinator_id, tl_id, is_completed } = req.query;

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
      // Case 1: Company does not exist -> Create an entirely new company record
      company = await CompanyMetadata.create({
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
    const { user_id, college_id, tab = 'all', notification_type } = req.query;

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

// ── MD-1: GET /api/v1/metadata
// Searchable company & HR catalog with starts-with search, type filter, pagination & recycle bin toggle
app.get('/api/v1/metadata', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      q = '',
      type,
      is_deleted = 'false',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
      is_deleted: is_deleted === 'true',
    };

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

    const total = await CompanyMetadata.countDocuments(filter);
    const companies = await CompanyMetadata.find(filter)
      .sort({ company_name: 1, created_at: -1 })
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

    const created = await CompanyMetadata.create({
      company_name: trimmedCompany,
      hr_name: trimmedHr,
      hr_designation: hr_designation.trim(),
      primary_mobile: trimmedMobile,
      mobile_numbers: allMobiles,
      primary_email: trimmedEmail,
      email_ids: allEmails,
      company_type: company_type.toLowerCase(),
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
app.patch('/api/v1/metadata/:id', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
    if (company_type !== undefined) record.company_type = company_type.toLowerCase();
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

// ── MD-4: DELETE /api/v1/metadata/:id
// Soft delete record to Recycle Bin (Spec Section 17)
app.delete('/api/v1/metadata/:id', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await CompanyMetadata.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Metadata record not found' },
      });
    }

    record.is_deleted = true;
    record.deleted_at = new Date();
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
app.post('/api/v1/metadata/:id/restore', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await CompanyMetadata.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Metadata record not found' },
      });
    }

    record.is_deleted = false;
    record.deleted_at = null;
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
app.delete('/api/v1/metadata/:id/purge', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
// Bulk paste / Excel import endpoint with row-by-row validation & duplicate reporting (Spec Section 16)
app.post('/api/v1/metadata/bulk-import', authenticateJWT, authorizeRoles('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER'), async (req: Request, res: Response) => {
  try {
    const { rows = [] } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rows array is required and cannot be empty' },
      });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row_number: number; company_name: string; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      const cName = (r.company_name || '').trim();
      const hName = (r.hr_name || '').trim();
      const pMobile = (r.primary_mobile || '').trim();
      const pEmail = (r.primary_email || '').trim().toLowerCase();
      const cType = (r.company_type || 'other').trim().toLowerCase();

      if (!cName) {
        errors.push({ row_number: rowNum, company_name: 'Unknown', reason: 'Missing Company Name' });
        skippedCount++;
        continue;
      }

      // Check exact duplicate
      if (pMobile) {
        const exact = await CompanyMetadata.findOne({
          is_deleted: false,
          company_name: { $regex: new RegExp(`^${escapeRegex(cName)}$`, 'i') },
          hr_name: { $regex: new RegExp(`^${escapeRegex(hName)}$`, 'i') },
          $or: [{ primary_mobile: pMobile }, { mobile_numbers: pMobile }],
          primary_email: pEmail,
        });

        if (exact) {
          errors.push({ row_number: rowNum, company_name: cName, reason: 'Exact duplicate already exists' });
          skippedCount++;
          continue;
        }
      }

      await CompanyMetadata.create({
        company_name: cName,
        hr_name: hName,
        primary_mobile: pMobile,
        mobile_numbers: pMobile ? [pMobile] : [],
        primary_email: pEmail,
        email_ids: pEmail ? [pEmail] : [],
        company_type: cType || 'other',
        is_deleted: false,
      });

      importedCount++;
    }

    return res.status(200).json({
      success: true,
      message: `Bulk import completed: ${importedCount} contacts imported, ${skippedCount} skipped.`,
      data: {
        imported_count: importedCount,
        skipped_count: skippedCount,
        errors,
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

    const filter: any = { is_deleted: false };

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
      filter.account_status = status;
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
      role_codes = ['COORDINATOR'],
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
      assigned_college_ids,
      role_codes,
      account_status,
      presence_status,
      password,
    } = req.body;

    const user = await User.findById(id);
    if (!user || user.is_deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    if (full_name !== undefined) user.full_name = full_name.trim();
    if (personal_email !== undefined) user.personal_email = personal_email.trim().toLowerCase();
    if (primary_mobile !== undefined) user.primary_mobile = primary_mobile.trim();
    if (secondary_mobile !== undefined) user.secondary_mobile = secondary_mobile.trim();
    if (account_status !== undefined) user.account_status = account_status;
    if (presence_status !== undefined) user.presence_status = presence_status;

    if (assigned_college_ids !== undefined) {
      user.assigned_college_ids = assigned_college_ids.map((cId: string) => new Types.ObjectId(cId));
    }

    if (role_codes !== undefined) {
      user.role_codes = role_codes;
      const roles = await Role.find({ role_code: { $in: role_codes } });
      user.role_ids = roles.map((r) => r._id);
    }

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(password.trim(), salt);
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
        user.profile_photo_url = profile_photo_url;
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

      if (user.is_password_locked || user.account_status === 'blocked') {
        return res.status(403).json({
          success: false,
          is_locked: true,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Your account is locked due to exceeding monthly password update limits. Please contact your Administrator to release your account.',
          },
        });
      }

      if ((user.monthly_password_changes_count || 0) >= 2) {
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
      user.monthly_password_changes_count = (user.monthly_password_changes_count || 0) + 1;
      user.last_password_change_month = currentMonthStr;
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
    user.monthly_password_changes_count = 0;
    await user.save();

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
// Soft delete user
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

    return res.status(200).json({
      success: true,
      message: `User account for "${user.full_name}" has been deactivated and archived`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to deactivate user' },
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
        season_name: 'Campus Recruitment Season 2025-26',
        daily_calling_target: 30,
        working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        org_name: 'Infoziant Placement Operations',
        org_support_email: 'support@infoziant.com',
        org_support_phone: '+91 98401 23456',
        theme_default: 'dark',
        default_landing_page: '/dashboard',
        enable_email_notifications: true,
        enable_system_notifications: true,
        enable_dashboard_popups: true,
        system_announcement_banner: '',
      });
    }

    // Include system summary telemetry (Spec Section 13.2)
    const [totalUsers, totalCoordinators, totalCompanies, totalColleges] = await Promise.all([
      User.countDocuments({ is_deleted: false }),
      User.countDocuments({ is_deleted: false, role_codes: 'COORDINATOR' }),
      CompanyMetadata.countDocuments({ is_deleted: false }),
      College.countDocuments({ is_deleted: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        settings,
        system_summary: {
          total_users: totalUsers,
          total_coordinators: totalCoordinators,
          total_companies: totalCompanies,
          total_colleges: totalColleges,
          app_version: 'v1.0.0 Enterprise',
          database_status: 'Connected (MongoDB Atlas / Local)',
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
      season_name,
      daily_calling_target,
      working_days,
      org_name,
      org_support_email,
      org_support_phone,
      theme_default,
      default_landing_page,
      enable_email_notifications,
      enable_system_notifications,
      enable_dashboard_popups,
      system_announcement_banner,
    } = req.body;

    let settings = await SystemSettings.findOne({});
    if (!settings) {
      settings = new SystemSettings({});
    }

    if (academic_year !== undefined) settings.academic_year = academic_year.trim();
    if (season_name !== undefined) settings.season_name = season_name.trim();
    if (daily_calling_target !== undefined) settings.daily_calling_target = Number(daily_calling_target);
    if (working_days !== undefined) settings.working_days = working_days;
    if (org_name !== undefined) settings.org_name = org_name.trim();
    if (org_support_email !== undefined) settings.org_support_email = org_support_email.trim().toLowerCase();
    if (org_support_phone !== undefined) settings.org_support_phone = org_support_phone.trim();
    if (theme_default !== undefined) settings.theme_default = theme_default;
    if (default_landing_page !== undefined) settings.default_landing_page = default_landing_page;
    if (enable_email_notifications !== undefined) settings.enable_email_notifications = !!enable_email_notifications;
    if (enable_system_notifications !== undefined) settings.enable_system_notifications = !!enable_system_notifications;
    if (enable_dashboard_popups !== undefined) settings.enable_dashboard_popups = !!enable_dashboard_popups;
    if (system_announcement_banner !== undefined) settings.system_announcement_banner = system_announcement_banner.trim();

    await settings.save();

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
  console.error('❌ [Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

// Boot Server and Connect Database
const startServer = async () => {
  await connectDatabase();
  // Ensure strict zero records exist before August 2026 for daily leads
  await DailyLead.deleteMany({ lead_date: { $lt: new Date('2026-08-01T00:00:00.000Z') } });
  await seedAugustAllCollegesPositives();
  await seedAugustAllCollegesJdReceived();

  app.listen(PORT, () => {
    console.log(`🚀 [iPOMS API] Server running on http://localhost:${PORT}`);
    console.log(`📡 [iPOMS API] Health probe: http://localhost:${PORT}/api/v1/health`);
    console.log(`🔍 [iPOMS API] Company Search: http://localhost:${PORT}/api/v1/companies/search?q=10`);
    console.log(`📋 [iPOMS API] DT Today: http://localhost:${PORT}/api/v1/daily-tracker/today`);
    console.log(`📊 [iPOMS API] DT KPI:   http://localhost:${PORT}/api/v1/daily-tracker/kpi`);
  });

  // Start midnight finalization cron job (Spec Section 14)
  startFinalizationJob();
};

startServer();
