"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const User_1 = require("../models/User");
const College_1 = require("../models/College");
const server_1 = require("../server");
async function run() {
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    await (0, server_1.syncActiveCollegesRoster)();
    const currentWeek = '2026-09-21';
    const defaultMap = {
        'sujitha_s@infoziant.com': ['HITS', 'NEHRU', 'KPR', 'SONA'],
        'mohanaradha_a@infoziant.com': ['KARPAGAM', 'AIHT', 'ACET', 'KPR'],
        'thirisha_r@infoziant.com': ['PSNA', 'DSU', 'SMVEC'],
        'malavika_ramesh@infoziant.com': ['KLU', 'NGCE'],
        'lizenya_r@infoziant.com': ['NPR', 'KIOT', 'ACEW'],
        'megaladevi_ps@infoziant.com': ['NGP', 'KAMARAJ'],
        'seshmitha_tamil@icl.today': ['MCET', 'MEC'],
    };
    const allColleges = await College_1.College.find({ status: 'active' });
    const codeMap = new Map();
    allColleges.forEach((c) => codeMap.set(c.college_code.toUpperCase(), c._id));
    for (const [email, codes] of Object.entries(defaultMap)) {
        const user = await User_1.User.findOne({ official_email: email.toLowerCase(), is_deleted: false });
        if (user) {
            const colIds = codes.map((c) => codeMap.get(c)).filter(Boolean);
            user.assigned_college_ids = colIds;
            user.weekly_focus_locked = true;
            user.weekly_focus_week_key = currentWeek;
            user.weekly_focus_locked_at = new Date();
            await user.save();
            await College_1.College.updateMany({ assigned_coordinator_ids: user._id, _id: { $nin: colIds } }, { $pull: { assigned_coordinator_ids: user._id } });
            await College_1.College.updateMany({ _id: { $in: colIds } }, { $addToSet: { assigned_coordinator_ids: user._id } });
            console.log(`✅ [Focus Sync] ${user.full_name} (${email}) -> [${codes.join(', ')}] locked for week ${currentWeek}`);
        }
    }
    console.log('✨ All 7 coordinators synchronized with official default colleges!');
    await mongoose_1.default.disconnect();
}
run().catch(console.error);
