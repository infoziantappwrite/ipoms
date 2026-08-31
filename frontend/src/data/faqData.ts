export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  categoryLabel: string;
  tags: string[];
}

export interface FaqCategory {
  id: string;
  label: string;
  iconName: string;
  description: string;
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'all',
    label: 'All Questions',
    iconName: 'HelpCircle',
    description: 'Browse all frequently asked questions across the iPOMS platform.',
  },
  {
    id: 'report_builder',
    label: 'Report Builder & Exports',
    iconName: 'FileText',
    description: 'Weekly reports, pending tasks, active leads, A4 PDF print, image & Excel exports.',
  },
  {
    id: 'active_leads',
    label: 'Active Leads Management',
    iconName: 'Sparkles',
    description: 'Batch-specific active corporate rosters, 4-column layout, and direct database syncing.',
  },
  {
    id: 'pending_tasks',
    label: 'Placement Pending Tasks',
    iconName: 'ListTodo',
    description: 'Follow-ups on pending JDs, candidate databases, and scheduled drive dates.',
  },
  {
    id: 'daily_tracker',
    label: 'Daily Tracker & Calls',
    iconName: 'PhoneCall',
    description: 'Daily phone call logging, corporate outcomes, and auto-syncing into active leads.',
  },
  {
    id: 'weekly_tracker',
    label: 'Weekly Tracker & Pipelines',
    iconName: 'TrendingUp',
    description: 'Pipeline stages, student placed counts, and holds management by college/HR.',
  },
  {
    id: 'master_companies',
    label: 'Master Companies & Search',
    iconName: 'Building2',
    description: 'HR contact directory, past hiring history, and multi-parameter filtering.',
  },
  {
    id: 'institutions_roles',
    label: 'Institutions & Account Settings',
    iconName: 'ShieldCheck',
    description: 'Partner college switching, coordinator/admin permissions, and profile settings.',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  // ── 1. Report Builder & Document Generation ──
  {
    id: 'faq-1',
    category: 'report_builder',
    categoryLabel: 'Report Builder & Exports',
    question: 'What are the 3 types of reports available in the Report Builder?',
    answer: 'The Report Builder provides 3 specialized report categories:\n\n1. **Weekly Placement Report**: Generates institution-specific placement drive progress, stage-by-stage pipelines (Completed, In Progress, Pipeline, Top Companies, On Hold), confirmed placed student counts, and executive KPI summaries over a selected date range.\n2. **Pending Tasks Report**: A drive-action roster highlighting pending JDs, candidate database sharing deadlines, next actions, and scheduled drive dates for operational follow-ups.\n3. **Active Leads Pipeline Report**: A batch-specific corporate roster (e.g., Batch 2026, 2027, 2028) listing active hiring partners with designated roles and CTC packages.',
    tags: ['reports', 'weekly placement', 'pending tasks', 'active leads', 'templates'],
  },
  {
    id: 'faq-2',
    category: 'report_builder',
    categoryLabel: 'Report Builder & Exports',
    question: 'Which export formats are supported for generated reports?',
    answer: 'Every report can be exported in 3 presentation-grade formats:\n\n* **Save PDF (`.pdf`)**: Formatted specifically for standard A4 printing with auto-repeating table headers and institutional footers across multi-page documents.\n* **Save Image (`.png`)**: Generates an Ultra-HD (3000px width) high-resolution image with crisp text wrapping, optimized for direct sharing on WhatsApp and mobile messaging.\n* **Export XLSX (`.xls`)**: Exports a structured spreadsheet with formatted data grids and section headers for internal records and spreadsheet analysis.',
    tags: ['pdf', 'image', 'png', 'excel', 'xlsx', 'export', 'print', 'whatsapp'],
  },
  {
    id: 'faq-3',
    category: 'report_builder',
    categoryLabel: 'Report Builder & Exports',
    question: 'Can I edit report details before downloading or sharing?',
    answer: 'Yes. After generating any report, the interactive document editor allows coordinators to edit company names, roles, CTC figures, remarks, and observations inline prior to exporting. All edits instantly update both the on-screen preview and the exported files.',
    tags: ['edit report', 'inline edit', 'live editor', 'customize'],
  },

  // ── 2. Active Leads Management ──
  {
    id: 'faq-4',
    category: 'active_leads',
    categoryLabel: 'Active Leads Management',
    question: 'Where does the data in the Active Leads Report come from?',
    answer: 'The data syncs directly from the **Active Leads Management** database module. Any changes made to company names, roles, or CTC packages in the Active Leads module automatically reflect when building the report.',
    tags: ['sync', 'active leads management', 'database', 'source'],
  },

  // ── 3. Placement Pending Tasks ──
  {
    id: 'faq-5',
    category: 'pending_tasks',
    categoryLabel: 'Placement Pending Tasks',
    question: 'How to use the Pending Tasks module?',
    answer: 'Once you are on the **Pending Tasks** screen:\n\n* **Select College**: Select your target college first from the dropdown.\n* **Add Entries**: After selecting the college, you can add new pending task entries manually.\n* **Edit Entries**: If you want to edit previously available entries, click the **Pen (Edit)** icon available in each row.\n* **Delete Entries**: You can delete any specific row by using the **Bin (Delete)** icon.\n* **Export Documents**: This pending task list can be exported into an **Excel document (`.xls`)**, **Image (`.png`)**, or **PDF document (`.pdf`)** by clicking the **Export** button.',
    tags: ['pending tasks', 'college selection', 'manual entry', 'edit row', 'delete row', 'export'],
  },

  // ── 4. Daily Tracker & Call Logging ──
  {
    id: 'faq-6',
    category: 'daily_tracker',
    categoryLabel: 'Daily Tracker & Calls',
    question: 'How to use the Daily Tracker module?',
    answer: 'Once you are on the **Daily Tracker** screen, the buttons perform their respective actions:\n\n* **College Selection**: Select your target institution from the college dropdown selector.\n* **Searching**: Search across company names, HR contacts, or phone numbers to quickly locate or populate records.\n* **Add (`+ Add Row`)**: Add new daily calling entries manually into the tracker grid.\n* **Save**: Save your logged calling outcomes, remarks, and updates securely into the database.\n* **History**: View previous days\' call history records, which are **read-only** (non-editable) for data integrity and reference.',
    tags: ['daily tracker', 'college selection', 'searching', 'add row', 'save', 'history', 'read only'],
  },
  {
    id: 'faq-7',
    category: 'daily_tracker',
    categoryLabel: 'Daily Tracker & Calls',
    question: 'How to perform calls in the Daily Tracker?',
    answer: 'To perform daily calls and log conversations:\n\n* **1. Load Contacts**: Click the **Load Contacts** button to open the master metadata directory. Select contacts using the **S.No Range Picker** or **Pagination**, or click **Recent Data** (top-right corner) to pick from recently loaded metadata. Click **Import Contacts** (e.g., Import 20 or 30 contacts) to create your daily calling table.\n* **2. Starting Time**: Enter your **Starting Time** manually in the first column before initiating the call.\n* **3. Complete Call & Select Outcome**: Perform the call. Once completed, select the **Call Outcome / Status** from the dropdown.\n* **4. Automatic End Time & Duration**: Once the call status is chosen, the system automatically records the **Ending Time** and computes the **Duration**.\n* **5. Remarks & Follow-Up Month**: Add any comments. If the outcome is **Follow Up**, the **Follow Up Month** column activates for that row to assign the scheduled month.\n* **6. Row Actions**: Use the action buttons on any row to edit or delete entries as needed.',
    tags: ['perform calls', 'load contacts', 'range picker', 'recent data', 'starting time', 'duration', 'follow up month', 'call outcome'],
  },

  // ── 5. Weekly Tracker & Pipeline Progression ──
  {
    id: 'faq-8',
    category: 'weekly_tracker',
    categoryLabel: 'Weekly Tracker & Pipelines',
    question: 'How does the Daily Tracker sync with the Weekly Tracker?',
    answer: 'To sync and manage weekly placement pipelines:\n\n* **1. Mandatory College Selection**: Selecting your target college from the dropdown is a **must** before managing records.\n* **2. Sync Positives (`Sync` Button)**: Click the **Sync Daily Positives** button. This automatically pulls all positive call outcomes logged in the Daily Tracker (*Hiring, Invite Email, Follow Up*) into your weekly pipeline stages.\n* **3. Manual Add (`+ Add Company`)**: You can also add companies manually into any section using the **+ Add Company** button.\n* **4. Move Between Sections (`⇅`)**: Click the **Up/Down Bidirectional Arrow (`⇅`)** icon on any company row to move it into any of the 7 available pipeline sections.\n* **5. Edit & Delete**: You can edit row details with the **Pen (Edit)** icon or delete entries using the row action buttons.\n* **6. Export & WhatsApp Sharing**: From here, you can export the formatted weekly placement report into **Excel**, **Image**, or **PDF** format to share directly with your respective college placement groups on WhatsApp.',
    tags: ['weekly tracker', 'daily sync', 'sync button', 'positive calls', 'college selection', 'manual add', 'move section', 'bidirectional arrow', 'edit', 'delete', 'export', 'whatsapp'],
  },
  {
    id: 'faq-9',
    category: 'weekly_tracker',
    categoryLabel: 'Weekly Tracker & Pipelines',
    question: 'How do I move a company between different sections in the Weekly Tracker?',
    answer: 'To move a company to another section:\n\n* Click the **Up/Down Bidirectional Arrow (`⇅`)** button in the **Actions** column of that company\'s row.\n* A dropdown list will appear displaying all 7 available sections (*Companies Completed, Companies In Progress, Companies in Pipeline, Top Companies, Rejected by HR, On Hold by College/TPO, On Hold by HR*).\n* Click on your desired target section, and the company details will be moved to that section table area immediately.',
    tags: ['move company', 'sections', 'bidirectional arrow', 'pipeline transfer', 'reassign'],
  },
  {
    id: 'faq-16',
    category: 'weekly_tracker',
    categoryLabel: 'Weekly Tracker & Pipelines',
    question: 'What is the difference between "On Hold by College" and "On Hold by HR"?',
    answer: '* **On Hold by College**: The campus drive is temporarily paused due to internal college exams, semester holidays, or institutional schedule conflicts.\n* **On Hold by HR**: The corporate recruiter has put the drive on hold due to internal hiring budget reviews or organizational restructuring.',
    tags: ['on hold', 'hold by college', 'hold by hr', 'drive pause'],
  },
  {
    id: 'faq-17',
    category: 'weekly_tracker',
    categoryLabel: 'Weekly Tracker & Pipelines',
    question: 'How are confirmed student placement counts recorded for Completed drives?',
    answer: 'When updating a drive to **Completed**, coordinators enter the total number of students placed and their confirmed CTC package, which automatically feeds into executive placement KPI metrics.',
    tags: ['placed count', 'offers', 'completed drive', 'kpi summary'],
  },

  // ── 6. Master Companies & HR Directory Search ──
  {
    id: 'faq-18',
    category: 'master_companies',
    categoryLabel: 'Master Companies & Search',
    question: 'How do I search for company HR contact details and past hiring history across previous years?',
    answer: 'Use the global search bar in the **Master Companies** or **Active Leads** module. You can search by company name, HR contact person, email, or domain to view historical interactions and previous CTC offerings.',
    tags: ['search', 'hr contacts', 'hiring history', 'master database'],
  },
  {
    id: 'faq-19',
    category: 'master_companies',
    categoryLabel: 'Master Companies & Search',
    question: 'How do I add a brand-new company or new HR contact to the master database?',
    answer: 'In the **Master Companies** or **Active Leads** module, click **+ Add Company / Lead**, fill in the company name, website, primary HR contact person, phone number, and official email, and click **Save**.',
    tags: ['add company', 'new hr contact', 'create lead'],
  },
  {
    id: 'faq-20',
    category: 'master_companies',
    categoryLabel: 'Master Companies & Search',
    question: 'Can I filter companies by industry domain, CTC package tier, or target batch?',
    answer: 'Yes. Multi-parameter filter bars allow you to filter records by graduating batch (e.g., 2026, 2027), CTC package ranges (*Super Dream, Dream, Core*), or operational status.',
    tags: ['filter', 'ctc tier', 'domain filter', 'batch filter'],
  },

  // ── 7. Institutions, Roles & Account Settings ──
  {
    id: 'faq-21',
    category: 'institutions_roles',
    categoryLabel: 'Institutions & Account Settings',
    question: 'Can I generate consolidated reports across all partner institutions?',
    answer: 'Yes. For **Active Leads**, reports are consolidated across all partner institutions by graduating batch. For **Weekly Reports** and **Pending Tasks**, you can choose a specific institution or select "All Institutions" for a consolidated institutional overview.',
    tags: ['consolidated', 'all colleges', 'partner institutions', 'multi-campus'],
  },
  {
    id: 'faq-22',
    category: 'institutions_roles',
    categoryLabel: 'Institutions & Account Settings',
    question: 'Who prepares and signs off on the generated reports?',
    answer: 'The report automatically includes the name and designation of the logged-in placement coordinator in the metadata header, along with Infoziant branding, institutional logos, and confidential watermarks.',
    tags: ['coordinator name', 'branding', 'generated by', 'sign off'],
  },
  {
    id: 'faq-23',
    category: 'institutions_roles',
    categoryLabel: 'Institutions & Account Settings',
    question: 'How do I switch between different partner colleges assigned to me?',
    answer: 'Use the **Target Institution** dropdown selector in the navigation bar or within the Report Builder / Tracker headers to switch the active college context seamlessly.',
    tags: ['switch college', 'target institution', 'college selector'],
  },
  {
    id: 'faq-24',
    category: 'institutions_roles',
    categoryLabel: 'Institutions & Account Settings',
    question: 'What are the differences in permissions between Coordinator, Team Leader, and Administrator?',
    answer: '* **Coordinator**: Logs daily calls, updates assigned drives, and builds college placement reports.\n* **Team Leader**: Reviews coordinator submissions, manages active institutional assignments, and monitors team KPIs.\n* **Administrator**: Full system access including user management, role assignments, institution setups, and data exports.',
    tags: ['roles', 'permissions', 'coordinator', 'team leader', 'admin'],
  },
  {
    id: 'faq-25',
    category: 'institutions_roles',
    categoryLabel: 'Institutions & Account Settings',
    question: 'How do I update my profile details or password?',
    answer: 'Click on your avatar/name in the top-right corner of the dashboard, select **Profile / Settings**, update your contact details or password, and click **Save Changes**.',
    tags: ['profile', 'password', 'settings', 'account'],
  },
];
