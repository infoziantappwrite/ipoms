"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CompanyMetadata_1 = require("../models/CompanyMetadata");
const database_1 = require("../config/database");
async function inspectMetadataDatabase() {
    console.log('\n===============================================================');
    console.log('🔍 DIRECT MONGODB DATABASE INSPECTION: "company_metadata" Collection');
    console.log('===============================================================\n');
    await (0, database_1.connectDatabase)();
    const count = await CompanyMetadata_1.CompanyMetadata.countDocuments({ is_deleted: false });
    const binCount = await CompanyMetadata_1.CompanyMetadata.countDocuments({ is_deleted: true });
    console.log(`📊 Active Companies in 'company_metadata': ${count}`);
    console.log(`🗑️ Recycle Bin Count: ${binCount}\n`);
    const recent = await CompanyMetadata_1.CompanyMetadata.find({})
        .sort({ created_at: -1 })
        .limit(6);
    recent.forEach((c, idx) => {
        console.log(`[Company Contact #${idx + 1}]`);
        console.log(`  ID             : ${c._id}`);
        console.log(`  Company Name   : "${c.company_name}"`);
        console.log(`  HR Name        : "${c.hr_name}"`);
        console.log(`  Primary Phone  : "${c.primary_mobile}"`);
        console.log(`  All Phones     : [${c.mobile_numbers.join(', ')}]`);
        console.log(`  Primary Email  : "${c.primary_email}"`);
        console.log(`  Industry Type  : ${c.company_type}`);
        console.log(`  Is Deleted     : ${c.is_deleted}`);
        console.log(`  Last Updated   : ${c.updated_at.toISOString()}`);
        console.log('---------------------------------------------------------------');
    });
    await (0, database_1.disconnectDatabase)();
    console.log('\n✅ Company Metadata database inspection verified successfully!\n');
}
inspectMetadataDatabase().catch(console.error);
