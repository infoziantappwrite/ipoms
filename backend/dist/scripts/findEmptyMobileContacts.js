"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const database_1 = require("../config/database");
async function findEmptyMobileContacts() {
    await (0, database_1.connectDatabase)();
    const emptyFilter = {
        is_deleted: false,
        $or: [
            { primary_mobile: { $exists: false } },
            { primary_mobile: null },
            { primary_mobile: '' },
            { primary_mobile: { $regex: '^[\\s\\-\\.]*$' } }
        ]
    };
    const contacts = await CompanyMetadata_1.CompanyMetadata.find(emptyFilter)
        .sort({ serial_number: 1 })
        .lean();
    console.log(`TOTAL_EMPTY_MOBILE_COUNT:${contacts.length}`);
    console.log(JSON.stringify(contacts.map((c) => ({
        serial_number: c.serial_number,
        company_name: c.company_name,
        hr_name: c.hr_name,
        hr_designation: c.hr_designation,
        primary_email: c.primary_email,
        company_type: c.company_type,
        notes: c.notes,
    })), null, 2));
    await (0, database_1.disconnectDatabase)();
}
findEmptyMobileContacts().catch(console.error);
