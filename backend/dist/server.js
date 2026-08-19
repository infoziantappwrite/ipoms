"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
const SystemSettings_1 = require("./models/SystemSettings");
const mongoose_1 = require("mongoose");
const finalizeDailyTracker_1 = require("./jobs/finalizeDailyTracker");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'ipoms_dev_access_secret_super_secure_key_2026';
// Middleware stack
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: CORS_ORIGIN,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
// ── Shared Helpers ───────────────────────────────────────────────────────────
// Build session_date as midnight UTC for a given local date string (YYYY-MM-DD) or today
function buildSessionDate(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
function getTodayDate() {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
function parseDateParam(dateStr) {
    const d = new Date(dateStr);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
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
    res.status(200).json({
        success: true,
        status: 'HEALTHY',
        service: 'iPOMS Core Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
// 2. Authentication Login Endpoint
app.post('/api/v1/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Official email and password are required',
                },
            });
        }
        const user = await User_1.User.findOne({
            official_email: email.toLowerCase().trim(),
            account_status: 'active',
            is_deleted: false,
        }).populate('role_ids');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                },
            });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                },
            });
        }
        // Update last login
        user.last_login_at = new Date();
        await user.save();
        // Generate Access Token (15m)
        const token = jsonwebtoken_1.default.sign({
            userId: user._id,
            email: user.official_email,
            roles: user.role_codes,
            fullName: user.full_name,
        }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    fullName: user.full_name,
                    email: user.official_email,
                    username: user.username,
                    roles: user.role_codes,
                    mustChangePassword: user.must_change_password,
                },
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'An unexpected error occurred',
            },
        });
    }
});
// 3. High-Speed Company Search Endpoint (Searches across 3,550+ companies in < 10ms)
app.get('/api/v1/companies/search', async (req, res) => {
    try {
        const query = String(req.query.q || '').trim();
        const limit = Math.min(Number(req.query.limit) || 20, 100);
        const page = Math.max(Number(req.query.page) || 1, 1);
        const skip = (page - 1) * limit;
        const filter = { is_deleted: false };
        if (query) {
            filter.$or = [
                { company_name: { $regex: query, $options: 'i' } },
                { hr_name: { $regex: query, $options: 'i' } },
                { primary_mobile: { $regex: query } },
                { primary_email: { $regex: query, $options: 'i' } },
            ];
        }
        const [companies, totalCount] = await Promise.all([
            CompanyMetadata_1.CompanyMetadata.find(filter)
                .sort({ serial_number: 1, company_name: 1 })
                .skip(skip)
                .limit(limit)
                .select('serial_number company_name hr_name hr_designation primary_mobile primary_email company_type'),
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
app.get('/api/v1/colleges', async (req, res) => {
    try {
        const colleges = await College_1.College.find({ status: 'active' })
            .sort({ college_code: 1 })
            .populate('assigned_coordinator_ids', 'full_name official_email primary_mobile');
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
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: error.message || 'Failed to fetch colleges',
            },
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
        const { coordinator_id, college_id } = req.query;
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
        const enriched = rows.map((row, idx) => ({
            ...row.toObject(),
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
        const { coordinator_id, college_id, company_ids } = req.body;
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
// ── DT-3: PATCH /api/v1/daily-tracker/:id
// Auto-save a single row — start_time, outcome, comments
app.patch('/api/v1/daily-tracker/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { call_start_time, outcome_status, comments, follow_up_date } = req.body;
        const row = await DailyTracker_1.DailyTracker.findById(id);
        if (!row) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Tracker row not found' },
            });
        }
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
            if (outcome_status === 'follow_up' && follow_up_date) {
                row.follow_up_date = new Date(follow_up_date);
            }
        }
        if (comments !== undefined) {
            row.comments = comments;
        }
        row.last_saved_at = new Date();
        await row.save();
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
// ── DT-5: POST /api/v1/daily-tracker/save-progress
// Manual Save Progress
app.post('/api/v1/daily-tracker/save-progress', async (req, res) => {
    try {
        const { coordinator_id, college_id } = req.body;
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
        const { coordinator_id, date } = req.query;
        if (!coordinator_id || !date) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'coordinator_id and date (YYYY-MM-DD) are required' },
            });
        }
        const sessionDate = buildSessionDate(String(date));
        const rows = await DailyTracker_1.DailyTracker.find({
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to load history' },
        });
    }
});
// ── DT-7: GET /api/v1/daily-tracker/kpi
// Live KPI counts for today
app.get('/api/v1/daily-tracker/kpi', async (req, res) => {
    try {
        const { coordinator_id, college_id } = req.query;
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
        const [total, completed, skipped, noResponse, followUp, positive] = await Promise.all([
            DailyTracker_1.DailyTracker.countDocuments(baseFilter),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, outcome_status: { $ne: null }, is_skipped: false }),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, is_skipped: true }),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, outcome_status: 'no_response' }),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, outcome_status: 'follow_up' }),
            DailyTracker_1.DailyTracker.countDocuments({ ...baseFilter, outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES } }),
        ]);
        return res.status(200).json({
            success: true,
            data: {
                session_date: today,
                kpi: {
                    total_loaded: total,
                    completed,
                    pending: Math.max(0, total - completed - skipped),
                    positive,
                    no_response: noResponse,
                    follow_up: followUp,
                    skipped,
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
        const { coordinator_id, year, month } = req.query;
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
// ─────────────────────────────────────────────────────────────────────────────
// MODULE 04 — WEEKLY TRACKER ENDPOINTS
// Spec: Module_04_Weekly_Tracker_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────
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
        const { college_id, academic_year, search, company_type } = req.query;
        if (!college_id) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'college_id is required' },
            });
        }
        const year = Number(academic_year) || 2026;
        const filter = {
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
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
        const rows = await WeeklyTracker_1.WeeklyTracker.find(filter)
            .sort({ follow_up_date: 1, company_name: 1 })
            .populate('coordinator_id', 'full_name official_email');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        // Dynamic partition into the 7 standard operational sections
        const followUpsDueToday = [];
        const completed = [];
        const inProgress = [];
        const pipeline = [];
        const topCompanies = [];
        const rejectedByHr = [];
        const rejectedByCollege = [];
        rows.forEach((row) => {
            const r = row.toObject();
            // Top Companies override
            if (row.is_pinned_top || row.pipeline_section === 'top_companies') {
                topCompanies.push(r);
            }
            // Check for follow-up due today / overdue (excluding completed/rejected)
            if (row.follow_up_date &&
                new Date(row.follow_up_date) <= todayEnd &&
                !['completed', 'rejected_by_hr', 'rejected_by_college'].includes(row.pipeline_section)) {
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
                        title: 'Follow-up Due Today',
                        order: 1,
                        summary_metric: `${followUpsDueToday.length} Urgent Follow-ups • Action Required Today`,
                        rows: followUpsDueToday,
                    },
                    completed: {
                        title: 'Companies Completed',
                        order: 2,
                        summary_metric: `${completed.length} Drives Completed • ${completed.reduce((acc, curr) => acc + (curr.selected_count || 0), 0)} Offers Placed`,
                        rows: completed,
                    },
                    in_progress: {
                        title: 'Companies In Progress',
                        order: 3,
                        summary_metric: `${inProgress.length} Active Operations • Drives Scheduled`,
                        rows: inProgress,
                    },
                    pipeline: {
                        title: 'Companies in Pipeline',
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
                    rejected_by_hr: {
                        title: 'Rejected by HR',
                        order: 6,
                        summary_metric: `${rejectedByHr.length} Employer Declines`,
                        rows: rejectedByHr,
                    },
                    rejected_by_college: {
                        title: 'Rejected by College',
                        order: 7,
                        summary_metric: `${rejectedByCollege.length} Institutional Declines`,
                        rows: rejectedByCollege,
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
// ── WT-2: POST /api/v1/weekly-tracker
// Add a recruitment drive record manually
app.post('/api/v1/weekly-tracker', async (req, res) => {
    try {
        const { college_id, coordinator_id, company_id, company_name, job_role, cdc_reference, company_type, ctc_lpa, eligible_batch, pipeline_section, current_status_text, follow_up_date, drive_date, selected_count, } = req.body;
        if (!college_id || !coordinator_id || !company_name) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'college_id, coordinator_id, and company_name are required' },
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
        const { startFriday, endThursday, weekNumber } = getFridayWeekBounds();
        const newDrive = await WeeklyTracker_1.WeeklyTracker.create({
            academic_year: 2026,
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            company_id: new mongoose_1.Types.ObjectId(String(resolvedCompanyId)),
            company_name: company_name.trim(),
            job_role: job_role?.trim() || 'Graduate Trainee',
            cdc_reference: cdc_reference?.trim() || '',
            company_type: company_type?.trim() || 'Software / IT',
            ctc_lpa: ctc_lpa?.trim() || '',
            eligible_batch: eligible_batch?.trim() || '2026 Batch',
            pipeline_section: pipeline_section || 'pipeline',
            current_status_text: current_status_text?.trim() || 'Invite email sent, awaiting JD',
            follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
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
                    row[field] = patchData[field];
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
// ─────────────────────────────────────────────────────────────────────────────
// MODULE 05 — DAILY LEADS ENDPOINTS
// Spec: Module_05_Daily_Leads_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────
// ── DL-1: GET /api/v1/daily-leads
// Fetch leads by date, optional college_id, and lead_type with search
app.get('/api/v1/daily-leads', async (req, res) => {
    try {
        const { date, college_id, lead_type, search } = req.query;
        const targetDate = date ? parseDateParam(String(date)) : getTodayDate();
        const nextDate = new Date(targetDate);
        nextDate.setDate(targetDate.getDate() + 1);
        const filter = {
            lead_date: { $gte: targetDate, $lt: nextDate },
            is_deleted: false,
        };
        if (college_id && college_id !== 'all') {
            filter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
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
        const leads = await DailyLead_1.DailyLead.find(filter)
            .sort({ created_at: -1 })
            .populate('college_id', 'college_name college_code')
            .populate('coordinator_id', 'full_name official_email');
        return res.status(200).json({
            success: true,
            data: {
                date: targetDate.toISOString(),
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
        if (!college_id || !coordinator_id || !company_name) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'college_id, coordinator_id, and company_name are required' },
            });
        }
        const targetDate = lead_date ? parseDateParam(String(lead_date)) : getTodayDate();
        const timeStr = event_time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        let resolvedCompanyId = company_id;
        if (!resolvedCompanyId) {
            const existingMeta = await CompanyMetadata_1.CompanyMetadata.findOne({
                company_name: { $regex: `^${company_name.trim()}$`, $options: 'i' },
            });
            resolvedCompanyId = existingMeta?._id || new mongoose_1.Types.ObjectId();
        }
        const newLead = await DailyLead_1.DailyLead.create({
            lead_type: lead_type || 'positive',
            college_id: new mongoose_1.Types.ObjectId(String(college_id)),
            coordinator_id: new mongoose_1.Types.ObjectId(String(coordinator_id)),
            company_id: new mongoose_1.Types.ObjectId(String(resolvedCompanyId)),
            daily_tracker_id: daily_tracker_id ? new mongoose_1.Types.ObjectId(String(daily_tracker_id)) : null,
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
        const { date, college_id } = req.query;
        const targetDate = date ? parseDateParam(String(date)) : getTodayDate();
        const nextDate = new Date(targetDate);
        nextDate.setDate(targetDate.getDate() + 1);
        const baseFilter = {
            lead_date: { $gte: targetDate, $lt: nextDate },
            is_deleted: false,
        };
        if (college_id && college_id !== 'all') {
            baseFilter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
        }
        const [positivesCount, jdCount, activeColleges] = await Promise.all([
            DailyLead_1.DailyLead.countDocuments({ ...baseFilter, lead_type: 'positive' }),
            DailyLead_1.DailyLead.countDocuments({ ...baseFilter, lead_type: 'jd_received' }),
            DailyLead_1.DailyLead.distinct('college_id', baseFilter),
        ]);
        return res.status(200).json({
            success: true,
            data: {
                date: targetDate.toISOString(),
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
        const { date, college_id, coordinator_id } = req.query;
        const targetDate = date ? parseDateParam(String(date)) : getTodayDate();
        const filter = {
            session_date: targetDate,
            outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES },
        };
        if (college_id && college_id !== 'all') {
            filter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
        }
        if (coordinator_id) {
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
// Returns the 4 Standardized Report Templates (Spec Section 8.3)
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
            id: 'college_performance',
            title: 'College Performance Report',
            audience: 'Institution Management & TPOs',
            icon: '🏛️',
            description: 'Institution-specific deep-dive covering total corporate outreach, positive responses, conducted drives, student offers, and package breakdown.',
            default_sections: ['kpi_summary', 'completed_companies', 'in_progress', 'pipeline', 'remarks'],
        },
        {
            id: 'coordinator_performance',
            title: 'Coordinator Performance Report',
            audience: 'Placement Team Leaders & Operations',
            icon: '👤',
            description: 'Operational activity review covering daily call completions, positive leads generated, JDs received, and drives coordinated.',
            default_sections: ['kpi_summary', 'completed_companies', 'insights', 'remarks'],
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
        const { template_type = 'weekly_placement', college_id, coordinator_id, academic_year = '2026', date_from, date_to, week_label = 'Week 30: 18 Jul - 24 Jul 2026', theme = 'blue', included_sections, custom_remarks, } = req.body;
        let targetCollege = null;
        if (college_id && college_id !== 'all') {
            targetCollege = await College_1.College.findById(college_id);
        }
        const coordinator = coordinator_id ? await User_1.User.findById(coordinator_id) : null;
        // Filter bases
        const wtFilter = { academic_year, is_deleted: false };
        const dtFilter = {};
        const dlFilter = { is_deleted: false };
        if (college_id && college_id !== 'all') {
            const cId = new mongoose_1.Types.ObjectId(String(college_id));
            wtFilter.college_id = cId;
            dtFilter.college_id = cId;
            dlFilter.college_id = cId;
        }
        if (coordinator_id) {
            const uId = new mongoose_1.Types.ObjectId(String(coordinator_id));
            dtFilter.coordinator_id = uId;
            wtFilter.coordinator_id = uId;
            dlFilter.coordinator_id = uId;
        }
        // Parallel fetch of pipeline sections & operational metrics
        const [completedRows, inProgressRows, pipelineRows, topCompaniesRows, totalCalls, positiveCalls, totalJds,] = await Promise.all([
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, pipeline_section: 'completed' }).sort({ created_at: -1 }),
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, pipeline_section: 'in_progress' }).sort({ created_at: -1 }),
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, pipeline_section: 'pipeline' }).sort({ created_at: -1 }),
            WeeklyTracker_1.WeeklyTracker.find({ ...wtFilter, is_pinned_top: true }).sort({ created_at: -1 }),
            DailyTracker_1.DailyTracker.countDocuments(dtFilter),
            DailyTracker_1.DailyTracker.countDocuments({ ...dtFilter, outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES } }),
            DailyLead_1.DailyLead.countDocuments({ ...dlFilter, lead_type: 'jd_received' }),
        ]);
        const totalOffers = completedRows.reduce((sum, r) => sum + (r.selected_count || 0), 0);
        // Build the Generated Report Document Schema
        const reportDocument = {
            template_type,
            report_title: template_type === 'weekly_placement'
                ? `Weekly Placement Operations Report — ${targetCollege?.college_name || 'All Partner Institutions'}`
                : template_type === 'monthly_placement'
                    ? `Monthly Placement Review — ${academic_year} Season`
                    : template_type === 'college_performance'
                        ? `Institutional Placement Performance — ${targetCollege?.college_name || 'College Overview'}`
                        : `Coordinator Performance Assessment — ${coordinator?.full_name || 'Operations Team'}`,
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
            },
            insights: [
                `Operational Velocity: Contacted corporate leads resulted in ${completedRows.length} completed drives with ${totalOffers} offers placed.`,
                `Active Pipeline: ${inProgressRows.length} drives currently underway with technical rounds in progress.`,
                `Lead Conversion: ${totalJds} Job Descriptions secured and circulated to students for registration.`,
            ],
            remarks: custom_remarks || 'All recruitment drives are proceeding as per placement schedule. Follow-ups with upcoming product companies remain active.',
            included_sections: included_sections || {
                kpi_summary: true,
                completed_companies: true,
                in_progress: true,
                pipeline: true,
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
// ─────────────────────────────────────────────────────────────────────────────
// MODULE 07 — ROLE-BASED DASHBOARD & ASSIGNED WORK ENDPOINTS
// Spec: Module_07_Role_Based_Dashboard_Specification_v1.0.md
// ─────────────────────────────────────────────────────────────────────────────
// Helper: Time-Aware Personalized Greeting (Spec Section 7.1)
function getTimeGreeting(fullName) {
    const hour = new Date().getHours();
    const firstName = fullName.split(' ')[0] || fullName;
    if (hour >= 5 && hour < 12) {
        return {
            greeting: `Good Morning, ${firstName} 👋`,
            icon: '🌅',
            subtext: 'Ready for today\'s placement operations? Let\'s make an impact!',
        };
    }
    else if (hour >= 12 && hour < 17) {
        return {
            greeting: `Good Afternoon, ${firstName} ☀️`,
            icon: '☀️',
            subtext: 'Tracking mid-day corporate follow-ups and drive schedules.',
        };
    }
    else if (hour >= 17 && hour < 20) {
        return {
            greeting: `Good Evening, ${firstName} 🌇`,
            icon: '🌇',
            subtext: 'Wrapping up today\'s call logs and finalized daily leads.',
        };
    }
    else {
        return {
            greeting: `Burning the midnight oil? Thanks for your dedication, ${firstName} 🌙`,
            icon: '🌙',
            subtext: 'Night operational review — remember to submit all finalized sheets.',
        };
    }
}
// ── DB-1: GET /api/v1/dashboard/coordinator
// Coordinator Dashboard (Spec Section 5.1 & 7) — "What should I do today?"
app.get('/api/v1/dashboard/coordinator', async (req, res) => {
    try {
        const { coordinator_id } = req.query;
        let coordinator = null;
        if (coordinator_id) {
            coordinator = await User_1.User.findById(coordinator_id);
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
// ── DB-2: GET /api/v1/dashboard/team-leader
// Team Leader Dashboard (Spec Section 5.2) — "How is my team performing today?"
app.get('/api/v1/dashboard/team-leader', async (req, res) => {
    try {
        const coordinators = await User_1.User.find({ is_deleted: false }).limit(10);
        const today = getTodayDate();
        // Per-coordinator live activity matrix
        const teamMatrix = await Promise.all(coordinators.map(async (c) => {
            const [calls, positives, jds, pendingWork] = await Promise.all([
                DailyTracker_1.DailyTracker.countDocuments({
                    coordinator_id: c._id,
                    call_date: {
                        $gte: new Date(today.setHours(0, 0, 0, 0)),
                        $lt: new Date(today.setHours(23, 59, 59, 999)),
                    },
                }),
                DailyTracker_1.DailyTracker.countDocuments({
                    coordinator_id: c._id,
                    outcome_status: { $in: DailyTracker_1.POSITIVE_OUTCOMES },
                }),
                DailyLead_1.DailyLead.countDocuments({ coordinator_id: c._id, lead_type: 'jd_received', is_deleted: false }),
                AssignedWork_1.AssignedWork.countDocuments({ assigned_to_coordinator_id: c._id, is_completed: false, is_deleted: false }),
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
        }));
        const totalDispatchedAssignments = await AssignedWork_1.AssignedWork.countDocuments({ is_deleted: false });
        const completedAssignments = await AssignedWork_1.AssignedWork.countDocuments({ is_completed: true, is_deleted: false });
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
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch team leader dashboard' },
        });
    }
});
// ── DB-3: GET /api/v1/dashboard/admin
// Administrator / Executive Dashboard (Spec Section 5.3) — "How is the complete placement operation progressing?"
app.get('/api/v1/dashboard/admin', async (req, res) => {
    try {
        const [totalCalls, totalPositives, totalJds, totalDrives, totalOffersAgg, totalColleges, totalUsers,] = await Promise.all([
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
        ]);
        const totalOffers = totalOffersAgg[0]?.sum || 0;
        const positiveRate = totalCalls > 0 ? Math.round((totalPositives / totalCalls) * 100) : 0;
        // College Placement Leaderboard
        const colleges = await College_1.College.find({ status: 'active' }).limit(5);
        const leaderboard = await Promise.all(colleges.map(async (c) => {
            const [calls, drives, offers] = await Promise.all([
                DailyTracker_1.DailyTracker.countDocuments({ college_id: c._id }),
                WeeklyTracker_1.WeeklyTracker.countDocuments({ college_id: c._id, pipeline_section: 'completed', is_deleted: false }),
                WeeklyTracker_1.WeeklyTracker.aggregate([
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
        }));
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
        const { coordinator_id, tl_id, is_completed } = req.query;
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
            company_name: { $regex: new RegExp(`^${company_name.trim()}$`, 'i') },
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
        const { user_id, college_id, tab = 'all', notification_type } = req.query;
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
// ── MD-1: GET /api/v1/metadata
// Searchable company & HR catalog with starts-with search, type filter, pagination & recycle bin toggle
app.get('/api/v1/metadata', async (req, res) => {
    try {
        const { page = 1, limit = 50, q = '', type, is_deleted = 'false', } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
        const skip = (pageNum - 1) * limitNum;
        const filter = {
            is_deleted: is_deleted === 'true',
        };
        // Starts-with search (Spec Section 8: search by company name starts-with or mobile)
        if (q && String(q).trim() !== '') {
            const queryStr = String(q).trim();
            const isPhone = /^[0-9+]+$/.test(queryStr);
            if (isPhone) {
                filter.$or = [
                    { primary_mobile: { $regex: queryStr, $options: 'i' } },
                    { mobile_numbers: { $regex: queryStr, $options: 'i' } },
                ];
            }
            else {
                // Starts-with regex
                const startsWithRegex = new RegExp(`^${queryStr}`, 'i');
                const containsRegex = new RegExp(queryStr, 'i');
                filter.$or = [
                    { company_name: startsWithRegex },
                    { hr_name: containsRegex },
                    { primary_email: containsRegex },
                ];
            }
        }
        if (type && type !== 'all') {
            filter.company_type = type;
        }
        const total = await CompanyMetadata_1.CompanyMetadata.countDocuments(filter);
        const companies = await CompanyMetadata_1.CompanyMetadata.find(filter)
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
                company_name: { $regex: new RegExp(`^${trimmedCompany}$`, 'i') },
                hr_name: { $regex: new RegExp(`^${trimmedHr}$`, 'i') },
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
        const created = await CompanyMetadata_1.CompanyMetadata.create({
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
app.patch('/api/v1/metadata/:id', async (req, res) => {
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
// Soft delete record to Recycle Bin (Spec Section 12)
app.delete('/api/v1/metadata/:id', async (req, res) => {
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
// Restore record from Recycle Bin (Spec Section 12 & 17)
app.post('/api/v1/metadata/:id/restore', async (req, res) => {
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
app.delete('/api/v1/metadata/:id/purge', async (req, res) => {
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
// Bulk paste / Excel import endpoint with row-by-row validation & duplicate reporting (Spec Section 16)
app.post('/api/v1/metadata/bulk-import', async (req, res) => {
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
        const errors = [];
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
                const exact = await CompanyMetadata_1.CompanyMetadata.findOne({
                    is_deleted: false,
                    company_name: { $regex: new RegExp(`^${cName}$`, 'i') },
                    hr_name: { $regex: new RegExp(`^${hName}$`, 'i') },
                    $or: [{ primary_mobile: pMobile }, { mobile_numbers: pMobile }],
                    primary_email: pEmail,
                });
                if (exact) {
                    errors.push({ row_number: rowNum, company_name: cName, reason: 'Exact duplicate already exists' });
                    skippedCount++;
                    continue;
                }
            }
            await CompanyMetadata_1.CompanyMetadata.create({
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
app.get('/api/v1/users', async (req, res) => {
    try {
        const { q, role, status, page = 1, limit = 50 } = req.query;
        const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 50));
        const skip = (pageNum - 1) * limitNum;
        const filter = { is_deleted: false };
        if (q && String(q).trim() !== '') {
            const qStr = String(q).trim();
            const regex = new RegExp(qStr, 'i');
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
app.post('/api/v1/users', async (req, res) => {
    try {
        const { full_name, username, official_email, personal_email = '', password = 'Password@123', role_codes = ['COORDINATOR'], assigned_college_ids = [], primary_mobile = '', employee_id = '', account_status = 'active', } = req.body;
        if (!full_name || !username || !official_email) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'full_name, username, and official_email are mandatory' },
            });
        }
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
app.patch('/api/v1/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, personal_email, primary_mobile, secondary_mobile, assigned_college_ids, role_codes, account_status, presence_status, password, } = req.body;
        const user = await User_1.User.findById(id);
        if (!user || user.is_deleted) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' },
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
// ── US-4: DELETE /api/v1/users/:id
// Soft delete user
app.delete('/api/v1/users/:id', async (req, res) => {
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
        return res.status(200).json({
            success: true,
            message: `User account for "${user.full_name}" has been deactivated and archived`,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to deactivate user' },
        });
    }
});
// ── RO-1: GET /api/v1/roles
// List all system roles and permissions matrix (Spec Section 8)
app.get('/api/v1/roles', async (req, res) => {
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
app.patch('/api/v1/roles/:id', async (req, res) => {
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
app.get('/api/v1/settings', async (req, res) => {
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
                system_announcement_banner: '',
            });
        }
        // Include system summary telemetry (Spec Section 13.2)
        const [totalUsers, totalCoordinators, totalCompanies, totalColleges] = await Promise.all([
            User_1.User.countDocuments({ is_deleted: false }),
            User_1.User.countDocuments({ is_deleted: false, role_codes: 'COORDINATOR' }),
            CompanyMetadata_1.CompanyMetadata.countDocuments({ is_deleted: false }),
            College_1.College.countDocuments({ is_deleted: false }),
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
app.patch('/api/v1/settings', async (req, res) => {
    try {
        const { academic_year, season_name, daily_calling_target, working_days, org_name, org_support_email, org_support_phone, theme_default, default_landing_page, enable_email_notifications, enable_system_notifications, enable_dashboard_popups, system_announcement_banner, } = req.body;
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
        if (system_announcement_banner !== undefined)
            settings.system_announcement_banner = system_announcement_banner.trim();
        await settings.save();
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
// Boot Server and Connect Database
const startServer = async () => {
    await (0, database_1.connectDatabase)();
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
startServer();
