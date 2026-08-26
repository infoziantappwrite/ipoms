"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const College_1 = require("../models/College");
const User_1 = require("../models/User");
const Role_1 = require("../models/Role");
async function inspectCoordinators() {
    await (0, database_1.connectDatabase)();
    // Ensure models are registered
    const _c = College_1.College;
    const _r = Role_1.Role;
    const coordinators = await User_1.User.find({
        is_deleted: { $ne: true },
        role_codes: 'PLACEMENT_COORDINATOR'
    }).populate('assigned_college_ids', 'college_name college_code location').lean();
    console.log(`\n=============================================================`);
    console.log(`📊 TOTAL PLACEMENT COORDINATORS IN MONGODB: ${coordinators.length}`);
    console.log(`=============================================================\n`);
    let fullyCompleteCount = 0;
    let partiallyCompleteCount = 0;
    let minimalCount = 0;
    const summary = coordinators.map((c, index) => {
        const assignedColleges = (c.assigned_college_ids || []).map((col) => col.college_code || col.college_name).join(', ');
        // Core & Profile Fields
        const hasPersonalEmail = Boolean(c.personal_email && c.personal_email.trim());
        const hasEmployeeId = Boolean(c.employee_id && c.employee_id.trim());
        const hasPrimaryMobile = Boolean(c.primary_mobile && c.primary_mobile.trim());
        const hasSecondaryMobile = Boolean(c.secondary_mobile && c.secondary_mobile.trim());
        const hasAlternateMobile = Boolean(c.alternate_mobile && c.alternate_mobile.trim());
        const hasAddress = Boolean(c.residential_address || c.address_line);
        const hasCity = Boolean(c.city && c.city.trim());
        const hasState = Boolean(c.state && c.state.trim());
        const hasPincode = Boolean(c.pincode && c.pincode.trim());
        const hasDob = Boolean(c.date_of_birth);
        const hasDoj = Boolean(c.date_of_joining);
        const hasLinkedIn = Boolean(c.linkedin_profile && c.linkedin_profile.trim());
        const hasPhoto = Boolean(c.profile_photo_url && c.profile_photo_url.trim());
        const hasAssignedColleges = Boolean(c.assigned_college_ids && c.assigned_college_ids.length > 0);
        const filledFields = [];
        const missingFields = [];
        if (c.full_name)
            filledFields.push('full_name');
        if (c.username)
            filledFields.push('username');
        if (c.official_email)
            filledFields.push('official_email');
        if (hasEmployeeId)
            filledFields.push('employee_id');
        else
            missingFields.push('employee_id');
        if (hasPrimaryMobile)
            filledFields.push('primary_mobile');
        else
            missingFields.push('primary_mobile');
        if (hasPersonalEmail)
            filledFields.push('personal_email');
        else
            missingFields.push('personal_email');
        if (hasSecondaryMobile || hasAlternateMobile)
            filledFields.push('secondary/alt_mobile');
        else
            missingFields.push('secondary/alt_mobile');
        if (hasAddress)
            filledFields.push('address');
        else
            missingFields.push('address');
        if (hasCity)
            filledFields.push('city');
        else
            missingFields.push('city');
        if (hasState)
            filledFields.push('state');
        else
            missingFields.push('state');
        if (hasPincode)
            filledFields.push('pincode');
        else
            missingFields.push('pincode');
        if (hasDob)
            filledFields.push('date_of_birth');
        else
            missingFields.push('date_of_birth');
        if (hasDoj)
            filledFields.push('date_of_joining');
        else
            missingFields.push('date_of_joining');
        if (hasLinkedIn)
            filledFields.push('linkedin_profile');
        else
            missingFields.push('linkedin_profile');
        if (hasPhoto)
            filledFields.push('profile_photo');
        else
            missingFields.push('profile_photo');
        if (hasAssignedColleges)
            filledFields.push('assigned_colleges');
        else
            missingFields.push('assigned_colleges');
        const totalKeyProfileFields = 13;
        const filledCount = totalKeyProfileFields - missingFields.length;
        const score = Math.round((filledCount / totalKeyProfileFields) * 100);
        if (missingFields.length === 0)
            fullyCompleteCount++;
        else if (score >= 40)
            partiallyCompleteCount++;
        else
            minimalCount++;
        return {
            index: index + 1,
            name: c.full_name,
            username: c.username,
            official_email: c.official_email,
            primary_mobile: c.primary_mobile || '(empty)',
            employee_id: c.employee_id || '(empty)',
            personal_email: c.personal_email || '(empty)',
            address: c.residential_address || c.address_line || '(empty)',
            city: c.city || '(empty)',
            state: c.state || '(empty)',
            pincode: c.pincode || '(empty)',
            dob: c.date_of_birth ? new Date(c.date_of_birth).toISOString().split('T')[0] : '(empty)',
            doj: c.date_of_joining ? new Date(c.date_of_joining).toISOString().split('T')[0] : '(empty)',
            linkedin: c.linkedin_profile || '(empty)',
            assigned_colleges: assignedColleges || '(none)',
            account_status: c.account_status,
            photo: hasPhoto ? c.profile_photo_url : '(none)',
            missingFields,
            score
        };
    });
    for (const s of summary) {
        console.log(`[${s.index}] ${s.name} (@${s.username})`);
        console.log(`    Official Email  : ${s.official_email}`);
        console.log(`    Primary Mobile  : ${s.primary_mobile}`);
        console.log(`    Employee ID     : ${s.employee_id}`);
        console.log(`    Assigned College: ${s.assigned_colleges}`);
        console.log(`    Account Status  : ${s.account_status}`);
        console.log(`    Profile Photo   : ${s.photo}`);
        console.log(`    Personal Email  : ${s.personal_email}`);
        console.log(`    DOB / DOJ       : ${s.dob} / ${s.doj}`);
        console.log(`    Location/Address: ${s.address}, ${s.city}, ${s.state} ${s.pincode}`);
        console.log(`    Profile Score   : ${s.score}%`);
        if (s.missingFields.length > 0) {
            console.log(`    ❌ Missing (${s.missingFields.length}): ${s.missingFields.join(', ')}`);
        }
        else {
            console.log(`    ✅ 100% Fully Updated`);
        }
        console.log('-------------------------------------------------------------');
    }
    console.log('\n=============================================================');
    console.log('📈 PROFILE SECTION COMPLETION SUMMARY');
    console.log('=============================================================');
    console.log(`Total Placement Coordinators : ${coordinators.length}`);
    console.log(`100% Fully Completed Profiles: ${fullyCompleteCount}`);
    console.log(`Partially Completed Profiles : ${partiallyCompleteCount}`);
    console.log(`Minimal/Base Profiles        : ${minimalCount}`);
    console.log('=============================================================\n');
    // Overall User Breakdown across all roles
    const allUsers = await User_1.User.find({ is_deleted: { $ne: true } }).lean();
    console.log(`Total Users across all roles : ${allUsers.length}`);
    for (const u of allUsers) {
        console.log(` - ${u.full_name} | ${u.official_email} | Roles: [${u.role_codes.join(', ')}] | Status: ${u.account_status}`);
    }
    await (0, database_1.disconnectDatabase)();
    process.exit(0);
}
inspectCoordinators().catch(err => {
    console.error(err);
    process.exit(1);
});
