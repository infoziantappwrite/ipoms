import { College } from '../models/College';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { User } from '../models/User';
import { WeeklyTracker } from '../models/WeeklyTracker';

export async function updateNehruWeeklyTracker(): Promise<{
  success: boolean;
  message: string;
  inProgressCount: number;
  pipelineCount: number;
  topCompaniesCount: number;
}> {
  console.log('🔄 [Nehru Weekly Tracker] Starting fresh data update for Nehru College...');

  // 1. Identify Nehru college record(s)
  const nehruColleges = await College.find({
    $or: [
      { college_code: 'NEHRU' },
      { college_code: new RegExp('^NEHRU$', 'i') },
      { college_name: new RegExp('Nehru', 'i') },
    ],
  });

  if (nehruColleges.length === 0) {
    console.error('❌ [Nehru Weekly Tracker] Nehru College not found in database.');
    return {
      success: false,
      message: 'Nehru college record not found in database.',
      inProgressCount: 0,
      pipelineCount: 0,
      topCompaniesCount: 0,
    };
  }

  const primaryCollege = nehruColleges.find((c) => c.college_code === 'NEHRU') || nehruColleges[0];
  const allNehruCollegeIds = nehruColleges.map((c) => c._id);

  console.log(`🏛️ [Nehru Weekly Tracker] Found ${nehruColleges.length} Nehru College doc(s). Primary ID: ${primaryCollege._id} (${primaryCollege.college_name})`);

  // 2. Identify assigned coordinator (Sujitha is assigned to NEHRU)
  let coordinator = await User.findOne({
    $or: [
      { official_email: 'sujitha_s@infoziant.com' },
      { username: 'sujitha' },
      { full_name: /Sujitha/i },
      { assigned_college_ids: primaryCollege._id },
    ],
  });
  if (!coordinator) {
    coordinator = await User.findOne({ role_codes: 'PLACEMENT_COORDINATOR' }) || await User.findOne();
  }

  // 3. Remove ALL existing data present for Nehru College in WeeklyTracker
  const deletedResult = await WeeklyTracker.deleteMany({
    college_id: { $in: allNehruCollegeIds },
  });
  console.log(`🗑️ [Nehru Weekly Tracker] Removed ${deletedResult.deletedCount} old records for Nehru College.`);

  // 4. Fresh Dataset: Companies in Progress (7 companies from user's screenshot)
  const inProgressList = [
    {
      company_name: 'ResNet Solutions Pvt Ltd',
      job_role: 'ML Developer / Software Developer',
      ctc_lpa: '8 - 12 LPA',
      status: 'DB Shared. Drive date to be scheduled.',
      batch: '2027',
    },
    {
      company_name: 'Bibus India Pvt Ltd',
      job_role: 'Design Engineer / Internal Coordinator',
      ctc_lpa: '3 - 4 LPA',
      status: 'DB Shared. Drive date to be scheduled.',
      batch: '2027',
    },
    {
      company_name: 'Fristine Infotech Pvt Ltd',
      job_role: 'Zoho Developer/BA/Data Engineer',
      ctc_lpa: '4 LPA',
      status: 'DB Shared. Drive date to be scheduled.',
      batch: '2027',
    },
    {
      company_name: 'Voltech Group',
      job_role: 'Graduate Trainee Engineer',
      ctc_lpa: '3.12 LPA',
      status: 'DB Shared. Drive date to be scheduled.',
      batch: '2027',
    },
    {
      company_name: 'AquaAirX',
      job_role: 'Sourcing and Procurement Intern',
      ctc_lpa: '15K/month',
      status: 'DB Shared. Drive date to be scheduled.',
      batch: '2027',
    },
    {
      company_name: 'ELEATION CAE Service Pvt Ltd',
      job_role: 'CAE Project Engineer',
      ctc_lpa: '9.6 LPA',
      status: 'JD received. DB to be shared.',
      batch: '2027',
    },
    {
      company_name: 'Crawl Corp India Pvt Ltd',
      job_role: 'Associate Trainee',
      ctc_lpa: '8-12k for Intern/3-4.5 LPA',
      status: 'JD received. DB to be shared.',
      batch: '2027',
    },
  ];

  // 5. Fresh Dataset: Companies in Pipeline (43 companies from user's table)
  // Top 14 companies from screenshot 2 are highlighted and marked is_pinned_top: true
  const top14CompanyNames = new Set([
    'GridSync Services Pvt Ltd',
    'KritiLabs',
    'RunLoyal',
    'Eco Saathi Green India Private',
    'Explorica',
    'AgentAnalytics.AI',
    'Sasken',
    'Merlin Automation',
    'Evobi',
    'Agnitech Forge Pvt. Lmt.',
    'Crawl Corp India',
    'Flipr Innovation Labs',
    'Loyal Wingman',
    'Planys Technologies',
  ]);

  const pipelineList = [
    {
      s_no: 1,
      company_name: 'AI Health Highway India Pvt. Ltd.',
      job_role: 'Software  / AI Engineer',
      ctc_lpa: '4 – 8 LPA',
      status: 'Hiring in progress. HR requested to share invite mail.',
      batch: '2027',
    },
    {
      s_no: 2,
      company_name: 'Besmak Components Pvt. Ltd.',
      job_role: 'GET',
      ctc_lpa: '4 LPA',
      status: 'HR requested to share college details. Awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 3,
      company_name: 'Perfint Healthcare Ltd',
      job_role: 'SDE',
      ctc_lpa: '5 - 6 LPA',
      status: 'Active hiring. Awaiting JD.',
      batch: '2027',
    },
    {
      s_no: 4,
      company_name: 'Quark Global',
      job_role: 'Associate Software Engineer / GET',
      ctc_lpa: '5 - 8 LPA',
      status: 'Hiring in progress, awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 5,
      company_name: 'iNube solutions',
      job_role: 'Multiple IT Roles',
      ctc_lpa: '6 - 7 LPA',
      status: 'Invite mail requested by HR as hiring plans are to be confirmed.',
      batch: '2027',
    },
    {
      s_no: 6,
      company_name: 'Juspay',
      job_role: 'Software Developer',
      ctc_lpa: '6 - 8  LPA',
      status: 'HR requested invite mail. Follow-up on August 11th.',
      batch: '2027',
    },
    {
      s_no: 7,
      company_name: 'Wavicle Data',
      job_role: 'Data Analyst',
      ctc_lpa: '4 - 6 LPA',
      status: 'Active hiring. HR requested college profile & invite mail.',
      batch: '2027',
    },
    {
      s_no: 8,
      company_name: 'UBS Bglr',
      job_role: 'Multiple IT Roles',
      ctc_lpa: '10 - 12 LPA',
      status: 'Invite mail requested by HR, awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 9,
      company_name: 'ResNet Solutions Pvt Ltd',
      job_role: 'Software Engineer',
      ctc_lpa: '5 LPA',
      status: 'Active hiring, invite mail shared to HR.',
      batch: '2027',
    },
    {
      s_no: 10,
      company_name: 'GridSync Services Pvt Ltd',
      job_role: 'Automation/Testing/Commissioning Engineer',
      ctc_lpa: '3-5 LPA',
      status: 'Hiring in progress, invitation mail requested.',
      batch: '2027',
    },
    {
      s_no: 11,
      company_name: 'EmbedUR Systems',
      job_role: 'Software Engineering/Trainee roles',
      ctc_lpa: '5 - 8 LPA',
      status: 'HR requested invite mail.  Awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 12,
      company_name: 'Axxela',
      job_role: 'Trainee / Trade Analyst',
      ctc_lpa: '6 - 8 LPA',
      status: 'HR requested invite mail, awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 13,
      company_name: 'Novetum',
      job_role: 'Devops / Software Engineer',
      ctc_lpa: '5 - 6 LPA',
      status: 'Hiring in progress, invitation mail requested.',
      batch: '2027',
    },
    {
      s_no: 14,
      company_name: 'DongAh Electric India Pvt Ltd',
      job_role: 'GET / Junior Engineer',
      ctc_lpa: '3 - 4 LPA',
      status: 'Active hiring. HR requested college profile & invite mail to proceed further.',
      batch: '2027',
    },
    {
      s_no: 15,
      company_name: 'GE Vernova',
      job_role: 'GET',
      ctc_lpa: '4 - 6 LPA',
      status: 'Invite mail requested by HR, awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 16,
      company_name: 'Aero 360',
      job_role: 'Electronic / Junior Robotic Engineer',
      ctc_lpa: '3.5 LPA',
      status: 'Hiring in progress, invitation mail requested.',
      batch: '2027',
    },
    {
      s_no: 17,
      company_name: 'Changepond',
      job_role: 'GET / Software Test Engineer',
      ctc_lpa: '3 - 4 LPA',
      status: 'Invite mail requested by HR, awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 18,
      company_name: 'Cashfree',
      job_role: 'Multiple Roles',
      ctc_lpa: '6 - 9 LPA',
      status: 'Invite mail requested by HR to check college profile.',
      batch: '2027',
    },
    {
      s_no: 19,
      company_name: 'KritiLabs',
      job_role: 'Marketing Intern',
      ctc_lpa: '20k/month',
      status: 'HR requested invite mail. Awaiting JD.',
      batch: '2027',
    },
    {
      s_no: 20,
      company_name: 'Tridots',
      job_role: 'Business Analyst',
      ctc_lpa: '4 LPA',
      status: 'Active hiring, awaiting JD.',
      batch: '2027',
    },
    {
      s_no: 21,
      company_name: 'Optum',
      job_role: 'Full Stack / Software Engineer',
      ctc_lpa: '10 - 13 LPA',
      status: 'Invite mail shared. Awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 22,
      company_name: 'Loyalty Juggernaut',
      job_role: 'Software Engineer',
      ctc_lpa: '3 - 5 LPA',
      status: 'HR requested an invite mail.',
      batch: '2027',
    },
    {
      s_no: 23,
      company_name: 'NxtWave',
      job_role: 'Multiple Roles',
      ctc_lpa: '8 - 10 LPA',
      status: 'Active hiring. Awaiting JD.',
      batch: '2027',
    },
    {
      s_no: 24,
      company_name: 'Driblet Pvt Ltd',
      job_role: 'Robotics Engineer',
      ctc_lpa: '4 - 6 LPA',
      status: 'Hiring in progress, awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 25,
      company_name: 'Renaissance',
      job_role: 'Software Developer',
      ctc_lpa: '4 - 6 LPA',
      status: 'Invite mail requested by HR. Awaiting HR confirmation.',
      batch: '2027',
    },
    {
      s_no: 26,
      company_name: 'Modulus Housing',
      job_role: 'Architect Engineer',
      ctc_lpa: '3 LPA',
      status: 'Hiring in progress, HR requested invite mail.',
      batch: '2027',
    },
    {
      s_no: 27,
      company_name: 'RunLoyal',
      job_role: 'Web Developer',
      ctc_lpa: '3 - 4 LPA',
      status: 'Invite mail requested by HR. Awaiting HR confirmation.',
      batch: '2027',
    },
    {
      s_no: 28,
      company_name: 'PWC',
      job_role: 'GET',
      ctc_lpa: '4 LPA',
      status: 'HR requested invite mail. Awaiting JD.',
      batch: '2027',
    },
    {
      s_no: 29,
      company_name: 'Photom Technologies',
      job_role: 'Mechanical Design Engineer',
      ctc_lpa: '3-4 LPA',
      status: 'HR requested invite mail. HR response awaited.',
      batch: '2027',
    },
    {
      s_no: 30,
      company_name: 'Eco Saathi Green India Private',
      job_role: 'Quality Analyst',
      ctc_lpa: '3–5 LPA',
      status: 'Invite mail requested by HR. Awaiting HR confirmation.',
      batch: '2027',
    },
    {
      s_no: 31,
      company_name: 'Explorica',
      job_role: 'GET',
      ctc_lpa: '3–5 LPA',
      status: 'HR requested invite mail. HR response awaited.',
      batch: '2027',
    },
    {
      s_no: 32,
      company_name: 'AgentAnalytics.AI',
      job_role: 'AI/ML & Agentic Engineer',
      ctc_lpa: '4-6 LPA',
      status: 'Invite mail requested by HR. Awaiting HR confirmation.',
      batch: '2027',
    },
    {
      s_no: 33,
      company_name: 'Sasken',
      job_role: 'Software Engineer',
      ctc_lpa: '5 LPA',
      status: 'HR requested invite mail. Awaiting JD.',
      batch: '2027',
    },
    {
      s_no: 34,
      company_name: 'Merlin Automation',
      job_role: 'Junior Design Engineer',
      ctc_lpa: '4 - 7 LPA',
      status: 'Invite mail requested by HR. Awaiting HR confirmation.',
      batch: '2027',
    },
    {
      s_no: 35,
      company_name: 'Evobi',
      job_role: 'Android Developer',
      ctc_lpa: '6 -7 LPA',
      status: 'HR requested invite mail. HR response awaited.',
      batch: '2027',
    },
    {
      s_no: 36,
      company_name: 'Tiger Analytics',
      job_role: 'Multiple IT Roles',
      ctc_lpa: '6 - 8 LPA',
      status: 'Invite mail shared. Follow-up needed.',
      batch: '2027',
    },
    {
      s_no: 37,
      company_name: 'DSRL',
      job_role: 'Embedded Engineer',
      ctc_lpa: '3 - 5 LPA',
      status: 'Active hiring. HR requested invite mail.',
      batch: '2027',
    },
    {
      s_no: 38,
      company_name: 'Driblet Pvt Ltd',
      job_role: 'Robotics Engineer',
      ctc_lpa: '4 - 6 LPA',
      status: 'Hiring in progress, awaiting HR response.',
      batch: '2027',
    },
    {
      s_no: 39,
      company_name: 'Agnitech Forge Pvt. Lmt.',
      job_role: 'Data Analyst',
      ctc_lpa: '3–5 LPA',
      status: 'Invite mail requested by HR. Awaiting HR confirmation.',
      batch: '2027',
    },
    {
      s_no: 40,
      company_name: 'Crawl Corp India',
      job_role: 'AI Engineer',
      ctc_lpa: '4 LPA',
      status: 'HR requested invite mail. HR response awaited.',
      batch: '2027',
    },
    {
      s_no: 41,
      company_name: 'Flipr Innovation Labs',
      job_role: 'Software Engineer',
      ctc_lpa: '4.5 LPA',
      status: 'Invite mail requested Awaiting JD.',
      batch: '2027',
    },
    {
      s_no: 42,
      company_name: 'Loyal Wingman',
      job_role: 'Graduate Engineer Trainee',
      ctc_lpa: '3 LPA',
      status: 'Active hiring. HR requested invite mail.',
      batch: '2027',
    },
    {
      s_no: 43,
      company_name: 'Planys Technologies',
      job_role: 'Multiple Intern Roles',
      ctc_lpa: '15k/month - Intern',
      status: 'Active hiring. HR requested invite mail.',
      batch: '2027',
    },
  ];

  // Helper to ensure CompanyMetadata exists
  async function getOrCreateCompany(companyName: string) {
    const trimmed = companyName.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let comp = await CompanyMetadata.findOne({
      company_name: new RegExp(`^${escaped}$`, 'i'),
    });
    if (!comp) {
      comp = await CompanyMetadata.create({
        company_name: trimmed,
        company_type: 'software',
        industry_sector: 'Information Technology',
      });
    }
    return comp;
  }

  // 6. Insert In-Progress Companies
  let inProgressCreated = 0;
  for (const item of inProgressList) {
    const comp = await getOrCreateCompany(item.company_name);
    await WeeklyTracker.create({
      academic_year: 2027,
      college_id: primaryCollege._id,
      coordinator_id: coordinator?._id,
      company_id: comp._id,
      company_name: item.company_name.trim(),
      job_role: item.job_role.trim(),
      ctc_lpa: item.ctc_lpa.trim(),
      eligible_batch: `${item.batch} Batch`,
      pipeline_section: 'in_progress',
      is_pinned_top: false,
      current_status_text: item.status.trim(),
      selected_count: 0,
      registered_count: 0,
      shortlisted_count: 0,
      is_deleted: false,
    });
    inProgressCreated++;
  }

  // 7. Insert Pipeline Companies (and flag the 14 top companies)
  let pipelineCreated = 0;
  let topCount = 0;
  for (const item of pipelineList) {
    const comp = await getOrCreateCompany(item.company_name);
    const isTop = top14CompanyNames.has(item.company_name.trim());
    if (isTop) topCount++;

    await WeeklyTracker.create({
      academic_year: 2027,
      college_id: primaryCollege._id,
      coordinator_id: coordinator?._id,
      company_id: comp._id,
      company_name: item.company_name.trim(),
      job_role: item.job_role.trim(),
      ctc_lpa: item.ctc_lpa.trim(),
      eligible_batch: `${item.batch} Batch`,
      pipeline_section: 'pipeline',
      is_pinned_top: isTop,
      current_status_text: item.status.trim(),
      selected_count: 0,
      registered_count: 0,
      shortlisted_count: 0,
      is_deleted: false,
    });
    pipelineCreated++;
  }

  console.log(`✅ [Nehru Weekly Tracker] Successfully loaded fresh data for Nehru College:`);
  console.log(`   - Companies In Progress : ${inProgressCreated}`);
  console.log(`   - Companies In Pipeline : ${pipelineCreated}`);
  console.log(`   - Top Companies Marked  : ${topCount}`);

  return {
    success: true,
    message: `Successfully loaded ${inProgressCreated} in-progress, ${pipelineCreated} pipeline, and ${topCount} top companies for Nehru College.`,
    inProgressCount: inProgressCreated,
    pipelineCount: pipelineCreated,
    topCompaniesCount: topCount,
  };
}
