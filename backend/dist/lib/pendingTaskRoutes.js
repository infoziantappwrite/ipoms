"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPendingTaskRoutes = registerPendingTaskRoutes;
const mongoose_1 = require("mongoose");
const PendingTask_1 = require("../models/PendingTask");
const CompanyMetadata_1 = require("../models/CompanyMetadata");
/**
 * Pending Task Module Routes
 *
 * Provides complete CRUD, bulk deletion, KPI summary, and college-wise isolation
 * for the "Pending Task" register in iPOMS.
 */
function registerPendingTaskRoutes(app) {
    // ── PT-1: GET /api/v1/pending-tasks ──────────────────────────────────────────
    // Fetch pending tasks filtered by college_id, optional search, and db_shared_status
    app.get('/api/v1/pending-tasks', async (req, res) => {
        try {
            const { college_id, search, db_shared_status, sort_by = 'serial_no', sort_order = 'asc' } = req.query;
            if (!college_id) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'college_id is required' },
                });
            }
            const filter = { is_deleted: false };
            if (college_id !== 'all') {
                if (!mongoose_1.Types.ObjectId.isValid(String(college_id))) {
                    return res.status(400).json({
                        success: false,
                        error: { code: 'INVALID_ID', message: 'Invalid college_id' },
                    });
                }
                filter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
            }
            if (db_shared_status && db_shared_status !== 'all') {
                if (db_shared_status === 'Shared') {
                    filter.db_shared_date = { $ne: null };
                }
                else if (db_shared_status === 'Pending') {
                    filter.db_shared_date = null;
                }
            }
            if (search) {
                const q = String(search).trim();
                filter.$or = [
                    { company_name: { $regex: q, $options: 'i' } },
                    { current_status: { $regex: q, $options: 'i' } },
                    { next_status: { $regex: q, $options: 'i' } },
                    { action_to_be_taken: { $regex: q, $options: 'i' } },
                    { remarks: { $regex: q, $options: 'i' } },
                ];
            }
            const sortOptions = {};
            const order = sort_order === 'desc' ? -1 : 1;
            if (sort_by === 'drive_date') {
                sortOptions.drive_date = order;
            }
            else if (sort_by === 'jd_received_date') {
                sortOptions.jd_received_date = order;
            }
            else if (sort_by === 'company_name') {
                sortOptions.company_name = order;
            }
            else {
                sortOptions.serial_no = order;
            }
            const tasks = await PendingTask_1.PendingTask.find(filter)
                .sort(sortOptions)
                .populate('college_id', 'college_name college_code logo_url location')
                .populate('coordinator_id', 'full_name official_email')
                .populate('company_id', 'company_name domain logo_url');
            return res.status(200).json({
                success: true,
                data: {
                    tasks,
                    total: tasks.length,
                    college_id: String(college_id),
                },
            });
        }
        catch (error) {
            console.error('[PendingTask] GET error:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch pending tasks' },
            });
        }
    });
    // ── PT-2: GET /api/v1/pending-tasks/kpi ──────────────────────────────────────
    // Fetch summary KPI cards for a specific college
    app.get('/api/v1/pending-tasks/kpi', async (req, res) => {
        try {
            const { college_id } = req.query;
            if (!college_id) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'college_id is required' },
                });
            }
            const filter = { is_deleted: false };
            if (college_id !== 'all') {
                if (!mongoose_1.Types.ObjectId.isValid(String(college_id))) {
                    return res.status(400).json({
                        success: false,
                        error: { code: 'INVALID_ID', message: 'Invalid college_id' },
                    });
                }
                filter.college_id = new mongoose_1.Types.ObjectId(String(college_id));
            }
            const allTasks = await PendingTask_1.PendingTask.find(filter).lean();
            const now = new Date();
            const total_tasks = allTasks.length;
            let db_shared_count = 0;
            let db_pending_count = 0;
            let drives_scheduled_count = 0;
            let actions_pending_count = 0;
            for (const t of allTasks) {
                if (t.db_shared_date) {
                    db_shared_count++;
                }
                else {
                    db_pending_count++;
                }
                if (t.drive_date && new Date(t.drive_date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                    drives_scheduled_count++;
                }
                if (t.action_to_be_taken && t.action_to_be_taken.trim().length > 0) {
                    actions_pending_count++;
                }
            }
            return res.status(200).json({
                success: true,
                data: {
                    kpi: {
                        total_tasks,
                        db_shared_count,
                        db_pending_count,
                        drives_scheduled_count,
                        actions_pending_count,
                    },
                },
            });
        }
        catch (error) {
            console.error('[PendingTask] KPI error:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to fetch pending task KPIs' },
            });
        }
    });
    // ── PT-3: POST /api/v1/pending-tasks ─────────────────────────────────────────
    // Create a new pending task for a college with sequential serial_no
    app.post('/api/v1/pending-tasks', async (req, res) => {
        try {
            const { college_id, coordinator_id, company_name, company_id, jd_received_date, db_shared_date, db_shared_status, current_status, next_status, action_to_be_taken, drive_date, remarks, } = req.body;
            if (!college_id || !company_name || !action_to_be_taken) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'college_id, company_name, and Remarks / Next Action are required',
                    },
                });
            }
            if (action_to_be_taken.trim().length < 10) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Remarks / Next Action must contain at least 10 characters',
                    },
                });
            }
            // Determine coordinator from body or authenticated user session
            const authUserId = req.user?.userId || req.user?._id;
            const targetCoordinatorId = coordinator_id || authUserId;
            if (!targetCoordinatorId) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'coordinator_id is required' },
                });
            }
            // Calculate next sequential serial_no for this college
            const highestTask = await PendingTask_1.PendingTask.findOne({
                college_id: new mongoose_1.Types.ObjectId(String(college_id)),
                is_deleted: false,
            }).sort({ serial_no: -1 });
            const nextSerialNo = (highestTask?.serial_no || 0) + 1;
            // Check for CompanyMetadata match if company_id not explicitly provided
            let resolvedCompanyId = company_id;
            if (!resolvedCompanyId) {
                const meta = await CompanyMetadata_1.CompanyMetadata.findOne({
                    company_name: { $regex: `^${company_name.trim()}$`, $options: 'i' },
                });
                if (meta)
                    resolvedCompanyId = meta._id;
            }
            const newTask = await PendingTask_1.PendingTask.create({
                college_id: new mongoose_1.Types.ObjectId(String(college_id)),
                coordinator_id: new mongoose_1.Types.ObjectId(String(targetCoordinatorId)),
                company_name: company_name.trim(),
                company_id: resolvedCompanyId ? new mongoose_1.Types.ObjectId(String(resolvedCompanyId)) : null,
                serial_no: nextSerialNo,
                jd_received_date: jd_received_date ? new Date(jd_received_date) : null,
                db_shared_date: db_shared_date ? new Date(db_shared_date) : null,
                db_shared_status: db_shared_status || 'Pending',
                current_status: current_status || 'JD Received',
                next_status: next_status || '',
                action_to_be_taken: action_to_be_taken.trim(),
                drive_date: drive_date ? new Date(drive_date) : null,
                remarks: remarks || '',
                is_completed: false,
                is_deleted: false,
            });
            const populated = await PendingTask_1.PendingTask.findById(newTask._id)
                .populate('college_id', 'college_name college_code logo_url')
                .populate('coordinator_id', 'full_name official_email')
                .populate('company_id', 'company_name domain logo_url');
            return res.status(201).json({
                success: true,
                data: { task: populated },
                message: 'Pending task created successfully',
            });
        }
        catch (error) {
            console.error('[PendingTask] POST error:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to create pending task' },
            });
        }
    });
    // ── PT-4: PATCH /api/v1/pending-tasks/:id ────────────────────────────────────
    // Update a pending task
    app.patch('/api/v1/pending-tasks/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose_1.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_ID', message: 'Invalid task ID' },
                });
            }
            const existingTask = await PendingTask_1.PendingTask.findOne({ _id: id, is_deleted: false });
            if (!existingTask) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Pending task not found' },
                });
            }
            const authUserId = req.user?.userId || req.user?._id;
            const { company_name, company_id, jd_received_date, db_shared_date, db_shared_status, current_status, next_status, action_to_be_taken, drive_date, remarks, is_completed, serial_no, } = req.body;
            if (company_name !== undefined)
                existingTask.company_name = company_name.trim();
            if (company_id !== undefined)
                existingTask.company_id = company_id ? new mongoose_1.Types.ObjectId(String(company_id)) : null;
            if (jd_received_date !== undefined)
                existingTask.jd_received_date = jd_received_date ? new Date(jd_received_date) : null;
            if (db_shared_date !== undefined)
                existingTask.db_shared_date = db_shared_date ? new Date(db_shared_date) : null;
            if (db_shared_status !== undefined)
                existingTask.db_shared_status = db_shared_status;
            if (current_status !== undefined)
                existingTask.current_status = current_status;
            if (next_status !== undefined)
                existingTask.next_status = next_status;
            if (action_to_be_taken !== undefined) {
                if (action_to_be_taken.trim().length < 10) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Remarks / Next Action must contain at least 10 characters',
                        },
                    });
                }
                existingTask.action_to_be_taken = action_to_be_taken.trim();
            }
            if (drive_date !== undefined)
                existingTask.drive_date = drive_date ? new Date(drive_date) : null;
            if (remarks !== undefined)
                existingTask.remarks = remarks;
            if (is_completed !== undefined)
                existingTask.is_completed = Boolean(is_completed);
            if (serial_no !== undefined)
                existingTask.serial_no = Number(serial_no);
            if (authUserId && mongoose_1.Types.ObjectId.isValid(String(authUserId))) {
                existingTask.updated_by = new mongoose_1.Types.ObjectId(String(authUserId));
            }
            await existingTask.save();
            const updated = await PendingTask_1.PendingTask.findById(existingTask._id)
                .populate('college_id', 'college_name college_code logo_url')
                .populate('coordinator_id', 'full_name official_email')
                .populate('company_id', 'company_name domain logo_url');
            return res.status(200).json({
                success: true,
                data: { task: updated },
                message: 'Pending task updated successfully',
            });
        }
        catch (error) {
            console.error('[PendingTask] PATCH error:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to update pending task' },
            });
        }
    });
    // ── PT-5: DELETE /api/v1/pending-tasks/:id ───────────────────────────────────
    // Soft delete a single pending task
    app.delete('/api/v1/pending-tasks/:id', async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose_1.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'INVALID_ID', message: 'Invalid task ID' },
                });
            }
            const task = await PendingTask_1.PendingTask.findById(id);
            if (!task || task.is_deleted) {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Pending task not found' },
                });
            }
            task.is_deleted = true;
            task.deleted_at = new Date();
            await task.save();
            return res.status(200).json({
                success: true,
                message: 'Pending task deleted successfully',
            });
        }
        catch (error) {
            console.error('[PendingTask] DELETE error:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to delete pending task' },
            });
        }
    });
    // ── PT-6: POST /api/v1/pending-tasks/batch-delete ────────────────────────────
    // Bulk soft delete multiple pending tasks
    app.post('/api/v1/pending-tasks/batch-delete', async (req, res) => {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'ids array is required and must not be empty' },
                });
            }
            const validIds = ids.filter((id) => mongoose_1.Types.ObjectId.isValid(String(id))).map((id) => new mongoose_1.Types.ObjectId(String(id)));
            if (validIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'No valid ObjectIds provided' },
                });
            }
            const result = await PendingTask_1.PendingTask.updateMany({ _id: { $in: validIds }, is_deleted: false }, { $set: { is_deleted: true, deleted_at: new Date() } });
            return res.status(200).json({
                success: true,
                data: {
                    deleted_count: result.modifiedCount,
                },
                message: `${result.modifiedCount} pending task(s) deleted successfully`,
            });
        }
        catch (error) {
            console.error('[PendingTask] BATCH DELETE error:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to bulk delete pending tasks' },
            });
        }
    });
    // ── PT-7: POST /api/v1/pending-tasks/batch-update ────────────────────────────
    // Bulk update fields across multiple pending tasks at once
    app.post('/api/v1/pending-tasks/batch-update', async (req, res) => {
        try {
            const { ids, updates } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'ids array is required and must not be empty' },
                });
            }
            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'updates object is required' },
                });
            }
            const validIds = ids
                .filter((id) => mongoose_1.Types.ObjectId.isValid(String(id)))
                .map((id) => new mongoose_1.Types.ObjectId(String(id)));
            if (validIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'No valid ObjectIds provided' },
                });
            }
            const setObj = { updated_at: new Date() };
            const authUserId = req.user?.userId || req.user?._id;
            if (authUserId && mongoose_1.Types.ObjectId.isValid(String(authUserId))) {
                setObj.updated_by = new mongoose_1.Types.ObjectId(String(authUserId));
            }
            if (updates.jd_received_date !== undefined) {
                setObj.jd_received_date = updates.jd_received_date ? new Date(updates.jd_received_date) : null;
            }
            if (updates.db_shared_date !== undefined) {
                setObj.db_shared_date = updates.db_shared_date ? new Date(updates.db_shared_date) : null;
                setObj.db_shared_status = updates.db_shared_date ? 'Shared' : 'Pending';
            }
            if (updates.action_to_be_taken !== undefined && updates.action_to_be_taken.trim() !== '') {
                if (updates.action_to_be_taken.trim().length < 10) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Remarks / Next Action must contain at least 10 characters',
                        },
                    });
                }
                setObj.action_to_be_taken = updates.action_to_be_taken.trim();
            }
            if (updates.current_status !== undefined && updates.current_status.trim() !== '') {
                setObj.current_status = updates.current_status.trim();
            }
            if (updates.drive_date !== undefined) {
                setObj.drive_date = updates.drive_date ? new Date(updates.drive_date) : null;
            }
            if (updates.remarks !== undefined) {
                setObj.remarks = updates.remarks.trim();
            }
            const result = await PendingTask_1.PendingTask.updateMany({ _id: { $in: validIds }, is_deleted: false }, { $set: setObj });
            return res.status(200).json({
                success: true,
                data: {
                    updated_count: result.modifiedCount,
                },
                message: `${result.modifiedCount} pending task(s) updated successfully`,
            });
        }
        catch (error) {
            console.error('[PendingTask] BATCH UPDATE error:', error);
            return res.status(500).json({
                success: false,
                error: { code: 'INTERNAL_SERVER_ERROR', message: error.message || 'Failed to bulk update pending tasks' },
            });
        }
    });
}
