// Manual corrections for the 14 messy company entries in MCET, derived from
// inspecting the FULL raw row (email domain, matching phone numbers against
// records already in metadata, and the surrounding columns) rather than
// guessing from the company-name string alone.
const MANUAL_FIXES = {
  'Bain and Company - 14.5 LPA': { company: 'Bain and Company', extra: '14.5 LPA' },
  'Hyperverge - 14 LPA': { company: 'Hyperverge', extra: '14 LPA' },
  // row 60's mobile column was blank in the sheet - user supplied the real number directly
  'Kyndryl 6LPA': { company: 'Kyndryl', hr: 'Kaveri', extra: '6 LPA', forceMobile: '919971744577' },
  'Bajaj FInance6.5 + incentives - Sales role': { company: 'Bajaj Finance', extra: '6.5 LPA + incentives, Sales role' },
  'Parvathi Aravindh/Lead – Talent Acquisition': {
    // company name column actually held the HR's own name+title; the real
    // company is only recoverable from the email domain (azentio.com) -
    // matches the existing "Azentio" record (#454) from earlier this session
    company: 'Azentio', hr: 'Parvathi Aravindh', extra: 'Lead - Talent Acquisition',
  },
  'Aerele technologies  /tirupur': { company: 'Aerele Technologies', hr: 'Vignesh Sekar', extra: 'Founder, Tirupur' },
  'Namekart - Subashini (Noida)': { company: 'Namekart', hr: 'Subashini', extra: 'Noida' },
  'Geetanjali Sharma - Optiver': { company: 'Optiver', hr: 'Geetanjali Sharma' },
  'Serena Hitachi': { company: 'Hitachi Energy (Direct Contact)', hr: 'Serena' }, // matches existing record by exact phone 9987493642
  'Prasanna GEP World': { company: 'GEP World', hr: 'Prasanna' },
  'IMC': { company: 'IMC Trading', hr: 'Kamlesh J' }, // "Trading" was part of the company name, not a stray word
  'Edveon hariharan': { company: 'Edveon', hr: 'Hariharan' },
  'MuticoreWare': { company: 'Multicoreware', hr: 'Swetha Srinivasan' }, // typo; matches existing record by exact phone 9380801094
  'Workday - 20 LPA': { company: 'Workday', extra: '20 LPA' },
};

module.exports = MANUAL_FIXES;
