"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const database_1 = require("../config/database");
async function listMultiContacts() {
    await (0, database_1.connectDatabase)();
    console.log('\n===============================================================');
    console.log('🔍 NSK Bearings Records:');
    console.log('===============================================================');
    const nsk = await CompanyMetadata_1.CompanyMetadata.find({
        is_deleted: false,
        $or: [
            { serial_number: { $in: [2359, 2360, 2361, 3842] } },
            { company_name: { $regex: /NSK/i } }
        ]
    }).sort({ serial_number: 1 }).lean();
    console.log(JSON.stringify(nsk.map((c) => ({
        serial_number: c.serial_number,
        company_name: c.company_name,
        hr_name: c.hr_name,
        hr_designation: c.hr_designation,
        primary_mobile: c.primary_mobile,
        mobile_numbers: c.mobile_numbers,
        primary_email: c.primary_email,
        email_ids: c.email_ids,
    })), null, 2));
    console.log('\n===============================================================');
    console.log('🔍 Propel Technology Solutions Records:');
    console.log('===============================================================');
    const propel = await CompanyMetadata_1.CompanyMetadata.find({
        is_deleted: false,
        $or: [
            { serial_number: { $in: [2567, 2568, 2569, 2570, 2571, 3600, 3976] } },
            { company_name: { $regex: /Propel/i } }
        ]
    }).sort({ serial_number: 1 }).lean();
    console.log(JSON.stringify(propel.map((c) => ({
        serial_number: c.serial_number,
        company_name: c.company_name,
        hr_name: c.hr_name,
        hr_designation: c.hr_designation,
        primary_mobile: c.primary_mobile,
        mobile_numbers: c.mobile_numbers,
        primary_email: c.primary_email,
        email_ids: c.email_ids,
    })), null, 2));
    await (0, database_1.disconnectDatabase)();
}
listMultiContacts().catch(console.error);
