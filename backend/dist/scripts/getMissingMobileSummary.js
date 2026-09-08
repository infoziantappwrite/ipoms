"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const database_1 = require("../config/database");
async function run() {
    await (0, database_1.connectDatabase)();
    const emptyFilter = {
        is_deleted: false,
        $and: [
            {
                $or: [
                    { primary_mobile: { $exists: false } },
                    { primary_mobile: null },
                    { primary_mobile: '' },
                    { primary_mobile: { $regex: '^[\\s\\-\\.]*$' } }
                ]
            },
            {
                $or: [
                    { mobile_numbers: { $exists: false } },
                    { mobile_numbers: { $size: 0 } },
                    { mobile_numbers: null }
                ]
            }
        ]
    };
    const total = await CompanyMetadata_1.CompanyMetadata.countDocuments({ is_deleted: false });
    const missing = await CompanyMetadata_1.CompanyMetadata.find(emptyFilter).sort({ serial_number: 1 }).lean();
    const withHrOrEmail = missing.filter((c) => (c.hr_name && c.hr_name.trim()) || (c.primary_email && c.primary_email.trim()));
    const purePlaceholders = missing.filter((c) => !(c.hr_name && c.hr_name.trim()) && !(c.primary_email && c.primary_email.trim()));
    console.log('TOTAL_ACTIVE:', total);
    console.log('TOTAL_MISSING_MOBILE:', missing.length);
    console.log('MISSING_WITH_HR_OR_EMAIL_COUNT:', withHrOrEmail.length);
    console.log('PURE_EMPTY_PLACEHOLDERS_COUNT:', purePlaceholders.length);
    console.log('\n=== [CATEGORY 1] HAS HR NAME OR EMAIL, BUT NO MOBILE NUMBER (' + withHrOrEmail.length + ') ===');
    withHrOrEmail.forEach((c, idx) => {
        console.log(`${idx + 1}. #${c.serial_number || '—'} | ${c.company_name} | HR: ${c.hr_name || '—'} | Email: ${c.primary_email || (c.email_ids && c.email_ids[0]) || '—'}`);
    });
    console.log('\n=== [CATEGORY 2] PURE PLACEHOLDERS - NO HR NAME, NO EMAIL, NO MOBILE (' + purePlaceholders.length + ') ===');
    purePlaceholders.forEach((c, idx) => {
        console.log(`${idx + 1}. #${c.serial_number || '—'} | ${c.company_name}`);
    });
    await (0, database_1.disconnectDatabase)();
}
run().catch(console.error);
