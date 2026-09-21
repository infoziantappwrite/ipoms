"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const ActiveLead_1 = require("../models/ActiveLead");
const dns_1 = __importDefault(require("dns"));
dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
async function main() {
    await (0, database_1.connectDatabase)();
    const count = await ActiveLead_1.ActiveLead.countDocuments({});
    const activeCount = await ActiveLead_1.ActiveLead.countDocuments({ is_deleted: { $ne: true } });
    const sample = await ActiveLead_1.ActiveLead.find({}).limit(5).lean();
    console.log(`=== ACTIVE LEADS STATS ===`);
    console.log(`Total ActiveLead docs in DB: ${count}`);
    console.log(`Non-deleted ActiveLead docs: ${activeCount}`);
    console.log(`Sample:`, JSON.stringify(sample, null, 2));
    await (0, database_1.disconnectDatabase)();
}
main().catch(console.error);
