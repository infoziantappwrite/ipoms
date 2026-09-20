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
    const countBefore = await ActiveLead_1.ActiveLead.countDocuments({});
    console.log(`ℹ️ [Purge] Found ${countBefore} ActiveLead entries in database.`);
    const result = await ActiveLead_1.ActiveLead.deleteMany({});
    console.log(`🗑️ [Purge] Successfully deleted ${result.deletedCount} ActiveLead records.`);
    const countAfter = await ActiveLead_1.ActiveLead.countDocuments({});
    console.log(`✅ [Purge] Remaining ActiveLead entries: ${countAfter}`);
    await (0, database_1.disconnectDatabase)();
}
main().catch(console.error);
