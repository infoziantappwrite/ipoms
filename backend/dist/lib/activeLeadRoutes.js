"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncLeadFromDailyTracker = syncLeadFromDailyTracker;
exports.registerActiveLeadRoutes = registerActiveLeadRoutes;
const mongoose_1 = require("mongoose");
const exceljs_1 = __importDefault(require("exceljs"));
const ActiveLead_1 = require("../models/ActiveLead");
const authMiddleware_1 = require("./authMiddleware");
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Automatically create or update an Active Lead when a call is logged in Daily Tracker.
 */
async function syncLeadFromDailyTracker(data) {
    try {
        if (!data.company_name)
            return null;
        const normalizedCompany = data.company_name.trim();
        if (!normalizedCompany)
            return null;
        const outcome = (data.call_outcome || '').toLowerCase();
        let status = null;
        let followupMonth = '';
        if (outcome.includes('hiring') ||
            outcome.includes('invite') ||
            outcome.includes('jd') ||
            outcome.includes('positive') ||
            outcome.includes('interested')) {
            status = 'Hiring';
        }
        else if (outcome.includes('follow') ||
            outcome.includes('call back') ||
            outcome.includes('reschedule') ||
            outcome.includes('later')) {
            status = 'Follow Up';
            // Attempt to extract month from remarks if present
            const currentMonthIndex = new Date().getMonth();
            followupMonth = ActiveLead_1.FOLLOWUP_MONTHS[currentMonthIndex] || 'August';
        }
        else if (outcome.includes('not hiring') ||
            outcome.includes('declined') ||
            outcome.includes('rejected')) {
            status = 'Not Hiring';
        }
        if (!status)
            return null;
        const year = data.academic_year || '2026';
        // Find existing lead or upsert (with safe regex escaping)
        const existing = await ActiveLead_1.ActiveLead.findOne({
            company_name: { $regex: new RegExp(`^${escapeRegex(normalizedCompany)}$`, 'i') },
            academic_year: year,
            is_deleted: false,
        });
        if (existing) {
            existing.status = status;
            if (status === 'Follow Up' && followupMonth && !existing.followup_month) {
                existing.followup_month = followupMonth;
            }
            if (data.daily_tracker_id)
                existing.daily_tracker_id = data.daily_tracker_id;
            await existing.save();
            return existing;
        }
        const newLead = await ActiveLead_1.ActiveLead.create({
            company_name: normalizedCompany,
            role: 'Graduate Trainee',
            ctc: 'Competitive / Best in Industry',
            status,
            followup_month: status === 'Follow Up' ? followupMonth : '',
            academic_year: year,
            coordinator_id: data.coordinator_id || null,
            college_id: data.college_id || null,
            daily_tracker_id: data.daily_tracker_id || null,
        });
        return newLead;
    }
    catch (err) {
        console.error('syncLeadFromDailyTracker error:', err);
        return null;
    }
}
function registerActiveLeadRoutes(app) {
    // ── 1. GET /api/v1/active-leads (List with stats & search) ─────────────────
    app.get('/api/v1/active-leads', authMiddleware_1.authenticateJWT, async (req, res) => {
        try {
            const { academic_year, status, followup_month, search, college_id, sort = 'desc', } = req.query;
            const filter = { is_deleted: false };
            if (academic_year && academic_year !== 'all') {
                filter.academic_year = String(academic_year);
            }
            if (status && status !== 'all') {
                filter.status = String(status);
            }
            if (followup_month && followup_month !== 'all') {
                filter.followup_month = String(followup_month);
            }
            if (college_id && college_id !== 'all') {
                filter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
            }
            if (search && typeof search === 'string' && search.trim()) {
                const q = escapeRegex(search.trim());
                filter.$or = [
                    { company_name: { $regex: q, $options: 'i' } },
                    { role: { $regex: q, $options: 'i' } },
                    { ctc: { $regex: q, $options: 'i' } },
                ];
            }
            const leads = await ActiveLead_1.ActiveLead.find(filter)
                .sort({ created_at: sort === 'asc' ? 1 : -1 })
                .populate('coordinator_id', 'full_name email')
                .populate('college_id', 'college_name college_code')
                .lean();
            // Compute statistics across the entire unfiltered dataset (or year-scoped)
            const baseFilter = { is_deleted: false };
            if (academic_year && academic_year !== 'all') {
                baseFilter.academic_year = String(academic_year);
            }
            const allStats = await ActiveLead_1.ActiveLead.aggregate([
                { $match: baseFilter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]);
            const stats = {
                total: 0,
                hiring: 0,
                not_hiring: 0,
                follow_up: 0,
            };
            allStats.forEach((item) => {
                stats.total += item.count;
                if (item._id === 'Hiring')
                    stats.hiring = item.count;
                if (item._id === 'Not Hiring')
                    stats.not_hiring = item.count;
                if (item._id === 'Follow Up')
                    stats.follow_up = item.count;
            });
            return res.json({
                success: true,
                data: {
                    leads,
                    stats,
                    total_count: leads.length,
                },
            });
        }
        catch (err) {
            console.error('GET /active-leads error:', err);
            return res.status(500).json({ success: false, error: { message: err.message || 'Failed to fetch active leads' } });
        }
    });
    // ── 2. POST /api/v1/active-leads (Create Lead) ───────────────────────────
    app.post('/api/v1/active-leads', authMiddleware_1.authenticateJWT, async (req, res) => {
        try {
            const { company_name, role = 'Graduate Trainee', ctc = '', status = 'Hiring', followup_month = '', academic_year = '2026', college_id, } = req.body;
            if (!company_name || !company_name.trim()) {
                return res.status(400).json({ success: false, error: { message: 'Company name is required' } });
            }
            if (!ActiveLead_1.ACTIVE_LEAD_STATUSES.includes(status)) {
                return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
            }
            const authUser = req.user;
            const coordinatorId = authUser?.userId ? new mongoose_1.Types.ObjectId(authUser.userId) : null;
            const lead = await ActiveLead_1.ActiveLead.create({
                company_name: company_name.trim(),
                role: role.trim() || 'Graduate Trainee',
                ctc: ctc.trim(),
                status,
                followup_month: status === 'Follow Up' ? followup_month : '',
                academic_year: academic_year || '2026',
                coordinator_id: coordinatorId,
                college_id: college_id ? new mongoose_1.Types.ObjectId(college_id) : null,
            });
            return res.status(201).json({
                success: true,
                data: { lead },
                message: 'Active lead added successfully',
            });
        }
        catch (err) {
            console.error('POST /active-leads error:', err);
            return res.status(500).json({ success: false, error: { message: err.message || 'Failed to create active lead' } });
        }
    });
    // ── 3. POST /api/v1/active-leads/bulk (Bulk Paste & Create) ──────────────
    app.post('/api/v1/active-leads/bulk', authMiddleware_1.authenticateJWT, async (req, res) => {
        try {
            const { lines, academic_year = '2026', default_status = 'Hiring' } = req.body;
            if (!lines || !Array.isArray(lines) || lines.length === 0) {
                return res.status(400).json({ success: false, error: { message: 'No lines provided for bulk import' } });
            }
            const authUser = req.user;
            const coordinatorId = authUser?.userId ? new mongoose_1.Types.ObjectId(authUser.userId) : null;
            const createdLeads = [];
            for (const line of lines) {
                const trimmed = typeof line === 'string' ? line.trim() : '';
                if (!trimmed)
                    continue;
                // Parse format: Company Name, Role, CTC, Status, Followup Month
                // or tab-separated / comma-separated / plain company name
                const parts = trimmed.includes('\t')
                    ? trimmed.split('\t').map((p) => p.trim())
                    : trimmed.split(',').map((p) => p.trim());
                const companyName = parts[0] || '';
                if (!companyName)
                    continue;
                const role = parts[1] || 'Graduate Trainee';
                const ctc = parts[2] || '';
                let status = parts[3] || default_status;
                if (!ActiveLead_1.ACTIVE_LEAD_STATUSES.includes(status)) {
                    status = default_status;
                }
                const followupMonth = status === 'Follow Up' ? (parts[4] || 'August') : '';
                const lead = await ActiveLead_1.ActiveLead.create({
                    company_name: companyName,
                    role,
                    ctc,
                    status,
                    followup_month: followupMonth,
                    academic_year,
                    coordinator_id: coordinatorId,
                });
                createdLeads.push(lead);
            }
            return res.status(201).json({
                success: true,
                data: { created_count: createdLeads.length, leads: createdLeads },
                message: `Successfully imported ${createdLeads.length} active leads`,
            });
        }
        catch (err) {
            console.error('POST /active-leads/bulk error:', err);
            return res.status(500).json({ success: false, error: { message: err.message || 'Failed to bulk import leads' } });
        }
    });
    // ── 4. PUT /api/v1/active-leads/:id (Update & Auto-save) ──────────────────
    app.put('/api/v1/active-leads/:id', authMiddleware_1.authenticateJWT, async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose_1.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, error: { message: 'Invalid lead ID' } });
            }
            const { company_name, role, ctc, status, followup_month, academic_year } = req.body;
            const lead = await ActiveLead_1.ActiveLead.findById(id);
            if (!lead || lead.is_deleted) {
                return res.status(404).json({ success: false, error: { message: 'Active lead not found' } });
            }
            if (company_name !== undefined)
                lead.company_name = company_name.trim();
            if (role !== undefined)
                lead.role = role.trim();
            if (ctc !== undefined)
                lead.ctc = ctc.trim();
            if (status !== undefined) {
                if (!ActiveLead_1.ACTIVE_LEAD_STATUSES.includes(status)) {
                    return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
                }
                lead.status = status;
                // If status is not Follow Up, clear followup_month
                if (status !== 'Follow Up') {
                    lead.followup_month = '';
                }
            }
            if (followup_month !== undefined && lead.status === 'Follow Up') {
                lead.followup_month = followup_month;
            }
            if (academic_year !== undefined) {
                lead.academic_year = academic_year;
            }
            await lead.save();
            return res.json({
                success: true,
                data: { lead },
                message: 'Active lead updated successfully',
            });
        }
        catch (err) {
            console.error('PUT /active-leads/:id error:', err);
            return res.status(500).json({ success: false, error: { message: err.message || 'Failed to update active lead' } });
        }
    });
    // ── 5. DELETE /api/v1/active-leads/:id (Soft Delete) ──────────────────────
    app.delete('/api/v1/active-leads/:id', authMiddleware_1.authenticateJWT, async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose_1.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, error: { message: 'Invalid lead ID' } });
            }
            const lead = await ActiveLead_1.ActiveLead.findById(id);
            if (!lead) {
                return res.status(404).json({ success: false, error: { message: 'Active lead not found' } });
            }
            lead.is_deleted = true;
            lead.deleted_at = new Date();
            await lead.save();
            return res.json({
                success: true,
                data: { id: lead._id },
                message: 'Active lead removed successfully',
            });
        }
        catch (err) {
            console.error('DELETE /active-leads/:id error:', err);
            return res.status(500).json({ success: false, error: { message: err.message || 'Failed to delete active lead' } });
        }
    });
    // ── 6. GET /api/v1/active-leads/export (ExcelJS Spreadsheet Download) ────
    app.get('/api/v1/active-leads/export', authMiddleware_1.authenticateJWT, async (req, res) => {
        try {
            const { academic_year, status, followup_month, search } = req.query;
            const filter = { is_deleted: false };
            if (academic_year && academic_year !== 'all')
                filter.academic_year = String(academic_year);
            if (status && status !== 'all')
                filter.status = String(status);
            if (followup_month && followup_month !== 'all')
                filter.followup_month = String(followup_month);
            if (search && typeof search === 'string' && search.trim()) {
                const q = search.trim();
                filter.$or = [
                    { company_name: { $regex: q, $options: 'i' } },
                    { role: { $regex: q, $options: 'i' } },
                    { ctc: { $regex: q, $options: 'i' } },
                ];
            }
            const leads = await ActiveLead_1.ActiveLead.find(filter)
                .sort({ created_at: -1 })
                .populate('coordinator_id', 'full_name')
                .lean();
            const workbook = new exceljs_1.default.Workbook();
            workbook.creator = 'iPOMS Placement Operations';
            workbook.created = new Date();
            const worksheet = workbook.addWorksheet('Active Leads', {
                pageSetup: { paperSize: 9, orientation: 'landscape' },
            });
            // Define columns
            worksheet.columns = [
                { header: 'S.No', key: 'sno', width: 8 },
                { header: 'Company Name', key: 'company_name', width: 32 },
                { header: 'Role / Designation', key: 'role', width: 26 },
                { header: 'CTC / Package', key: 'ctc', width: 18 },
                { header: 'Status', key: 'status', width: 16 },
                { header: 'Followup Month', key: 'followup_month', width: 18 },
                { header: 'Graduating Year', key: 'academic_year', width: 18 },
                { header: 'Logged Coordinator', key: 'coordinator', width: 22 },
                { header: 'Created Date', key: 'created_at', width: 16 },
            ];
            // Style Header row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E3A8A' }, // iPOMS Deep Navy
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 28;
            // Add Rows
            leads.forEach((l, idx) => {
                const row = worksheet.addRow({
                    sno: idx + 1,
                    company_name: l.company_name || '—',
                    role: l.role || '—',
                    ctc: l.ctc || '—',
                    status: l.status || '—',
                    followup_month: l.status === 'Follow Up' ? (l.followup_month || '—') : 'N/A',
                    academic_year: l.academic_year || '2026',
                    coordinator: l.coordinator_id?.full_name || 'System',
                    created_at: l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '—',
                });
                row.height = 22;
                row.alignment = { vertical: 'middle' };
                // Status pill styling
                const statusCell = row.getCell('status');
                if (l.status === 'Hiring') {
                    statusCell.font = { bold: true, color: { argb: 'FF059669' } };
                }
                else if (l.status === 'Follow Up') {
                    statusCell.font = { bold: true, color: { argb: 'FFD97706' } };
                }
                else if (l.status === 'Not Hiring') {
                    statusCell.font = { bold: true, color: { argb: 'FFE11D48' } };
                }
            });
            // Borders on all cells
            worksheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    };
                });
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=iPOMS_Active_Leads_${Date.now()}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();
            return;
        }
        catch (err) {
            console.error('GET /active-leads/export error:', err);
            return res.status(500).json({ success: false, error: { message: err.message || 'Export failed' } });
        }
    });
}
