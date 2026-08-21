"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const User_1 = require("../models/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function listUsers() {
    await (0, database_1.connectDatabase)();
    const users = await User_1.User.find({ is_deleted: false }).select('full_name username official_email role_codes account_status password_hash');
    console.log('\n========================================================================================');
    console.log('👥 iPOMS — ACTIVE USER ROSTER & LOGIN CREDENTIALS');
    console.log('========================================================================================\n');
    for (const u of users) {
        const isDefaultIpoms = await bcryptjs_1.default.compare('Ipoms@123', u.password_hash);
        const isDefaultLower = await bcryptjs_1.default.compare('iPOMS@123', u.password_hash);
        const passwordMatch = isDefaultIpoms ? 'Ipoms@123' : (isDefaultLower ? 'iPOMS@123' : 'Custom / Reset');
        console.log(`Name    : ${u.full_name}`);
        console.log(`Email   : ${u.official_email}`);
        console.log(`Roles   : ${u.role_codes.join(', ')}`);
        console.log(`Status  : ${u.account_status}`);
        console.log(`Password: ${passwordMatch}`);
        console.log('----------------------------------------------------------------------------------------');
    }
    await (0, database_1.disconnectDatabase)();
    process.exit(0);
}
listUsers();
