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
    id: 'active_college_focus',
    label: 'Active College Focus & Locking',
    iconName: 'ShieldCheck',
    description: 'Weekly college focus locking, coordinator quotas (Min 1, Max 4), and unlocking dashboard modules.',
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
    description: 'HR contact directory, past hiring history, bulk paste, recycle bin, and multi-parameter filtering.',
  },
  {
    id: 'institutions_roles',
    label: 'Institutions & Account Settings',
    iconName: 'ShieldCheck',
    description: 'Partner college switching, coordinator/admin permissions, and profile settings.',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  // ── 0. Active College Focus & Module Unlocking ──
  {
    id: 'faq-0',
    category: 'active_college_focus',
    categoryLabel: 'Active College Focus & Locking',
    question: 'How to unlock the dashboard modules when they are locked, and how many colleges need to be selected in the Active College Focus section?',
    answer: 'To unlock your dashboard and access all operational modules (Daily Tracker, Weekly Tracker, Leads, Reports, and Pending Tasks), you must select your assigned partner institutions in the **Active College Focus** section on your Coordinator Dashboard and click **Save & Lock Focus**.\n\nHere are the complete guidelines, quotas, and unlocking conditions:\n\n* **1. College Selection Quota (Minimum 1, Maximum 4)**:\n  - **Minimum**: Every coordinator **must select at least 1 partner college** to unlock their dashboard and modules.\n  - **Maximum**: A coordinator can select and manage a **maximum of 4 partner colleges** during any active cycle.\n\n* **2. Strict Mutual Exclusion (Zero Duplication Across Coordinators)**:\n  - The **exact same college cannot be selected by multiple coordinators**.\n  - Once an institution is locked by one coordinator, it is marked with a **`🔒 Handled by [Coordinator Name]`** badge in the matrix and becomes disabled/non-selectable for all other coordinators.\n  - This guarantees all 6 placement coordinators operate on distinct, non-overlapping institutions without duplicate calling or double-handling.\n\n* **3. Weekly Monday Cycle**:\n  - Active college focus is configured on a **weekly basis** starting every **Monday**.\n  - Coordinators update or verify their assigned institutions at the start of each work week.\n\n* **4. How to Lock & Unlock the Modules**:\n  - **To Unlock Dashboard Modules**: Select your 1 to 4 available colleges from the grid and click the **"Save & Lock Focus"** button. The dashboard KPIs, Daily Tracker, Weekly Tracker, Leads, Reports, and sidebar navigation will immediately unlock for full access.\n  - **To Modify Selections Later**: If you ever need to change your focus institutions during the week, click **"Unlock & Edit Focus"**, adjust your selected colleges, and click **"Save & Lock Focus"** again to re-lock.',
    tags: [
      'active college focus',
      'unlock modules',
      'how to unlock',
      'minimum colleges',
      'maximum colleges',
      'weekly monday',
      'mutual exclusion',
      'no duplicate colleges',
      'save and lock',
      'unlock and edit',
      'dashboard locked',
      'college selection',
    ],
  },
  {
    id: 'faq-0b',
    category: 'active_college_focus',
    categoryLabel: 'Active College Focus & Locking',
    question: 'What happens if a coordinator forgets to lock their Active College Focus on Monday?',
    answer: 'If you do not lock your Active College Focus at the beginning of the week:\n\n* The navigation links for **Daily Tracker**, **Weekly Tracker**, **Daily Leads**, **Pending Tasks**, and **Report Builder** remain in a secure locked state with a prompt directing you to your Dashboard.\n* Once you open your Dashboard, choose your 1 to 4 focus colleges, and click **Save & Lock Focus**, your entire workspace will instantly unlock.\n* If you need to reassign a college during mid-week, your Team Leader or Administrator can also update assignments directly from the **Settings > College Roster** control panel.',
    tags: ['monday focus', 'forgot to lock', 'unlock workspace', 'team leader override', 'college roster'],
  },

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
    question: 'Which export formats are supported for generated reports and when should I use each?',
    answer: 'Every report can be exported in 3 presentation-grade formats:\n\n* **Save Image (`.png`) [Ultra-HD 3000px]**: Generates a high-definition image formatted with crisp fonts, rounded cards, and optimal padding. **Best for**: Direct sharing to College/TPO WhatsApp groups where quick mobile readability without opening PDF viewers is essential.\n* **Save PDF (`.pdf`) [Standard A4 Print]**: Formatted specifically for standard A4 printing with auto-repeating table headers, clean page breaks, institutional branding, and footers. **Best for**: Formal executive management meetings, TPO audits, and physical printed dossiers.\n* **Export XLSX (`.xls`) [Spreadsheet Data]**: Exports a clean, structured spreadsheet with formatted data grids and section headers. **Best for**: Internal record keeping, historical archiving, and offline spreadsheet calculations.',
    tags: ['pdf', 'image', 'png', 'excel', 'xlsx', 'export', 'print', 'whatsapp', 'ultra hd', 'when to use'],
  },
  {
    id: 'faq-3',
    category: 'report_builder',
    categoryLabel: 'Report Builder & Exports',
    question: 'Can I edit report details before downloading or sharing?',
    answer: 'Yes. After generating any report, the interactive document editor allows coordinators to edit company names, roles, CTC figures, remarks, and observations inline prior to exporting. All edits instantly update both the on-screen preview and the exported files.',
    tags: ['edit report', 'inline edit', 'live editor', 'customize'],
  },
  {
    id: 'faq-3b',
    category: 'report_builder',
    categoryLabel: 'Report Builder & Exports',
    question: 'What does the "Reset" button do in the Report Builder / Generator area?',
    answer: 'The **Reset** button (styled matching the navigation controls) allows you to instantly revert all temporary filters, custom date pickers, or unsaved inline edits back to their default pristine database values without needing to refresh the entire browser page.',
    tags: ['reset button', 'clear filters', 'revert report', 'restore defaults'],
  },
  {
    id: 'faq-3c',
    category: 'report_builder',
    categoryLabel: 'Report Builder & Exports',
    question: 'How do the "Expand All" and "Collapse All" buttons assist in report generation?',
    answer: 'In multi-section reports (like the Weekly Placement Report with 7 pipeline stages):\n\n* **Collapse All**: Collapses every section into compact title cards, allowing you to get an immediate high-level overview of total company counts per category.\n* **Expand All**: Expands all tables simultaneously, making it effortless to perform a comprehensive line-by-line review before exporting your final PDF or WhatsApp image.',
    tags: ['expand all', 'collapse all', 'accordion', 'overview', 'quick review'],
  },

  // ── 2. Active Leads Management ──
  {
    id: 'faq-4',
    category: 'active_leads',
    categoryLabel: 'Active Leads Management',
    question: 'Where does the data in the Active Leads Report come from and how does it sync?',
    answer: 'The data syncs directly from the **Active Leads Management** database module. Any changes made to company names, roles, or CTC packages in the Active Leads module automatically reflect when building the report in real-time.\n\nCoordinators can switch between batch tabs (**Batch 2026**, **Batch 2027**, **Batch 2028**) to view and maintain distinct graduating rosters.',
    tags: ['sync', 'active leads management', 'database', 'source', 'batch tabs'],
  },
  {
    id: 'faq-4b',
    category: 'active_leads',
    categoryLabel: 'Active Leads Management',
    question: 'What is the structure of the Active Leads table?',
    answer: 'Active Leads utilizes an ultra-clean **4-Column Layout**:\n\n1. **S.No / ID**: Sequential tracking number.\n2. **Company Name**: Verified corporate recruiter name.\n3. **Role / Designation**: Designated campus hiring job profile (e.g., Software Engineer, Trainee, Analyst).\n4. **CTC Package**: Salary or stipend package details offered to candidates (e.g., 6.5 LPA, 12 LPA).\n5. **Actions**: Row actions for instant editing or deletion with the ruby-red delete trigger.',
    tags: ['4-column layout', 'active leads table', 'ctc package', 'job role', 'company name'],
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
  {
    id: 'faq-5b',
    category: 'pending_tasks',
    categoryLabel: 'Placement Pending Tasks',
    question: 'What are the operational categories tracked under Placement Pending Tasks?',
    answer: 'Pending Tasks allows placement coordinators to track time-sensitive action items including:\n\n* **Pending JD Collection**: Following up with HR to receive formal Job Descriptions and eligibility criteria.\n* **Candidate Database Sharing**: Preparing and transmitting filtered student resume lists to the recruiting team.\n* **Online Assessment Scheduling**: Coordinating test dates, platforms (HackerRank, Cocubes, etc.), and lab slots.\n* **Interview Slot Finalization**: Confirming panel dates and room allocations with TPO and HR representatives.',
    tags: ['pending jd', 'candidate database', 'online assessment', 'interview dates', 'task categories'],
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
  {
    id: 'faq-7b',
    category: 'daily_tracker',
    categoryLabel: 'Daily Tracker & Calls',
    question: 'How does the "Tomorrow\'s Tracker" work and how do I move or reschedule calls?',
    answer: 'The Daily Tracker provides dedicated **Today** and **Tomorrow** views to manage your calling pipeline seamlessly:\n\n* **Moving Calls from Today to Tomorrow**: When managing today\'s calling list, you can select one or multiple rows and click **Tomorrow** (or the Move action) to transfer them directly into tomorrow\'s schedule.\n* **Working inside Tomorrow\'s Tracker**: When you switch to the **Tomorrow** tab, you are viewing your pre-scheduled upcoming roster.\n* **Rescheduling from Tomorrow**: When you select a row while already on the Tomorrow tab, the interface displays a direct **Move** action allowing you to reassign the call to a specific custom date or shift it back, preventing redundant "move to tomorrow" loops.\n* **Color Consistency**: The Tomorrow tab and Tomorrow action buttons use the signature cyan-teal theme (`#00E5FF`) for instant visual clarity.',
    tags: ['tomorrow tracker', 'move button', 'reschedule calls', 'custom date', 'tomorrow tab', 'scheduled calls'],
  },
  {
    id: 'faq-7c',
    category: 'daily_tracker',
    categoryLabel: 'Daily Tracker & Calls',
    question: 'How do I use the "Recent Data" and "Range Picker" in the Load Contacts modal?',
    answer: 'When loading fresh HR contacts into your Daily Tracker:\n\n* **S.No Range Picker**: Enter starting and ending serial numbers (e.g., From `1` to `30`) to immediately batch-select a contiguous block of contacts.\n* **Recent Data Quick Button**: Located at the top-right of the modal, clicking **Recent Data** automatically highlights the most recently added or updated corporate metadata contacts.\n* **Import Selected**: Click the green **Import Contacts** button to populate your Daily Tracker table instantly.',
    tags: ['range picker', 'recent data', 's.no selection', 'quick import', 'load contacts modal'],
  },

  // ── 5. Inactive & Daily Leads Pipeline ──
  {
    id: 'faq-7d',
    category: 'active_leads',
    categoryLabel: 'Active Leads Management',
    question: 'What is the difference between the "Positives" tab and the "JD Received" tab in Leads Management?',
    answer: 'Leads Management organizes corporate opportunities across two stages:\n\n* **Positives Tab (Blue)**: Contains all companies that gave positive initial feedback during daily calls (*Hiring, Follow Up, Request for Email Pitch*). These represent warm opportunities requiring nurturing.\n* **JD Received Tab (Green)**: Contains corporate partners who have formally submitted their Job Description (JD), eligibility criteria, and CTC package. These leads are ready for drive scheduling and can be pushed directly into active placement rosters.',
    tags: ['positives tab', 'jd received', 'blue tab', 'green tab', 'lead lifecycle', 'hiring pitch'],
  },

  // ── 6. Weekly Tracker & Pipeline Progression ──
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
    id: 'faq-9b',
    category: 'weekly_tracker',
    categoryLabel: 'Weekly Tracker & Pipelines',
    question: 'Can I bulk copy-paste companies directly into Weekly Tracker sections from Excel?',
    answer: 'Yes! You can click the **Paste from Excel** action in any Weekly Tracker section. A modal will open where you can paste tab-separated rows copied straight from your spreadsheet. The system automatically maps Company Name, Role, Package, Dates, and Contact details directly into the selected section.',
    tags: ['bulk paste', 'excel paste', 'paste weekly', 'spreadsheet import', 'quick add'],
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

  // ── 7. Master Companies & HR Directory Search ──
  {
    id: 'faq-18',
    category: 'master_companies',
    categoryLabel: 'Master Companies & Search',
    question: 'How do I search for company HR contact details and past hiring history across previous years?',
    answer: 'Use the global search bar in the **Master Companies** or **Active Leads** module. You can search by company name, HR contact person, email, or domain to view historical interactions and previous CTC offerings.',
    tags: ['search', 'hr contacts', 'hiring history', 'master database'],
  },
  {
    id: 'faq-18b',
    category: 'master_companies',
    categoryLabel: 'Master Companies & Search',
    question: 'How does the Bulk Paste modal work in Master Metadata?',
    answer: 'The **Bulk Paste** feature in Master Metadata allows administrators and coordinators to onboard entire contact directories in seconds:\n\n1. Copy columns from Excel/Google Sheets (*Company Name, HR Person, Designation, Phone, Email, Domain, Location*).\n2. Click **Paste Contacts** in the Master Metadata header and paste the content into the text area.\n3. The system parses every row, detects headers automatically, and provides an interactive preview grid.\n4. If any rows have missing mandatory fields, click **Remove Invalid Rows** to clean them up, then click **Import All Valid Rows**.',
    tags: ['bulk paste modal', 'metadata import', 'csv paste', 'parse excel', 'auto validation'],
  },
  {
    id: 'faq-18c',
    category: 'master_companies',
    categoryLabel: 'Master Companies & Search',
    question: 'How does the Metadata Recycle Bin and Soft Deletion protect contact records?',
    answer: 'To prevent accidental data loss of valuable corporate HR numbers:\n\n* When you delete a contact from the Master Metadata directory, it is moved to the **Recycle Bin** rather than being permanently destroyed.\n* To view deleted records, click the **Recycle Bin** toggle in the header.\n* Click the green **Restore (`↺`)** button on any row to return that contact back to the active directory immediately.\n* If you want to permanently clear discarded contacts, click the red **Empty Recycle Bin** button.',
    tags: ['recycle bin', 'soft delete', 'restore contact', 'empty recycle bin', 'data protection'],
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

  // ── 8. Institutions, Roles & Account Settings ──
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
  {
    id: 'faq-26',
    category: 'institutions_roles',
    categoryLabel: 'Institutions & Account Settings',
    question: 'What design standard is used for Delete and Destructive buttons across iPOMS?',
    answer: 'To ensure uniform safety and intuitive visual recognition, all delete, discard, and empty-bin triggers across all modules (Daily Tracker, Weekly Tracker, Master Metadata, Active Leads, Daily Leads, and Pending Tasks) use the standardized **Ruby-Red Gradient** with subtle glowing elevation (`linear-gradient(180deg, #E60000 0%, #C80000 50%, #990000 100%)`).',
    tags: ['delete button', 'ruby red', 'design standard', 'button colors', 'safety'],
  },
];
