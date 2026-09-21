"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const ActiveLead_1 = require("../models/ActiveLead");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    const allLeads = await ActiveLead_1.ActiveLead.find({}).lean();
    const backupDir = path_1.default.join(__dirname, 'backups');
    if (!fs_1.default.existsSync(backupDir)) {
        fs_1.default.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path_1.default.join(backupDir, `active_leads_backup_${Date.now()}.json`);
    fs_1.default.writeFileSync(backupPath, JSON.stringify(allLeads, null, 2), 'utf-8');
    console.log(`✅ [Backup] Backed up ${allLeads.length} active leads to ${backupPath}`);
    await (0, database_1.disconnectDatabase)();
}
main().catch(console.error);
