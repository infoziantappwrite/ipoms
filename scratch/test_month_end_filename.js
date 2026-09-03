function getReportExportBaseFileName(report) {
  if (!report) return 'report';

  // 1. Extract College Acronym
  let acronym = (report.branding?.college_code || report.college_code || '').trim();
  if (!acronym || acronym.toUpperCase() === 'IPOMS' || acronym.toUpperCase() === 'COLLEGE') {
    const cName = report.branding?.college_name || report.college_name || report.institution_name || '';
    const parenMatch = cName.match(/\((.*?)\)/);
    if (parenMatch && parenMatch[1]) {
      acronym = parenMatch[1].trim();
    } else if (cName) {
      const words = cName.split(/\s+/);
      acronym = words[0] || 'college';
    } else {
      acronym = 'college';
    }
  }

  const cleanAcronym = acronym.toLowerCase();

  // 2. Check if Month-End Report
  const isMonthEnd =
    report.template_type === 'month_end' ||
    report.template_type === 'monthly_placement' ||
    (report.report_title && /month/i.test(report.report_title)) ||
    (report.template_name && /month/i.test(report.template_name));

  if (isMonthEnd) {
    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    let detectedMonth = '';
    const searchSources = [
      report.report_period,
      report.period,
      report.week_label,
      report.report_title,
      report.title,
    ];

    for (const src of searchSources) {
      if (typeof src === 'string' && src.trim()) {
        for (const m of MONTHS) {
          if (new RegExp(`\\b${m}\\b`, 'i').test(src)) {
            detectedMonth = m;
            break;
          }
        }
        if (detectedMonth) break;
      }
    }

    if (!detectedMonth) {
      const rawDate = report.generated_date || report.created_at || report.updated_at;
      const d = rawDate ? new Date(rawDate) : new Date();
      if (!isNaN(d.getTime())) {
        detectedMonth = MONTHS[d.getMonth()];
      } else {
        detectedMonth = 'August';
      }
    }

    // Required filename format: "aiht- August month report" (for aiht- August month report.pdf)
    return `${cleanAcronym}- ${detectedMonth} month report`;
  }

  const baseTitle = (report.report_title || 'Weekly_Placement_Report')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  return cleanAcronym && cleanAcronym !== 'ipoms' && cleanAcronym !== 'college'
    ? `${cleanAcronym}_${baseTitle}`
    : baseTitle;
}

// Test cases
const testCases = [
  {
    report: {
      template_type: 'month_end',
      branding: { college_code: 'AIHT', college_name: 'Anand Institute of Higher Technology' },
      report_period: 'August 2026',
    },
    expectedPdf: 'aiht- August month report.pdf',
    expectedPng: 'aiht- August month report.png',
  },
  {
    report: {
      template_type: 'month_end',
      branding: { college_code: 'KIOT', college_name: 'Knowledge Institute of Technology' },
      report_period: 'August 2026',
    },
    expectedPdf: 'kiot- August month report.pdf',
    expectedPng: 'kiot- August month report.png',
  },
  {
    report: {
      template_type: 'month_end',
      branding: { college_code: 'KLU', college_name: 'Kalasalingam Academy of Research and Education' },
      report_title: 'September 2026 Month-End Placement Report',
      report_period: 'September 2026',
    },
    expectedPdf: 'klu- September month report.pdf',
    expectedPng: 'klu- September month report.png',
  },
  {
    report: {
      template_type: 'month_end',
      branding: { college_code: 'ACET', college_name: 'Achariya College of Engineering Technology' },
      report_period: 'August 2026',
    },
    expectedPdf: 'acet- August month report.pdf',
    expectedPng: 'acet- August month report.png',
  },
];

console.log('🧪 Testing Month End Report File Name Generation...\n');
let allPassed = true;

testCases.forEach((tc, idx) => {
  const baseName = getReportExportBaseFileName(tc.report);
  const pdfName = `${baseName}.pdf`;
  const pngName = `${baseName}.png`;

  const pdfPass = pdfName === tc.expectedPdf;
  const pngPass = pngName === tc.expectedPng;

  if (pdfPass && pngPass) {
    console.log(`✅ Test ${idx + 1} Passed: "${pdfName}" & "${pngName}"`);
  } else {
    console.error(`❌ Test ${idx + 1} Failed! Got PDF: "${pdfName}", Expected: "${tc.expectedPdf}"`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\n🎉 ALL FILE NAME TESTS PASSED PERFECTLY!');
} else {
  process.exit(1);
}
