import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

interface CleanMatchPair {
  targetSno: number;
  targetName: string;
  sourceSno: number;
  sourceName: string;
  fallbackData?: {
    hr_name?: string;
    primary_mobile?: string;
    primary_email?: string;
  };
}

const CLEAN_13_MATCHES: CleanMatchPair[] = [
  {
    targetSno: 3809,
    targetName: 'VLSI Technologies',
    sourceSno: 3569,
    sourceName: 'VLSI Technology',
    fallbackData: { primary_mobile: '+919187393632', primary_email: 'hr@vlsiind.in' }
  },
  {
    targetSno: 3812,
    targetName: 'Qmax Systems',
    sourceSno: 2603,
    sourceName: 'QMax systems india pvt ltd',
    fallbackData: { hr_name: 'saravana', primary_mobile: '9840230903', primary_email: 'saravana@qmaxsys.com' }
  },
  {
    targetSno: 3818,
    targetName: 'Loyalty Juggernaut India Pvt. Ltd.',
    sourceSno: 2011,
    sourceName: 'Loyalty Juggernaut',
    fallbackData: { hr_name: 'Aanchal Choudhary', primary_mobile: '+919511637796', primary_email: 'opportunity@lji.io' }
  },
  {
    targetSno: 3822,
    targetName: 'Nimblix',
    sourceSno: 2324,
    sourceName: 'Nimblix Technologies',
    fallbackData: { primary_mobile: '8123402974' }
  },
  {
    targetSno: 3837,
    targetName: 'Ziffity',
    sourceSno: 3519,
    sourceName: 'Ziffity Solutions',
    fallbackData: { hr_name: 'Sathyaprakash Sekaran', primary_mobile: '9840776239', primary_email: 'sathyaprakash.sekaran@ziffity.com' }
  },
  {
    targetSno: 3846,
    targetName: 'BluBridge',
    sourceSno: 555,
    sourceName: 'blubridge technologies',
    fallbackData: { hr_name: 'Kripa Shankar', primary_mobile: '9894977977' }
  },
  {
    targetSno: 3866,
    targetName: 'Dexian India Technologies',
    sourceSno: 1017,
    sourceName: 'DEXIAN',
    fallbackData: { hr_name: 'ANJALI', primary_email: 'anjali.patnaik@dexian.com' }
  },
  {
    targetSno: 3928,
    targetName: 'ExcelaCom',
    sourceSno: 1240,
    sourceName: 'Excelacom Technologies Pvt Ltd',
    fallbackData: { hr_name: 'Latha S', primary_mobile: '7667620910', primary_email: 'latha.s@excelacom.in' }
  },
  {
    targetSno: 3949,
    targetName: 'Loyal Wingman',
    sourceSno: 2010,
    sourceName: 'Loyal Wingman Technologies Pvt. Ltd.',
    fallbackData: { primary_mobile: '7845869805', primary_email: 'hr@loyalwingtech.com' }
  },
  {
    targetSno: 3953,
    targetName: 'Hitachi Energy India Ltd',
    sourceSno: 1586,
    sourceName: 'Hitachi Energy',
    fallbackData: { hr_name: 'Serena Fernandes', primary_mobile: '8591420245', primary_email: 'serena.fernandes@hitachienergy.com' }
  },
  {
    targetSno: 3954,
    targetName: 'BDO India',
    sourceSno: 485,
    sourceName: 'BDO',
    fallbackData: { hr_name: 'Indhushree', primary_mobile: '9538282761', primary_email: 'indushreej@bdo.in' }
  },
  {
    targetSno: 3973,
    targetName: 'NTT Data',
    sourceSno: 2363,
    sourceName: 'NTT DATA Services',
    fallbackData: { hr_name: 'Kiran Shankar', primary_mobile: '9686682180', primary_email: 'kiran.s@nttdata.com' }
  },
  {
    targetSno: 3987,
    targetName: 'Strategi Automation Solutions Pvt Ltd',
    sourceSno: 3028,
    sourceName: 'Strategi Automation',
    fallbackData: { hr_name: 'Meena Subramani/Ranjani', primary_mobile: '7624997728', primary_email: 'meena@strategiautomation.com' }
  }
];

export async function fillCleanMetadataPlaceholders(dryRun = false) {
  console.log('\n===============================================================');
  console.log(`🔧 ${dryRun ? '[DRY RUN] ' : ''}Auto-Fill Clean 13 Metadata Placeholders`);
  console.log('===============================================================\n');

  await connectDatabase();

  let updatedCount = 0;

  for (const pair of CLEAN_13_MATCHES) {
    const target = await CompanyMetadata.findOne({
      serial_number: pair.targetSno,
      is_deleted: false,
    });

    const source = await CompanyMetadata.findOne({
      serial_number: pair.sourceSno,
      is_deleted: false,
    });

    console.log(`\n📌 Target #${pair.targetSno}: "${pair.targetName}"`);
    if (!target) {
      console.warn(`   ⚠️ Target record #${pair.targetSno} not found in database.`);
      continue;
    }

    const hr_name = (source?.hr_name || pair.fallbackData?.hr_name || target.hr_name || '').trim();
    const primary_mobile = (source?.primary_mobile || pair.fallbackData?.primary_mobile || target.primary_mobile || '').trim();
    const primary_email = (source?.primary_email || pair.fallbackData?.primary_email || target.primary_email || '').trim();
    
    const mobile_numbers = Array.from(new Set([
      ...(source?.mobile_numbers || []),
      ...(target.mobile_numbers || []),
      primary_mobile
    ].filter(Boolean)));

    const email_ids = Array.from(new Set([
      ...(source?.email_ids || []),
      ...(target.email_ids || []),
      primary_email
    ].filter(Boolean)));

    const updatePayload: Record<string, any> = {
      updated_at: new Date()
    };

    if (hr_name) updatePayload.hr_name = hr_name;
    if (source?.hr_designation) updatePayload.hr_designation = source.hr_designation;
    if (primary_mobile) updatePayload.primary_mobile = primary_mobile;
    if (mobile_numbers.length > 0) updatePayload.mobile_numbers = mobile_numbers;
    if (primary_email) updatePayload.primary_email = primary_email;
    if (email_ids.length > 0) updatePayload.email_ids = email_ids;
    if (source?.company_type && !target.company_type) updatePayload.company_type = source.company_type;
    if (source?.industry_sector && !target.industry_sector) updatePayload.industry_sector = source.industry_sector;

    console.log(`   Source #${pair.sourceSno}: "${source?.company_name || pair.sourceName}"`);
    console.log(`   HR Name       : ${hr_name || '—'}`);
    console.log(`   Primary Phone : ${primary_mobile || '—'}`);
    console.log(`   Primary Email : ${primary_email || '—'}`);

    if (!dryRun) {
      await CompanyMetadata.updateOne({ _id: target._id }, { $set: updatePayload });
      console.log(`   ✅ Successfully updated Target #${pair.targetSno}`);
      updatedCount++;
    } else {
      console.log(`   🔍 [Dry Run] Ready to apply update`);
    }
  }

  console.log(`\n===============================================================`);
  console.log(`✨ Finished processing. Total records updated: ${updatedCount}/${CLEAN_13_MATCHES.length}`);
  console.log(`===============================================================\n`);

  await disconnectDatabase();
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  fillCleanMetadataPlaceholders(isDryRun).catch(console.error);
}
