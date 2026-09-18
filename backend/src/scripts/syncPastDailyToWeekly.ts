import mongoose, { Types } from 'mongoose';
import { DailyTracker, PIPELINE_SYNC_OUTCOME } from '../models/DailyTracker';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { College } from '../models/College';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { getCurrentAcademicYear, getCurrentGraduatingBatchYear } from '../lib/academicYear';
import { connectDatabase, disconnectDatabase } from '../config/database';

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function syncAllPastDailyToWeekly() {
  console.log('\n===============================================================');
  console.log('🔄 SYNCING ALL PAST DAILY TRACKER ENTRIES ➔ WEEKLY TRACKER');
  console.log('===============================================================\n');

  await connectDatabase();

  const targetYear = await getCurrentAcademicYear();
  const batchYear = await getCurrentGraduatingBatchYear();
  console.log(`📌 Academic Year: ${targetYear}, Batch Year: ${batchYear}`);

  const colleges = await College.find({ is_active: { $ne: false } }).sort({ college_code: 1 });
  console.log(`🏫 Found ${colleges.length} active college(s).`);

  let totalSynced = 0;
  let totalPromotedMarked = 0;

  for (const college of colleges) {
    // Find all positive daily tracker rows for this college
    const queryCollegeIds = [college._id];
    const sameCodeCols = await College.find({
      $or: [
        { college_code: college.college_code },
        { college_name: college.college_name },
      ],
    });
    sameCodeCols.forEach((sc) => {
      if (!queryCollegeIds.some((id) => String(id) === String(sc._id))) {
        queryCollegeIds.push(sc._id);
      }
    });

    const positiveDailyRows = await DailyTracker.find({
      college_id: { $in: queryCollegeIds },
      outcome_status: PIPELINE_SYNC_OUTCOME,
    }).sort({ session_date: 1, created_at: 1 });

    if (positiveDailyRows.length === 0) {
      continue;
    }

    console.log(`\n🏫 College: ${college.college_name} (${college.college_code}) - ${positiveDailyRows.length} positive call(s) found.`);

    // Existing weekly records for this college
    const existingWeekly = await WeeklyTracker.find({
      college_id: { $in: queryCollegeIds },
      academic_year: targetYear,
      is_deleted: false,
    });

    const seenNames = new Set<string>();
    existingWeekly.forEach((w) => {
      if (w.company_name) seenNames.add(w.company_name.trim().toLowerCase());
    });

    // Find highest order_index in pipeline section
    const maxPipelineRow = await WeeklyTracker.findOne({
      college_id: { $in: queryCollegeIds },
      academic_year: targetYear,
      pipeline_section: 'pipeline',
      is_deleted: false,
    }).sort({ order_index: -1 });

    let nextOrderIndex = maxPipelineRow && typeof maxPipelineRow.order_index === 'number'
      ? maxPipelineRow.order_index + 1
      : existingWeekly.filter((w) => w.pipeline_section === 'pipeline').length;

    let collegeSynced = 0;

    for (const dRow of positiveDailyRows) {
      if (!dRow.company_name || !dRow.company_name.trim()) continue;
      const trimmedName = dRow.company_name.trim();
      const normalizedKey = trimmedName.toLowerCase();

      if (!seenNames.has(normalizedKey)) {
        // Retrieve full metadata contacts if available
        let metaContacts: { mobile_numbers?: string[]; email_ids?: string[]; company_type?: string } = {};
        if (dRow.company_id && Types.ObjectId.isValid(String(dRow.company_id))) {
          const meta = await CompanyMetadata.findById(dRow.company_id).lean();
          if (meta) {
            metaContacts = {
              mobile_numbers: meta.mobile_numbers,
              email_ids: meta.email_ids,
              company_type: meta.company_type || meta.industry_sector,
            };
          }
        }

        const primaryMobile = dRow.mobile_number || (metaContacts.mobile_numbers && metaContacts.mobile_numbers[0]) || '';
        const allMobiles = Array.from(new Set([
          ...(dRow.mobile_number ? [dRow.mobile_number] : []),
          ...(metaContacts.mobile_numbers || []),
        ].filter(Boolean)));

        const primaryEmail = dRow.email_id || (metaContacts.email_ids && metaContacts.email_ids[0]) || '';
        const allEmails = Array.from(new Set([
          ...(dRow.email_id ? [dRow.email_id] : []),
          ...(metaContacts.email_ids || []),
        ].filter(Boolean)));

        const callDate = dRow.session_date ? new Date(dRow.session_date) : new Date();
        const startFriday = new Date(callDate);
        const dayOfWeek = startFriday.getDay();
        const diffToFriday = (dayOfWeek + 2) % 7;
        startFriday.setDate(startFriday.getDate() - diffToFriday);
        startFriday.setHours(0, 0, 0, 0);

        const endThursday = new Date(startFriday);
        endThursday.setDate(endThursday.getDate() + 6);
        endThursday.setHours(23, 59, 59, 999);

        const firstJan = new Date(callDate.getFullYear(), 0, 1);
        const daysPast = Math.floor((callDate.getTime() - firstJan.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((daysPast + firstJan.getDay() + 1) / 7);

        await WeeklyTracker.create({
          academic_year: targetYear,
          college_id: dRow.college_id,
          coordinator_id: dRow.coordinator_id || new Types.ObjectId(),
          company_id: dRow.company_id || new Types.ObjectId(),
          daily_tracker_id: dRow._id,
          company_name: trimmedName,
          job_role: '',
          contact_number: primaryMobile,
          mobile_numbers: allMobiles,
          email_id: primaryEmail,
          email_ids: allEmails,
          cdc_reference: dRow.hr_name ? `${dRow.hr_name}${dRow.mobile_number ? ` (${dRow.mobile_number})` : ''}` : '',
          company_type: metaContacts.company_type || 'Software / IT',
          ctc_lpa: '',
          eligible_batch: `${batchYear} Batch`,
          pipeline_section: 'pipeline',
          current_status_text: 'Invite sent, Awaiting JD',
          follow_up_date: dRow.follow_up_date || null,
          order_index: nextOrderIndex++,
          week_number: weekNumber,
          week_start_date: startFriday,
          week_end_date: endThursday,
          created_at: new Date(),
          updated_at: new Date(),
          last_status_updated_at: new Date(),
        });

        seenNames.add(normalizedKey);
        collegeSynced++;
        totalSynced++;
        console.log(`  ➕ Synced to Pipeline: "${trimmedName}" (Order: ${nextOrderIndex - 1}, Status: "Invite sent, Awaiting JD")`);
      }

      if (!dRow.is_promoted_to_weekly) {
        dRow.is_promoted_to_weekly = true;
        await dRow.save();
        totalPromotedMarked++;
      }
    }

    if (collegeSynced > 0) {
      console.log(`  ✅ Successfully synced ${collegeSynced} company(ies) for ${college.college_name}`);
    } else {
      console.log(`  ℹ️ All positive calls already synced for ${college.college_name}`);
    }
  }

  // Update any existing WeeklyTracker records that still have the old placeholder status string
  const updateResult = await WeeklyTracker.updateMany(
    {
      current_status_text: 'Invite mail shared awaiting JD',
      is_deleted: false,
    },
    {
      $set: {
        current_status_text: 'Invite sent, Awaiting JD',
        updated_at: new Date(),
      },
    }
  );

  console.log(`\n🔄 Updated ${updateResult.modifiedCount} existing weekly record(s) from old status to "Invite sent, Awaiting JD"`);
  console.log(`\n🎉 Summary: ${totalSynced} new company(ies) synced, ${totalPromotedMarked} daily row(s) flagged as promoted.`);

  await disconnectDatabase();
}

if (require.main === module) {
  syncAllPastDailyToWeekly().catch((err) => {
    console.error('Fatal sync error:', err);
    process.exit(1);
  });
}
