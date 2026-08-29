"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renumberCompanyMetadata = renumberCompanyMetadata;
const CompanyMetadata_1 = require("../models/CompanyMetadata");
/**
 * Renumbers all active contacts in CompanyMetadata sequentially from 1 to N
 * without any gaps, so S.No range queries (e.g. 1 to 10) return exactly the expected number of contacts.
 */
async function renumberCompanyMetadata() {
    const companies = await CompanyMetadata_1.CompanyMetadata.find({ is_deleted: false }).sort({ serial_number: 1, _id: 1 });
    if (companies.length === 0) {
        return { count: 0, message: 'No companies found to renumber.' };
    }
    const bulkOps = companies.map((c, index) => ({
        updateOne: {
            filter: { _id: c._id },
            update: { $set: { serial_number: index + 1 } },
        },
    }));
    // Execute in batches of 1000
    const BATCH_SIZE = 1000;
    for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
        const chunk = bulkOps.slice(i, i + BATCH_SIZE);
        await CompanyMetadata_1.CompanyMetadata.bulkWrite(chunk);
    }
    console.log(`✅ [Renumber] Successfully normalized ${companies.length} contacts from S.No 1 to ${companies.length}.`);
    return {
        count: companies.length,
        message: `Successfully renumbered ${companies.length} contacts sequentially from S.No 1 to ${companies.length}.`,
    };
}
