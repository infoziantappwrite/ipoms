"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ActiveLead_1 = require("../models/ActiveLead");
async function run() {
    await mongoose_1.default.connect('mongodb://127.0.0.1:27017/ipoms_db');
    await ActiveLead_1.ActiveLead.deleteMany({ academic_year: '2026' });
    const counts = await ActiveLead_1.ActiveLead.aggregate([
        { $group: { _id: '$academic_year', count: { $sum: 1 } } }
    ]);
    console.log('Active Leads grouped by academic_year:', counts);
    await mongoose_1.default.disconnect();
}
run();
