import { College } from '../models/College';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { User } from '../models/User';
import { WeeklyTracker } from '../models/WeeklyTracker';

export async function updateHitsWeeklyTracker(): Promise<{
  success: boolean;
  message: string;
  inProgressCount: number;
  pipelineCount: number;
  topCompaniesCount: number;
}> {
  console.log('🔄 [HITS Weekly Tracker] Starting fresh data update for HITS College...');

  // 1. Identify HITS college record(s)
  const hitsColleges = await College.find({
    $or: [
      { college_code: 'HITS' },
      { college_code: new RegExp('^HITS$', 'i') },
      { college_name: new RegExp('Hindustan', 'i') },
    ],
  });

  if (hitsColleges.length === 0) {
    console.error('❌ [HITS Weekly Tracker] HITS College not found in database.');
    return {
      success: false,
      message: 'HITS college record not found in database.',
      inProgressCount: 0,
      pipelineCount: 0,
      topCompaniesCount: 0,
    };
  }

  const primaryCollege = hitsColleges.find((c) => c.college_code === 'HITS') || hitsColleges[0];
  const allHitsCollegeIds = hitsColleges.map((c) => c._id);

  console.log(`🏛️ [HITS Weekly Tracker] Found ${hitsColleges.length} HITS College doc(s). Primary ID: ${primaryCollege._id} (${primaryCollege.college_name})`);

  // 2. Identify assigned coordinator
  let coordinator = await User.findOne({
    $or: [
      { assigned_college_ids: primaryCollege._id },
      { official_email: 'sujitha_s@infoziant.com' },
      { role_codes: 'PLACEMENT_COORDINATOR' },
    ],
  });
  if (!coordinator) {
    coordinator = await User.findOne();
  }

  // 3. Remove ALL existing data present for HITS College in WeeklyTracker
  const deletedResult = await WeeklyTracker.deleteMany({
    college_id: { $in: allHitsCollegeIds },
  });
  console.log(`🗑️ [HITS Weekly Tracker] Removed ${deletedResult.deletedCount} old records for HITS College.`);

  // 4. Fresh Dataset: Companies in Progress (10 companies from Screenshot 1)
  const inProgressList = [
    {
      company_name: 'Bibus India Pvt Ltd',
      job_role: 'Design Engineer / Internal Coordinator',
      ctc_lpa: '3 - 4 LPA',
      status: 'Students DB shared. Awaiting drive date confirmation.',
      batch: '2027',
    },
    {
      company_name: 'KritiLabs',
      job_role: 'MBA Marketing Intern',
      ctc_lpa: '20k/month',
      status: 'Second round completed, awaiting results.',
      batch: '2027',
    },
    {
      company_name: 'Brakes India',
      job_role: 'GET',
      ctc_lpa: '15k/month - Intern, 3.80 - 5.82 LPA',
      status: 'Students DB shared. Awaiting drive date confirmation.',
      batch: '2027',
    },
    {
      company_name: 'Pepagora',
      job_role: 'Insides Sales Associate/BDA',
      ctc_lpa: '4 LPA',
      status: 'Drive scheduled on September 3rd.',
      batch: '2027',
    },
    {
      company_name: 'AquaAirX',
      job_role: 'Sourcing and Procurement Intern',
      ctc_lpa: '15K/month',
      status: 'JD received, DB need to be shared',
      batch: '2027',
    },
    {
      company_name: 'KritiLabs (New JD)',
      job_role: 'Production (Engineering Roles)',
      ctc_lpa: '12k/month',
      status: 'Drive scheduled on September 3rd.',
      batch: '2027',
    },
    {
      company_name: 'Hudsmer Business Solutions',
      job_role: 'Software Quality & Accessibility Engineer Trainee',
      ctc_lpa: '5-12k for Internship/ 3-5 LPA',
      status: 'JD received, DB to be shared.',
      batch: '2027',
    },
    {
      company_name: 'PERI Industries',
      job_role: 'GET',
      ctc_lpa: '2-3 LPA',
      status: 'Drive tentatively scheduled by September 3rd week.',
      batch: '2027',
    },
    {
      company_name: 'ELEATION CAE Service Pvt Ltd',
      job_role: 'CAE Project Engineer',
      ctc_lpa: '9.6 LPA',
      status: 'JD received, DB to be shared.',
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

  // Top company names list from Screenshot 2 to mark is_pinned_top: true
  // Contains the 18 items shown in TOP COMPANIES
  const topCompanyMatches = [
    'Omega Health Care',
    'FocusR',
    'LTTS',
    'Voltech Events',
    'Crawl Corp India',
    'Modulus Housing',
    'Agnitech Forge Pvt. Lmt.',
    'AgentAnalytics.AI',
    'Colan Infotech',
    'Rishabh Enterprises',
    'Valeo',
    'Lawlytics',
    'DeepFacts Pvt Ltd',
    'Revature',
    'American Megatrends',
    'Sanmar',
    'Congruent',
  ];

  // 5. Fresh Dataset: Companies in Pipeline (51 companies from user text prompt)
  const pipelineList = [
    { s_no: 1, company_name: 'Visteon', job_role: 'Software Engineer', ctc_lpa: '6 - 7 LPA', status: 'Invite mail shared. Awaiting HR response.', batch: '2027' },
    { s_no: 2, company_name: 'Juspay', job_role: 'Software Developer', ctc_lpa: '6 - 8  LPA', status: 'HR requested invite mail.', batch: '2027' },
    { s_no: 3, company_name: 'Toshiba', job_role: 'Engineering/IT Roles', ctc_lpa: '5 - 8 LPA', status: 'Hiring plans in progress. Awaiting HR response.', batch: '2027' },
    { s_no: 4, company_name: 'Optum', job_role: 'Full STack Engineer', ctc_lpa: '10 - 13 LPA', status: 'Invite mail shared. Awaiting HR response.', batch: '2027' },
    { s_no: 5, company_name: 'Trilogy', job_role: 'Software Engineer', ctc_lpa: '10 - 15 LPA', status: 'Invite mail requested by HR to check the college profile.', batch: '2027' },
    { s_no: 6, company_name: 'PayPal', job_role: 'SDE - 1', ctc_lpa: '7 - 10 LPA', status: 'Invite mail requested by HR to check the college profile.', batch: '2027' },
    { s_no: 7, company_name: 'AutomationEdge', job_role: 'Multiple Roles', ctc_lpa: '4 - 6 LPA', status: 'HR requested invite mail. Follow-up needed.', batch: '2027' },
    { s_no: 8, company_name: 'ITC Infotech India', job_role: 'SDE', ctc_lpa: '3.5 - 5.5 LPA', status: 'Invite mail shared. Awaiting HR response.', batch: '2027' },
    { s_no: 9, company_name: 'Mphasis', job_role: 'Associate Software Engineer', ctc_lpa: '4 - 5 LPA', status: 'Invite mail shared. Awaiting HR response.', batch: '2027' },
    { s_no: 10, company_name: 'Quark Global', job_role: 'Associate Software Engineer / GET', ctc_lpa: '5 - 8 LPA', status: 'Hiring in progress, awaiting HR response.', batch: '2027' },
    { s_no: 11, company_name: 'GridSync Services Pvt Ltd', job_role: 'Automation/Testing/Commissioning Engineer', ctc_lpa: '3-5 LPA', status: 'Hiring in progress, invitation mail requested.', batch: '2027' },
    { s_no: 12, company_name: 'EmbedUR Systems', job_role: 'Software Engineering/Trainee roles', ctc_lpa: '5 - 8 LPA', status: 'HR requested invite mail, awaiting HR response.', batch: '2027' },
    { s_no: 13, company_name: 'UBS Bglr', job_role: 'Multiple IT Roles', ctc_lpa: '10 - 12 LPA', status: 'Invite mail requested by HR, awaiting HR response.', batch: '2027' },
    { s_no: 14, company_name: 'Planys Technologies', job_role: 'Mechanical, Electrical & Manufacturing Intern', ctc_lpa: '15k/month', status: 'HR requested invite mail. Follow-up needed.', batch: '2027' },
    { s_no: 15, company_name: 'Perfint Healthcare Ltd', job_role: 'SDE', ctc_lpa: '5 - 6 LPA', status: 'Active hiring. Awaiting JD.', batch: '2027' },
    { s_no: 16, company_name: 'Flatirons Solutions', job_role: 'Associate Software Engineer', ctc_lpa: '3 - 5 LPA', status: 'HR requested invite mail, awaiting HR response.', batch: '2027' },
    { s_no: 17, company_name: 'Dassault Systems', job_role: 'Associate Software / R & D Engineer', ctc_lpa: '7 - 9 LPA', status: 'Invite mail requested by HR, awaiting HR response (Bangalore location preferably)', batch: '2027' },
    { s_no: 18, company_name: 'Loyalty Juggernaut', job_role: 'Software Engineer', ctc_lpa: '3 - 5 LPA', status: 'HR requested an invite mail', batch: '2027' },
    { s_no: 19, company_name: 'Bigcat Wireless Private Limited', job_role: 'Embedded Software Engineer', ctc_lpa: '5 LPA', status: 'Hiring in progress. HR requested invite mail.', batch: '2027' },
    { s_no: 20, company_name: 'Driblet Pvt Ltd', job_role: 'Robotics Engineer', ctc_lpa: '4 - 6 LPA', status: 'Hiring in progress, awaiting HR response.', batch: '2027' },
    { s_no: 21, company_name: 'Bibus India Pvt Ltd', job_role: 'Design Engineer / Internal Coordinator', ctc_lpa: '3 - 4 LPA', status: 'JD received. DB to be shared.', batch: '2027' },
    { s_no: 22, company_name: 'L & T Technologies', job_role: 'GET', ctc_lpa: '4 - 6 LPA', status: 'Invite mail requested by HR. Awaiting HR confirmation.', batch: '2027' },
    { s_no: 23, company_name: 'Fanucindia', job_role: 'GET', ctc_lpa: '5 LPA', status: 'HR requested invite mail. HR response awaited.', batch: '2027' },
    { s_no: 24, company_name: 'DSRL', job_role: 'Embedded Engineer', ctc_lpa: '3 - 5 LPA', status: 'Active hiring. HR requested invite mail.', batch: '2027' },
    { s_no: 25, company_name: 'Voltech Events', job_role: 'GET (EEE)', ctc_lpa: '3 LPA', status: 'Hiring in progress. Awaiting JD (Preferably male candidates).', batch: '2027' },
    { s_no: 26, company_name: 'Crawl Corp India', job_role: 'AI Engineer', ctc_lpa: '4 LPA', status: 'HR requested invite mail. HR response awaited.', batch: '2027' },
    { s_no: 27, company_name: 'Modulus Housing', job_role: 'Architect Engineer', ctc_lpa: '3 LPA', status: 'Invite mail requested by HR. Awaiting HR confirmation.', batch: '2027' },
    { s_no: 28, company_name: 'Hunger Box', job_role: 'Multiple roles', ctc_lpa: '4 - 5 LPA', status: 'Invite mail requested by HR. Awaiting HR confirmation.', batch: '2027' },
    { s_no: 29, company_name: 'PWC', job_role: 'GET', ctc_lpa: '4 LPA', status: 'HR requested invite mail. HR response awaited.', batch: '2027' },
    { s_no: 30, company_name: 'Agnitech Forge Pvt. Lmt.', job_role: 'Data Analyst', ctc_lpa: '3–5 LPA', status: 'Invite mail requested by HR. Awaiting HR confirmation.', batch: '2027' },
    { s_no: 31, company_name: 'AgentAnalytics.AI', job_role: 'AI/ML & Agentic Engineer', ctc_lpa: '4-6 LPA', status: 'Invite mail requested by HR. Awaiting HR confirmation.', batch: '2027' },
    { s_no: 32, company_name: 'Mercedes Benz', job_role: 'Test / Analytics Engineer', ctc_lpa: '9-10 LPA', status: 'HR requested invite mail. HR response awaited.', batch: '2027' },
    { s_no: 33, company_name: 'Kinaxis', job_role: 'Software Engineer Trainee', ctc_lpa: '6 LPA', status: 'Hiring plans by September. Follow-up needed.', batch: '2027' },
    { s_no: 34, company_name: 'Hashiraworks', job_role: 'Software Developer', ctc_lpa: '10 - 12 LPA', status: 'Invite mail requested by HR. Awaiting HR confirmation.', batch: '2027' },
    { s_no: 35, company_name: 'Valeo', job_role: 'Graduate Engineer Trainee', ctc_lpa: '3 - 5 LPA', status: 'Active hiring. HR requested invite mail.', batch: '2027' },
    { s_no: 36, company_name: 'Care Edge', job_role: 'Software  / AI Engineer', ctc_lpa: '3 LPA', status: 'Hiring plans are in progress. Awaiting hiring month confirmation.', batch: '2027' },
    { s_no: 37, company_name: 'Colan Infotech', job_role: 'Software Developer', ctc_lpa: '4 LPA', status: 'Hiring actively. Awaiting JD.', batch: '2027' },
    { s_no: 38, company_name: 'Rishabh Enterprises', job_role: 'GET', ctc_lpa: '3-4 LPA', status: 'Invite mail requested by HR. Awaiting HR confirmation.', batch: '2027' },
    { s_no: 39, company_name: 'Planys Tech', job_role: 'Mechanical, Electrical & Manufacturing Intern', ctc_lpa: '15k/month', status: 'Invite mail requested by HR. Awaiting JD.', batch: '2027' },
    { s_no: 40, company_name: 'Lawlytics', job_role: 'Tech Support Roles', ctc_lpa: '13 - 15 LPA', status: 'Invite mail requested by HR. Awaiting HR confirmation.', batch: '2027' },
    { s_no: 41, company_name: 'DeepFacts Pvt Ltd', job_role: 'Software Engineer', ctc_lpa: '3 - 4 LPA', status: 'Active hiring. HR requested invite mail.', batch: '2027' },
    { s_no: 42, company_name: 'Revature', job_role: 'Software Engineer Trainee', ctc_lpa: '4 - 5 LPA', status: 'October hiring. Follow-up by September end.', batch: '2027' },
    { s_no: 43, company_name: 'American Megatrends', job_role: 'Software Engineer Trainee', ctc_lpa: '3.5 - 5 LPA', status: 'November hiring. Follow-up by October mid.', batch: '2027' },
    { s_no: 44, company_name: 'Sanmar', job_role: 'GET', ctc_lpa: '4 - 5 LPA', status: 'November hiring. Follow-up by October mid.', batch: '2027' },
    { s_no: 45, company_name: 'Congruent', job_role: 'Junior Software Engineer', ctc_lpa: '4 - 5 LPA', status: 'November hiring. Follow-up by October mid.', batch: '2027' },
    { s_no: 46, company_name: 'Sanmar', job_role: 'GET', ctc_lpa: '4 - 5 LPA', status: 'November hiring. Follow-up by October mid.', batch: '2027' },
    { s_no: 47, company_name: 'Congruent', job_role: 'Junior Software Engineer', ctc_lpa: '4 - 5 LPA', status: 'December hiring. Follow-up by November mid.', batch: '2027' },
    { s_no: 48, company_name: 'Titan Engineering', job_role: 'GET', ctc_lpa: '4 - 5 LPA', status: 'December hiring. Follow-up by November mid.', batch: '2027' },
    { s_no: 49, company_name: 'Omega Health Care', job_role: 'AR Caller/Trainee Coder', ctc_lpa: '3 LPA', status: 'Actively hiring, awaiting JD.', batch: '2027' },
    { s_no: 50, company_name: 'FocusR', job_role: 'IT trainee roles', ctc_lpa: '3 LPA', status: 'Hiring in progress. HR confirmation awaited.', batch: '2027' },
    { s_no: 51, company_name: 'LTTS', job_role: 'Associate Engineer Trainee', ctc_lpa: '4 LPA', status: 'Hiring actively. Awaiting JD.', batch: '2027' },
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

  // 7. Insert Pipeline Companies (and flag the top companies)
  let pipelineCreated = 0;
  let topCount = 0;
  for (const item of pipelineList) {
    const comp = await getOrCreateCompany(item.company_name);
    const isTop = topCompanyMatches.some((name) => name.toLowerCase() === item.company_name.trim().toLowerCase());
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

  console.log(`✅ [HITS Weekly Tracker] Successfully loaded fresh data for HITS College:`);
  console.log(`   - Companies In Progress : ${inProgressCreated}`);
  console.log(`   - Companies In Pipeline : ${pipelineCreated}`);
  console.log(`   - Top Companies Marked  : ${topCount}`);

  return {
    success: true,
    message: `Successfully loaded ${inProgressCreated} in-progress, ${pipelineCreated} pipeline, and ${topCount} top companies for HITS College.`,
    inProgressCount: inProgressCreated,
    pipelineCount: pipelineCreated,
    topCompaniesCount: topCount,
  };
}
