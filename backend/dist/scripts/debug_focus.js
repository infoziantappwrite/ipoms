"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = require("../models/User");
const College_1 = require("../models/College");
dotenv_1.default.config();
function getWeekMondayKey(d = new Date()) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
}
async function run() {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    const currentWeekMonday = getWeekMondayKey();
    console.log('Calculated currentWeekMonday:', currentWeekMonday);
    const allUsers = await User_1.User.find({ is_deleted: false }).lean();
    console.log('\n--- ALL ACTIVE USERS IN DB ---');
    for (const u of allUsers) {
        console.log(JSON.stringify({
            _id: String(u._id),
            full_name: u.full_name,
            username: u.username,
            official_email: u.official_email,
            role_codes: u.role_codes,
            weekly_focus_locked: u.weekly_focus_locked,
            weekly_focus_week_key: u.weekly_focus_week_key,
            assigned_college_ids: (u.assigned_college_ids || []).map(String)
        }));
    }
    const allColleges = await College_1.College.find({ status: 'active' }).sort({ college_code: 1 }).lean();
    const collegesMap = new Map();
    allColleges.forEach(c => collegesMap.set(String(c._id), c));
    const targetCodes = ['ACET', 'AIHT', 'KARPAGAM', 'KPR'];
    const targetColleges = allColleges.filter((c) => targetCodes.includes(c.college_code));
    console.log('\n--- TARGET COLLEGES ---');
    for (const col of targetColleges) {
        console.log(`\nCollege: [${col.college_code}] ${col.college_name} (${col._id})`);
        console.log('  College.assigned_coordinator_ids:', col.assigned_coordinator_ids);
        const usersWithThisAssigned = allUsers.filter((u) => (u.assigned_college_ids || []).some((id) => String(id) === String(col._id)));
        console.log('  Users having this in User.assigned_college_ids:', usersWithThisAssigned.map((u) => `${u.full_name} (${u._id}, locked: ${u.weekly_focus_locked}, week: ${u.weekly_focus_week_key})`));
    }
    // Now let's simulate the EXACT API output for Mohanaradha:
    const mohana = allUsers.find((u) => u.official_email === 'mohanaradha_a@infoziant.com');
    if (mohana) {
        const currentUserId = String(mohana._id);
        const activeCoordinators = await User_1.User.find({
            role_codes: { $in: ['COORDINATOR', 'PLACEMENT_COORDINATOR', 'TEAM_LEADER'] },
            account_status: 'active',
            is_deleted: false,
        }).select('_id full_name official_email assigned_college_ids weekly_focus_locked weekly_focus_week_key weekly_focus_locked_at').lean();
        const collegeHandlersMap = new Map();
        for (const coord of activeCoordinators) {
            const coordIdStr = String(coord._id);
            if (currentUserId && coordIdStr === String(currentUserId)) {
                continue;
            }
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
        console.log('\n--- SIMULATED FOCUS MATRIX FOR MOHANARADHA ---');
        for (const col of allColleges) {
            const cIdStr = String(col._id);
            const otherHandlers = collegeHandlersMap.get(cIdStr) || [];
            const isSelectedByMe = (mohana.assigned_college_ids || []).map(String).includes(cIdStr);
            if (['ACET', 'AIHT', 'KARPAGAM', 'KPR'].includes(col.college_code) || otherHandlers.length > 0) {
                console.log(`[${col.college_code}] isSelectedByMe: ${isSelectedByMe}, otherHandlers (${otherHandlers.length}): ${otherHandlers.map(h => h.name).join(', ')}`);
            }
        }
    }
    await mongoose_1.default.disconnect();
}
run().catch(console.error);
