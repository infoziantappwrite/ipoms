"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVE_COLLEGE_CODES = void 0;
exports.syncActiveCollegesRoster = syncActiveCollegesRoster;
// iPOMS Backend Server - August 2026 Segregation Active
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const exceljs_1 = __importDefault(require("exceljs"));
const xlsx = __importStar(require("xlsx"));
const database_1 = require("./config/database");
const CompanyMetadata_1 = require("./models/CompanyMetadata");
const User_1 = require("./models/User");
const Role_1 = require("./models/Role");
const College_1 = require("./models/College");
const DailyTracker_1 = require("./models/DailyTracker");
const WeeklyTracker_1 = require("./models/WeeklyTracker");
const DailyLead_1 = require("./models/DailyLead");
const ReportLibrary_1 = require("./models/ReportLibrary");
const AssignedWork_1 = require("./models/AssignedWork");
const Notification_1 = require("./models/Notification");
const PendingTask_1 = require("./models/PendingTask");
const ActiveLead_1 = require("./models/ActiveLead");
const SystemSettings_1 = require("./models/SystemSettings");
const AuditLog_1 = require("./models/AuditLog");
const audit_1 = require("./lib/audit");
const mongoose_1 = __importStar(require("mongoose"));
const finalizeDailyTracker_1 = require("./jobs/finalizeDailyTracker");
const authRoutes_1 = require("./lib/authRoutes");
const activeLeadRoutes_1 = require("./lib/activeLeadRoutes");
const pendingTaskRoutes_1 = require("./lib/pendingTaskRoutes");
const seedMasterDailyLeads_1 = require("./lib/seedMasterDailyLeads");
const seedAugustAllCollegesJdReceived_1 = require("./lib/seedAugustAllCollegesJdReceived");
const seedActiveLeadsFromMasterPositives_1 = require("./lib/seedActiveLeadsFromMasterPositives");
const reloadWeeklyTracker2027_1 = require("./lib/reloadWeeklyTracker2027");
const reloadMetaDatabase_1 = require("./lib/reloadMetaDatabase");
const loadUniqueCompanies_1 = require("./lib/loadUniqueCompanies");
const exportMissingMobiles_1 = require("./lib/exportMissingMobiles");
const normalizeSerialNumbers_1 = require("./lib/normalizeSerialNumbers");
const authMiddleware_1 = require("./lib/authMiddleware");
const routePolicy_1 = require("./lib/routePolicy");
const passwordPolicy_1 = require("./lib/passwordPolicy");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
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
    'http://localhost',
    'capacitor://localhost',
    'https://localhost',
    'https://ipoms.vercel.app',
];
// Middleware stack
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin, Vercel deployments, mobile apps, or local networks
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.0.2.2')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '25mb' }));
app.use(express_1.default.urlencoded({ limit: '25mb', extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)('dev'));
// ── Shared Helpers ───────────────────────────────────────────────────────────
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// Get today's operational calendar date as midnight UTC with 6:00 AM IST cutoff
// - Between 00:00:00 and 05:59:59 IST: Active session belongs to previous day (coordinators can edit and sync).
// - At and after 06:00:00 IST: Fresh new day session starts.
function getTodayDate() {
    const now = new Date();
    // IST offset: UTC + 5 hours 30 mins
    const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffsetMs);
    const istHour = istTime.getUTCHours();
    if (istHour < 6) {
        // Before 6:00 AM IST -> still part of yesterday's active session
        istTime.setUTCDate(istTime.getUTCDate() - 1);
    }
    return new Date(Date.UTC(istTime.getUTCFullYear(), istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0, 0));
}
// Build session_date as midnight UTC for a given local date string (YYYY-MM-DD) or today
function buildSessionDate(dateStr) {
    if (dateStr) {
        return parseDateParam(dateStr);
    }
    return getTodayDate();
}
function parseDateParam(dateStr) {
    if (!dateStr)
        return getTodayDate();
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
    if (isNaN(d.getTime()))
        return getTodayDate();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
// Format duration from seconds to "01m 53s" as per spec Section 10.4
function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}
// ─────────────────────────────────────────────────────────────────────────────
// CORE INFRASTRUCTURE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
// 1. Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
    const isDbConnected = mongoose_1.default.connection.readyState === 1;
    const status = isDbConnected ? 'HEALTHY' : 'DEGRADED';
    res.status(isDbConnected ? 200 : 503).json({
        success: isDbConnected,
        status,
        service: 'iPOMS Core Backend API',
        version: '1.0.0',
        database: {
            status: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
            name: mongoose_1.default.connection.name || 'ipoms_db',
            readyState: mongoose_1.default.connection.readyState,
        },
        timestamp: new Date().toISOString(),
    });
});
// One-off data-repair tooling, not a health probe despite the name. It is
// registered here, ABOVE the `app.use('/api/v1', authenticateJWT)` mount below,
// so the global gate never sees it — hence the explicit per-route middleware.
// Without it this was an anonymous endpoint that deleted colleges on a GET.
app.get('/api/v1/health/daily-leads-diagnostics', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR'), async (req, res) => {
    try {
        // Every mutation here is now behind ?resync=true. A GET is supposed to be
        // safe to repeat; this one silently deleted the MAR/NGC colleges and
        // reassigned six companies' college_id on every call, including from a
        // browser preflight or an uptime checker.
        const resync = req.query.resync === 'true';
        if (resync) {
            await (0, seedMasterDailyLeads_1.seedMasterDailyLeads)();
            await (0, seedAugustAllCollegesJdReceived_1.seedAugustAllCollegesJdReceived)();
            await (0, seedActiveLeadsFromMasterPositives_1.seedActiveLeadsFromMasterPositives)();
        }
        let ngceCollege = await College_1.College.findOne({ college_code: 'NGCE' });
        if (!ngceCollege && resync) {
            ngceCollege = await College_1.College.create({
                college_name: 'Narayana Guru College of Engineering',
                college_code: 'NGCE',
                location: 'Kanyakumari / Coimbatore, Tamil Nadu',
                departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
                is_deleted: false,
            });
        }
        if (resync) {
            await College_1.College.deleteMany({ college_code: { $in: ['MAR', 'NGC'] } });
            if (ngceCollege) {
                await DailyLead_1.DailyLead.updateMany({ company_name: { $in: ['Merlin Automation', 'sasken', 'Avinya Infinity Solutions Pvt Ltd', 'BIBUS India', 'SSHRD GROUP', 'DEEPFACTS'] } }, { $set: { college_id: ngceCollege._id } });
            }
        }
        const augStart = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
        const preAugustCount = await DailyLead_1.DailyLead.countDocuments({ lead_date: { $lt: augStart } });
        const augustPositivesCount = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'positive', lead_date: { $gte: augStart } });
        const augustJdCount = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'jd_received', lead_date: { $gte: augStart } });
        const positives = await DailyLead_1.DailyLead.find({ lead_type: 'positive', lead_date: { $gte: augStart } })
            .populate('college_id', 'college_name college_code');
        const jds = await DailyLead_1.DailyLead.find({ lead_type: 'jd_received', lead_date: { $gte: augStart } })
            .populate('college_id', 'college_name college_code');
        const collegeBreakdown = {};
        const dateBreakdown = {};
        positives.forEach((p) => {
            const cCode = p.college_id?.college_code || 'UNKNOWN';
            collegeBreakdown[cCode] = (collegeBreakdown[cCode] || 0) + 1;
            const dStr = p.lead_date && p.lead_date instanceof Date ? p.lead_date.toISOString().split('T')[0] : (p.lead_date ? String(p.lead_date).split('T')[0] : 'UNKNOWN');
            dateBreakdown[dStr] = (dateBreakdown[dStr] || 0) + 1;
        });
        const jdCollegeBreakdown = {};
        const jdDateBreakdown = {};
        jds.forEach((j) => {
            const cCode = j.college_id?.college_code || 'UNKNOWN';
            jdCollegeBreakdown[cCode] = (jdCollegeBreakdown[cCode] || 0) + 1;
            const dStr = j.lead_date && j.lead_date instanceof Date ? j.lead_date.toISOString().split('T')[0] : (j.lead_date ? String(j.lead_date).split('T')[0] : 'UNKNOWN');
            jdDateBreakdown[dStr] = (jdDateBreakdown[dStr] || 0) + 1;
        });
        const allColleges = await College_1.College.find({ is_deleted: { $ne: true } }, 'college_code college_name');
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
    }
    catch (err) {
        console.error('❌ [Diagnostics Error]:', err);
        return res.status(200).json({ success: false, error: err.stack || err.message });
    }
});
// 2. Authentication Login Endpoint
// Auth routes (sign-in, lockout, OTP reset) live in lib/authRoutes.ts
(0, authRoutes_1.registerAuthRoutes)(app);
// ── Authentication & RBAC Middleware ──────────────────────────────────────────
// Two distinct gates, in order:
//   1. authenticateJWT  — WHO are you?   (401 if unproven)
//   2. authorizeRoute   — MAY you do it? (403 if your role is not permitted)
// Step 2 is default-deny: an endpoint with no entry in the policy table is
// refused, so a route added without a policy fails closed instead of silently
// being open to every logged-in user.
// Per-record ownership ("may you see THIS row?") is separate again — see
// scopeToSelf() at the handlers that take a coordinator_id.
app.use('/api/v1', (req, res, next) => {
    // Must stay in step with isPublic() in routePolicy.ts — an entry here skips
    // authentication, and the matching entry there skips the default-deny table.
    if (req.path === '/health' || req.path.startsWith('/auth')) {
        return next();
    }
    return (0, authMiddleware_1.authenticateJWT)(req, res, next);
});
app.use('/api/v1', routePolicy_1.authorizeRoute);
// ── Maintenance Mode Enforcement Gate ──
app.use('/api/v1', async (req, res, next) => {
    // Never block public endpoints, health checks, auth flows, or settings
    if (req.path === '/health' || req.path.startsWith('/auth') || req.path.startsWith('/settings')) {
        return next();
    }
    const user = req.user;
    if (!user)
        return next();
    // ADMINISTRATOR / ADMIN is NEVER blocked so they can fix issues and toggle maintenance off
    const isUserAdmin = (user.roles || []).some((r) => r === 'ADMINISTRATOR' || r === 'ADMIN');
    if (isUserAdmin)
        return next();
    try {
        const settings = await SystemSettings_1.SystemSettings.findOne({}).lean();
        if (!settings || !settings.maintenance_mode_enabled)
            return next();
        const now = new Date();
        const inTimeWindow = (!settings.maintenance_start_time || new Date(settings.maintenance_start_time) <= now) &&
            (!settings.maintenance_end_time || new Date(settings.maintenance_end_time) >= now);
        if (!inTimeWindow)
            return next();
        const affectedRoles = settings.maintenance_affected_roles || ['PLACEMENT_COORDINATOR', 'TEAM_LEADER'];
        const isAffected = (user.roles || []).some((r) => affectedRoles.includes(r));
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
    }
    catch {
        // If settings lookup fails, let request proceed
    }
    return next();
});
// Register Active Leads routes
(0, activeLeadRoutes_1.registerActiveLeadRoutes)(app);
// Register Pending Task routes
(0, pendingTaskRoutes_1.registerPendingTaskRoutes)(app);
// 3. High-Speed Company Search Endpoint (Searches across 3,850+ companies in < 10ms)
app.get('/api/v1/companies/search', async (req, res) => {
    try {
        const query = String(req.query.q || '').trim();
        const limit = Math.min(Number(req.query.limit) || 20, 100);
        const page = Math.max(Number(req.query.page) || 1, 1);
        const skip = (page - 1) * limit;
        const filter = { is_deleted: false };
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
            // Recent data includes all records from S.No 3548 (Crawl Corp India) upwards, including future additions
            if (!filter.serial_number) {
                filter.serial_number = { $gte: 3548 };
            }
            else {
                filter.serial_number.$gte = Math.max(filter.serial_number.$gte || 3548, 3548);
            }
        }
        // In Recent Data view, sort descending so the most recently added companies appear at the top
        const sortOrder = isRecent
            ? { serial_number: -1, _id: -1 }
            : { serial_number: 1, _id: 1 };
        const [companies, totalCount] = await Promise.all([
            CompanyMetadata_1.CompanyMetadata.find(filter)
                .sort(sortOrder)
                .skip(skip)
                .limit(limit)
                .select('serial_number company_name hr_name hr_designation primary_mobile mobile_numbers primary_email email_ids company_type location notes created_at'),
            CompanyMetadata_1.CompanyMetadata.countDocuments(filter),
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
    }
    catch (error) {
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
app.get('/api/v1/colleges', async (req, res) => {
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
        if ((await College_1.College.estimatedDocumentCount()) === 0) {
            console.log('🌱 [Colleges] Empty roster — seeding master partner colleges (first run).');
            await College_1.College.insertMany(MASTER_PARTNER_COLLEGES.map((item) => ({
                college_name: item.college_name,
                college_code: item.college_code,
                location: item.location,
                logo_url: item.logo_url,
                departments: ['CSE', 'IT', 'AI & DS', 'ECE', 'MECH'],
                status: 'active',
            })));
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
        const colleges = await College_1.College.find({ status: 'active' }).sort({ college_code: 1 });
        return res.status(200).json({
            success: true,
            data: {
                total: colleges.length,
                colleges,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve colleges' },
        });
    }
});
// List of official active partner college codes (21 active colleges)
exports.ACTIVE_COLLEGE_CODES = [
    'KARPAGAM', 'MCET', 'ACET', 'KPR', 'AIHT', 'KAMARAJ', 'NGP', 'MKCE',
    'ACEW', 'NPR', 'KIOT', 'KLU', 'SMVEC', 'DSU', 'PSNA', 'SONA',
    'MEC', 'NGCE', 'HITS', 'NEHRU', 'MAREPHRA'
];
// Helper to initialize/sync active roster on startup or demand
async function syncActiveCollegesRoster() {
    try {
        const activeRes = await College_1.College.updateMany({ college_code: { $in: exports.ACTIVE_COLLEGE_CODES } }, { $set: { status: 'active' } });
        const inactiveRes = await College_1.College.updateMany({ college_code: { $nin: exports.ACTIVE_COLLEGE_CODES } }, { $set: { status: 'inactive' } });
        console.log(`🏛️ [Colleges] Roster synchronized: active (${exports.ACTIVE_COLLEGE_CODES.length} colleges), inactive updated.`);
    }
    catch (err) {
        console.error('Failed to sync active college roster:', err);
    }
}
// ── GET /api/v1/colleges/all ────────────────────────────────────────────────
// Returns all colleges (active and inactive) for management interface
app.get('/api/v1/colleges/all', async (req, res) => {
    try {
        const colleges = await College_1.College.find({}).sort({ status: 1, college_code: 1 });
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to retrieve all colleges' },
        });
    }
});
// ── PATCH /api/v1/colleges/:id/status ────────────────────────────────────────
// Updates college active/inactive status
app.patch('/api/v1/colleges/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive', 'on_hold'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_STATUS', message: 'Status must be active, inactive, or on_hold' },
            });
        }
        const college = await College_1.College.findByIdAndUpdate(id, { status }, { new: true });
        if (!college) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'College not found' },
            });
        }
        // If marked inactive, clear from any coordinator's active weekly focus
        if (status !== 'active') {
            await User_1.User.updateMany({ weekly_focus_locked: id }, { $pull: { weekly_focus_locked: id } });
        }
        return res.status(200).json({
            success: true,
            message: `College ${college.college_code} status updated to ${status}`,
            data: { college },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update college status' },
        });
    }
});
// ── POST /api/v1/colleges/sync-roster ─────────────────────────────────────────
app.post('/api/v1/colleges/sync-roster', async (req, res) => {
    try {
        await syncActiveCollegesRoster();
        const colleges = await College_1.College.find({}).sort({ status: 1, college_code: 1 });
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to sync roster' },
        });
    }
});
/**
 * Helper to compute current week Monday key (YYYY-MM-DD)
 */
function getWeekMondayKey(d = new Date()) {
    const date = new Date(d);
    const day = date.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
}
// ── GET /api/v1/colleges/focus-matrix ──────────────────────────────────────────
// Returns all active colleges with real-time occupancy metadata (who currently handles what),
// guaranteeing zero duplication across coordinators.
app.get('/api/v1/colleges/focus-matrix', async (req, res) => {
    try {
        const currentWeekMonday = getWeekMondayKey();
        // Identify current user if authenticated
        let currentUserId = req.user?.userId || req.user?._id || null;
        if (!currentUserId) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.split(' ')[1];
                    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET || 'ipoms_secure_jwt_secret_key_2026');
                    currentUserId = decoded.userId || decoded._id || decoded.id || null;
                }
                catch { }
            }
        }
        if (!currentUserId && req.query.user_id) {
            currentUserId = String(req.query.user_id);
        }
        const [allColleges, activeCoordinators, currentUser] = await Promise.all([
            College_1.College.find({ status: 'active' }).sort({ college_code: 1 }),
            User_1.User.find({
                role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR', 'TEAM_LEADER'] },
                account_status: 'active',
                is_deleted: false,
            }).select('_id full_name official_email assigned_college_ids weekly_focus_locked weekly_focus_week_key weekly_focus_locked_at'),
            currentUserId ? User_1.User.findById(currentUserId) : null,
        ]);
        // Build map of college_id -> array of handlers (other coordinators/TLs who have locked focus)
        const collegeHandlersMap = new Map();
        for (const coord of activeCoordinators) {
            const coordIdStr = String(coord._id);
            // Skip current user (their colleges are "selected by me", not occupied by others)
            if (currentUserId && coordIdStr === String(currentUserId)) {
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
        const myAssignedCollegeIds = (currentUser?.assigned_college_ids || []).map((id) => String(id));
        const isMyFocusLocked = Boolean(currentUser?.weekly_focus_locked && currentUser?.weekly_focus_week_key === currentWeekMonday);
        const collegesWithOccupancy = allColleges.map((c) => {
            const cIdStr = String(c._id);
            const otherHandlers = collegeHandlersMap.get(cIdStr) || [];
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
    }
    catch (error) {
        console.error('❌ [Focus Matrix Error]:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch college focus matrix' },
        });
    }
});
// ── POST /api/v1/colleges/lock-focus ──────────────────────────────────────────
// Atomically validates and locks 1-4 colleges for the current coordinator,
// ensuring strict mutual exclusion (NO DUPLICATE COLLEGES ACROSS COORDINATORS).
app.post('/api/v1/colleges/lock-focus', async (req, res) => {
    try {
        const currentWeekMonday = getWeekMondayKey();
        // Identify user
        let currentUserId = req.user?.userId || req.user?._id || null;
        if (!currentUserId) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.split(' ')[1];
                    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET || 'ipoms_secure_jwt_secret_key_2026');
                    currentUserId = decoded.userId || decoded._id || decoded.id || null;
                }
                catch { }
            }
        }
        if (!currentUserId && req.body.user_id) {
            currentUserId = String(req.body.user_id);
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
                error: { code: 'VALIDATION_ERROR', message: 'Please select at least 1 partner college (Minimum 1, Maximum 4).' },
            });
        }
        if (college_ids.length > 4) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Maximum 4 colleges allowed per coordinator.' },
            });
        }
        const sanitizedIds = Array.from(new Set(college_ids.map(String))).filter((id) => mongoose_1.Types.ObjectId.isValid(id));
        if (sanitizedIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid college IDs provided.' },
            });
        }
        // Verify all selected colleges exist
        const selectedColleges = await College_1.College.find({ _id: { $in: sanitizedIds.map((id) => new mongoose_1.Types.ObjectId(id)) }, status: 'active' });
        if (selectedColleges.length !== sanitizedIds.length) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_COLLEGES', message: 'One or more selected colleges are invalid or inactive.' },
            });
        }
        // ── STRICT MUTUAL EXCLUSION CHECK ──
        // Find if ANY other active coordinator has locked ANY of these requested colleges for this week
        // ── CO-HANDLING & MUTUAL EXCLUSION CHECK ──
        // Rule 1: A minimum of 1 college must be selected, and a maximum of 4 are allowed (checked above).
        // Rule 2: At most 2 coordinators or team leaders can handle any single college.
        // Rule 3: Per coordinator / team leader, at most 1 college can be co-handled with another person.
        const otherCoordinators = await User_1.User.find({
            _id: { $ne: new mongoose_1.Types.ObjectId(currentUserId) },
            role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR', 'TEAM_LEADER'] },
            account_status: 'active',
            is_deleted: false,
            weekly_focus_locked: true,
            weekly_focus_week_key: currentWeekMonday,
        }).populate('assigned_college_ids', 'college_name college_code');
        let sharedCollegesCount = 0;
        const sharedCollegeNames = [];
        for (const reqId of sanitizedIds) {
            const otherHandlersForCollege = otherCoordinators.filter((oc) => oc.assigned_college_ids.some((c) => String(c._id) === String(reqId)));
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
        // Rule: At a time, maximum 1 college only is allowed to be co-handled per user
        if (sharedCollegesCount > 1) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'MAX_SHARED_COLLEGES_EXCEEDED',
                    message: `You have selected ${sharedCollegesCount} co-handled colleges (${sharedCollegeNames.join(', ')}). At a time, maximum 1 college only is allowed to be co-handled by 2 coordinators or team leader.`,
                },
            });
        }
        // Lock focus for the current user
        const user = await User_1.User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
            });
        }
        user.assigned_college_ids = sanitizedIds.map((id) => new mongoose_1.Types.ObjectId(id));
        user.weekly_focus_locked = true;
        user.weekly_focus_week_key = currentWeekMonday;
        user.weekly_focus_locked_at = new Date();
        await user.save();
        // Bidirectional sync on College model
        await College_1.College.updateMany({ _id: { $in: sanitizedIds.map((id) => new mongoose_1.Types.ObjectId(id)) } }, { $addToSet: { assigned_coordinator_ids: user._id } });
        await (0, audit_1.writeAudit)({
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
                is_locked: true,
                week_key: currentWeekMonday,
                locked_at: user.weekly_focus_locked_at,
            },
        });
    }
    catch (error) {
        console.error('❌ [Lock Focus Error]:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to lock college focus' },
        });
    }
});
// ── POST /api/v1/colleges/unlock-focus ────────────────────────────────────────
// Unlocks focus for the coordinator so they can modify their selections
app.post('/api/v1/colleges/unlock-focus', async (req, res) => {
    try {
        let currentUserId = req.user?.userId || req.user?._id || null;
        if (!currentUserId) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.split(' ')[1];
                    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET || 'ipoms_secure_jwt_secret_key_2026');
                    currentUserId = decoded.userId || decoded._id || decoded.id || null;
                }
                catch { }
            }
        }
        if (!currentUserId && req.body.user_id) {
            currentUserId = String(req.body.user_id);
        }
        if (!currentUserId) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required to unlock college focus.' },
            });
        }
        const user = await User_1.User.findById(currentUserId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
            });
        }
        user.weekly_focus_locked = false;
        await user.save();
        await (0, audit_1.writeAudit)({
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
    }
    catch (error) {
        console.error('❌ [Unlock Focus Error]:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to unlock college focus' },
        });
    }
});
// 5. Coordinators List Endpoint
app.get('/api/v1/coordinators', async (req, res) => {
    try {
        const coordinators = await User_1.User.find({
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
    }
    catch (error) {
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
app.get('/api/v1/daily-tracker/today', async (req, res) => {
    try {
        const college_id = req.query.college_id;
        // A coordinator is pinned to their own id regardless of what the query
        // string asks for; a Team Leader/Admin may name any coordinator. Without
        // this, every daily-tracker route trusted `coordinator_id` verbatim from
        // the client — the same IDOR class already fixed on the dashboard.
        const coordinator_id = (0, routePolicy_1.scopeToSelf)(req, req.query.coordinator_id);
        if (!coordinator_id || !college_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and college_id are required' },
            });
        }
        const today = buildSessionDate();
        const rows = await DailyTracker_1.DailyTracker.find({
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            session_date: today,
            is_finalized: false,
        }).sort({ created_at: 1 });
        // Auto-clean any unfinalized duplicate rows created in the same session
        const seenKeys = new Set();
        const uniqueRows = [];
        const duplicateIdsToDelete = [];
        for (const row of rows) {
            const key = `${row.company_id || row.company_name}_${row.mobile_number}`;
            if (seenKeys.has(key) && !row.call_start_time && !row.outcome_status) {
                duplicateIdsToDelete.push(row._id);
            }
            else {
                seenKeys.add(key);
                uniqueRows.push(row);
            }
        }
        if (duplicateIdsToDelete.length > 0) {
            await DailyTracker_1.DailyTracker.deleteMany({ _id: { $in: duplicateIdsToDelete } });
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || "Failed to load today's tracker" },
        });
    }
});
// ── DT-2: POST /api/v1/daily-tracker/load-contacts
// Bulk-create tracker rows from selected company_ids (Contact Picker)
app.post('/api/v1/daily-tracker/load-contacts', async (req, res) => {
    try {
        const { college_id, company_ids } = req.body;
        const coordinator_id = (0, routePolicy_1.scopeToSelf)(req, req.body.coordinator_id);
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
        const companies = await CompanyMetadata_1.CompanyMetadata.find({
            _id: { $in: company_ids.map((id) => new mongoose_1.Types.ObjectId(id)) },
            is_deleted: false,
        }).select('_id company_name hr_name primary_mobile primary_email');
        if (companies.length === 0) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'No valid companies found for the given IDs' },
            });
        }
        const existingRows = await DailyTracker_1.DailyTracker.find({
            coordinator_id: new mongoose_1.Types.ObjectId(coordinator_id),
            college_id: new mongoose_1.Types.ObjectId(college_id),
            session_date: today,
            is_finalized: false,
        }).select('company_id mobile_number');
        const existingMobiles = new Set(existingRows.map((r) => r.mobile_number));
        const existingCompanyIds = new Set(existingRows.map((r) => String(r.company_id)));
        const duplicates = [];
        const toInsert = [];
        for (const company of companies) {
            const isDuplicate = existingCompanyIds.has(String(company._id)) ||
                existingMobiles.has(String(company.primary_mobile || ''));
            if (isDuplicate) {
                duplicates.push(company.company_name);
                continue;
            }
            toInsert.push({
                coordinator_id: new mongoose_1.Types.ObjectId(coordinator_id),
                college_id: new mongoose_1.Types.ObjectId(college_id),
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
        let inserted = [];
        if (toInsert.length > 0) {
            inserted = await DailyTracker_1.DailyTracker.insertMany(toInsert, { ordered: false });
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to load contacts' },
        });
    }
});
// ── DT-MANUAL: POST /api/v1/daily-tracker/manual-row
// Manually add an entry directly into today's Daily Tracker
app.post('/api/v1/daily-tracker/manual-row', async (req, res) => {
    try {
        const { coordinator_id, college_id, company_name, hr_name, mobile_number, email_id, call_start_time, call_end_time, duration_seconds, outcome_status, follow_up_month, comments, session_date, } = req.body;
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
        // Find or create CompanyMetadata
        let company = await CompanyMetadata_1.CompanyMetadata.findOne({
            company_name: { $regex: new RegExp(`^${escapeRegex(company_name.trim())}$`, 'i') },
            is_deleted: false,
        });
        if (!company) {
            company = await CompanyMetadata_1.CompanyMetadata.create({
                company_name: company_name.trim(),
                hr_name: hr_name?.trim() || 'HR Contact',
                primary_mobile: mobile_number?.trim() || '',
                mobile_numbers: mobile_number ? [mobile_number.trim()] : [],
                primary_email: email_id?.trim().toLowerCase() || '',
                email_ids: email_id ? [email_id.trim().toLowerCase()] : [],
                notes: `Created via Daily Tracker manual entry on ${new Date().toLocaleDateString('en-IN')}`,
            });
        }
        const newRow = await DailyTracker_1.DailyTracker.create({
            coordinator_id: new mongoose_1.Types.ObjectId(coordinator_id),
            college_id: new mongoose_1.Types.ObjectId(college_id),
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
        if (newRow.outcome_status && newRow.company_name) {
            (0, activeLeadRoutes_1.syncLeadFromDailyTracker)({
                company_name: newRow.company_name,
                call_outcome: newRow.outcome_status,
                remarks: newRow.comments,
                coordinator_id: newRow.coordinator_id,
                college_id: newRow.college_id,
                daily_tracker_id: newRow._id,
            }).catch((e) => console.error('Auto-lead sync error on create:', e));
        }
        const enrichedRow = {
            ...(newRow.toObject ? newRow.toObject() : newRow),
            duration_formatted: newRow.duration_seconds != null ? formatDuration(newRow.duration_seconds) : null,
        };
        return res.status(201).json({
            success: true,
            message: 'Contact row added successfully',
            data: { row: enrichedRow },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to add manual contact row' },
        });
    }
});
// ── DT-3: PATCH /api/v1/daily-tracker/:id
// Auto-save a single row — start_time, outcome, comments
app.patch('/api/v1/daily-tracker/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { call_start_time, outcome_status, comments, follow_up_date, follow_up_month, company_name, hr_name, mobile_number, email_id, } = req.body;
        const row = await DailyTracker_1.DailyTracker.findById(id);
        if (!row) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Tracker row not found' },
            });
        }
        // The route policy only proves the caller is staff; it cannot know this
        // particular row belongs to them. Without this, any coordinator could
        // read or edit another coordinator's call log by guessing/enumerating ids.
        if ((0, routePolicy_1.refuseForeignOwner)(req, res, String(row.coordinator_id), 'You can only edit your own tracker rows.'))
            return;
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
                    message: 'Start Time is required before selecting Call Outcome. Press Spacebar to insert the current system time, or manually enter the Start Time.',
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
                if (follow_up_date)
                    row.follow_up_date = new Date(follow_up_date);
                if (follow_up_month !== undefined)
                    row.follow_up_month = follow_up_month || null;
            }
            else {
                // If outcome changed away from follow_up, reset follow_up_month
                row.follow_up_month = null;
                row.follow_up_date = null;
            }
        }
        else if (follow_up_month !== undefined) {
            row.follow_up_month = follow_up_month || null;
        }
        if (comments !== undefined) {
            row.comments = comments;
        }
        row.last_saved_at = new Date();
        await row.save();
        // Auto-sync into Active Leads if outcome indicates positive / hiring / follow up / invite
        if (row.outcome_status && row.company_name) {
            (0, activeLeadRoutes_1.syncLeadFromDailyTracker)({
                company_name: row.company_name,
                call_outcome: row.outcome_status,
                remarks: row.comments,
                coordinator_id: row.coordinator_id,
                college_id: row.college_id,
                daily_tracker_id: row._id,
            }).catch((e) => console.error('Auto-lead sync error:', e));
            // Auto-sync into Weekly Tracker (Companies in Pipeline) if positive outcome (invite_mail, hiring, jd_received, in_connect, drive_completed)
            const POSITIVE_WEEKLY_OUTCOMES = ['invite_mail', 'hiring', 'jd_received', 'drive_completed', 'in_connect'];
            if (POSITIVE_WEEKLY_OUTCOMES.includes(row.outcome_status)) {
                (async () => {
                    try {
                        const { startFriday, endThursday, weekNumber } = getFridayWeekBounds(row.session_date || new Date());
                        const existingWeekly = await WeeklyTracker_1.WeeklyTracker.findOne({
                            college_id: row.college_id,
                            company_name: { $regex: `^${row.company_name.trim()}$`, $options: 'i' },
                            is_deleted: false,
                        });
                        if (!existingWeekly) {
                            await WeeklyTracker_1.WeeklyTracker.create({
                                academic_year: 2026,
                                college_id: row.college_id,
                                coordinator_id: row.coordinator_id,
                                company_id: row.company_id,
                                daily_tracker_id: row._id,
                                company_name: row.company_name,
                                job_role: 'Graduate Trainee',
                                cdc_reference: '',
                                company_type: 'Software / IT',
                                ctc_lpa: '',
                                eligible_batch: '2026 Batch',
                                pipeline_section: 'pipeline',
                                current_status_text: row.comments || `Invite email sent (${(row.outcome_status || 'positive').replace(/_/g, ' ')})`,
                                follow_up_date: row.follow_up_date || null,
                                week_number: weekNumber,
                                week_start_date: startFriday,
                                week_end_date: endThursday,
                            });
                        }
                    }
                    catch (e) {
                        console.error('Auto-sync to WeeklyTracker error:', e);
                    }
                })();
            }
        }
        return res.status(200).json({
            success: true,
            message: 'Row saved',
            data: {
                ...row.toObject(),
                duration_formatted: row.duration_seconds != null ? formatDuration(row.duration_seconds) : null,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to save row' },
        });
    }
});
// ── DT-4: PATCH /api/v1/daily-tracker/:id/skip
// Skip a contact
app.patch('/api/v1/daily-tracker/:id/skip', async (req, res) => {
    try {
        const { id } = req.params;
        const row = await DailyTracker_1.DailyTracker.findById(id);
        if (!row) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Tracker row not found' },
            });
        }
        if ((0, routePolicy_1.refuseForeignOwner)(req, res, String(row.coordinator_id), 'You can only skip your own tracker rows.'))
            return;
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to skip row' },
        });
    }
});
// ── DT-4B: DELETE /api/v1/daily-tracker/:id
// Delete a contact row from today's daily tracker
app.delete('/api/v1/daily-tracker/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const row = await DailyTracker_1.DailyTracker.findById(id);
        if (!row) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Tracker row not found' },
            });
        }
        if ((0, routePolicy_1.refuseForeignOwner)(req, res, String(row.coordinator_id), 'You can only delete your own tracker rows.'))
            return;
        if (row.is_finalized) {
            return res.status(403).json({
                success: false,
                error: { code: 'FINALIZED', message: 'Cannot delete — this day is finalized' },
            });
        }
        await DailyTracker_1.DailyTracker.findByIdAndDelete(id);
        return res.status(200).json({
            success: true,
            message: `${row.company_name} removed from today's calling sheet`,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete row' },
        });
    }
});
// ── DT-5: POST /api/v1/daily-tracker/save-progress
// Manual Save Progress
app.post('/api/v1/daily-tracker/save-progress', async (req, res) => {
    try {
        const { college_id } = req.body;
        const coordinator_id = (0, routePolicy_1.scopeToSelf)(req, req.body.coordinator_id);
        if (!coordinator_id || !college_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and college_id are required' },
            });
        }
        const today = buildSessionDate();
        await DailyTracker_1.DailyTracker.updateMany({
            coordinator_id: new mongoose_1.Types.ObjectId(coordinator_id),
            college_id: new mongoose_1.Types.ObjectId(college_id),
            session_date: today,
            is_finalized: false,
        }, {
            $inc: { save_count: 1 },
            $set: { last_saved_at: new Date() },
        });
        const positiveRows = await DailyTracker_1.DailyTracker.find({
            coordinator_id: new mongoose_1.Types.ObjectId(coordinator_id),
            college_id: new mongoose_1.Types.ObjectId(college_id),
            session_date: today,
            outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES },
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to save progress' },
        });
    }
});
// ── DT-6: GET /api/v1/daily-tracker/history
// Fetch a past day's tracker in read-only mode
app.get('/api/v1/daily-tracker/history', async (req, res) => {
    try {
        const date = req.query.date;
        const coordinator_id = (0, routePolicy_1.scopeToSelf)(req, req.query.coordinator_id);
        if (!coordinator_id || !date) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and date (YYYY-MM-DD) are required' },
            });
        }
        const sessionDate = buildSessionDate(String(date));
        const parsedDate = parseDateParam(String(date));
        const yr = parsedDate.getUTCFullYear();
        const mo = parsedDate.getUTCMonth() + 1;
        const dy = parsedDate.getUTCDate();
        const startOfDay = new Date(Date.UTC(yr, mo - 1, dy, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(yr, mo - 1, dy, 23, 59, 59, 999));
        const filter = {
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            $or: [
                { session_date: sessionDate },
                { session_date: { $gte: startOfDay, $lte: endOfDay } },
                { year: yr, month: mo, day: dy },
            ],
        };
        if (req.query.college_id) {
            filter.college_id = new mongoose_1.Types.ObjectId(String(req.query.college_id));
        }
        const rows = await DailyTracker_1.DailyTracker.find(filter).sort({ serial_no: 1, created_at: 1 });
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to load history' },
        });
    }
});
// ── DT-6b: GET /api/v1/tracker/active-days and /api/v1/daily-tracker/active-days
const getActiveDaysHandler = async (req, res) => {
    try {
        const coordinator_id = (0, routePolicy_1.scopeToSelf)(req, req.query.coordinator_id);
        const year = Number(req.query.year) || new Date().getFullYear();
        const month = Number(req.query.month) || (new Date().getMonth() + 1);
        if (!coordinator_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'coordinator_id is required' },
            });
        }
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        const records = await DailyTracker_1.DailyTracker.find({
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            session_date: { $gte: startOfMonth, $lte: endOfMonth },
        }).select('session_date day');
        const daysSet = new Set();
        records.forEach((r) => {
            if (r.day) {
                daysSet.add(r.day);
            }
            else if (r.session_date) {
                daysSet.add(new Date(r.session_date).getUTCDate());
            }
        });
        return res.status(200).json({
            success: true,
            data: {
                year,
                month,
                days: Array.from(daysSet).sort((a, b) => a - b),
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch active days' },
        });
    }
};
app.get('/api/v1/tracker/active-days', getActiveDaysHandler);
app.get('/api/v1/daily-tracker/active-days', getActiveDaysHandler);
// ── DT-7: GET /api/v1/daily-tracker/kpi
// Live KPI counts for today
app.get('/api/v1/daily-tracker/kpi', async (req, res) => {
    try {
        const college_id = req.query.college_id;
        const coordinator_id = (0, routePolicy_1.scopeToSelf)(req, req.query.coordinator_id);
        if (!coordinator_id || !college_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and college_id are required' },
            });
        }
        const today = buildSessionDate();
        const baseFilter = {
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            session_date: today,
            is_finalized: false,
        };
        const [total, completed, noResponse, followUp, positive] = await Promise.all([
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, is_skipped: false }),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, outcome_status: { $ne: null }, is_skipped: false }),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, outcome_status: 'no_response', is_skipped: false }),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, outcome_status: 'follow_up', is_skipped: false }),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES }, is_skipped: false }),
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch KPI' },
        });
    }
});
// ── DT-8: GET /api/v1/daily-tracker/calendar-activity
// Calendar activity dots
app.get('/api/v1/daily-tracker/calendar-activity', async (req, res) => {
    try {
        const { year, month } = req.query;
        const coordinator_id = (0, routePolicy_1.scopeToSelf)(req, req.query.coordinator_id);
        if (!coordinator_id || !year || !month) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'coordinator_id, year, and month are required' },
            });
        }
        const activeDays = await DailyTracker_1.DailyTracker.distinct('day', {
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            year: Number(year),
            month: Number(month),
        });
        return res.status(200).json({
            success: true,
            data: {
                year: Number(year),
                month: Number(month),
                active_days: activeDays.sort((a, b) => a - b),
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch calendar activity' },
        });
    }
});
// ── DT-9: GET /api/v1/daily-tracker/pending-followups
// Fetch all scheduled follow-ups across focused colleges, time-categorized by month
app.get('/api/v1/daily-tracker/pending-followups', async (req, res) => {
    try {
        const coordinatorId = (0, routePolicy_1.scopeToSelf)(req, req.query.coordinator_id);
        const collegeIdsParam = req.query.college_ids;
        const collegeIdParam = req.query.college_id;
        const filter = {
            outcome_status: 'follow_up',
            is_deleted: { $ne: true },
        };
        if (coordinatorId) {
            filter.coordinator_id = coordinatorId;
        }
        if (collegeIdsParam) {
            const ids = collegeIdsParam.split(',').map((id) => id.trim()).filter(Boolean);
            if (ids.length > 0) {
                filter.college_id = { $in: ids };
            }
        }
        else if (collegeIdParam) {
            filter.college_id = collegeIdParam;
        }
        const rows = await DailyTracker_1.DailyTracker.find(filter)
            .populate('company_id', 'company_name hr_name phone_number email_id location domain')
            .populate('college_id', 'college_name college_code logo_url')
            .sort({ updatedAt: -1 })
            .lean();
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const currentMonthIdx = new Date().getMonth(); // 0 to 11
        const currentMonthName = monthNames[currentMonthIdx];
        const categorized = rows.map((r) => {
            const monthStr = r.follow_up_month ? String(r.follow_up_month).trim() : '';
            const targetMonthIdx = monthNames.findIndex((m) => m.toLowerCase() === monthStr.toLowerCase());
            let urgency = 'upcoming';
            if (targetMonthIdx !== -1) {
                if (targetMonthIdx === currentMonthIdx) {
                    urgency = 'due_now';
                }
                else if (targetMonthIdx < currentMonthIdx) {
                    urgency = 'overdue';
                }
                else {
                    urgency = 'upcoming';
                }
            }
            else if (monthStr) {
                urgency = 'due_now';
            }
            return {
                _id: r._id,
                company_name: r.company_id?.company_name || r.company_name || 'Unknown Company',
                hr_name: r.company_id?.hr_name || r.hr_name || '',
                phone_number: r.company_id?.phone_number || r.phone_number || '',
                email_id: r.company_id?.email_id || r.email_id || '',
                college_id: r.college_id?._id || r.college_id,
                college_name: r.college_id?.college_name || '',
                college_code: r.college_id?.college_code || '',
                college_logo: r.college_id?.logo_url || '',
                follow_up_month: monthStr || currentMonthName,
                comments: r.comments || '',
                session_date: r.session_date,
                last_called_at: r.call_start_time || r.updatedAt,
                urgency,
            };
        });
        const dueNow = categorized.filter((c) => c.urgency === 'due_now');
        const overdue = categorized.filter((c) => c.urgency === 'overdue');
        const upcoming = categorized.filter((c) => c.urgency === 'upcoming');
        return res.status(200).json({
            success: true,
            data: {
                current_month: currentMonthName,
                total_pending: categorized.length,
                due_now_count: dueNow.length,
                overdue_count: overdue.length,
                upcoming_count: upcoming.length,
                follow_ups: [...dueNow, ...overdue, ...upcoming],
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch pending follow-ups' },
        });
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// MODULE 04 — WEEKLY TRACKER ENDPOINTS
// Spec: Module_04_Weekly_Tracker_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────
// Helper: Calculate Month-bound 4-week periods (never crossing month boundaries)
function getMonthWeekBounds(offset = 0) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();
    const currentWeekInMonth = currentDate <= 7 ? 1 : currentDate <= 14 ? 2 : currentDate <= 21 ? 3 : 4;
    const currentAbsoluteWeek = (currentYear * 12 + currentMonth) * 4 + (currentWeekInMonth - 1);
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
    }
    else if (targetWeekNumber === 2) {
        startDay = 8;
        endDay = 14;
    }
    else if (targetWeekNumber === 3) {
        startDay = 15;
        endDay = 21;
    }
    else {
        startDay = 22;
        endDay = lastDayOfMonth;
    }
    const startDate = new Date(targetYear, targetMonth, startDay, 0, 0, 0, 0);
    const endDate = new Date(targetYear, targetMonth, endDay, 23, 59, 59, 999);
    return { startDate, endDate, weekNumber: targetWeekNumber, month: targetMonth, year: targetYear };
}
// Helper: Calculate Friday-to-Friday week bounds for a given date
function getFridayWeekBounds(targetDate = new Date()) {
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
app.get('/api/v1/weekly-tracker', async (req, res) => {
    try {
        const { college_id, academic_year, search, company_type, week_offset } = req.query;
        const year = academic_year && academic_year !== 'all' ? Number(academic_year) : 2027;
        const filter = {
            is_deleted: false,
        };
        if (college_id && college_id !== 'all') {
            const queryCollegeIds = [];
            if (mongoose_1.Types.ObjectId.isValid(String(college_id))) {
                queryCollegeIds.push(new mongoose_1.Types.ObjectId(String(college_id)));
                const targetCol = await College_1.College.findById(college_id);
                if (targetCol) {
                    const sameCodeCols = await College_1.College.find({
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
            }
            else {
                const foundCols = await College_1.College.find({
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
            const q = String(search).trim();
            filter.$or = [
                { company_name: { $regex: q, $options: 'i' } },
                { job_role: { $regex: q, $options: 'i' } },
                { cdc_reference: { $regex: q, $options: 'i' } },
                { current_status_text: { $regex: q, $options: 'i' } },
            ];
        }
        let rows = await WeeklyTracker_1.WeeklyTracker.find(filter)
            .sort({ follow_up_date: 1, company_name: 1 })
            .populate('coordinator_id', 'full_name official_email');
        // If 0 rows found and academic_year was specified, fallback to querying all records for that college
        if (rows.length === 0 && filter.academic_year) {
            const fallbackFilter = { ...filter };
            delete fallbackFilter.academic_year;
            rows = await WeeklyTracker_1.WeeklyTracker.find(fallbackFilter)
                .sort({ follow_up_date: 1, company_name: 1 })
                .populate('coordinator_id', 'full_name official_email');
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        // Dynamic partition into the standard operational sections
        const followUpsDueToday = [];
        const completed = [];
        const inDrive = [];
        const inProgress = [];
        const pipeline = [];
        const topCompanies = [];
        const rejectedCompanies = [];
        const onHoldByCollege = [];
        const onHoldByHr = [];
        rows.forEach((row) => {
            const r = row.toObject();
            // Top Companies override
            if (row.is_pinned_top || row.pipeline_section === 'top_companies') {
                topCompanies.push(r);
            }
            // Check for follow-up due today / overdue (excluding completed/rejected/holds)
            if (row.follow_up_date &&
                new Date(row.follow_up_date) <= todayEnd &&
                !['completed', 'rejected_companies', 'rejected_by_hr', 'on_hold_by_college', 'on_hold_by_hr', 'rejected_by_college'].includes(row.pipeline_section)) {
                followUpsDueToday.push(r);
            }
            // Primary section placement
            switch (row.pipeline_section) {
                case 'completed':
                    completed.push(r);
                    break;
                case 'in_drive':
                case 'companies_in_drive':
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
                    // Top companies are also included in top companies section
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
                    in_drive: {
                        title: 'Companies in Drive',
                        order: 2,
                        summary_metric: `${inDrive.length} Drives Scheduled & In Progress`,
                        rows: inDrive,
                    },
                    companies_in_drive: {
                        title: 'Companies in Drive',
                        order: 2,
                        summary_metric: `${inDrive.length} Drives Scheduled & In Progress`,
                        rows: inDrive,
                    },
                    in_progress: {
                        title: 'Companies In Progress',
                        order: 3,
                        summary_metric: `${inProgress.length} Active Operations • JD Received & Pipeline`,
                        rows: inProgress,
                    },
                    pipeline: {
                        title: 'Companies In Pipeline',
                        order: 4,
                        summary_metric: `${pipeline.length} Total Leads • Awaiting JD`,
                        rows: pipeline,
                    },
                    top_companies: {
                        title: 'Top Companies',
                        order: 5,
                        summary_metric: `${topCompanies.length} Priority Hiring Partners`,
                        rows: topCompanies,
                    },
                    rejected_companies: {
                        title: 'Rejected Companies',
                        order: 6,
                        summary_metric: `${rejectedCompanies.length} Employer / Process Declines`,
                        rows: rejectedCompanies,
                    },
                    on_hold_by_college: {
                        title: 'Companies On Hold By College',
                        order: 7,
                        summary_metric: `${onHoldByCollege.length} Institutional Holds`,
                        rows: onHoldByCollege,
                    },
                    on_hold_by_hr: {
                        title: 'Companies On Hold By HR',
                        order: 8,
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch weekly tracker' },
        });
    }
});
// ── WT-1K: GET /api/v1/weekly-tracker/kpi
// Live KPI counts across sections for weekly tracker
app.get('/api/v1/weekly-tracker/kpi', async (req, res) => {
    try {
        const { college_id, academic_year, week_offset } = req.query;
        const filter = { is_deleted: false };
        if (college_id && college_id !== 'all') {
            const queryCollegeIds = [];
            if (mongoose_1.Types.ObjectId.isValid(String(college_id))) {
                queryCollegeIds.push(new mongoose_1.Types.ObjectId(String(college_id)));
                const targetCol = await College_1.College.findById(college_id);
                if (targetCol) {
                    const sameCodeCols = await College_1.College.find({
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
            }
            else {
                const foundCols = await College_1.College.find({
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
        let rows = await WeeklyTracker_1.WeeklyTracker.find(filter);
        if (rows.length === 0 && filter.academic_year) {
            const fallbackFilter = { ...filter };
            delete fallbackFilter.academic_year;
            rows = await WeeklyTracker_1.WeeklyTracker.find(fallbackFilter);
        }
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const followUps = rows.filter((r) => r.follow_up_date &&
            new Date(r.follow_up_date) <= todayEnd &&
            !['completed', 'rejected_by_hr', 'rejected_by_college'].includes(r.pipeline_section)).length;
        const completed = rows.filter((r) => r.pipeline_section === 'completed').length;
        const inDrive = rows.filter((r) => r.pipeline_section === 'in_drive' || r.pipeline_section === 'companies_in_drive').length;
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
                    in_drive: inDrive,
                    in_progress: inProgress,
                    pipeline_leads: pipeline,
                    top_companies: topCompanies,
                    total_offers: totalOffers,
                    total_records: rows.length,
                },
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
// ── WT-1X: GET /api/v1/weekly-tracker/export-xlsx
// Export all 6 sections to a single-sheet styled XLSX workbook with college acronym tab name
app.get('/api/v1/weekly-tracker/export-xlsx', async (req, res) => {
    try {
        const { college_id, academic_year, search, company_type } = req.query;
        if (!college_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'college_id is required' },
            });
        }
        const college = await College_1.College.findById(college_id);
        const collegeCode = college?.college_code || 'COLLEGE';
        const collegeName = college?.college_name || 'Weekly Placement Tracker';
        const year = Number(academic_year) || 2027;
        const filter = {
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            is_deleted: false,
        };
        if (academic_year && academic_year !== 'all') {
            filter.academic_year = { $in: [Number(academic_year), String(academic_year)] };
        }
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
        let rows = await WeeklyTracker_1.WeeklyTracker.find(filter)
            .sort({ follow_up_date: 1, company_name: 1 })
            .populate('coordinator_id', 'full_name official_email');
        if (rows.length === 0 && filter.academic_year) {
            const fallbackFilter = { ...filter };
            delete fallbackFilter.academic_year;
            rows = await WeeklyTracker_1.WeeklyTracker.find(fallbackFilter)
                .sort({ follow_up_date: 1, company_name: 1 })
                .populate('coordinator_id', 'full_name official_email');
        }
        // Partition into sections
        const completed = rows.filter((r) => r.pipeline_section === 'completed');
        const inDrive = rows.filter((r) => r.pipeline_section === 'in_drive' || r.pipeline_section === 'companies_in_drive');
        const inProgress = rows.filter((r) => r.pipeline_section === 'in_progress');
        const pipeline = rows.filter((r) => r.pipeline_section === 'pipeline');
        const topCompanies = rows.filter((r) => r.is_pinned_top || r.pipeline_section === 'top_companies');
        const rejectedByHr = rows.filter((r) => r.pipeline_section === 'rejected_by_hr');
        const rejectedByCollege = rows.filter((r) => r.pipeline_section === 'rejected_by_college');
        const workbook = new exceljs_1.default.Workbook();
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
        const renderSection = (sectionTitle, sectionRows, bannerColor, extraHeaderTitle = 'Offers Released') => {
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
            }
            else {
                sectionRows.forEach((r, idx) => {
                    const rowData = sheet.addRow([
                        idx + 1,
                        r.company_name || '-',
                        r.job_role || '-',
                        r.ctc_lpa || '-',
                        r.current_status_text || '-',
                        r.pipeline_section === 'completed'
                            ? (r.selected_count !== undefined ? String(r.selected_count) : '-')
                            : (r.drive_date ? new Date(r.drive_date).toLocaleDateString('en-IN') : (r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-IN') : '-')),
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
        // 2. Companies in Drive (Indigo Banner)
        renderSection('2. COMPANIES IN DRIVE', inDrive, 'FF4338CA', 'Drive Date / Stage');
        // 3. Companies in Progress (Blue Banner)
        renderSection('3. COMPANIES IN PROGRESS', inProgress, 'FF2563EB', 'Follow-up / Drive Date');
        // 4. Companies in Pipeline (Indigo Banner)
        renderSection('4. COMPANIES IN PIPELINE', pipeline, 'FF4F46E5', 'Timeline');
        // 5. Top Companies (Amber Banner)
        renderSection('5. TOP COMPANIES', topCompanies, 'FFD97706', 'Package / Tier');
        // 6. Companies Rejected by HR (Rose / Coral Banner)
        renderSection('6. COMPANIES REJECTED BY HR', rejectedByHr, 'FFE11D48', 'Reason');
        // 7. Companies Rejected by TPO (Slate / Purple Banner)
        renderSection('7. COMPANIES REJECTED BY TPO', rejectedByCollege, 'FF64748B', 'Reason');
        // Send the XLSX buffer
        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `Weekly_Tracker_${collegeCode}_${year}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(Buffer.from(buffer));
    }
    catch (error) {
        console.error('❌ [WeeklyTracker] Export XLSX error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to export XLSX' },
        });
    }
});
// ── WT-2: POST /api/v1/weekly-tracker
// Add a recruitment drive record manually
app.post('/api/v1/weekly-tracker', async (req, res) => {
    try {
        const { college_id, coordinator_id, company_id, company_name, job_role, cdc_reference, company_type, ctc_lpa, eligible_batch, pipeline_section, current_status_text, follow_up_date, drive_date, selected_count, } = req.body;
        if (!college_id ||
            !coordinator_id ||
            !company_name?.trim() ||
            !job_role?.trim() ||
            !ctc_lpa?.trim() ||
            !current_status_text?.trim()) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Company Name, Role, CTC, and Status are mandatory fields and must be filled.',
                },
            });
        }
        // If company_id is not provided, look up or find in company_metadata
        let resolvedCompanyId = company_id;
        if (!resolvedCompanyId) {
            const existingMeta = await CompanyMetadata_1.CompanyMetadata.findOne({
                company_name: { $regex: `^${company_name.trim()}$`, $options: 'i' },
            });
            resolvedCompanyId = existingMeta?._id || new mongoose_1.Types.ObjectId();
        }
        const effectiveSection = pipeline_section === 'follow_ups_due_today' ? 'in_progress' : (pipeline_section || 'pipeline');
        const effectiveFollowUp = pipeline_section === 'follow_ups_due_today' && !follow_up_date ? new Date() : (follow_up_date ? new Date(follow_up_date) : null);
        const { startFriday, endThursday, weekNumber } = getFridayWeekBounds();
        const newDrive = await WeeklyTracker_1.WeeklyTracker.create({
            academic_year: 2026,
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            company_id: new mongoose_1.Types.ObjectId(String(resolvedCompanyId)),
            company_name: company_name.trim(),
            job_role: job_role.trim(),
            cdc_reference: cdc_reference?.trim() || '',
            company_type: company_type?.trim() || 'Software / IT',
            ctc_lpa: ctc_lpa.trim(),
            eligible_batch: eligible_batch?.trim() || '2026 Batch',
            pipeline_section: effectiveSection,
            current_status_text: current_status_text.trim(),
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create recruitment drive' },
        });
    }
});
// ── WT-3: PATCH /api/v1/weekly-tracker/:id
// Inline update of any field in a row (role, cdc, ctc, status, follow-up date, offers)
app.patch('/api/v1/weekly-tracker/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const patchData = req.body;
        const row = await WeeklyTracker_1.WeeklyTracker.findById(id);
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
                const fieldLabels = {
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
                    row[field] = patchData[field] ? new Date(patchData[field]) : null;
                }
                else {
                    row[field] = typeof patchData[field] === 'string' ? patchData[field].trim() : patchData[field];
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update weekly tracker' },
        });
    }
});
// ── WT-4: PATCH /api/v1/weekly-tracker/:id/section
// Move company between pipeline sections
app.patch('/api/v1/weekly-tracker/:id/section', async (req, res) => {
    try {
        const { id } = req.params;
        const { pipeline_section, current_status_text } = req.body;
        if (!pipeline_section || !WeeklyTracker_1.PIPELINE_SECTIONS.includes(pipeline_section)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Valid pipeline_section is required' },
            });
        }
        const row = await WeeklyTracker_1.WeeklyTracker.findById(id);
        if (!row || row.is_deleted) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Weekly tracker record not found' },
            });
        }
        row.pipeline_section = pipeline_section;
        row.is_pinned_top = pipeline_section === 'top_companies';
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to move section' },
        });
    }
});
// ── WT-5: PATCH /api/v1/weekly-tracker/:id/pin
// Toggle Top Companies pinning
app.patch('/api/v1/weekly-tracker/:id/pin', async (req, res) => {
    try {
        const { id } = req.params;
        const row = await WeeklyTracker_1.WeeklyTracker.findById(id);
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to toggle pin' },
        });
    }
});
// ── WT-6: DELETE /api/v1/weekly-tracker/:id
// Soft delete record to recycle bin
app.delete('/api/v1/weekly-tracker/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const row = await WeeklyTracker_1.WeeklyTracker.findById(id);
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete record' },
        });
    }
});
// ── WT-6B: POST /api/v1/weekly-tracker/batch-delete
app.post('/api/v1/weekly-tracker/batch-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'ids array is required' },
            });
        }
        const objectIds = ids.map((id) => new mongoose_1.Types.ObjectId(id));
        await WeeklyTracker_1.WeeklyTracker.updateMany({ _id: { $in: objectIds } }, { $set: { is_deleted: true, deleted_at: new Date() } });
        return res.status(200).json({
            success: true,
            message: `${ids.length} records moved to Recycle Bin`,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to batch delete records' },
        });
    }
});
// ── WT-7: GET /api/v1/weekly-tracker/kpi
// Live KPI counts across sections
app.get('/api/v1/weekly-tracker/kpi', async (req, res) => {
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
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            academic_year: year,
            is_deleted: false,
        };
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const [pipelineCount, inProgressCount, completedRows, topCount, rejectedHrCount, rejectedCollegeCount, followUpsDueCount,] = await Promise.all([
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'pipeline' }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'in_progress' }),
            WeeklyTracker_1.WeeklyTracker.find({ ...baseFilter, pipeline_section: 'completed' }).select('selected_count'),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...baseFilter, $or: [{ pipeline_section: 'top_companies' }, { is_pinned_top: true }] }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'rejected_by_hr' }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...baseFilter, pipeline_section: 'rejected_by_college' }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch weekly KPI' },
        });
    }
});
// ── WT-8: POST /api/v1/weekly-tracker/sync-daily-positives
// Ingest un-promoted positive outcome rows from Daily Tracker into Weekly Tracker Pipeline
app.post('/api/v1/weekly-tracker/sync-daily-positives', async (req, res) => {
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
        const positiveDailyRows = await DailyTracker_1.DailyTracker.find({
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES },
        });
        let syncedCount = 0;
        for (const dRow of positiveDailyRows) {
            // Check if already present in weekly_tracker
            const existing = await WeeklyTracker_1.WeeklyTracker.findOne({
                college_id: dRow.college_id,
                company_name: { $regex: `^${dRow.company_name.trim()}$`, $options: 'i' },
                is_deleted: false,
            });
            if (!existing) {
                await WeeklyTracker_1.WeeklyTracker.create({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to sync daily positives' },
        });
    }
});
// ── DL-0: GET /api/v1/daily-leads/diagnostics
// Verification endpoint to confirm zero pre-August data and accurate August breakdown
app.get('/api/v1/daily-leads/diagnostics', async (req, res) => {
    try {
        const augStart = new Date(Date.UTC(2026, 7, 1, 0, 0, 0, 0));
        const preAugustCount = await DailyLead_1.DailyLead.countDocuments({ lead_date: { $lt: augStart } });
        const augustPositivesCount = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'positive', lead_date: { $gte: augStart } });
        const augustJdCount = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'jd_received', lead_date: { $gte: augStart } });
        const positives = await DailyLead_1.DailyLead.find({ lead_type: 'positive', lead_date: { $gte: augStart } })
            .populate('college_id', 'college_name college_code');
        const collegeBreakdown = {};
        const dateBreakdown = {};
        positives.forEach((p) => {
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
    }
    catch (err) {
        return res.status(500).json({ success: false, error: { message: err.message } });
    }
});
// ── DL-1: GET /api/v1/daily-leads
// Fetch leads by date, optional college_id, and lead_type with search
app.get('/api/v1/daily-leads', async (req, res) => {
    try {
        const { date, college_id, lead_type, search } = req.query;
        // Only scope coordinator_id if explicitly requested; if omitted, return all leads across the team
        const requestedCoordId = req.query.coordinator_id;
        const coordinator_id = requestedCoordId && requestedCoordId !== 'all' ? (0, routePolicy_1.scopeToSelf)(req, requestedCoordId) : undefined;
        const filter = {
            is_deleted: false,
        };
        if (date && date !== 'all') {
            const targetDate = parseDateParam(String(date));
            const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
            filter.lead_date = { $gte: targetDate, $lt: nextDate };
        }
        if (college_id && college_id !== 'all') {
            filter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
        }
        if (coordinator_id && coordinator_id !== 'all') {
            filter.coordinator_id = new mongoose_1.Types.ObjectId(String(coordinator_id));
        }
        if (lead_type && DailyLead_1.LEAD_TYPES.includes(lead_type)) {
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
        // A one-off NGCE college-repair used to run here, unconditionally, on
        // every call to this endpoint — the app's busiest read. Removed 29 Aug
        // 2026: it silently reverted any manual correction a coordinator made to
        // those 6 companies' college assignment, since it reran the same
        // reassignment on every page load regardless of current state. The same
        // repair is still available, opt-in, via
        // GET /health/daily-leads-diagnostics?resync=true (administrator only).
        // Ensure master positives across all colleges are seeded
        const totalPositivesCount = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'positive', is_deleted: false });
        if (totalPositivesCount === 0) {
            await (0, seedMasterDailyLeads_1.seedMasterDailyLeads)();
        }
        const totalAugustJdCount = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'jd_received', is_deleted: false });
        if (totalAugustJdCount === 0) {
            await (0, seedAugustAllCollegesJdReceived_1.seedAugustAllCollegesJdReceived)();
        }
        const leads = await DailyLead_1.DailyLead.find(filter)
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch daily leads' },
        });
    }
});
// ── DL-2: POST /api/v1/daily-leads
// Create a new lead entry (manual or with daily_tracker copy link)
app.post('/api/v1/daily-leads', async (req, res) => {
    try {
        const { lead_type, college_id, coordinator_id, company_id, daily_tracker_id, company_name, job_role, ctc, eligible_batch, event_time, lead_date, remarks, } = req.body;
        if (!college_id || college_id === 'all' || !mongoose_1.Types.ObjectId.isValid(String(college_id))) {
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
        let resolvedCoordinatorId = coordinator_id || req.user?._id || req.user?.id;
        if (!resolvedCoordinatorId || !mongoose_1.Types.ObjectId.isValid(String(resolvedCoordinatorId))) {
            const fallbackUser = await User_1.User.findOne({ is_active: { $ne: false } });
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
        if (!resolvedCompanyId || !mongoose_1.Types.ObjectId.isValid(String(resolvedCompanyId))) {
            const existingMeta = await CompanyMetadata_1.CompanyMetadata.findOne({
                company_name: { $regex: `^${company_name.trim()}$`, $options: 'i' },
            });
            resolvedCompanyId = existingMeta?._id || new mongoose_1.Types.ObjectId();
        }
        const newLead = await DailyLead_1.DailyLead.create({
            lead_type: lead_type || 'positive',
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            coordinator_id: new mongoose_1.Types.ObjectId(String(resolvedCoordinatorId)),
            company_id: new mongoose_1.Types.ObjectId(String(resolvedCompanyId)),
            daily_tracker_id: daily_tracker_id && mongoose_1.Types.ObjectId.isValid(String(daily_tracker_id)) ? new mongoose_1.Types.ObjectId(String(daily_tracker_id)) : null,
            company_name: company_name.trim(),
            job_role: job_role?.trim() || 'Graduate Trainee',
            ctc: ctc?.trim() || '',
            eligible_batch: eligible_batch?.trim() || '2026 Batch',
            event_time: timeStr,
            lead_date: targetDate,
            remarks: remarks?.trim() || '',
        });
        const populated = await DailyLead_1.DailyLead.findById(newLead._id)
            .populate('college_id', 'college_name college_code')
            .populate('coordinator_id', 'full_name official_email');
        return res.status(201).json({
            success: true,
            message: `${lead_type === 'jd_received' ? 'JD Received' : 'Positive Lead'} recorded successfully`,
            data: populated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create daily lead' },
        });
    }
});
// ── DL-3: PATCH /api/v1/daily-leads/:id
// Inline update of lead fields
app.patch('/api/v1/daily-leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const patchData = req.body;
        const lead = await DailyLead_1.DailyLead.findById(id);
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
                lead[f] = patchData[f];
            }
        });
        if (patchData.lead_date) {
            lead.lead_date = parseDateParam(String(patchData.lead_date));
        }
        if (patchData.college_id && mongoose_1.Types.ObjectId.isValid(String(patchData.college_id))) {
            lead.college_id = new mongoose_1.Types.ObjectId(String(patchData.college_id));
        }
        await lead.save();
        const updated = await DailyLead_1.DailyLead.findById(lead._id)
            .populate('college_id', 'college_name college_code')
            .populate('coordinator_id', 'full_name official_email');
        return res.status(200).json({
            success: true,
            message: 'Daily lead updated successfully',
            data: updated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update daily lead' },
        });
    }
});
// ── DL-4: POST /api/v1/daily-leads/:id/move-to-jd
// 1-Click Move from Positives tab to JD Received tab (Spec Section 6.3 & 11)
app.post('/api/v1/daily-leads/:id/move-to-jd', async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await DailyLead_1.DailyLead.findById(id);
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
        const updated = await DailyLead_1.DailyLead.findById(lead._id)
            .populate('college_id', 'college_name college_code')
            .populate('coordinator_id', 'full_name official_email');
        return res.status(200).json({
            success: true,
            message: `${lead.company_name} successfully moved to JD Received tab`,
            data: updated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to move to JD' },
        });
    }
});
// ── DL-5: DELETE /api/v1/daily-leads/:id
// Soft delete lead record
app.delete('/api/v1/daily-leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await DailyLead_1.DailyLead.findById(id);
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete lead' },
        });
    }
});
// ── DL-6: GET /api/v1/daily-leads/summary
// Summary Strip counts: Positives count, JDs count, Active colleges count (Spec Section 7.3)
app.get('/api/v1/daily-leads/summary', async (req, res) => {
    try {
        const { date, college_id, coordinator_id } = req.query;
        const baseFilter = {
            is_deleted: false,
        };
        if (date && date !== 'all') {
            const targetDate = parseDateParam(String(date));
            const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
            baseFilter.lead_date = { $gte: targetDate, $lt: nextDate };
        }
        if (college_id && college_id !== 'all') {
            baseFilter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
        }
        if (coordinator_id && coordinator_id !== 'all') {
            baseFilter.coordinator_id = new mongoose_1.Types.ObjectId(String(coordinator_id));
        }
        const totalPositivesCount = await DailyLead_1.DailyLead.countDocuments({ lead_type: 'positive', is_deleted: false });
        if (totalPositivesCount === 0) {
            await (0, seedMasterDailyLeads_1.seedMasterDailyLeads)();
        }
        const [positivesCount, jdCount, activeColleges] = await Promise.all([
            DailyLead_1.DailyLead.countDocuments({ ...baseFilter, lead_type: 'positive' }),
            DailyLead_1.DailyLead.countDocuments({ ...baseFilter, lead_type: 'jd_received' }),
            DailyLead_1.DailyLead.distinct('college_id', baseFilter),
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch summary' },
        });
    }
});
// ── DL-7: GET /api/v1/daily-leads/daily-tracker-positives
// Fetch positive calls from Daily Tracker for the "Copy from Daily Tracker" shortcut (Spec Section 11)
app.get('/api/v1/daily-leads/daily-tracker-positives', async (req, res) => {
    try {
        const { date, college_id } = req.query;
        const requestedCoordId = req.query.coordinator_id;
        const coordinator_id = requestedCoordId && requestedCoordId !== 'all' ? (0, routePolicy_1.scopeToSelf)(req, requestedCoordId) : undefined;
        const targetDate = date ? parseDateParam(String(date)) : getTodayDate();
        const filter = {
            session_date: targetDate,
            outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES },
        };
        if (college_id && college_id !== 'all') {
            filter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
        }
        if (coordinator_id && coordinator_id !== 'all') {
            filter.coordinator_id = new mongoose_1.Types.ObjectId(String(coordinator_id));
        }
        const positives = await DailyTracker_1.DailyTracker.find(filter)
            .sort({ call_end_time: -1 })
            .populate('college_id', 'college_name college_code');
        return res.status(200).json({
            success: true,
            data: {
                total: positives.length,
                positives,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch daily tracker positives' },
        });
    }
});
// ── DL-8: POST /api/v1/daily-leads/sync-positives
// Ingest positive calls and pipeline opportunities for the given date into Daily Leads
app.post('/api/v1/daily-leads/sync-positives', async (req, res) => {
    try {
        const { date, college_id, coordinator_id } = req.body;
        const targetDate = date ? parseDateParam(String(date)) : getTodayDate();
        const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
        let syncedCount = 0;
        // 1. Pull from DailyTracker calls for this date with positive outcomes
        const dtFilter = {
            $or: [
                { session_date: { $gte: targetDate, $lt: nextDate } },
                { call_start_time: { $gte: targetDate, $lt: nextDate } },
            ],
            outcome_status: { $in: ['jd_received', 'hiring', 'drive_completed', 'invite_mail', 'in_connect', 'follow_up'] },
        };
        if (college_id && college_id !== 'all' && mongoose_1.Types.ObjectId.isValid(String(college_id))) {
            dtFilter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
        }
        const positiveCalls = await DailyTracker_1.DailyTracker.find(dtFilter);
        for (const call of positiveCalls) {
            if (!call.company_name || !call.company_name.trim())
                continue;
            const leadType = call.outcome_status === 'jd_received' ? 'jd_received' : 'positive';
            const escapedCompanyName = call.company_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existing = await DailyLead_1.DailyLead.findOne({
                company_name: { $regex: `^${escapedCompanyName}$`, $options: 'i' },
                lead_date: { $gte: targetDate, $lt: nextDate },
                lead_type: leadType,
                is_deleted: false,
            });
            // Extract accurate call start time from Daily Tracker Time column
            let callTime = '10:00 AM';
            const timeSource = call.call_start_time || call.created_at;
            if (timeSource) {
                const d = new Date(timeSource);
                if (!isNaN(d.getTime())) {
                    callTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
            }
            if (!existing) {
                await DailyLead_1.DailyLead.create({
                    lead_type: leadType,
                    college_id: call.college_id,
                    coordinator_id: call.coordinator_id || (coordinator_id && mongoose_1.Types.ObjectId.isValid(String(coordinator_id)) ? new mongoose_1.Types.ObjectId(String(coordinator_id)) : new mongoose_1.Types.ObjectId('6a847199fa3bf51271bc14eb')),
                    company_id: call.company_id || null,
                    daily_tracker_id: call._id,
                    company_name: call.company_name.trim(),
                    job_role: 'Graduate Trainee',
                    ctc: '',
                    eligible_batch: '2026 Batch',
                    event_time: callTime,
                    lead_date: targetDate,
                    remarks: call.comments || `From Daily Tracker: ${(call.outcome_status || '').replace(/_/g, ' ')}`,
                    is_deleted: false,
                });
                syncedCount++;
            }
        }
        // 2. Pull from WeeklyTracker pipeline items that have follow_up_date or drive_date or updated for this date
        const wtFilter = {
            is_deleted: false,
            $or: [
                { follow_up_date: { $gte: targetDate, $lt: nextDate } },
                { drive_date: { $gte: targetDate, $lt: nextDate } },
                { created_at: { $gte: targetDate, $lt: nextDate } },
                { last_status_updated_at: { $gte: targetDate, $lt: nextDate } },
            ],
        };
        if (college_id && college_id !== 'all' && mongoose_1.Types.ObjectId.isValid(String(college_id))) {
            wtFilter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
        }
        const pipelineRows = await WeeklyTracker_1.WeeklyTracker.find(wtFilter);
        for (const wt of pipelineRows) {
            if (!wt.company_name || !wt.company_name.trim())
                continue;
            const escapedWtCompany = wt.company_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existing = await DailyLead_1.DailyLead.findOne({
                company_name: { $regex: `^${escapedWtCompany}$`, $options: 'i' },
                lead_date: { $gte: targetDate, $lt: nextDate },
                lead_type: 'positive',
                is_deleted: false,
            });
            let wtTime = '10:00 AM';
            if (wt.daily_tracker_id) {
                const dtRow = await DailyTracker_1.DailyTracker.findById(wt.daily_tracker_id);
                const timeRef = dtRow?.call_start_time || dtRow?.created_at;
                if (timeRef) {
                    const d = new Date(timeRef);
                    if (!isNaN(d.getTime())) {
                        wtTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                    }
                }
            }
            else if (wt.created_at) {
                const d = new Date(wt.created_at);
                if (!isNaN(d.getTime())) {
                    wtTime = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                }
            }
            if (!existing) {
                await DailyLead_1.DailyLead.create({
                    lead_type: 'positive',
                    college_id: wt.college_id,
                    coordinator_id: wt.coordinator_id || (coordinator_id && mongoose_1.Types.ObjectId.isValid(String(coordinator_id)) ? new mongoose_1.Types.ObjectId(String(coordinator_id)) : new mongoose_1.Types.ObjectId('6a847199fa3bf51271bc14eb')),
                    company_id: wt.company_id || null,
                    company_name: wt.company_name.trim(),
                    job_role: wt.job_role || 'Graduate Trainee',
                    ctc: wt.ctc_lpa || '',
                    eligible_batch: wt.eligible_batch || '2026 Batch',
                    event_time: wtTime,
                    lead_date: targetDate,
                    remarks: wt.current_status_text || `Pipeline: ${wt.pipeline_section.replace(/_/g, ' ')}`,
                    is_deleted: false,
                });
                syncedCount++;
            }
        }
        return res.status(200).json({
            success: true,
            message: syncedCount > 0
                ? `Successfully synced ${syncedCount} positive lead(s) for ${date || 'today'}`
                : `All positive pipeline leads for ${date || 'today'} are already up to date`,
            data: {
                synced_count: syncedCount,
                date: targetDate,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to sync positive leads' },
        });
    }
});
// ── DL-9: POST /api/v1/daily-leads/copy-to-jd
// Copies a selected positive company (or positive leads) across all selected target colleges into JD Received
app.post('/api/v1/daily-leads/copy-to-jd', async (req, res) => {
    try {
        const { date, company_name, college_ids, lead_id, job_role, ctc, eligible_batch, event_time } = req.body;
        const targetDate = date ? parseDateParam(String(date)) : getTodayDate();
        const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
        // 1. Single Company Multi-College Copying Flow
        if (company_name && Array.isArray(college_ids) && college_ids.length > 0) {
            const escapedCompanyName = company_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Find source positive lead for metadata reference
            let sourceLead = null;
            if (lead_id && mongoose_1.Types.ObjectId.isValid(lead_id)) {
                sourceLead = await DailyLead_1.DailyLead.findById(lead_id);
            }
            if (!sourceLead) {
                sourceLead = await DailyLead_1.DailyLead.findOne({
                    company_name: { $regex: `^${escapedCompanyName}$`, $options: 'i' },
                    lead_type: 'positive',
                    lead_date: { $gte: targetDate, $lt: nextDate },
                    is_deleted: false,
                });
            }
            const roleToUse = job_role || sourceLead?.job_role || 'Graduate Trainee';
            const ctcToUse = ctc !== undefined ? ctc : (sourceLead?.ctc || '');
            const batchToUse = eligible_batch || sourceLead?.eligible_batch || '2026 Batch';
            const timeToUse = event_time || sourceLead?.event_time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            const validCollegeIds = college_ids
                .filter((id) => mongoose_1.Types.ObjectId.isValid(id))
                .map((id) => new mongoose_1.Types.ObjectId(id));
            let copiedCount = 0;
            for (const targetCollegeId of validCollegeIds) {
                // Check if already present in JD Received for this college & date
                const existing = await DailyLead_1.DailyLead.findOne({
                    lead_type: 'jd_received',
                    college_id: targetCollegeId,
                    company_name: { $regex: `^${escapedCompanyName}$`, $options: 'i' },
                    lead_date: { $gte: targetDate, $lt: nextDate },
                    is_deleted: false,
                });
                if (!existing) {
                    await DailyLead_1.DailyLead.create({
                        lead_type: 'jd_received',
                        college_id: targetCollegeId,
                        coordinator_id: sourceLead?.coordinator_id || req.user?._id || new mongoose_1.Types.ObjectId('6a847199fa3bf51271bc14eb'),
                        company_id: sourceLead?.company_id || null,
                        daily_tracker_id: sourceLead?.daily_tracker_id || null,
                        company_name: company_name.trim(),
                        job_role: roleToUse,
                        ctc: ctcToUse,
                        eligible_batch: batchToUse,
                        event_time: timeToUse,
                        lead_date: targetDate,
                        remarks: 'JD Received copied from Positives',
                        is_jd_received: true,
                        is_deleted: false,
                    });
                    copiedCount++;
                }
            }
            return res.status(200).json({
                success: true,
                message: copiedCount > 0
                    ? `Successfully copied "${company_name}" to ${copiedCount} college(s) in JD Received`
                    : `"${company_name}" is already present in JD Received for all selected colleges`,
                data: {
                    copied_count: copiedCount,
                    total_colleges_selected: validCollegeIds.length,
                    company_name,
                },
            });
        }
        // 2. Fallback: Bulk copy all positive leads matching college_ids
        const filter = {
            lead_type: 'positive',
            lead_date: { $gte: targetDate, $lt: nextDate },
            is_deleted: false,
        };
        if (Array.isArray(college_ids) && college_ids.length > 0 && !college_ids.includes('all')) {
            const validCollegeIds = college_ids
                .filter((id) => mongoose_1.Types.ObjectId.isValid(id))
                .map((id) => new mongoose_1.Types.ObjectId(id));
            if (validCollegeIds.length > 0) {
                filter.college_id = { $in: validCollegeIds };
            }
        }
        const positiveLeads = await DailyLead_1.DailyLead.find(filter);
        let copiedCount = 0;
        for (const lead of positiveLeads) {
            const escapedLeadName = lead.company_name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const existing = await DailyLead_1.DailyLead.findOne({
                lead_type: 'jd_received',
                college_id: lead.college_id,
                company_name: { $regex: `^${escapedLeadName}$`, $options: 'i' },
                lead_date: { $gte: targetDate, $lt: nextDate },
                is_deleted: false,
            });
            if (!existing) {
                await DailyLead_1.DailyLead.create({
                    lead_type: 'jd_received',
                    college_id: lead.college_id,
                    coordinator_id: lead.coordinator_id,
                    company_id: lead.company_id,
                    daily_tracker_id: lead.daily_tracker_id,
                    company_name: lead.company_name,
                    job_role: lead.job_role || 'Graduate Trainee',
                    ctc: lead.ctc || '',
                    eligible_batch: lead.eligible_batch || '2026 Batch',
                    event_time: lead.event_time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    lead_date: lead.lead_date || targetDate,
                    remarks: lead.remarks || 'Copied from Positives',
                    is_jd_received: true,
                    is_deleted: false,
                });
                copiedCount++;
            }
        }
        return res.status(200).json({
            success: true,
            message: copiedCount > 0
                ? `Successfully copied ${copiedCount} lead(s) to JD Received`
                : positiveLeads.length === 0
                    ? `No positive leads found on ${date || 'today'}`
                    : `Selected positive leads are already present in JD Received`,
            data: {
                copied_count: copiedCount,
                total_positives_found: positiveLeads.length,
            },
        });
    }
    catch (error) {
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
app.get('/api/v1/analytics/overview', async (req, res) => {
    try {
        const { college_id, coordinator_id, academic_year = '2026' } = req.query;
        const baseDtFilter = {};
        const baseWtFilter = { academic_year, is_deleted: false };
        const baseDlFilter = { is_deleted: false };
        if (college_id && college_id !== 'all') {
            const cId = new mongoose_1.Types.ObjectId(String(college_id));
            baseDtFilter.college_id = cId;
            baseWtFilter.college_id = cId;
            baseDlFilter.college_id = cId;
        }
        if (coordinator_id) {
            const uId = new mongoose_1.Types.ObjectId(String(coordinator_id));
            baseDtFilter.coordinator_id = uId;
            baseWtFilter.coordinator_id = uId;
            baseDlFilter.coordinator_id = uId;
        }
        // Parallel metric queries across M03, M04, M05
        const [totalCalls, positiveCalls, distinctCompaniesContacted, activeColleges, drivesCompleted, drivesInProgress, drivesPipeline, offersAgg, totalJdsReceived, followUpsDue,] = await Promise.all([
            DailyTracker_1.DailyTracker.countDocuments(baseDtFilter),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseDtFilter, outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES } }),
            DailyTracker_1.DailyTracker.distinct('company_name', baseDtFilter),
            DailyTracker_1.DailyTracker.distinct('college_id', baseDtFilter),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...baseWtFilter, pipeline_section: 'completed' }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...baseWtFilter, pipeline_section: 'in_progress' }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...baseWtFilter, pipeline_section: 'pipeline' }),
            WeeklyTracker_1.WeeklyTracker.aggregate([
                { $match: { ...baseWtFilter, pipeline_section: 'completed' } },
                { $group: { _id: null, totalOffers: { $sum: '$selected_count' } } },
            ]),
            DailyLead_1.DailyLead.countDocuments({ ...baseDlFilter, lead_type: 'jd_received' }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch analytics overview' },
        });
    }
});
// ── RA-2: GET /api/v1/analytics/comparisons
// Period and College comparative metrics (Spec Section 7.3)
app.get('/api/v1/analytics/comparisons', async (req, res) => {
    try {
        const { academic_year = '2026' } = req.query;
        const colleges = await College_1.College.find({ status: 'active' }).limit(10);
        // Calculate per-college breakdown
        const collegeComparisons = await Promise.all(colleges.map(async (c) => {
            const [calls, positives, drives, offers] = await Promise.all([
                DailyTracker_1.DailyTracker.countDocuments({ college_id: c._id }),
                DailyTracker_1.DailyTracker.countDocuments({ college_id: c._id, outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES } }),
                WeeklyTracker_1.WeeklyTracker.countDocuments({ college_id: c._id, academic_year, is_deleted: false, pipeline_section: 'completed' }),
                WeeklyTracker_1.WeeklyTracker.aggregate([
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
        }));
        return res.status(200).json({
            success: true,
            data: {
                college_comparisons: collegeComparisons,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch comparisons' },
        });
    }
});
// ── RA-3: GET /api/v1/analytics/company-responsiveness
// Company Responsiveness Rankings & Follow-up status (Spec Section 7.4)
app.get('/api/v1/analytics/company-responsiveness', async (req, res) => {
    try {
        const { college_id, academic_year = '2026' } = req.query;
        const wtFilter = { academic_year, is_deleted: false };
        if (college_id && college_id !== 'all') {
            wtFilter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
        }
        // Fetch top hiring companies from WeeklyTracker
        const topCompanies = await WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, is_pinned_top: true })
            .sort({ created_at: -1 })
            .limit(10)
            .populate('college_id', 'college_name college_code');
        // Fetch pending follow-ups
        const pendingFollowUps = await WeeklyTracker_1.WeeklyTracker.find({
            ...wtFilter,
            follow_up_date: { $exists: true, $ne: null },
        })
            .sort({ follow_up_date: 1 })
            .limit(15)
            .populate('college_id', 'college_name college_code');
        // Industry / Company Type breakdown
        const companyTypes = await WeeklyTracker_1.WeeklyTracker.aggregate([
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch company responsiveness' },
        });
    }
});
// ── RA-4: GET /api/v1/reports/templates
// Returns the 3 Standardized Report Templates (Spec Section 8.3)
app.get('/api/v1/reports/templates', (req, res) => {
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
    ];
    return res.status(200).json({
        success: true,
        data: { templates },
    });
});
// ── RA-5: POST /api/v1/reports/generate
// Dynamic Report Generator reading live from M03, M04, and M05 (Spec Section 9.7 & 10.3)
app.post('/api/v1/reports/generate', async (req, res) => {
    try {
        const { template_type = 'weekly_placement', college_id, coordinator_id, academic_year = 'all', date_from, date_to, week_label = 'Week 3: 21 Aug - 27 Aug 2026', theme = 'blue', included_sections, included_kpi_cards, kpi_cards, custom_remarks, lead_sources, include_prepared_by, prepared_by, active_leads_columns, } = req.body;
        if (template_type !== 'active_leads') {
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
        let targetCollege = null;
        if (college_id && college_id !== 'all') {
            if (mongoose_1.Types.ObjectId.isValid(String(college_id))) {
                targetCollege = await College_1.College.findById(college_id);
            }
            if (!targetCollege) {
                targetCollege = await College_1.College.findOne({
                    $or: [
                        { college_code: String(college_id).toUpperCase() },
                        { college_name: String(college_id) },
                    ],
                });
            }
        }
        let coordinator = null;
        if (coordinator_id) {
            if (mongoose_1.Types.ObjectId.isValid(String(coordinator_id))) {
                coordinator = await User_1.User.findById(coordinator_id);
            }
            if (!coordinator) {
                coordinator = await User_1.User.findOne({
                    $or: [
                        { email: String(coordinator_id) },
                        { full_name: String(coordinator_id) },
                    ],
                });
            }
        }
        if (!coordinator && req.user) {
            coordinator = req.user;
        }
        if (!coordinator && targetCollege?._id) {
            coordinator = await User_1.User.findOne({
                assigned_college_ids: targetCollege._id,
                is_active: { $ne: false },
            });
        }
        // ── CASE 1: PENDING TASKS REPORT ───────────────────────────────────────────
        if (template_type === 'pending_tasks') {
            const ptFilter = { is_deleted: { $ne: true } };
            if (college_id && college_id !== 'all') {
                const queryIds = [];
                if (mongoose_1.Types.ObjectId.isValid(String(college_id))) {
                    queryIds.push(new mongoose_1.Types.ObjectId(String(college_id)));
                }
                if (targetCollege?._id) {
                    queryIds.push(targetCollege._id);
                }
                queryIds.push(String(college_id));
                ptFilter.college_id = { $in: queryIds };
            }
            const pendingTasks = await PendingTask_1.PendingTask.find(ptFilter).sort({ serial_no: 1, created_at: -1 });
            const dbSharedCount = pendingTasks.filter((t) => t.current_status === 'Database Shared' || t.db_shared_status === 'Shared').length;
            const dbPendingCount = pendingTasks.filter((t) => t.current_status === 'Database Pending' || t.db_shared_status === 'Pending').length;
            const drivesScheduled = pendingTasks.filter((t) => t.current_status === 'Drive Scheduled' || (t.drive_date && t.current_status !== 'Drive Completed')).length;
            const drivesInProgress = pendingTasks.filter((t) => t.current_status === 'Drive in Progress').length;
            const drivesCompleted = pendingTasks.filter((t) => t.current_status === 'Drive Completed').length;
            const awaitingTpo = pendingTasks.filter((t) => t.current_status === 'Awaiting TPO Approval').length;
            const awaitingHr = pendingTasks.filter((t) => t.current_status === 'Awaiting HR Approval').length;
            const jdReceived = pendingTasks.filter((t) => t.current_status === 'JD Received' || t.jd_received_date).length;
            const reportDocument = {
                template_type: 'pending_tasks',
                report_title: 'Pending task placement report',
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
                    college_logo: targetCollege?.logo_url || null,
                    confidential_notice: 'Prepared by Infoziant',
                },
                sections: {
                    pending_tasks: pendingTasks.map((t, idx) => ({
                        s_no: t.serial_no || idx + 1,
                        company_name: t.company_name,
                        jd_received_date: t.jd_received_date ? new Date(t.jd_received_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
                        db_shared_date: t.db_shared_date ? new Date(t.db_shared_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
                        current_status: t.current_status || 'Database Pending',
                        action_to_be_taken: t.action_to_be_taken || '',
                        drive_date: t.drive_date ? new Date(t.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
                        remarks: t.remarks || '',
                    })),
                },
                remarks: custom_remarks || 'All pending action items are actively tracked with institutions and corporate HRs for prompt closure.',
                included_sections: included_sections || {
                    pending_tasks: true,
                    remarks: true,
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
            const hasSpecificBatch = academic_year && academic_year !== 'all' && String(academic_year).trim() !== '';
            const selectedBatch = hasSpecificBatch ? String(academic_year).trim() : '';
            // Stream selection options: jd_received (Hot), positives (Warm), weekly_tracker (Pipeline/In Progress)
            const leadSources = req.body.lead_sources || {
                jd_received: true,
                positives: true,
                weekly_tracker: true,
            };
            const normalizeCompanyName = (name) => {
                return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
            };
            // Pre-fetch all ACTIVE colleges to map college_id to college_code
            const activeColleges = await College_1.College.find({ status: 'active' }).lean();
            const activeCollegeIds = new Set(activeColleges.map((c) => String(c._id)));
            const activeCollegeObjectIds = Array.from(activeCollegeIds).map((id) => new mongoose_1.Types.ObjectId(id));
            const collegeCodeMap = new Map();
            for (const col of activeColleges) {
                collegeCodeMap.set(String(col._id), col.college_code || col.college_name || '');
            }
            // Map normalized company name -> Set of college codes
            const companyCollegesMap = new Map();
            const addCompanyCollege = (rawName, collegeId) => {
                const norm = normalizeCompanyName(rawName);
                if (!norm)
                    return;
                if (!collegeId || !activeCollegeIds.has(String(collegeId)))
                    return; // STRICTLY ACTIVE COLLEGES ONLY
                const code = collegeCodeMap.get(String(collegeId));
                if (code) {
                    if (!companyCollegesMap.has(norm)) {
                        companyCollegesMap.set(norm, new Set());
                    }
                    companyCollegesMap.get(norm).add(code);
                }
            };
            // 1. Populate colleges from all DailyLead (both jd_received and positive)
            const allDailyLeadsForColleges = await DailyLead_1.DailyLead.find({ is_deleted: false }).select('company_name college_id lead_type').lean();
            for (const dl of allDailyLeadsForColleges) {
                addCompanyCollege(dl.company_name, dl.college_id);
            }
            // 2. Also populate colleges from WeeklyTracker
            const allWeeklyTrackersForColleges = await WeeklyTracker_1.WeeklyTracker.find({ is_deleted: false }).select('company_name college_id pipeline_section').lean();
            for (const wt of allWeeklyTrackersForColleges) {
                addCompanyCollege(wt.company_name, wt.college_id);
            }
            const companyMap = new Map();
            // Pre-fetch all companies that have reached JD Received stage in active colleges
            const allJdLeads = await DailyLead_1.DailyLead.find({
                lead_type: 'jd_received',
                is_deleted: false,
                college_id: { $in: activeCollegeObjectIds },
            });
            const allJdCompanyKeys = new Set(allJdLeads.map((j) => normalizeCompanyName(j.company_name)).filter(Boolean));
            // 1. Hot Leads: JD Received (Highest Priority — Final Box of Hot Leads)
            if (leadSources.jd_received) {
                const jdFilter = { lead_type: 'jd_received', is_deleted: false };
                if (college_id && college_id !== 'all') {
                    const cId = mongoose_1.Types.ObjectId.isValid(String(college_id)) ? new mongoose_1.Types.ObjectId(String(college_id)) : college_id;
                    jdFilter.college_id = { $in: [cId, String(college_id)] };
                }
                else {
                    jdFilter.college_id = { $in: activeCollegeObjectIds };
                }
                if (hasSpecificBatch) {
                    jdFilter.eligible_batch = { $regex: new RegExp(escapeRegex(selectedBatch), 'i') };
                }
                let jdRows = await DailyLead_1.DailyLead.find(jdFilter).sort({ createdAt: -1 });
                if (jdRows.length === 0 && college_id && college_id !== 'all') {
                    delete jdFilter.college_id;
                    jdFilter.college_id = { $in: activeCollegeObjectIds };
                    jdRows = await DailyLead_1.DailyLead.find(jdFilter).sort({ createdAt: -1 });
                }
                for (const r of jdRows) {
                    const raw = (r.company_name || '').trim();
                    if (!raw)
                        continue;
                    const key = normalizeCompanyName(raw);
                    const collegesSet = companyCollegesMap.get(key);
                    const collegesStr = collegesSet && collegesSet.size > 0 ? Array.from(collegesSet).sort().join(', ') : '—';
                    if (!companyMap.has(key)) {
                        companyMap.set(key, {
                            company_name: raw,
                            colleges: collegesStr,
                            role: (r.job_role || '').trim() || 'Graduate Trainee',
                            ctc: (r.ctc || '').trim() || 'Competitive',
                            source: 'jd_received',
                            tier: 'Hot Lead (JD Received)',
                            tier_badge: '🔥 Hot (JD)',
                        });
                    }
                }
            }
            // 2. Warm Leads: Positives (Subtract any company that has already given a JD)
            if (leadSources.positives) {
                const posFilter = { lead_type: 'positive', is_deleted: false };
                if (college_id && college_id !== 'all') {
                    const cId = mongoose_1.Types.ObjectId.isValid(String(college_id)) ? new mongoose_1.Types.ObjectId(String(college_id)) : college_id;
                    posFilter.college_id = { $in: [cId, String(college_id)] };
                }
                else {
                    posFilter.college_id = { $in: activeCollegeObjectIds };
                }
                if (hasSpecificBatch) {
                    posFilter.eligible_batch = { $regex: new RegExp(escapeRegex(selectedBatch), 'i') };
                }
                let posRows = await DailyLead_1.DailyLead.find(posFilter).sort({ createdAt: -1 });
                if (posRows.length === 0 && college_id && college_id !== 'all') {
                    delete posFilter.college_id;
                    posFilter.college_id = { $in: activeCollegeObjectIds };
                    posRows = await DailyLead_1.DailyLead.find(posFilter).sort({ createdAt: -1 });
                }
                for (const r of posRows) {
                    const raw = (r.company_name || '').trim();
                    if (!raw)
                        continue;
                    const key = normalizeCompanyName(raw);
                    // Rule: If company is in the JD Received final box, minus it from Positives
                    if (allJdCompanyKeys.has(key))
                        continue;
                    const collegesSet = companyCollegesMap.get(key);
                    const collegesStr = collegesSet && collegesSet.size > 0 ? Array.from(collegesSet).sort().join(', ') : '—';
                    if (!companyMap.has(key)) {
                        companyMap.set(key, {
                            company_name: raw,
                            colleges: collegesStr,
                            role: (r.job_role || '').trim() || 'Graduate Trainee',
                            ctc: (r.ctc || '').trim() || 'Competitive',
                            source: 'positives',
                            tier: 'Warm Lead (Positive)',
                            tier_badge: '⚡ Positive',
                        });
                    }
                }
            }
            // 3. Operational Leads: Weekly Tracker (In-Progress & Pipeline)
            if (leadSources.weekly_tracker) {
                const wtFilter = {
                    pipeline_section: { $in: ['in_progress', 'pipeline'] },
                    is_deleted: false,
                };
                if (college_id && college_id !== 'all') {
                    const cId = mongoose_1.Types.ObjectId.isValid(String(college_id)) ? new mongoose_1.Types.ObjectId(String(college_id)) : college_id;
                    wtFilter.college_id = { $in: [cId, String(college_id)] };
                }
                else {
                    wtFilter.college_id = { $in: activeCollegeObjectIds };
                }
                if (hasSpecificBatch) {
                    wtFilter.academic_year = { $in: [selectedBatch, Number(selectedBatch)] };
                }
                let wtRows = await WeeklyTracker_1.WeeklyTracker.find(wtFilter).sort({ createdAt: -1 });
                if (wtRows.length === 0 && college_id && college_id !== 'all') {
                    delete wtFilter.college_id;
                    wtFilter.college_id = { $in: activeCollegeObjectIds };
                    wtRows = await WeeklyTracker_1.WeeklyTracker.find(wtFilter).sort({ createdAt: -1 });
                }
                for (const r of wtRows) {
                    const raw = (r.company_name || '').trim();
                    if (!raw)
                        continue;
                    const key = normalizeCompanyName(raw);
                    const collegesSet = companyCollegesMap.get(key);
                    const collegesStr = collegesSet && collegesSet.size > 0 ? Array.from(collegesSet).sort().join(', ') : '—';
                    if (!companyMap.has(key)) {
                        companyMap.set(key, {
                            company_name: raw,
                            colleges: collegesStr,
                            role: (r.job_role || '').trim() || 'Graduate Trainee',
                            ctc: (r.ctc_lpa || r.salary_package || '').trim() || 'Competitive',
                            source: 'weekly_tracker',
                            tier: r.pipeline_section === 'in_progress' ? 'In-Progress' : 'Pipeline',
                            tier_badge: r.pipeline_section === 'in_progress' ? '📌 In Progress' : '📋 Pipeline',
                        });
                    }
                }
            }
            // Fallback: If companyMap is still empty, fall back to ActiveLead collection
            if (companyMap.size === 0) {
                const alFilter = { is_deleted: { $ne: true } };
                if (hasSpecificBatch) {
                    alFilter.academic_year = { $in: [selectedBatch, Number(selectedBatch)] };
                }
                const fallbackLeads = await ActiveLead_1.ActiveLead.find(alFilter).sort({ company_name: 1 });
                for (const al of fallbackLeads) {
                    const raw = (al.company_name || '').trim();
                    if (!raw)
                        continue;
                    const key = normalizeCompanyName(raw);
                    const collegesSet = companyCollegesMap.get(key);
                    const collegesStr = collegesSet && collegesSet.size > 0 ? Array.from(collegesSet).sort().join(', ') : '—';
                    if (!companyMap.has(key)) {
                        companyMap.set(key, {
                            company_name: raw,
                            colleges: collegesStr,
                            role: (al.role || '').trim() || 'Graduate Trainee',
                            ctc: (al.ctc || '').trim() || 'Competitive',
                            source: 'positives',
                            tier: 'Active Corporate Lead',
                            tier_badge: '⚡ Active',
                        });
                    }
                }
            }
            // Determine titles and labels based on selected streams
            const isOnlyJd = leadSources.jd_received && !leadSources.positives && !leadSources.weekly_tracker;
            const isOnlyPos = !leadSources.jd_received && leadSources.positives && !leadSources.weekly_tracker;
            const isOnlyWt = !leadSources.jd_received && !leadSources.positives && leadSources.weekly_tracker;
            let dynamicTitle = 'Active Leads Pipeline Report';
            let tierFocusLabel = 'Consolidated (JD Received • Positives • Weekly Pipeline)';
            if (isOnlyJd) {
                dynamicTitle = hasSpecificBatch
                    ? `Hot Leads (JD Received) — ${selectedBatch}`
                    : `Hot Leads (JD Received)`;
                tierFocusLabel = 'Hot Leads (JD Received)';
            }
            else if (isOnlyPos) {
                dynamicTitle = hasSpecificBatch
                    ? `Positive Leads — ${selectedBatch}`
                    : `Positive Leads`;
                tierFocusLabel = 'Positive Leads';
            }
            else if (isOnlyWt) {
                dynamicTitle = hasSpecificBatch
                    ? `Weekly Tracker Pipeline — ${selectedBatch}`
                    : `Weekly Tracker Pipeline`;
                tierFocusLabel = 'Weekly Tracker Pipeline';
            }
            else if (hasSpecificBatch) {
                dynamicTitle = `Active Leads Pipeline Report — ${selectedBatch}`;
            }
            const activeLeadsList = Array.from(companyMap.values()).sort((a, b) => a.company_name.localeCompare(b.company_name));
            const countJd = activeLeadsList.filter(l => l.source === 'jd_received').length;
            const countPos = activeLeadsList.filter(l => l.source === 'positives').length;
            const countWt = activeLeadsList.filter(l => l.source === 'weekly_tracker').length;
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
                    company_logo: '/infoziant-logo.png',
                    college_name: targetCollege?.college_name || '',
                    college_code: targetCollege?.college_code || 'iPOMS',
                    college_logo: targetCollege?.college_website ? `https://logo.clearbit.com/${targetCollege.college_website.replace(/https?:\/\//, '')}` : null,
                    confidential_notice: 'Prepared by Infoziant',
                },
                kpi_summary: {
                    total_leads: activeLeadsList.length,
                    graduating_year: hasSpecificBatch ? selectedBatch : 'All Batches',
                    hot_leads_count: countJd,
                    warm_leads_count: countPos,
                    pipeline_leads_count: countWt,
                    tier_focus: tierFocusLabel,
                    selected_streams: {
                        jd_received: !!leadSources.jd_received,
                        positives: !!leadSources.positives,
                        weekly_tracker: !!leadSources.weekly_tracker,
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
                    remarks: true,
                },
                included_kpi_cards: kpi_cards || included_kpi_cards || {
                    total_leads: true,
                    hot_leads_count: true,
                    warm_leads_count: true,
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
        // ── CASE 3: MONTH-END REPORT (INDIVIDUAL COORDINATOR) ──────────────────────
        if (template_type === 'month_end' || template_type === 'monthly_placement') {
            // 1. Resolve Colleges Handled by Coordinator
            let handledColleges = [];
            if (coordinator?.assigned_college_ids && coordinator.assigned_college_ids.length > 0) {
                handledColleges = await College_1.College.find({
                    _id: { $in: coordinator.assigned_college_ids },
                    is_deleted: { $ne: true },
                }).select('college_name college_code location');
            }
            if (handledColleges.length === 0) {
                handledColleges = await College_1.College.find({ is_deleted: { $ne: true } }).select('college_name college_code location');
            }
            const collegeIdsToMatch = [];
            if (targetCollege?._id)
                collegeIdsToMatch.push(targetCollege._id);
            if (college_id && college_id !== 'all' && mongoose_1.Types.ObjectId.isValid(String(college_id))) {
                collegeIdsToMatch.push(new mongoose_1.Types.ObjectId(String(college_id)));
            }
            // 2. Fetch conversions (Exclusively from 'in_progress' section of Weekly Tracker for the target college)
            const wtFilterProgress = {
                is_deleted: { $ne: true },
                pipeline_section: 'in_progress',
            };
            if (collegeIdsToMatch.length > 0) {
                wtFilterProgress.college_id = { $in: collegeIdsToMatch };
            }
            const inProgressConversions = await WeeklyTracker_1.WeeklyTracker.find(wtFilterProgress)
                .populate('college_id', 'college_name college_code')
                .sort({ created_at: -1, company_name: 1 });
            // Fetch matching pending tasks to pull exact jd_received_date from Pending Task section
            const pendingTasksForColleges = await PendingTask_1.PendingTask.find({
                is_deleted: { $ne: true },
                ...(collegeIdsToMatch.length > 0 ? { college_id: { $in: collegeIdsToMatch } } : {}),
            });
            const normalizeCompName = (name) => (name || '')
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
                    return (ptName === wtName ||
                        normPt === normWt ||
                        (normPt.length > 3 && normWt.length > 3 && (normPt.includes(normWt) || normWt.includes(normPt))) ||
                        ptName.includes(wtName) ||
                        wtName.includes(ptName));
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
                    role: wt.job_role || wt.role || 'Software Engineer',
                    ctc: wt.ctc_lpa || 'Competitive',
                    college_name: wt.college_id?.college_name || targetCollege?.college_name || 'Target Institution',
                    jd_received_date: formattedJdDate,
                };
            });
            // 3. Fetch Companies in Drive (Exclusively from 'in_drive' / 'companies_in_drive' section of Weekly Tracker)
            const wtFilterInDrive = {
                is_deleted: { $ne: true },
                pipeline_section: { $in: ['in_drive', 'companies_in_drive'] },
            };
            if (collegeIdsToMatch.length > 0) {
                wtFilterInDrive.college_id = { $in: collegeIdsToMatch };
            }
            const inDriveCompanies = await WeeklyTracker_1.WeeklyTracker.find(wtFilterInDrive)
                .populate('college_id', 'college_name college_code')
                .sort({ drive_date: 1, created_at: -1, company_name: 1 });
            // Build Section 2: Companies in Drive (Exact mirror of Weekly Tracker in_drive section: S.No, Company Name, Role, CTC, Status)
            const companiesInDriveList = inDriveCompanies.map((wt, idx) => ({
                s_no: idx + 1,
                company_name: wt.company_name,
                role: wt.job_role || wt.role || 'Software Engineer',
                ctc: wt.ctc_lpa || 'Competitive',
                status: wt.current_status_text || (wt.drive_date ? `Drive on ${new Date(wt.drive_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Drive in progress'),
                college_name: wt.college_id?.college_name || targetCollege?.college_name || 'Target Institution',
            }));
            // 4. Fetch Companies on Hold by College / TPO
            const wtFilterOnHoldCollege = {
                is_deleted: { $ne: true },
                pipeline_section: { $in: ['on_hold_by_college', 'rejected_by_college'] },
            };
            if (collegeIdsToMatch.length > 0) {
                wtFilterOnHoldCollege.college_id = { $in: collegeIdsToMatch };
            }
            const onHoldCollegeCompanies = await WeeklyTracker_1.WeeklyTracker.find(wtFilterOnHoldCollege)
                .populate('college_id', 'college_name college_code')
                .sort({ created_at: -1, company_name: 1 });
            const onHoldByCollegeList = onHoldCollegeCompanies.map((wt, idx) => ({
                s_no: idx + 1,
                company_name: wt.company_name,
                role: wt.job_role || wt.role || 'Software Engineer',
                ctc: wt.ctc_lpa || 'Competitive',
                status: wt.current_status_text || wt.remarks || 'On Hold by College / TPO',
                remarks: wt.remarks || wt.current_status_text || 'On Hold by College / TPO',
                college_name: wt.college_id?.college_name || targetCollege?.college_name || 'Target Institution',
            }));
            // 5. Fetch Companies on Hold by HR
            const wtFilterOnHoldHr = {
                is_deleted: { $ne: true },
                pipeline_section: 'on_hold_by_hr',
            };
            if (collegeIdsToMatch.length > 0) {
                wtFilterOnHoldHr.college_id = { $in: collegeIdsToMatch };
            }
            const onHoldHrCompanies = await WeeklyTracker_1.WeeklyTracker.find(wtFilterOnHoldHr)
                .populate('college_id', 'college_name college_code')
                .sort({ created_at: -1, company_name: 1 });
            const onHoldByHrList = onHoldHrCompanies.map((wt, idx) => ({
                s_no: idx + 1,
                company_name: wt.company_name,
                role: wt.job_role || wt.role || 'Software Engineer',
                ctc: wt.ctc_lpa || 'Competitive',
                status: wt.current_status_text || wt.remarks || 'On Hold from Corporate / HR',
                remarks: wt.remarks || wt.current_status_text || 'On Hold from Corporate / HR',
                college_name: wt.college_id?.college_name || targetCollege?.college_name || 'Target Institution',
            }));
            // 6. Fetch Completed Drives to calculate Total Offers Received & Completed Companies Section
            const wtFilterCompleted = {
                is_deleted: { $ne: true },
                pipeline_section: 'completed',
            };
            if (collegeIdsToMatch.length > 0) {
                wtFilterCompleted.college_id = { $in: collegeIdsToMatch };
            }
            const completedDrives = await WeeklyTracker_1.WeeklyTracker.find(wtFilterCompleted)
                .populate('college_id', 'college_name college_code')
                .sort({ created_at: -1, company_name: 1 });
            const totalOffersReceived = completedDrives.reduce((sum, d) => sum + (Number(d.selected_count) || 0), 0);
            const completedCompaniesList = completedDrives.map((wt, idx) => ({
                s_no: idx + 1,
                company_name: wt.company_name,
                role: wt.job_role || wt.role || 'Software Engineer',
                job_role: wt.job_role || wt.role || 'Software Engineer',
                ctc: wt.ctc_lpa || 'Competitive',
                ctc_lpa: wt.ctc_lpa || 'Competitive',
                status: wt.current_status_text || 'Drive Completed',
                current_status_text: wt.current_status_text || 'Drive Completed',
                offers_received: Number(wt.selected_count) || 0,
                selected_count: Number(wt.selected_count) || 0,
                college_name: wt.college_id?.college_name || targetCollege?.college_name || 'Target Institution',
            }));
            let monthName = 'August';
            if (week_label) {
                const cleaned = String(week_label).trim();
                if (/jan/i.test(cleaned))
                    monthName = 'January';
                else if (/feb/i.test(cleaned))
                    monthName = 'February';
                else if (/mar/i.test(cleaned))
                    monthName = 'March';
                else if (/apr/i.test(cleaned))
                    monthName = 'April';
                else if (/may/i.test(cleaned))
                    monthName = 'May';
                else if (/jun/i.test(cleaned))
                    monthName = 'June';
                else if (/jul/i.test(cleaned))
                    monthName = 'July';
                else if (/aug/i.test(cleaned))
                    monthName = 'August';
                else if (/sep/i.test(cleaned))
                    monthName = 'September';
                else if (/oct/i.test(cleaned))
                    monthName = 'October';
                else if (/nov/i.test(cleaned))
                    monthName = 'November';
                else if (/dec/i.test(cleaned))
                    monthName = 'December';
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
                    college_logo: targetCollege?.logo_url || null,
                    confidential_notice: `Prepared by Infoziant • ${coordinator?.full_name || 'Placement Coordinator'}`,
                    prepared_by: coordinator?.full_name || 'Placement Coordinator',
                    coordinator_name: coordinator?.full_name || 'Placement Coordinator',
                },
                kpi_summary: {
                    total_conversion_count: conversionsList.length + companiesInDriveList.length,
                    total_companies_scheduled: companiesInDriveList.length,
                    total_offers_moved: totalOffersReceived,
                },
                sections: {
                    completed_companies: completedCompaniesList,
                    company_conversions: conversionsList,
                    companies_in_drive: companiesInDriveList,
                    company_drives_scheduled: companiesInDriveList,
                    on_hold_by_college: onHoldByCollegeList,
                    on_hold_by_hr: onHoldByHrList,
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
        // Filter bases
        const wtFilter = { is_deleted: { $ne: true } };
        const dtFilter = {};
        const dlFilter = { is_deleted: { $ne: true } };
        if (academic_year && academic_year !== 'all') {
            const yearQueries = [academic_year, Number(academic_year), String(academic_year)].filter(Boolean);
            wtFilter.academic_year = { $in: yearQueries };
        }
        if (college_id && college_id !== 'all') {
            const queryCollegeIds = [];
            if (mongoose_1.Types.ObjectId.isValid(String(college_id))) {
                queryCollegeIds.push(new mongoose_1.Types.ObjectId(String(college_id)));
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
        let [completedRows, inProgressRows, pipelineRows, topCompaniesRows, rejectedCompaniesRows, onHoldByCollegeRows, onHoldByHrRows, totalCalls, positiveCalls, totalJds,] = await Promise.all([
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, pipeline_section: 'completed' }).sort({ created_at: -1 }),
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, pipeline_section: 'in_progress' }).sort({ created_at: -1 }),
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, pipeline_section: 'pipeline' }).sort({ created_at: -1 }),
            WeeklyTracker_1.WeeklyTracker.find({
                ...wtFilter,
                $or: [{ pipeline_section: 'top_companies' }, { is_pinned_top: true }],
            }).sort({ created_at: -1 }),
            WeeklyTracker_1.WeeklyTracker.find({
                ...wtFilter,
                pipeline_section: { $in: ['rejected_companies', 'rejected_by_hr'] },
            }).sort({ created_at: -1 }),
            WeeklyTracker_1.WeeklyTracker.find({
                ...wtFilter,
                pipeline_section: { $in: ['on_hold_by_college', 'rejected_by_college'] },
            }).sort({ created_at: -1 }),
            WeeklyTracker_1.WeeklyTracker.find({
                ...wtFilter,
                pipeline_section: 'on_hold_by_hr',
            }).sort({ created_at: -1 }),
            DailyTracker_1.DailyTracker.countDocuments(dtFilter),
            DailyTracker_1.DailyTracker.countDocuments({ ...dtFilter, outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES } }),
            DailyLead_1.DailyLead.countDocuments({ ...dlFilter, lead_type: 'jd_received' }),
        ]);
        // Fallback: If 0 rows found and an academic year filter was applied, search all records for that college
        if (completedRows.length === 0 &&
            inProgressRows.length === 0 &&
            pipelineRows.length === 0 &&
            topCompaniesRows.length === 0 &&
            rejectedCompaniesRows.length === 0 &&
            onHoldByCollegeRows.length === 0 &&
            onHoldByHrRows.length === 0 &&
            wtFilter.academic_year) {
            const fallbackFilter = { ...wtFilter };
            delete fallbackFilter.academic_year;
            const [fCompleted, fInProgress, fPipeline, fTopCompanies, fRejectedCompanies, fOnHoldByCollege, fOnHoldByHr] = await Promise.all([
                WeeklyTracker_1.WeeklyTracker.find({ ...fallbackFilter, pipeline_section: 'completed' }).sort({ created_at: -1 }),
                WeeklyTracker_1.WeeklyTracker.find({ ...fallbackFilter, pipeline_section: 'in_progress' }).sort({ created_at: -1 }),
                WeeklyTracker_1.WeeklyTracker.find({ ...fallbackFilter, pipeline_section: 'pipeline' }).sort({ created_at: -1 }),
                WeeklyTracker_1.WeeklyTracker.find({
                    ...fallbackFilter,
                    $or: [{ pipeline_section: 'top_companies' }, { is_pinned_top: true }],
                }).sort({ created_at: -1 }),
                WeeklyTracker_1.WeeklyTracker.find({
                    ...fallbackFilter,
                    pipeline_section: { $in: ['rejected_companies', 'rejected_by_hr'] },
                }).sort({ created_at: -1 }),
                WeeklyTracker_1.WeeklyTracker.find({
                    ...fallbackFilter,
                    pipeline_section: { $in: ['on_hold_by_college', 'rejected_by_college'] },
                }).sort({ created_at: -1 }),
                WeeklyTracker_1.WeeklyTracker.find({
                    ...fallbackFilter,
                    pipeline_section: 'on_hold_by_hr',
                }).sort({ created_at: -1 }),
            ]);
            completedRows = fCompleted;
            inProgressRows = fInProgress;
            pipelineRows = fPipeline;
            topCompaniesRows = fTopCompanies;
            rejectedCompaniesRows = fRejectedCompanies;
            onHoldByCollegeRows = fOnHoldByCollege;
            onHoldByHrRows = fOnHoldByHr;
        }
        const totalOffers = completedRows.reduce((sum, r) => sum + (r.selected_count || 0), 0);
        // Build the Generated Report Document Schema
        const reportDocument = {
            template_type,
            report_title: template_type === 'weekly_placement'
                ? 'Weekly Placement Report'
                : template_type === 'monthly_placement'
                    ? `Monthly Placement Review — ${academic_year} Season`
                    : 'Placement Operations Report',
            report_period: week_label,
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
                company_logo: '/infoziant-logo.png',
                college_name: targetCollege?.college_name || 'Consolidated Partner Institutions',
                college_code: targetCollege?.college_code || 'iPOMS',
                college_logo: targetCollege?.college_website ? `https://logo.clearbit.com/${targetCollege.college_website.replace(/https?:\/\//, '')}` : null,
                confidential_notice: 'Prepared by Infoziant',
            },
            kpi_summary: {
                total_calls: totalCalls,
                positive_responses: positiveCalls,
                jds_received: totalJds,
                drives_completed: completedRows.length,
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
                `Active Pipeline: ${inProgressRows.length} drives currently underway with technical rounds in progress.`,
                `Targeting: ${topCompaniesRows.length} premium top companies lined up for high CTC recruitment drives.`,
                `Lead Conversion: ${totalJds} Job Descriptions secured and circulated to students for registration.`,
            ],
            remarks: custom_remarks || 'All recruitment drives are proceeding as per placement schedule. Follow-ups with upcoming product companies remain active.',
            included_sections: included_sections || {
                kpi_summary: true,
                completed_companies: true,
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
                jds_received: true,
                drives_completed: true,
                drives_in_progress: true,
                pipeline_leads: true,
                top_companies_count: true,
                total_offers: true,
            },
        };
        return res.status(200).json({
            success: true,
            message: 'Report generated successfully',
            data: { report: reportDocument },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to generate report' },
        });
    }
});
// ── RA-6: POST /api/v1/reports/presets
// Save Custom Builder Configuration Preset (Spec Section 12)
app.post('/api/v1/reports/presets', async (req, res) => {
    try {
        const { template_type, preset_name, college_id, coordinator_id, academic_year = '2026', filters, included_sections, custom_remarks, theme, } = req.body;
        if (!template_type || !preset_name || !coordinator_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'template_type, preset_name, and coordinator_id are required' },
            });
        }
        const preset = await ReportLibrary_1.ReportLibrary.create({
            template_type,
            preset_name: preset_name.trim(),
            college_id: college_id && college_id !== 'all' ? new mongoose_1.Types.ObjectId(String(college_id)) : null,
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            academic_year,
            filters: filters || {},
            included_sections: included_sections || {},
            custom_remarks: custom_remarks?.trim() || '',
            theme: theme || 'blue',
        });
        const populated = await ReportLibrary_1.ReportLibrary.findById(preset._id)
            .populate('college_id', 'college_name college_code')
            .populate('coordinator_id', 'full_name official_email');
        return res.status(201).json({
            success: true,
            message: 'Report preset saved to library successfully',
            data: populated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to save report preset' },
        });
    }
});
// ── RA-7: GET /api/v1/reports/presets
// List Saved Report Presets
app.get('/api/v1/reports/presets', async (req, res) => {
    try {
        const { template_type, college_id, coordinator_id } = req.query;
        const filter = { is_deleted: false };
        if (template_type)
            filter.template_type = template_type;
        if (college_id && college_id !== 'all')
            filter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
        if (coordinator_id)
            filter.coordinator_id = new mongoose_1.Types.ObjectId(String(coordinator_id));
        const presets = await ReportLibrary_1.ReportLibrary.find(filter)
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch presets' },
        });
    }
});
// ── RA-8: DELETE /api/v1/reports/presets/:id
// Soft delete a report preset
app.delete('/api/v1/reports/presets/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const preset = await ReportLibrary_1.ReportLibrary.findById(id);
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete preset' },
        });
    }
});
function getTimeGreeting(fullName) {
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
app.get('/api/v1/dashboard/coordinator', async (req, res) => {
    try {
        // Ownership scoping: a coordinator is pinned to their own id no matter what
        // the query string asks for. Only a Team Leader / Administrator may name
        // someone else. Trusting `?coordinator_id=` outright let any coordinator
        // read any other's dashboard, which Module 07 §11 explicitly forbids.
        const coordinatorId = (0, routePolicy_1.scopeToSelf)(req, req.query.coordinator_id);
        let coordinator = null;
        if (coordinatorId) {
            coordinator = await User_1.User.findById(coordinatorId);
        }
        if (!coordinator) {
            coordinator = await User_1.User.findOne({ role_code: 'placement_coordinator' }) || {
                _id: new mongoose_1.Types.ObjectId(),
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
        const activeAssignments = await AssignedWork_1.AssignedWork.find({
            assigned_to_coordinator_id: coordinator._id,
            is_completed: false,
            is_deleted: false,
        })
            .sort({ priority: 1, created_at: -1 })
            .populate('sender_tl_id', 'full_name official_email')
            .populate('college_id', 'college_name college_code');
        // Fetch Assigned / Supervised College (Priority College)
        const priorityCollege = await College_1.College.findOne({ status: 'active' });
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
            DailyTracker_1.DailyTracker.countDocuments({
                coordinator_id: coordinator._id,
                call_date: {
                    $gte: new Date(today.setHours(0, 0, 0, 0)),
                    $lt: new Date(today.setHours(23, 59, 59, 999)),
                },
            }),
            DailyTracker_1.DailyTracker.countDocuments({
                coordinator_id: coordinator._id,
                outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES },
                call_date: {
                    $gte: new Date(today.setHours(0, 0, 0, 0)),
                    $lt: new Date(today.setHours(23, 59, 59, 999)),
                },
            }),
            DailyLead_1.DailyLead.countDocuments({
                coordinator_id: coordinator._id,
                lead_type: 'jd_received',
                is_deleted: false,
            }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({
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
        const [companiesCompleted, companiesInProgress, companiesPipeline, companiesTalkedToday] = await Promise.all([
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...pipelineFilter, pipeline_section: 'completed' }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...pipelineFilter, pipeline_section: 'in_progress' }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ ...pipelineFilter, pipeline_section: 'pipeline' }),
            DailyTracker_1.DailyTracker.distinct('company_name', {
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch coordinator dashboard' },
        });
    }
});
// ── GET /api/v1/dashboard/college-kpis
// Coordinator Per-College Focus KPI Cards (Min 1, Max 3 Colleges)
app.get('/api/v1/dashboard/college-kpis', async (req, res) => {
    try {
        const coordinatorId = (0, routePolicy_1.scopeToSelf)(req, req.query.coordinator_id);
        const collegeIdsQuery = req.query.college_ids;
        let coordinator = null;
        if (coordinatorId) {
            coordinator = await User_1.User.findById(coordinatorId);
        }
        if (!coordinator) {
            coordinator = await User_1.User.findOne({ role_code: 'placement_coordinator' }) || {
                _id: new mongoose_1.Types.ObjectId(),
                full_name: 'A. Mohanaradha',
            };
        }
        let targetCollegeIds = [];
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
        const POSITIVE_STATUSES = ['hiring', 'invite_mail', 'follow_up', 'jd_received', 'drive_completed', 'in_connect'];
        const NEGATIVE_STATUSES = ['invalid', 'no_response', 'hiring_freezed', 'call_back'];
        const NOT_HIRING_STATUSES = ['not_hiring'];
        const kpiResults = await Promise.all(targetCollegeIds.map(async (cIdStr) => {
            let college = null;
            if (mongoose_1.Types.ObjectId.isValid(cIdStr)) {
                college = await College_1.College.findById(cIdStr);
            }
            if (!college) {
                college = await College_1.College.findOne({
                    $or: [
                        { college_code: new RegExp(`^${escapeRegex(cIdStr)}$`, 'i') },
                        { college_name: new RegExp(`^${escapeRegex(cIdStr)}$`, 'i') },
                    ],
                });
            }
            if (!college)
                return null;
            const cObjectId = college._id;
            const coordinatorBaseFilter = {
                college_id: cObjectId,
                coordinator_id: coordinator._id,
            };
            const [totalCalls, totalPositives, totalNegatives, totalNotHiring, activeLeadsCount, weeklyPipelineCount,] = await Promise.all([
                // Total Calls Made
                DailyTracker_1.DailyTracker.countDocuments({
                    ...coordinatorBaseFilter,
                    is_skipped: { $ne: true },
                }),
                // Positives (Hiring, Invite Email, Follow Up, JD Received, Drive Completed)
                DailyTracker_1.DailyTracker.countDocuments({
                    ...coordinatorBaseFilter,
                    outcome_status: { $in: POSITIVE_STATUSES },
                }),
                // Negatives (Invalid, No Response, Freeze)
                DailyTracker_1.DailyTracker.countDocuments({
                    ...coordinatorBaseFilter,
                    outcome_status: { $in: NEGATIVE_STATUSES },
                }),
                // Not Hiring
                DailyTracker_1.DailyTracker.countDocuments({
                    ...coordinatorBaseFilter,
                    outcome_status: { $in: NOT_HIRING_STATUSES },
                }),
                // Daily Leads
                DailyLead_1.DailyLead.countDocuments({
                    ...coordinatorBaseFilter,
                    is_deleted: false,
                }),
                // Weekly in progress/pipeline
                WeeklyTracker_1.WeeklyTracker.countDocuments({
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
                logo_url: college.logo_url || '',
                total_calls: totalCalls,
                total_positives: totalPositives,
                total_negatives: totalNegatives,
                total_not_hiring: totalNotHiring,
                active_leads: activeLeadsCount,
                weekly_pipeline: weeklyPipelineCount,
                positive_rate: positiveRate,
            };
        }));
        const validKpis = kpiResults.filter(Boolean);
        return res.status(200).json({
            success: true,
            data: {
                colleges: validKpis,
                total_selected: validKpis.length,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch college KPIs' },
        });
    }
});
// ── DB-2: GET /api/v1/dashboard/team-leader
// Team Leader Dashboard (Spec Section 5.2) — Coordinator Profile Online Activity & Live Performance Matrix
app.get('/api/v1/dashboard/team-leader', async (req, res) => {
    try {
        const coordinators = await User_1.User.find({
            role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR'] },
            is_deleted: false,
        })
            .populate('assigned_college_ids', 'college_name college_code')
            .sort({ full_name: 1 });
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const nowMs = Date.now();
        // Per-coordinator live profile & activity telemetry
        const teamMatrix = await Promise.all(coordinators.map(async (c) => {
            const [calls, positives, jds, pendingWork, latestCall] = await Promise.all([
                DailyTracker_1.DailyTracker.countDocuments({
                    coordinator_id: c._id,
                    call_date: { $gte: todayStart, $lte: todayEnd },
                }),
                DailyTracker_1.DailyTracker.countDocuments({
                    coordinator_id: c._id,
                    outcome_status: 'invite_mail',
                }),
                DailyLead_1.DailyLead.countDocuments({ coordinator_id: c._id, lead_type: 'jd_received', is_deleted: false }),
                AssignedWork_1.AssignedWork.countDocuments({ assigned_to_coordinator_id: c._id, is_completed: false, is_deleted: false }),
                DailyTracker_1.DailyTracker.findOne({ coordinator_id: c._id })
                    .sort({ session_date: -1, created_at: -1 })
                    .populate('college_id', 'college_name college_code')
                    .select('company_name session_date outcome_status created_at college_id'),
            ]);
            // Determine real-time online status and last activity
            let lastActiveTime = null;
            let lastActivitySummary = 'No activity logged today';
            if (latestCall?.session_date) {
                lastActiveTime = new Date(latestCall.session_date);
                const company = latestCall.company_name || 'Partner Company';
                const college = latestCall.college_id?.college_code || latestCall.college_id?.college_name || '';
                lastActivitySummary = `Logged call for ${company}${college ? ` (${college})` : ''}`;
            }
            else if (c.last_login_at) {
                lastActiveTime = new Date(c.last_login_at);
                lastActivitySummary = 'Signed in to portal';
            }
            let onlineStatus = 'offline';
            let onlineStatusLabel = 'Offline';
            if (c.account_status === 'on_leave') {
                onlineStatus = 'on_leave';
                onlineStatusLabel = 'On Leave';
            }
            else if (c.account_status === 'partial_working') {
                onlineStatus = 'partial_working';
                onlineStatusLabel = 'Partial Working';
            }
            else if (lastActiveTime) {
                const diffMinutes = Math.floor((nowMs - lastActiveTime.getTime()) / (1000 * 60));
                if (diffMinutes <= 15) {
                    onlineStatus = 'online';
                    onlineStatusLabel = 'Active Now';
                }
                else if (diffMinutes <= 60) {
                    onlineStatus = 'away';
                    onlineStatusLabel = `Away (${diffMinutes}m ago)`;
                }
                else if (calls > 0 || (c.last_login_at && new Date(c.last_login_at).toDateString() === new Date().toDateString())) {
                    onlineStatus = 'away';
                    onlineStatusLabel = 'Active Today';
                }
                else {
                    onlineStatus = 'offline';
                    onlineStatusLabel = 'Offline';
                }
            }
            return {
                coordinator_id: c._id,
                name: c.full_name,
                username: c.username,
                email: c.official_email,
                mobile: c.primary_mobile || '',
                profile_photo_url: c.profile_photo_url || '',
                account_status: c.account_status,
                presence_status: c.presence_status || 'available',
                assigned_colleges: c.assigned_college_ids || [],
                last_login_at: c.last_login_at,
                last_active_at: lastActiveTime,
                last_activity_summary: lastActivitySummary,
                online_status: onlineStatus,
                online_status_label: onlineStatusLabel,
                calls_today: calls,
                positive_leads: positives,
                jds_received: jds,
                pending_assigned_work: pendingWork,
                performance_status: calls >= 25 ? 'on_track' : calls > 0 ? 'active' : 'pending',
            };
        }));
        const totalDispatchedAssignments = await AssignedWork_1.AssignedWork.countDocuments({ is_deleted: false });
        const completedAssignments = await AssignedWork_1.AssignedWork.countDocuments({ is_completed: true, is_deleted: false });
        // Count online coordinators
        const onlineCount = teamMatrix.filter((m) => m.online_status === 'online').length;
        const activeTodayCount = teamMatrix.filter((m) => m.calls_today > 0 || m.online_status === 'online' || m.online_status === 'away').length;
        return res.status(200).json({
            success: true,
            data: {
                greeting: {
                    greeting: 'Team Operations Command Center 👔',
                    subtext: 'Real-time coordinator monitoring, profile online activity, task dispatch, and drive velocity.',
                },
                online_summary: {
                    total_coordinators: coordinators.length,
                    currently_online: onlineCount,
                    active_today: activeTodayCount,
                },
                team_matrix: teamMatrix,
                assignments_overview: {
                    total_dispatched: totalDispatchedAssignments,
                    completed: completedAssignments,
                    active_pending: totalDispatchedAssignments - completedAssignments,
                },
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch team leader dashboard' },
        });
    }
});
// ── DB-3: GET /api/v1/dashboard/admin
// Administrator / Executive Dashboard (Spec Section 5.3 & Chapter 3 Screen 5) — "How is the complete placement operation progressing?"
app.get('/api/v1/dashboard/admin', async (req, res) => {
    try {
        const [totalCalls, totalPositives, totalJds, totalDrives, totalOffersAgg, totalColleges, totalUsers, totalCompaniesInDb, totalAssignedWork, settingsDoc, missingMobilesCount, missingEmailsCount,] = await Promise.all([
            DailyTracker_1.DailyTracker.countDocuments({}),
            DailyTracker_1.DailyTracker.countDocuments({ outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES } }),
            DailyLead_1.DailyLead.countDocuments({ lead_type: 'jd_received', is_deleted: false }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ pipeline_section: 'completed', is_deleted: false }),
            WeeklyTracker_1.WeeklyTracker.aggregate([
                { $match: { pipeline_section: 'completed', is_deleted: false } },
                { $group: { _id: null, sum: { $sum: '$selected_count' } } },
            ]),
            College_1.College.countDocuments({ status: 'active' }),
            User_1.User.countDocuments({ is_deleted: false }),
            CompanyMetadata_1.CompanyMetadata.countDocuments({ is_deleted: false }),
            AssignedWork_1.AssignedWork.countDocuments({ is_deleted: false }),
            SystemSettings_1.SystemSettings.findOne({}),
            CompanyMetadata_1.CompanyMetadata.countDocuments({
                $or: [{ mobile_number: { $exists: false } }, { mobile_number: '' }, { mobile_number: null }],
                is_deleted: false,
            }),
            CompanyMetadata_1.CompanyMetadata.countDocuments({
                $or: [{ email_id: { $exists: false } }, { email_id: '' }, { email_id: null }],
                is_deleted: false,
            }),
        ]);
        const totalOffers = totalOffersAgg[0]?.sum || 0;
        const positiveRate = totalCalls > 0 ? Math.round((totalPositives / totalCalls) * 100) : 0;
        // Distinct companies contacted
        const distinctCompaniesContacted = (await DailyTracker_1.DailyTracker.distinct('company_name')).length;
        // Data Quality Score: 100 - penalties for missing data
        const totalDataPoints = (totalCompaniesInDb || 1) * 2; // email + mobile
        const missingDataPoints = missingMobilesCount + missingEmailsCount;
        const metadataQualityPct = Math.max(10, Math.min(100, Math.round(((totalDataPoints - missingDataPoints) / totalDataPoints) * 100)));
        // ── All Active Colleges for Leaderboard ──
        const allColleges = await College_1.College.find({ status: 'active' }).sort({ college_name: 1 }).lean();
        // Fetch all users to map assigned coordinators
        const allCoordinators = await User_1.User.find({ is_deleted: false })
            .select('_id full_name official_email primary_mobile role_codes assigned_college_ids is_active is_password_locked failed_login_attempts profile_photo_url')
            .lean();
        // Aggregations per college
        const collegeStatsMap = new Map();
        const [dailyStatsByCollege, weeklyStatsByCollege, leadsByCollege] = await Promise.all([
            DailyTracker_1.DailyTracker.aggregate([
                {
                    $group: {
                        _id: '$college_id',
                        calls: { $sum: 1 },
                        positives: {
                            $sum: { $cond: [{ $in: ['$outcome_status', DailyTracker_1.POSITIVE_OUTCOMES] }, 1, 0] },
                        },
                    },
                },
            ]),
            WeeklyTracker_1.WeeklyTracker.aggregate([
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
            DailyLead_1.DailyLead.aggregate([
                { $match: { lead_type: 'jd_received', is_deleted: false } },
                { $group: { _id: '$college_id', count: { $sum: 1 } } },
            ]),
        ]);
        dailyStatsByCollege.forEach((d) => {
            const id = String(d._id);
            const existing = collegeStatsMap.get(id) || { calls: 0, positives: 0, jds: 0, drives: 0, offers: 0, topCtc: 0, activePipeline: 0 };
            existing.calls = d.calls;
            existing.positives = d.positives;
            collegeStatsMap.set(id, existing);
        });
        weeklyStatsByCollege.forEach((w) => {
            const id = String(w._id);
            const existing = collegeStatsMap.get(id) || { calls: 0, positives: 0, jds: 0, drives: 0, offers: 0, topCtc: 0, activePipeline: 0 };
            existing.drives = w.drives;
            existing.offers = w.offers || 0;
            existing.activePipeline = w.activePipeline || 0;
            existing.topCtc = w.topCtc || 0;
            collegeStatsMap.set(id, existing);
        });
        leadsByCollege.forEach((l) => {
            const id = String(l._id);
            const existing = collegeStatsMap.get(id) || { calls: 0, positives: 0, jds: 0, drives: 0, offers: 0, topCtc: 0, activePipeline: 0 };
            existing.jds = l.count;
            collegeStatsMap.set(id, existing);
        });
        const unassignedCollegesList = [];
        const leaderboard = allColleges.map((c) => {
            const cIdStr = String(c._id);
            const stats = collegeStatsMap.get(cIdStr) || { calls: 0, positives: 0, jds: 0, drives: 0, offers: 0, topCtc: 0, activePipeline: 0 };
            // Find assigned coordinators
            const assigned = allCoordinators.filter((u) => Array.isArray(u.assigned_college_ids) && u.assigned_college_ids.some((cid) => String(cid) === cIdStr)).map((u) => ({
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
                tpo_name: c.tpo_name || 'Placement Office',
                tpo_contact_mobile: c.tpo_contact_mobile || '',
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
        // ── Workforce & Coordinator Snapshot ──
        const coordinatorUsers = allCoordinators.filter((u) => u.role_codes?.includes('PLACEMENT_COORDINATOR') || u.role_codes?.includes('COORDINATOR'));
        const coordinatorCallsAgg = await DailyTracker_1.DailyTracker.aggregate([
            {
                $group: {
                    _id: '$coordinator_id',
                    calls: { $sum: 1 },
                    positives: {
                        $sum: { $cond: [{ $in: ['$outcome_status', DailyTracker_1.POSITIVE_OUTCOMES] }, 1, 0] },
                    },
                },
            },
        ]);
        const coordStatsMap = new Map();
        coordinatorCallsAgg.forEach((c) => {
            coordStatsMap.set(String(c._id), { calls: c.calls, positives: c.positives });
        });
        const lockedAccountsList = [];
        const workforce = coordinatorUsers.map((u) => {
            const uIdStr = String(u._id);
            const cStats = coordStatsMap.get(uIdStr) || { calls: 0, positives: 0 };
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
            return {
                coordinator_id: u._id,
                name: u.full_name,
                email: u.official_email,
                mobile: u.primary_mobile,
                profile_photo_url: u.profile_photo_url || null,
                assigned_colleges_count: assignedCount,
                calls_logged: cStats.calls,
                positives_secured: cStats.positives,
                is_active: u.is_active !== false,
                is_locked: isLocked,
                is_overloaded: assignedCount > 4,
                is_unassigned: assignedCount === 0,
            };
        });
        // ── Stale Pipeline Alerts (WeeklyTracker records with follow-ups older than 7 days) ──
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const stalePipelineCount = await WeeklyTracker_1.WeeklyTracker.countDocuments({
            is_deleted: false,
            pipeline_section: { $in: ['pipeline', 'in_progress', 'top_companies'] },
            $or: [
                { follow_up_date: { $lte: new Date() } },
                { updated_at: { $lte: sevenDaysAgo } },
            ],
        });
        // ── Recent Positive Conversions Feed ──
        const recentLeads = await DailyLead_1.DailyLead.find({ lead_type: { $in: ['positive', 'jd_received'] }, is_deleted: false })
            .sort({ created_at: -1 })
            .limit(6)
            .populate('college_id', 'college_name college_code')
            .populate('coordinator_id', 'full_name official_email')
            .lean();
        const recentConversions = recentLeads.map((l) => ({
            lead_id: l._id,
            company_name: l.company_name,
            hr_name: l.hr_name,
            job_role: l.job_role || 'Software Engineer / Graduate Trainee',
            package_lpa: l.package_lpa || 'Competitive',
            lead_type: l.lead_type,
            college_name: l.college_id?.college_name || 'General Institution',
            college_code: l.college_id?.college_code || 'ALL',
            coordinator_name: l.coordinator_id?.full_name || 'Placement Team',
            date: l.created_at || new Date(),
        }));
        // ── Module 10 System Telemetry & Maintenance Status ──
        const weeklyPipelineCount = await WeeklyTracker_1.WeeklyTracker.countDocuments({ is_deleted: false });
        const dailyLeadsCount = await DailyLead_1.DailyLead.countDocuments({ is_deleted: false });
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
        const recentAuditLogs = await AuditLog_1.AuditLog.find({})
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
                workforce_snapshot: {
                    total_coordinators: coordinatorUsers.length,
                    active_today: workforce.filter((w) => w.calls_logged > 0).length || coordinatorUsers.length,
                    coordinators: workforce,
                },
                critical_alerts: criticalAlerts,
                recent_conversions: recentConversions,
                system_telemetry: systemTelemetry,
                audit_logs: recentAuditLogs,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch admin dashboard' },
        });
    }
});
// ── DB-4: POST /api/v1/assigned-work
// Team Leader creates and dispatches Assigned Work to a Coordinator (Spec Section 9 & 10)
app.post('/api/v1/assigned-work', async (req, res) => {
    try {
        const { sender_tl_id, assigned_to_coordinator_id, college_id, company_name, hr_name, hr_mobile, hr_email, task_description, priority = 'high', } = req.body;
        if (!sender_tl_id || !assigned_to_coordinator_id || !college_id || !company_name || !task_description) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'sender_tl_id, assigned_to_coordinator_id, college_id, company_name, and task_description are required',
                },
            });
        }
        const assignment = await AssignedWork_1.AssignedWork.create({
            sender_tl_id: new mongoose_1.Types.ObjectId(String(sender_tl_id)),
            assigned_to_coordinator_id: new mongoose_1.Types.ObjectId(String(assigned_to_coordinator_id)),
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            company_name: company_name.trim(),
            hr_name: hr_name?.trim() || '',
            hr_mobile: hr_mobile?.trim() || '',
            hr_email: hr_email?.trim().toLowerCase() || '',
            task_description: task_description.trim(),
            priority,
            status: 'assigned',
        });
        const populated = await AssignedWork_1.AssignedWork.findById(assignment._id)
            .populate('sender_tl_id', 'full_name official_email')
            .populate('assigned_to_coordinator_id', 'full_name official_email')
            .populate('college_id', 'college_name college_code');
        return res.status(201).json({
            success: true,
            message: 'Work assignment dispatched to coordinator dashboard successfully',
            data: populated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create work assignment' },
        });
    }
});
// ── DB-5: GET /api/v1/assigned-work
// List Active Assigned Work (filtered by coordinator or TL)
app.get('/api/v1/assigned-work', async (req, res) => {
    try {
        const { tl_id, is_completed } = req.query;
        // Pinned to the caller's own id unless they're a supervisor — otherwise
        // any coordinator could read another's assigned work by passing a
        // different ?coordinator_id=. See scopeToSelf() in routePolicy.ts.
        const coordinator_id = (0, routePolicy_1.scopeToSelf)(req, req.query.coordinator_id);
        const filter = { is_deleted: false };
        if (coordinator_id)
            filter.assigned_to_coordinator_id = new mongoose_1.Types.ObjectId(String(coordinator_id));
        if (tl_id)
            filter.sender_tl_id = new mongoose_1.Types.ObjectId(String(tl_id));
        if (is_completed !== undefined)
            filter.is_completed = is_completed === 'true';
        const assignments = await AssignedWork_1.AssignedWork.find(filter)
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch assigned work' },
        });
    }
});
// ── DB-6: POST /api/v1/assigned-work/:id/load-to-metadata
// Metadata Merge Engine — Signature Feature (Spec Section 12 & 15)
app.post('/api/v1/assigned-work/:id/load-to-metadata', async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await AssignedWork_1.AssignedWork.findById(id)
            .populate('sender_tl_id', 'full_name')
            .populate('assigned_to_coordinator_id', 'full_name');
        if (!assignment || assignment.is_deleted) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Assigned work item not found' },
            });
        }
        const { company_name, hr_name, hr_mobile, hr_email } = assignment;
        const tlName = assignment.sender_tl_id?.full_name || 'Team Leader';
        const coordName = assignment.assigned_to_coordinator_id?.full_name || 'Coordinator';
        // 1. Search for existing company in CompanyMetadata (Case-Insensitive)
        let company = await CompanyMetadata_1.CompanyMetadata.findOne({
            company_name: { $regex: new RegExp(`^${escapeRegex(company_name.trim())}$`, 'i') },
            is_deleted: false,
        });
        let mergeResultCase = 1;
        if (!company) {
            // Case 1: Company does not exist -> Create an entirely new company record
            company = await CompanyMetadata_1.CompanyMetadata.create({
                company_name: company_name.trim(),
                hr_name: hr_name?.trim() || '',
                primary_mobile: hr_mobile?.trim() || '',
                mobile_numbers: hr_mobile ? [hr_mobile.trim()] : [],
                primary_email: hr_email?.trim().toLowerCase() || '',
                email_ids: hr_email ? [hr_email.trim().toLowerCase()] : [],
                notes: `[Metadata Merge] Added via Assigned Work by ${coordName} (Assigned by ${tlName} on ${new Date().toLocaleDateString('en-IN')})`,
            });
            mergeResultCase = 1;
        }
        else {
            // Company exists -> Check HR, Mobile, Email hierarchy
            const existingHrName = (company.hr_name || '').trim().toLowerCase();
            const incomingHrName = (hr_name || '').trim().toLowerCase();
            if (incomingHrName && existingHrName === incomingHrName) {
                // Case 3 & 4: Same HR -> Append new Mobile & Email without duplicates
                let updated = false;
                if (hr_mobile && !company.mobile_numbers.includes(hr_mobile.trim())) {
                    company.mobile_numbers.push(hr_mobile.trim());
                    if (!company.primary_mobile)
                        company.primary_mobile = hr_mobile.trim();
                    updated = true;
                    mergeResultCase = 3;
                }
                if (hr_email && !company.email_ids.includes(hr_email.trim().toLowerCase())) {
                    company.email_ids.push(hr_email.trim().toLowerCase());
                    if (!company.primary_email)
                        company.primary_email = hr_email.trim().toLowerCase();
                    updated = true;
                    mergeResultCase = 4;
                }
                if (updated) {
                    company.notes = `${company.notes || ''}\n[Metadata Merge] Updated contact info from Assigned Work by ${coordName} on ${new Date().toLocaleDateString('en-IN')}`;
                    await company.save();
                }
            }
            else {
                // Case 2: Different HR contact -> update primary or append notes
                if (!company.hr_name)
                    company.hr_name = hr_name?.trim() || '';
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Metadata merge engine failed' },
        });
    }
});
// ── DB-7: PATCH /api/v1/assigned-work/:id/complete
// Coordinator marks assignment completed -> immediately hides from active dashboard (Spec Section 9 & 10)
app.patch('/api/v1/assigned-work/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const assignment = await AssignedWork_1.AssignedWork.findById(id);
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
    }
    catch (error) {
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
app.get('/api/v1/notifications', async (req, res) => {
    try {
        const { college_id, tab = 'all', notification_type } = req.query;
        // Pinned to the caller's own id unless they're a supervisor — otherwise
        // passing a colleague's ?user_id= reads notifications targeted at them,
        // including their per-user read/response state. See scopeToSelf() in
        // routePolicy.ts (built for coordinator_id, applies the same way here).
        const user_id = (0, routePolicy_1.scopeToSelf)(req, req.query.user_id);
        const uId = user_id ? new mongoose_1.Types.ObjectId(String(user_id)) : null;
        const cId = college_id && college_id !== 'all' ? new mongoose_1.Types.ObjectId(String(college_id)) : null;
        // Audience targeting query filter
        const audienceConditions = [{ audience_type: 'everyone' }];
        if (uId) {
            audienceConditions.push({ target_user_ids: uId });
        }
        if (cId) {
            audienceConditions.push({ target_college_id: cId });
        }
        const queryFilter = {
            is_deleted: false,
            $or: audienceConditions,
        };
        if (notification_type) {
            queryFilter.notification_type = notification_type;
        }
        // Fetch active notifications capped at Top 100
        const notifications = await Notification_1.Notification.find(queryFilter)
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
        }
        else if (tab === 'announcement') {
            filtered = processed.filter((n) => n.notification_type === 'announcement');
        }
        else if (tab === 'meeting') {
            filtered = processed.filter((n) => n.notification_type === 'meeting');
        }
        else if (tab === 'assignment') {
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch notifications' },
        });
    }
});
// ── NT-2: POST /api/v1/notifications
// Broadcast alert or announcement to target audience (Spec Section 5.2.8.4)
app.post('/api/v1/notifications', async (req, res) => {
    try {
        const { notification_type = 'announcement', sender_id, sender_role = 'team_leader', audience_type = 'everyone', target_user_ids = [], target_college_id, title, message, icon_type = 'announcement', priority = 'medium', action_url, attachment_url, expires_at, requires_acknowledgment = false, } = req.body;
        if (!sender_id || !title || !message) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'sender_id, title, and message are required' },
            });
        }
        // Determine target users to populate initial recipient statuses
        let targetUsers = [];
        if (audience_type === 'individual' && target_user_ids.length > 0) {
            targetUsers = target_user_ids.map((id) => ({ user_id: new mongoose_1.Types.ObjectId(id), status: 'sent' }));
        }
        else if (audience_type === 'everyone') {
            const allUsers = await User_1.User.find({ is_deleted: false }).select('_id');
            targetUsers = allUsers.map((u) => ({ user_id: u._id, status: 'sent' }));
        }
        else {
            const allUsers = await User_1.User.find({ is_deleted: false }).select('_id');
            targetUsers = allUsers.map((u) => ({ user_id: u._id, status: 'sent' }));
        }
        const notification = await Notification_1.Notification.create({
            notification_type,
            sender_id: new mongoose_1.Types.ObjectId(String(sender_id)),
            sender_role,
            audience_type,
            target_user_ids: target_user_ids.map((id) => new mongoose_1.Types.ObjectId(String(id))),
            target_college_id: target_college_id && target_college_id !== 'all' ? new mongoose_1.Types.ObjectId(String(target_college_id)) : null,
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
        const populated = await Notification_1.Notification.findById(notification._id)
            .populate('sender_id', 'full_name official_email')
            .populate('target_college_id', 'college_name college_code');
        return res.status(201).json({
            success: true,
            message: 'Notification broadcast successfully dispatched',
            data: populated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to broadcast notification' },
        });
    }
});
// ── NT-3: PATCH /api/v1/notifications/:id/read
// Mark notification as read for current user
app.patch('/api/v1/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        const notification = await Notification_1.Notification.findById(id);
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
            }
            else {
                notification.recipient_statuses.push({
                    user_id: new mongoose_1.Types.ObjectId(uIdStr),
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to mark notification as read' },
        });
    }
});
// ── NT-4: PATCH /api/v1/notifications/mark-all-read
// Mark all notifications as read for current user
app.patch('/api/v1/notifications/mark-all-read', async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'user_id is required' },
            });
        }
        const uId = new mongoose_1.Types.ObjectId(String(user_id));
        const now = new Date();
        await Notification_1.Notification.updateMany({ is_deleted: false, 'recipient_statuses.user_id': uId }, {
            $set: {
                'recipient_statuses.$[elem].status': 'read',
                'recipient_statuses.$[elem].read_at': now,
            },
        }, {
            arrayFilters: [{ 'elem.user_id': uId }],
        });
        return res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to mark all as read' },
        });
    }
});
// ── NT-5: PATCH /api/v1/notifications/:id/acknowledge
// Acknowledge or submit Meeting Attendance ("acknowledged", "will_attend", "cannot_attend")
app.patch('/api/v1/notifications/:id/acknowledge', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, response } = req.body;
        if (!user_id || !response) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'user_id and response are required' },
            });
        }
        const notification = await Notification_1.Notification.findById(id);
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
        }
        else {
            notification.recipient_statuses.push({
                user_id: new mongoose_1.Types.ObjectId(uIdStr),
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
    }
    catch (error) {
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
app.get('/api/v1/metadata/empty-mobiles', async (req, res) => {
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
        const companies = await CompanyMetadata_1.CompanyMetadata.find(emptyFilter)
            .sort({ serial_number: 1, _id: 1 })
            .select('serial_number company_name hr_name hr_designation primary_mobile mobile_numbers primary_email email_ids company_type location notes created_at');
        return res.status(200).json({
            success: true,
            data: {
                total: companies.length,
                companies,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch empty mobile contacts' },
        });
    }
});
// ── MD-0.1: ALL /api/v1/metadata/import-unique-companies
// Loads unique_companies_list.xlsx into Master Metadata and establishes it as the sole Recent Data batch
app.all('/api/v1/metadata/import-unique-companies', async (req, res) => {
    try {
        const result = await (0, loadUniqueCompanies_1.importUniqueCompaniesList)();
        return res.status(200).json({
            success: result.success,
            data: result,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'IMPORT_ERROR', message: error.message || 'Failed to import unique companies' },
        });
    }
});
// ── MD-0.2: ALL /api/v1/metadata/export-missing-excel
// Exports all contacts with missing mobiles into C:\Projects\iPOMS\missing.xlsx
app.all('/api/v1/metadata/export-missing-excel', async (req, res) => {
    try {
        const result = await (0, exportMissingMobiles_1.generateMissingMobilesExcel)();
        return res.status(200).json({
            success: result.success,
            data: result,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'EXPORT_ERROR', message: error.message || 'Failed to export missing mobiles Excel' },
        });
    }
});
// ── MD-0.3: ALL /api/v1/metadata/renumber
// Ensures continuous, unbroken sequential numbering 1..N across all metadata
app.all('/api/v1/metadata/renumber', async (req, res) => {
    try {
        const result = await (0, normalizeSerialNumbers_1.renumberCompanyMetadata)();
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'RENUMBER_ERROR', message: error.message || 'Failed to renumber metadata' },
        });
    }
});
// ── MD-1: GET /api/v1/metadata
// Searchable company & HR catalog with starts-with search, type filter, range selection (from_sno to_sno), pagination & recycle bin toggle
app.get('/api/v1/metadata', async (req, res) => {
    try {
        const { page = 1, limit = 50, q = '', type, is_deleted = 'false', from_sno, to_sno, } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        let limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 50));
        const filter = {
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
            }
            else {
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
            // Recent data includes all records from S.No 3548 (Crawl Corp India) upwards, including future additions
            if (!filter.serial_number) {
                filter.serial_number = { $gte: 3548 };
            }
            else {
                filter.serial_number.$gte = Math.max(filter.serial_number.$gte || 3548, 3548);
            }
        }
        // In Recent Data view, sort descending so the most recently added companies appear at the top
        const sortOrder = isRecent
            ? { serial_number: -1, _id: -1 }
            : { serial_number: 1, _id: 1 };
        const total = await CompanyMetadata_1.CompanyMetadata.countDocuments(filter);
        const companies = await CompanyMetadata_1.CompanyMetadata.find(filter)
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch metadata companies' },
        });
    }
});
// ── MD-2: POST /api/v1/metadata
// Add new company / HR contact with intelligent duplicate pre-validation (Spec Section 7 & 11)
app.post('/api/v1/metadata', async (req, res) => {
    try {
        const { company_name, hr_name = '', hr_designation = '', primary_mobile = '', mobile_numbers = [], primary_email = '', email_ids = [], company_type = 'other', notes = '', force_save = false, } = req.body;
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
            const existing = await CompanyMetadata_1.CompanyMetadata.findOne({
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
                }
                else {
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
        const highestDoc = await CompanyMetadata_1.CompanyMetadata.findOne({ serial_number: { $gt: 0 } }).sort({ serial_number: -1 }).select('serial_number');
        const nextSerial = (highestDoc?.serial_number || 0) + 1;
        const created = await CompanyMetadata_1.CompanyMetadata.create({
            serial_number: nextSerial,
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create metadata record' },
        });
    }
});
// ── MD-3: PATCH /api/v1/metadata/:id
// Update company / HR contact details
app.patch('/api/v1/metadata/:id', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req, res) => {
    try {
        const { id } = req.params;
        const { company_name, hr_name, hr_designation, primary_mobile, mobile_numbers, primary_email, email_ids, company_type, notes, } = req.body;
        const record = await CompanyMetadata_1.CompanyMetadata.findById(id);
        if (!record || record.is_deleted) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Metadata record not found' },
            });
        }
        if (company_name !== undefined)
            record.company_name = company_name.trim();
        if (hr_name !== undefined)
            record.hr_name = hr_name.trim();
        if (hr_designation !== undefined)
            record.hr_designation = hr_designation.trim();
        if (primary_mobile !== undefined) {
            record.primary_mobile = primary_mobile.trim();
            record.mobile_numbers = Array.from(new Set([record.primary_mobile, ...(mobile_numbers || record.mobile_numbers)].filter(Boolean)));
        }
        if (primary_email !== undefined) {
            record.primary_email = primary_email.trim().toLowerCase();
            record.email_ids = Array.from(new Set([record.primary_email, ...(email_ids || record.email_ids)].filter(Boolean)));
        }
        if (company_type !== undefined)
            record.company_type = company_type.toLowerCase();
        if (notes !== undefined)
            record.notes = notes.trim();
        await record.save();
        return res.status(200).json({
            success: true,
            message: `Metadata for "${record.company_name}" updated successfully`,
            data: record,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update metadata record' },
        });
    }
});
// ── MD-4: DELETE /api/v1/metadata/:id
// Soft delete record to Recycle Bin (Spec Section 17)
app.delete('/api/v1/metadata/:id', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req, res) => {
    try {
        const { id } = req.params;
        const record = await CompanyMetadata_1.CompanyMetadata.findById(id);
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to soft delete metadata record' },
        });
    }
});
// ── MD-5: POST /api/v1/metadata/:id/restore
// Restore record from Recycle Bin (Spec Section 17)
app.post('/api/v1/metadata/:id/restore', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req, res) => {
    try {
        const { id } = req.params;
        const record = await CompanyMetadata_1.CompanyMetadata.findById(id);
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to restore metadata record' },
        });
    }
});
// ── MD-6: DELETE /api/v1/metadata/:id/purge
// Permanently purge record from database (Spec Section 17)
app.delete('/api/v1/metadata/:id/purge', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const record = await CompanyMetadata_1.CompanyMetadata.findByIdAndDelete(id);
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to purge metadata record' },
        });
    }
});
// ── MD-7: POST /api/v1/metadata/bulk-import
// Bulk paste / Excel import endpoint with row-by-row intelligent deduplication & append merging
app.post('/api/v1/metadata/bulk-import', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER', 'TEAM_LEAD', 'PLACEMENT_COORDINATOR', 'COORDINATOR'), async (req, res) => {
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
        const details = [];
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
                ? rawMobile.split(/[,;\/]+/).map((s) => s.trim()).filter((s) => s.length >= 5)
                : [];
            // Parse and clean all emails in the row
            const incomingEmails = rawEmail
                ? rawEmail.split(/[,;\/]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.includes('@'))
                : [];
            // Check if company already exists in database (case-insensitive)
            const existing = await CompanyMetadata_1.CompanyMetadata.findOne({
                is_deleted: false,
                company_name: { $regex: new RegExp(`^${escapeRegex(cName)}$`, 'i') },
            });
            if (existing) {
                // Collect all existing mobile numbers for this company
                const existingMobiles = Array.from(new Set([existing.primary_mobile, ...(existing.mobile_numbers || [])].map((m) => (m || '').trim()).filter(Boolean)));
                // Collect all existing emails for this company
                const existingEmails = Array.from(new Set([existing.primary_email, ...(existing.email_ids || [])].map((e) => (e || '').trim().toLowerCase()).filter(Boolean)));
                // Check for new mobile numbers not already recorded
                const newMobiles = incomingMobiles.filter((m) => !existingMobiles.includes(m));
                // Check for new emails not already recorded
                const newEmails = incomingEmails.filter((e) => !existingEmails.includes(e));
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
            }
            else {
                // RULE 4: Brand new company -> INSERT
                const highestDoc = await CompanyMetadata_1.CompanyMetadata.findOne({ serial_number: { $gt: 0 } }).sort({ serial_number: -1 }).select('serial_number');
                const nextSerial = (highestDoc?.serial_number || 0) + 1;
                await CompanyMetadata_1.CompanyMetadata.create({
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
    }
    catch (error) {
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
app.get('/api/v1/users', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        const { q, role, status, page = 1, limit = 50 } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
        const skip = (pageNum - 1) * limitNum;
        const filter = {};
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
            }
            else {
                filter.account_status = status;
                filter.is_deleted = false;
            }
        }
        const total = await User_1.User.countDocuments(filter);
        const users = await User_1.User.find(filter)
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch users' },
        });
    }
});
// ── US-2: POST /api/v1/users
// Create new user (with bcrypt password hashing & role association)
app.post('/api/v1/users', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER'), async (req, res) => {
    try {
        const { full_name, username, official_email, personal_email = '', password = 'Password@123', 
        // Canonical code, not the legacy `COORDINATOR` alias — defaulting to the
        // alias re-introduced the exact role-code drift `fixRoleCodes` cleaned up,
        // leaving new accounts with a role absent from the `roles` collection.
        role_codes = ['PLACEMENT_COORDINATOR'], assigned_college_ids = [], primary_mobile = '', employee_id = '', account_status = 'active', } = req.body;
        if (!full_name || !username || !official_email) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'full_name, username, and official_email are mandatory' },
            });
        }
        // A Team Leader may create coordinators, never an administrator or
        // another Team Leader.
        if ((0, routePolicy_1.refuseRoleEscalation)(req, res, role_codes))
            return;
        // Check duplicate username or email
        const existing = await User_1.User.findOne({
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
        const salt = await bcryptjs_1.default.genSalt(10);
        const password_hash = await bcryptjs_1.default.hash(password, salt);
        // Find role ObjectIds
        const roles = await Role_1.Role.find({ role_code: { $in: role_codes } });
        const roleIds = roles.map((r) => r._id);
        const user = await User_1.User.create({
            full_name: full_name.trim(),
            username: username.trim().toLowerCase(),
            official_email: official_email.trim().toLowerCase(),
            personal_email: personal_email.trim().toLowerCase(),
            password_hash,
            role_codes,
            role_ids: roleIds,
            assigned_college_ids: assigned_college_ids.map((id) => new mongoose_1.Types.ObjectId(id)),
            primary_mobile: primary_mobile.trim(),
            employee_id: employee_id.trim(),
            account_status,
            presence_status: 'available',
            is_deleted: false,
        });
        const populated = await User_1.User.findById(user._id)
            .select('-password_hash')
            .populate('assigned_college_ids', 'college_name college_code')
            .populate('role_ids', 'role_name role_code');
        return res.status(201).json({
            success: true,
            message: `User account for "${full_name}" created successfully`,
            data: populated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create user' },
        });
    }
});
// ── US-3: PATCH /api/v1/users/:id
// Update user profile, password, role, assigned colleges, or account status
app.patch('/api/v1/users/:id', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN', 'TEAM_LEADER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, personal_email, primary_mobile, secondary_mobile, alternate_mobile, employee_id, linkedin_profile, date_of_birth, date_of_joining, is_profile_locked, assigned_college_ids, role_codes, account_status, presence_status, password, } = req.body;
        const user = await User_1.User.findById(id);
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
        if ((0, routePolicy_1.refuseRoleEscalation)(req, res, role_codes))
            return;
        const grantable = (0, routePolicy_1.assignableRoles)(req);
        const targetRoles = (user.role_codes || []).map(routePolicy_1.normalizeRole).filter(Boolean);
        if (targetRoles.some((r) => !grantable.includes(r))) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN_PRIVILEGED_TARGET',
                    message: 'You do not have permission to modify this account.',
                },
            });
        }
        if (full_name !== undefined)
            user.full_name = full_name.trim();
        if (personal_email !== undefined)
            user.personal_email = personal_email.trim().toLowerCase();
        if (primary_mobile !== undefined)
            user.primary_mobile = primary_mobile.trim();
        if (secondary_mobile !== undefined)
            user.secondary_mobile = secondary_mobile.trim();
        if (alternate_mobile !== undefined)
            user.alternate_mobile = alternate_mobile.trim();
        if (employee_id !== undefined)
            user.employee_id = employee_id.trim();
        if (linkedin_profile !== undefined)
            user.linkedin_profile = linkedin_profile.trim();
        if (date_of_birth !== undefined)
            user.date_of_birth = date_of_birth ? new Date(date_of_birth) : null;
        if (date_of_joining !== undefined)
            user.date_of_joining = date_of_joining ? new Date(date_of_joining) : null;
        if (is_profile_locked !== undefined) {
            user.is_profile_locked = Boolean(is_profile_locked);
            if (!is_profile_locked) {
                user.profile_locked_at = null;
            }
            else {
                user.profile_locked_at = user.profile_locked_at || new Date();
            }
        }
        if (account_status !== undefined)
            user.account_status = account_status;
        if (presence_status !== undefined)
            user.presence_status = presence_status;
        if (assigned_college_ids !== undefined) {
            user.assigned_college_ids = assigned_college_ids.map((cId) => new mongoose_1.Types.ObjectId(cId));
        }
        if (role_codes !== undefined) {
            user.role_codes = role_codes;
            const roles = await Role_1.Role.find({ role_code: { $in: role_codes } });
            user.role_ids = roles.map((r) => r._id);
        }
        if (password && password.trim()) {
            const salt = await bcryptjs_1.default.genSalt(10);
            user.password_hash = await bcryptjs_1.default.hash(password.trim(), salt);
            user.last_password_changed_at = new Date();
        }
        await user.save();
        const populated = await User_1.User.findById(user._id)
            .select('-password_hash')
            .populate('assigned_college_ids', 'college_name college_code')
            .populate('role_ids', 'role_name role_code');
        return res.status(200).json({
            success: true,
            message: `User profile for "${user.full_name}" updated successfully`,
            data: populated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update user' },
        });
    }
});
// ── GET /api/v1/profile/:id — Fetch personal profile
app.get('/api/v1/profile/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Here :id IS the owner's own id (a profile is keyed by user id), unlike
        // the daily-tracker rows below where :id addresses a row and its owner
        // must be read from the fetched document instead.
        if ((0, routePolicy_1.refuseForeignOwner)(req, res, id, 'You can only access your own profile.'))
            return;
        const user = await User_1.User.findById(id)
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to load profile' },
        });
    }
});
// ── PATCH /api/v1/profile/:id — Self-service profile update with 30-day photo change rule
app.patch('/api/v1/profile/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if ((0, routePolicy_1.refuseForeignOwner)(req, res, id, 'You can only access your own profile.'))
            return;
        const { primary_mobile, secondary_mobile, alternate_mobile, personal_email, residential_address, address_line, pincode, city, state, linkedin_profile, date_of_birth, date_of_joining, profile_photo_url, password, } = req.body;
        const user = await User_1.User.findById(id);
        if (!user || user.is_deleted) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' },
            });
        }
        const isCurrentlyLocked = Boolean(user.is_profile_locked);
        // If profile is already locked, protect the 5 immutable fields from modification
        if (!isCurrentlyLocked) {
            if (primary_mobile !== undefined && String(primary_mobile).trim())
                user.primary_mobile = String(primary_mobile).trim();
            if (personal_email !== undefined && String(personal_email).trim())
                user.personal_email = String(personal_email).trim().toLowerCase();
            if (linkedin_profile !== undefined && String(linkedin_profile).trim())
                user.linkedin_profile = String(linkedin_profile).trim();
            if (date_of_birth !== undefined && date_of_birth)
                user.date_of_birth = new Date(date_of_birth);
            if (date_of_joining !== undefined && date_of_joining)
                user.date_of_joining = new Date(date_of_joining);
        }
        // Editable contact & location fields
        if (alternate_mobile !== undefined) {
            user.alternate_mobile = String(alternate_mobile).trim();
            user.secondary_mobile = String(alternate_mobile).trim();
        }
        else if (secondary_mobile !== undefined) {
            user.secondary_mobile = String(secondary_mobile).trim();
            user.alternate_mobile = String(secondary_mobile).trim();
        }
        if (residential_address !== undefined)
            user.residential_address = String(residential_address).trim();
        if (address_line !== undefined)
            user.address_line = String(address_line).trim();
        if (pincode !== undefined)
            user.pincode = String(pincode).trim();
        if (city !== undefined)
            user.city = String(city).trim();
        if (state !== undefined)
            user.state = String(state).trim();
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
            }
            else {
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
            if (!(0, passwordPolicy_1.isPasswordValid)(trimmedPassword)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'PASSWORD_POLICY',
                        message: (0, passwordPolicy_1.firstPasswordError)(trimmedPassword) || 'Password does not meet the policy.',
                    },
                });
            }
            const isUserAdmin = (user.role_codes || []).some((r) => r === 'ADMINISTRATOR' || r === 'ADMIN');
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
            const salt = await bcryptjs_1.default.genSalt(12);
            user.password_hash = await bcryptjs_1.default.hash(trimmedPassword, salt);
            user.last_password_changed_at = new Date();
            if (!isUserAdmin) {
                user.monthly_password_changes_count = (user.monthly_password_changes_count || 0) + 1;
                user.last_password_change_month = currentMonthStr;
            }
        }
        // Lock profile permanently once personal fields are updated
        const touchedPersonalFields = primary_mobile !== undefined ||
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
        const populated = await User_1.User.findById(user._id)
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update profile' },
        });
    }
});
// ── PATCH /api/v1/users/:id/unlock-profile — Administrator unlocks coordinator's profile
app.patch('/api/v1/users/:id/unlock-profile', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
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
        await (0, audit_1.writeAudit)({
            action: 'STATUS_CHANGE',
            result: 'SUCCESS',
            entityType: 'User',
            entityId: user._id,
            performedBy: req.user?._id || null,
            performedByRole: req.user?.role_codes?.[0] || 'ADMINISTRATOR',
            performedByEmail: req.user?.email || '',
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to unlock profile' },
        });
    }
});
// ── US-4: DELETE /api/v1/users/:id
// Soft delete / deactivate user (with 7-day restore window)
app.delete('/api/v1/users/:id', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
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
        await (0, audit_1.writeAudit)({
            action: 'STATUS_CHANGE',
            result: 'SUCCESS',
            entityType: 'User',
            entityId: user._id,
            performedBy: req.user?._id || null,
            performedByRole: req.user?.role_codes?.[0] || 'ADMINISTRATOR',
            performedByEmail: req.user?.email || '',
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to deactivate user' },
        });
    }
});
// ── US-5: PATCH /api/v1/users/:id/restore — Administrator restores deactivated user within 1 week (7 days)
app.patch('/api/v1/users/:id/restore', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.User.findById(id);
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
        await (0, audit_1.writeAudit)({
            action: 'STATUS_CHANGE',
            result: 'SUCCESS',
            entityType: 'User',
            entityId: user._id,
            performedBy: req.user?._id || null,
            performedByRole: req.user?.role_codes?.[0] || 'ADMINISTRATOR',
            performedByEmail: req.user?.email || '',
            module: 'UserManagement',
            severity: 'info',
            summary: `Deactivated user "${user.full_name}" successfully restored to Active by administrator.`,
            req,
        });
        const populated = await User_1.User.findById(user._id)
            .select('-password_hash')
            .populate('assigned_college_ids', 'college_name college_code')
            .populate('role_ids', 'role_name role_code');
        return res.status(200).json({
            success: true,
            message: `User account "${user.full_name}" has been successfully restored to Active status!`,
            data: populated,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to restore user' },
        });
    }
});
// ── RO-1: GET /api/v1/roles
// List all system roles and permissions matrix (Spec Section 8)
app.get('/api/v1/roles', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        const roles = await Role_1.Role.find({ status: 'active' }).sort({ role_code: 1 });
        return res.status(200).json({
            success: true,
            data: {
                total: roles.length,
                roles,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch roles' },
        });
    }
});
// ── RO-2: PATCH /api/v1/roles/:id
// Update role permissions
app.patch('/api/v1/roles/:id', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions, description } = req.body;
        const role = await Role_1.Role.findById(id);
        if (!role) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Role not found' },
            });
        }
        if (permissions !== undefined)
            role.permissions = permissions;
        if (description !== undefined)
            role.description = description.trim();
        await role.save();
        return res.status(200).json({
            success: true,
            message: `Permissions updated for role "${role.role_name}"`,
            data: role,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update role' },
        });
    }
});
// ── ST-1: GET /api/v1/settings
// Fetch global system settings (creates default if none exist)
app.get('/api/v1/settings', authMiddleware_1.authenticateJWT, async (req, res) => {
    try {
        let settings = await SystemSettings_1.SystemSettings.findOne({});
        if (!settings) {
            settings = await SystemSettings_1.SystemSettings.create({
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
            });
        }
        // Maintenance mode is time-windowed: the toggle can be left on but only
        // actually bite while now() is inside [start_time, end_time]. Compute the
        // effective state here so both the settings screen and the enforcement
        // middleware agree on what "currently in effect" means.
        // ── Real System Health & Telemetry Calculation ──
        const now = new Date();
        const isDbConnected = mongoose_1.default.connection.readyState === 1;
        const maintenanceInEffect = !!settings.maintenance_mode_enabled &&
            (!settings.maintenance_start_time || new Date(settings.maintenance_start_time) <= now) &&
            (!settings.maintenance_end_time || new Date(settings.maintenance_end_time) >= now);
        // ── Headcount & Organization Snapshot ──
        const [totalUsers, totalCoordinators, partialWorkingUsers, onLeaveUsers, blockedUsers, deactivatedUsers, totalCompanies, totalColleges, totalHrContacts, reportsGeneratedCount, totalCallsCount, totalWeeklyCount, totalDailyLeadsCount, totalActiveLeadsCount,] = await Promise.all([
            User_1.User.countDocuments({ is_deleted: false }),
            User_1.User.countDocuments({ is_deleted: false, role_codes: 'PLACEMENT_COORDINATOR' }),
            User_1.User.countDocuments({ is_deleted: false, account_status: 'partial_working' }),
            User_1.User.countDocuments({ is_deleted: false, account_status: 'on_leave' }),
            User_1.User.countDocuments({ is_deleted: false, $or: [{ account_status: 'blocked' }, { is_password_locked: true }] }),
            User_1.User.countDocuments({ $or: [{ is_deleted: true }, { account_status: 'deactivated' }] }),
            CompanyMetadata_1.CompanyMetadata.countDocuments({ is_deleted: false }),
            College_1.College.countDocuments({ status: 'active' }),
            CompanyMetadata_1.CompanyMetadata.countDocuments({ is_deleted: false, hr_name: { $exists: true, $ne: '' } }),
            ReportLibrary_1.ReportLibrary.countDocuments({ is_deleted: false }),
            DailyTracker_1.DailyTracker.countDocuments({ is_deleted: false }),
            WeeklyTracker_1.WeeklyTracker.countDocuments({ is_deleted: false }),
            DailyLead_1.DailyLead.countDocuments({ is_deleted: false }),
            ActiveLead_1.ActiveLead.countDocuments({ is_deleted: false }),
        ]);
        // ── Data Quality Aggregations ──
        const [duplicateCompanyGroups, missingMobilesCount, missingEmailsCount, missingHrCount] = await Promise.all([
            CompanyMetadata_1.CompanyMetadata.aggregate([
                { $match: { is_deleted: false } },
                { $group: { _id: { $toLower: { $trim: { input: '$company_name' } } }, count: { $sum: 1 } } },
                { $match: { count: { $gt: 1 } } },
            ]),
            CompanyMetadata_1.CompanyMetadata.countDocuments({
                is_deleted: false,
                $or: [{ mobile_number: { $exists: false } }, { mobile_number: '' }, { mobile_number: null }],
            }),
            CompanyMetadata_1.CompanyMetadata.countDocuments({
                is_deleted: false,
                $or: [{ email_id: { $exists: false } }, { email_id: '' }, { email_id: null }],
            }),
            CompanyMetadata_1.CompanyMetadata.countDocuments({
                is_deleted: false,
                $or: [{ hr_name: { $exists: false } }, { hr_name: '' }, { hr_name: null }],
            }),
        ]);
        const duplicateCompaniesCount = duplicateCompanyGroups.length;
        const totalDefects = (missingMobilesCount * 0.4) + (missingEmailsCount * 0.3) + (missingHrCount * 0.2) + (duplicateCompaniesCount * 0.1);
        const qualityScorePct = totalCompanies > 0 ? Math.max(10, Math.min(100, Math.round(100 - (totalDefects / totalCompanies) * 100))) : 100;
        // Determine Dynamic Health Status Banner
        let healthStatus = 'healthy';
        let healthMessage = 'All systems normal — database connected, nightly jobs active, data quality optimal.';
        if (!isDbConnected) {
            healthStatus = 'action_required';
            healthMessage = 'Critical Alert: Database connection lost or degraded. Immediate inspection required.';
        }
        else if (maintenanceInEffect) {
            healthStatus = 'attention_required';
            healthMessage = `Maintenance Active: ${settings.maintenance_reason || 'Scheduled system maintenance in progress.'}`;
        }
        else if (qualityScorePct < 80 || duplicateCompaniesCount > 5) {
            healthStatus = 'attention_required';
            healthMessage = `Attention Required: Data quality index at ${qualityScorePct}% with ${duplicateCompaniesCount} duplicate companies. Review recommended.`;
        }
        const totalDocs = totalCompanies + totalCallsCount + totalWeeklyCount + totalDailyLeadsCount + totalActiveLeadsCount + totalUsers + totalColleges + reportsGeneratedCount;
        const estimatedDbSizeMb = (totalDocs * 0.0025).toFixed(2);
        return res.status(200).json({
            success: true,
            data: {
                settings,
                system_health: {
                    status: healthStatus,
                    status_message: healthMessage,
                    db_connected: isDbConnected,
                    db_name: mongoose_1.default.connection.name || 'ipoms_db',
                    db_readyState: mongoose_1.default.connection.readyState,
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
                    companies_growth_pct: 4.8,
                    hr_contacts_growth_pct: 6.2,
                    reports_growth_pct: 12.5,
                },
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch system settings' },
        });
    }
});
// ── ST-2: PATCH /api/v1/settings
// Update global system settings
app.patch('/api/v1/settings', authMiddleware_1.authenticateJWT, (0, authMiddleware_1.authorizeRoles)('ADMINISTRATOR', 'ADMIN'), async (req, res) => {
    try {
        const { academic_year, season_name, daily_calling_target, working_days, org_name, org_support_email, org_support_phone, theme_default, default_landing_page, enable_email_notifications, enable_system_notifications, enable_dashboard_popups, maintenance_mode_enabled, maintenance_affected_roles, maintenance_reason, maintenance_start_time, maintenance_end_time, } = req.body;
        let settings = await SystemSettings_1.SystemSettings.findOne({});
        if (!settings) {
            settings = new SystemSettings_1.SystemSettings({});
        }
        if (academic_year !== undefined)
            settings.academic_year = academic_year.trim();
        if (season_name !== undefined)
            settings.season_name = season_name.trim();
        if (daily_calling_target !== undefined)
            settings.daily_calling_target = Number(daily_calling_target);
        if (working_days !== undefined)
            settings.working_days = working_days;
        if (org_name !== undefined)
            settings.org_name = org_name.trim();
        if (org_support_email !== undefined)
            settings.org_support_email = org_support_email.trim().toLowerCase();
        if (org_support_phone !== undefined)
            settings.org_support_phone = org_support_phone.trim();
        if (theme_default !== undefined)
            settings.theme_default = theme_default;
        if (default_landing_page !== undefined)
            settings.default_landing_page = default_landing_page;
        if (enable_email_notifications !== undefined)
            settings.enable_email_notifications = !!enable_email_notifications;
        if (enable_system_notifications !== undefined)
            settings.enable_system_notifications = !!enable_system_notifications;
        if (enable_dashboard_popups !== undefined)
            settings.enable_dashboard_popups = !!enable_dashboard_popups;
        if (maintenance_mode_enabled !== undefined)
            settings.maintenance_mode_enabled = !!maintenance_mode_enabled;
        if (maintenance_affected_roles !== undefined)
            settings.maintenance_affected_roles = maintenance_affected_roles;
        if (maintenance_reason !== undefined)
            settings.maintenance_reason = maintenance_reason.trim();
        if (maintenance_start_time !== undefined)
            settings.maintenance_start_time = maintenance_start_time ? new Date(maintenance_start_time) : null;
        if (maintenance_end_time !== undefined)
            settings.maintenance_end_time = maintenance_end_time ? new Date(maintenance_end_time) : null;
        await settings.save();
        await (0, audit_1.writeAudit)({
            action: 'STATUS_CHANGE',
            result: 'SUCCESS',
            entityType: 'SystemSettings',
            entityId: settings._id,
            performedBy: req.user?._id || null,
            performedByRole: req.user?.role_codes?.[0] || 'ADMINISTRATOR',
            performedByEmail: req.user?.email || '',
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update system settings' },
        });
    }
});
// Inspect Weekly Report Excel File
app.get('/api/v1/weekly-tracker-import/inspect', async (req, res) => {
    try {
        const candidatePaths = [
            'C:\\Users\\admin\\Downloads\\Weekly .xlsx',
            'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH (1).xlsx',
            'C:\\Users\\admin\\Downloads\\Weekly Report 2027 BATCH.xlsx',
            'C:\\Users\\admin\\Downloads\\Weekly Report.xlsx',
        ];
        const filePath = candidatePaths.find((p) => fs_1.default.existsSync(p)) || candidatePaths[0];
        const workbook = xlsx.readFile(filePath);
        const targetSheet = String(req.query.sheet || '').trim();
        if (targetSheet && workbook.Sheets[targetSheet]) {
            const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[targetSheet], { header: 1 });
            return res.json({
                success: true,
                sheetName: targetSheet,
                totalRows: rawData.length,
                rows: rawData,
            });
        }
        const summary = workbook.SheetNames.map((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            return {
                sheetName,
                totalRows: rawData.length,
                sampleRows: rawData.filter((r) => r && r.length > 0).slice(0, 30),
            };
        });
        return res.json({ success: true, sheetNames: workbook.SheetNames, sheets: summary });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
const SECTION_HEADERS_MAP = [
    { pattern: /companies\s+completed/i, section: 'completed' },
    { pattern: /companies\s+in\s+progress/i, section: 'in_progress' },
    { pattern: /companies\s+in\s+pipeline/i, section: 'pipeline' },
    { pattern: /top\s+companies/i, section: 'top_companies' },
    { pattern: /companies\s+on\s+hold\s+by\s+hr|rejected\s+companies/i, section: 'rejected_by_hr' },
    { pattern: /companies\s+on\s+hold\s+by\s+college|rejected\s+by\s+college/i, section: 'rejected_by_college' },
];
function parseWeeklySheet(sheet) {
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const entries = [];
    let currentSection = null;
    let headerMap = {};
    for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0)
            continue;
        const strRow = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ''));
        const joinedRow = strRow.join(' ').trim();
        if (!joinedRow)
            continue;
        // Check if section header
        let detectedSection = null;
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
        if (strRow.some((c) => /s\.?\s*no|si\.?\s*no/i.test(c)) &&
            strRow.some((c) => /company/i.test(c))) {
            headerMap = {};
            strRow.forEach((colName, colIdx) => {
                const lower = colName.toLowerCase().trim();
                if (/s\.?\s*no|si\.?\s*no/i.test(lower))
                    headerMap['sNo'] = colIdx;
                else if (/company\s*name|company/i.test(lower))
                    headerMap['companyName'] = colIdx;
                else if (/role/i.test(lower))
                    headerMap['role'] = colIdx;
                else if (/ctc/i.test(lower))
                    headerMap['ctc'] = colIdx;
                else if (/status/i.test(lower))
                    headerMap['status'] = colIdx;
                else if (/offers|no\s+of\s+offers/i.test(lower))
                    headerMap['offers'] = colIdx;
                else if (/follow\s*up/i.test(lower))
                    headerMap['followUp'] = colIdx;
                else if (/batch/i.test(lower))
                    headerMap['batch'] = colIdx;
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
            if (lowerComp === 'status' ||
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
                lowerComp.startsWith('completed count')) {
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
            let parsedFollowUpDate = '';
            if (followUpVal) {
                const num = Number(followUpVal);
                if (!isNaN(num) && num > 40000 && num < 60000) {
                    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
                    parsedFollowUpDate = d.toISOString().split('T')[0];
                }
                else {
                    parsedFollowUpDate = String(followUpVal).trim();
                }
            }
            let finalSection = currentSection;
            if (currentSection === 'rejected_by_hr' &&
                /rejected by (the )?college|response from (the )?college|college in connect|low package|bda role|tpo/i.test(cleanStatus)) {
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
app.all('/api/v1/weekly-tracker-import/sheet', async (req, res) => {
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
        const filePath = candidatePaths.find((p) => fs_1.default.existsSync(p)) || candidatePaths[0];
        const workbook = xlsx.readFile(filePath);
        const matchedSheetKey = workbook.SheetNames.find((s) => s.trim().toLowerCase() === sheetName.trim().toLowerCase());
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
        let college = await College_1.College.findOne({
            $or: [
                { college_code: normalizedKey },
                { college_code: new RegExp(`^${normalizedKey}$`, 'i') },
                { college_name: new RegExp(normalizedKey, 'i') },
            ],
        });
        if (!college) {
            const ALIAS_MAP = {
                ACHARIYA: 'ACET',
                KARPAGAM: 'KARPAGAM',
                'MAR EPHRAEM': 'MAR',
                EGS: 'EGS',
            };
            const mappedCode = ALIAS_MAP[normalizedKey];
            if (mappedCode) {
                college = await College_1.College.findOne({ college_code: mappedCode });
            }
        }
        if (!college) {
            college = await College_1.College.findOne();
        }
        if (!college) {
            return res.status(404).json({ success: false, error: `No college record found for sheet '${sheetName}'.` });
        }
        // Find Coordinator
        let coordinator = await User_1.User.findOne({
            $or: [{ username: 'megaladevi' }, { role_codes: 'PLACEMENT_COORDINATOR' }],
        });
        if (!coordinator) {
            coordinator = await User_1.User.findOne();
        }
        // Remove existing entries for this college to prevent duplicate entries
        await WeeklyTracker_1.WeeklyTracker.deleteMany({
            college_id: college._id,
            academic_year: 2026,
        });
        const sectionsBreakdown = {
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
            let compMeta = await CompanyMetadata_1.CompanyMetadata.findOne({
                company_name: new RegExp(`^${entry.companyName.trim()}$`, 'i'),
            });
            if (!compMeta) {
                compMeta = await CompanyMetadata_1.CompanyMetadata.create({
                    company_name: entry.companyName.trim(),
                    company_type: 'software',
                    industry_sector: 'Information Technology',
                });
            }
            await WeeklyTracker_1.WeeklyTracker.create({
                academic_year: 2026,
                college_id: college._id,
                coordinator_id: coordinator?._id,
                company_id: compMeta._id,
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
        const validEntries = parsedEntries.filter((e) => e.companyName.toLowerCase() !== 'status' && e.companyName.toLowerCase() !== 'count');
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
    }
    catch (err) {
        console.error('❌ Weekly import error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
// Reload All 2027 Batch Weekly Tracker Data from Excel (Skipping Pending Sheet)
app.all('/api/v1/weekly-tracker-import/reload-all-2027', async (req, res) => {
    try {
        const customPath = req.query.file ? String(req.query.file) : undefined;
        const result = await (0, reloadWeeklyTracker2027_1.reloadWeeklyTrackerFrom2027Workbook)(customPath);
        return res.json(result);
    }
    catch (err) {
        console.error('❌ Weekly tracker reload error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
// Reload Meta Database from Excel
app.all('/api/v1/metadata/reload', async (req, res) => {
    try {
        const customPath = req.query.file ? String(req.query.file) : undefined;
        const result = await (0, reloadMetaDatabase_1.reloadMetaDatabaseFromFile)(customPath);
        return res.json(result);
    }
    catch (err) {
        console.error('❌ Meta Database reload error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
// Centralized 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Cannot ${req.method} ${req.originalUrl}`,
        },
    });
});
// 5. Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ [Unhandled Server Error]:', err);
    res.status(500).json({
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
        const roleMap = {};
        for (const r of systemRoles) {
            let roleDoc = await Role_1.Role.findOne({ role_code: r.role_code });
            if (!roleDoc) {
                roleDoc = await Role_1.Role.create({ ...r, status: 'active', is_system_role: true });
            }
            roleMap[r.role_code] = roleDoc._id;
        }
        // 2. Fetch Colleges
        const allColleges = await College_1.College.find({ is_deleted: { $ne: true } });
        const collegeIds = allColleges.map((c) => c._id);
        // 3. Hash Default Password
        const defaultPassword = 'iPOMS@123';
        const salt = await bcryptjs_1.default.genSalt(12);
        const passwordHash = await bcryptjs_1.default.hash(defaultPassword, salt);
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
            const purgeResult = await User_1.User.deleteMany({
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
        const allUserIds = [];
        const createdUserIds = [];
        for (const u of defaultUsers) {
            const roleIds = u.role_codes.map((rc) => roleMap[rc]).filter(Boolean);
            let userDoc = await User_1.User.findOne({
                $or: [{ official_email: u.official_email.toLowerCase() }, { username: u.username.toLowerCase() }],
            });
            if (userDoc) {
                // Link any missing role IDs if empty
                if (!userDoc.role_ids || userDoc.role_ids.length === 0) {
                    const ownRoleCodes = userDoc.role_codes?.length ? userDoc.role_codes : u.role_codes;
                    const repaired = ownRoleCodes.map((rc) => roleMap[rc]).filter(Boolean);
                    if (repaired.length > 0) {
                        userDoc.role_ids = repaired;
                        await userDoc.save();
                        console.log(`🔧 [Accounts] Relinked role_ids for ${userDoc.official_email} (${ownRoleCodes.join(', ')}).`);
                    }
                }
                // Assign default colleges only if user has no assigned colleges and is Admin
                if (collegeIds.length > 0 && (!userDoc.assigned_college_ids || userDoc.assigned_college_ids.length === 0)) {
                    if (u.role_codes.includes('ADMINISTRATOR') || u.role_codes.includes('ADMIN')) {
                        userDoc.assigned_college_ids = collegeIds;
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
                        userDoc.assigned_college_ids = collegeIds;
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
            }
            else {
                const isAdmin = u.role_codes.includes('ADMINISTRATOR') || u.role_codes.includes('ADMIN');
                const created = await User_1.User.create({
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
        // Sujitha handles: NEHRU, KPR (partially with Mohanaradha), SONA, MAREPHRA
        // Mohanaradha handles: KARPAGAM, AIHT, ACET, KPR (partially with Sujitha)
        const DEFAULT_COORDINATOR_COLLEGE_MAP = {
            'sujitha_s@infoziant.com': ['NEHRU', 'KPR', 'SONA', 'MAREPHRA'],
            'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
            'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
            'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
            'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
            'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ'],
            'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
        };
        // Ensure Master Admin has all colleges with weekly_focus_locked = false
        const adminUsers = await User_1.User.find({
            role_codes: { $in: ['ADMINISTRATOR', 'ADMIN'] },
            is_deleted: false,
        });
        const adminUserIds = adminUsers.map((u) => u._id);
        if (collegeIds.length > 0 && adminUserIds.length > 0) {
            await College_1.College.updateMany({ _id: { $in: collegeIds } }, { $addToSet: { assigned_coordinator_ids: { $each: adminUserIds } } });
            await User_1.User.updateMany({ _id: { $in: adminUserIds } }, { $set: { assigned_college_ids: collegeIds, weekly_focus_locked: false } });
        }
        // Ensure Team Leader and coordinators have their official focus colleges mapped and locked
        const activeCollegesList = await College_1.College.find({ status: 'active' });
        const codeMap = new Map();
        activeCollegesList.forEach((c) => codeMap.set(c.college_code.toUpperCase(), c._id));
        const currentWeekMonday = getWeekMondayKey();
        for (const [email, codes] of Object.entries(DEFAULT_COORDINATOR_COLLEGE_MAP)) {
            const coordUser = await User_1.User.findOne({ official_email: email.toLowerCase(), is_deleted: false });
            if (coordUser) {
                const mappedIds = codes.map((c) => codeMap.get(c.toUpperCase())).filter(Boolean);
                if (!coordUser.assigned_college_ids || coordUser.assigned_college_ids.length === 0 || coordUser.assigned_college_ids.length > 4) {
                    coordUser.assigned_college_ids = mappedIds;
                    coordUser.weekly_focus_locked = true;
                    coordUser.weekly_focus_week_key = currentWeekMonday;
                    coordUser.weekly_focus_locked_at = new Date();
                    await coordUser.save();
                    await College_1.College.updateMany({ _id: { $in: mappedIds } }, { $addToSet: { assigned_coordinator_ids: coordUser._id } });
                }
            }
        }
        if (createdUserIds.length > 0) {
            console.log(`✅ [iPOMS] Created ${createdUserIds.length} missing default account(s) with password: ${defaultPassword}`);
        }
        console.log(`✅ [iPOMS] Default accounts verified (${allUserIds.length} present). Leadership linked to all colleges; coordinators manage distinct default focus colleges.`);
    }
    catch (err) {
        console.error('❌ Error in ensureDefaultAccounts:', err);
    }
};
// Ensure all existing CompanyMetadata records have valid sequential serial numbers
const ensureCompanyMetadataSerialNumbers = async () => {
    try {
        const unnumberedCount = await CompanyMetadata_1.CompanyMetadata.countDocuments({
            $or: [{ serial_number: { $exists: false } }, { serial_number: null }, { serial_number: 0 }],
        });
        if (unnumberedCount > 0) {
            console.log(`🔧 [iPOMS] Found ${unnumberedCount} company metadata records without serial number. Assigning sequential serial numbers...`);
            const highestDoc = await CompanyMetadata_1.CompanyMetadata.findOne({ serial_number: { $gt: 0 } }).sort({ serial_number: -1 }).select('serial_number');
            let currentSerial = highestDoc?.serial_number || 0;
            const unnumberedDocs = await CompanyMetadata_1.CompanyMetadata.find({
                $or: [{ serial_number: { $exists: false } }, { serial_number: null }, { serial_number: 0 }],
            }).sort({ created_at: 1, _id: 1 });
            for (const doc of unnumberedDocs) {
                currentSerial += 1;
                doc.serial_number = currentSerial;
                await doc.save();
            }
            console.log(`✅ [iPOMS] Successfully assigned serial numbers up to #${currentSerial}.`);
        }
    }
    catch (err) {
        console.error('❌ Error in ensureCompanyMetadataSerialNumbers:', err);
    }
};
// Boot Server and Connect Database
const startServer = async () => {
    await (0, database_1.connectDatabase)();
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
        await (0, seedMasterDailyLeads_1.seedMasterDailyLeads)();
        await (0, seedAugustAllCollegesJdReceived_1.seedAugustAllCollegesJdReceived)();
        await (0, seedActiveLeadsFromMasterPositives_1.seedActiveLeadsFromMasterPositives)();
        await (0, reloadWeeklyTracker2027_1.reloadWeeklyTrackerFrom2027Workbook)();
        await (0, reloadMetaDatabase_1.reloadMetaDatabaseFromFile)();
    }
    else {
        console.log('🌱 [Seed] Boot seeding skipped — existing data left intact. (Set SEED_ON_BOOT=true to reseed demo data.)');
    }
    await ensureDefaultAccounts();
    await ensureCompanyMetadataSerialNumbers();
    await syncActiveCollegesRoster();
    app.listen(PORT, () => {
        console.log(`🚀 [iPOMS API] Server running on http://localhost:${PORT}`);
        console.log(`📡 [iPOMS API] Health probe: http://localhost:${PORT}/api/v1/health`);
        console.log(`🔍 [iPOMS API] Company Search: http://localhost:${PORT}/api/v1/companies/search?q=10`);
        console.log(`📋 [iPOMS API] DT Today: http://localhost:${PORT}/api/v1/daily-tracker/today`);
        console.log(`📊 [iPOMS API] DT KPI:   http://localhost:${PORT}/api/v1/daily-tracker/kpi`);
    });
    // Start midnight finalization cron job (Spec Section 14)
    (0, finalizeDailyTracker_1.startFinalizationJob)();
};
startServer().catch((err) => {
    // Without this, a throw anywhere in boot (a malformed seed workbook, an
    // unreachable database) surfaced as an unhandled rejection and the process
    // stayed alive with no listener — the API just silently never came up.
    console.error('❌ [iPOMS API] Fatal error during startup — server did not start:', err);
    process.exit(1);
});
