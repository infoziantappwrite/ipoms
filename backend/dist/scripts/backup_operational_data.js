"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const DailyTracker_1 = require("../models/DailyTracker");
const DailyLead_1 = require("../models/DailyLead");
const WeeklyTracker_1 = require("../models/WeeklyTracker");
const ActiveLead_1 = require("../models/ActiveLead");
const PendingTask_1 = require("../models/PendingTask");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path_1.default.join(__dirname, '../../backups', `pre_clean_${timestamp}`);
    if (!fs_1.default.existsSync(backupDir)) {
        fs_1.default.mkdirSync(backupDir, { recursive: true });
    }
    console.log(`📦 Exporting backup to: ${backupDir}`);
    const [dailyTrackers, dailyLeads, weeklyTrackers, activeLeads, pendingTasks] = await Promise.all([
        DailyTracker_1.DailyTracker.find({}).lean(),
        DailyLead_1.DailyLead.find({}).lean(),
        WeeklyTracker_1.WeeklyTracker.find({}).lean(),
        ActiveLead_1.ActiveLead.find({}).lean(),
        PendingTask_1.PendingTask.find({}).lean(),
    ]);
    fs_1.default.writeFileSync(path_1.default.join(backupDir, 'DailyTracker.json'), JSON.stringify(dailyTrackers, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(backupDir, 'DailyLead.json'), JSON.stringify(dailyLeads, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(backupDir, 'WeeklyTracker.json'), JSON.stringify(weeklyTrackers, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(backupDir, 'ActiveLead.json'), JSON.stringify(activeLeads, null, 2));
    fs_1.default.writeFileSync(path_1.default.join(backupDir, 'PendingTask.json'), JSON.stringify(pendingTasks, null, 2));
    console.log(`✅ Backup successfully created:`);
    console.log(` - DailyTracker:  ${dailyTrackers.length} rows`);
    console.log(` - DailyLead:     ${dailyLeads.length} rows`);
    console.log(` - WeeklyTracker: ${weeklyTrackers.length} rows`);
    console.log(` - ActiveLead:    ${activeLeads.length} rows`);
    console.log(` - PendingTask:   ${pendingTasks.length} rows`);
    await (0, database_1.disconnectDatabase)();
    process.exit(0);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
