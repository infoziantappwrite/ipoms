/**
 * College Logo Resolution Engine for Reports and Branding
 * Ensures accurate lookup of partner college logos across single and multi-college reports.
 */

export const COLLEGE_LOGO_MAP: Record<string, string> = {
  // Nehru Group of Institutions / NCET
  NEHRU: '/college-logos/nehru.png',
  NCET: '/college-logos/nehru.png',
  'NEHRU GROUP': '/college-logos/nehru.png',
  'NEHRU GROUP OF INSTITUTIONS': '/college-logos/nehru.png',

  // Narayana Guru College of Engineering
  NGCE: '/college-logos/narayanaguru.png',
  NGC: '/college-logos/narayanaguru.png',
  NARAYANAGURU: '/college-logos/narayanaguru.png',
  'NARAYANA GURU': '/college-logos/narayanaguru.png',

  // Core & Partner Colleges (Codes & Names)
  ACET: '/college-logos/acet.png',
  ACEW: '/college-logos/ACEW.jfif',
  AIHT: '/college-logos/aiht.png',
  AAA: '/college-logos/aaa.png',
  AMCET: '/college-logos/AMCET.png',
  'ANNAI MIRA': '/college-logos/annai mira.png',
  AUDISANKAR: '/college-logos/audisankar.png',
  AUDISANKARA: '/college-logos/audisankar.png',
  AVS: '/college-logos/avs.png',
  BHARATHIYAR: '/college-logos/bharathiyar institue.png',
  CHRIST: '/college-logos/christ.png',
  DSU: '/college-logos/dsu.png',
  EGS: '/college-logos/egs.png',
  GANESH: '/college-logos/ganesg.png',
  GANESG: '/college-logos/ganesg.png',
  GCT: '/college-logos/gnyanamani.png',
  GNYANAMANI: '/college-logos/gnyanamani.png',
  GNANAMANI: '/college-logos/gnyanamani.png',
  HITS: '/college-logos/hits.png',
  HINDUSTAN: '/college-logos/hits.png',
  IFET: '/college-logos/ifet.png',
  KAMARAJ: '/college-logos/kamaraj.png',
  KARPAGAM: '/college-logos/karpagam.png',
  KARUNYA: '/college-logos/karunya.png',
  KCT: '/college-logos/kumaraguru.png',
  KGISL: '/college-logos/kgisl.png',
  KIOT: '/college-logos/kiot.jfif',
  KIT: '/college-logos/kit.png',
  KLU: '/college-logos/klu.png',
  KALASALINGAM: '/college-logos/klu.png',
  KPR: '/college-logos/kpr.png',
  KUMARAGURU: '/college-logos/kumaraguru.png',
  LICET: '/college-logos/layola.png',
  LAYOLA: '/college-logos/layola.png',
  LOYOLA: '/college-logos/layola.png',
  MAR: '/college-logos/mar ephream.png',
  'MAR EPHRAEM': '/college-logos/mar ephream.png',
  'MAR EPHREAM': '/college-logos/mar ephream.png',
  MCET: '/college-logos/MCET.png',
  MAHALINGAM: '/college-logos/MCET.png',
  MEC: '/college-logos/MEC.png',
  MUTHAYAMMAL: '/college-logos/MEC.png',
  MKCE: '/college-logos/mkce.png',
  'M.KUMARASAMY': '/college-logos/mkce.png',
  NGP: '/college-logos/ngp.png',
  'DR. N.G.P.': '/college-logos/ngp.png',
  'DR. NGP': '/college-logos/ngp.png',
  NPR: '/college-logos/npr.png',
  PANIMALAR: '/college-logos/panimalar.png',
  PEC: '/college-logos/panimalar.png',
  PSG: '/college-logos/psg.png',
  PSNA: '/college-logos/psna.png',
  RATHINAM: '/college-logos/Rathinam - RTC.png',
  RTC: '/college-logos/Rathinam - RTC.png',
  SECE: '/college-logos/srieshwar.png',
  SETHU: '/college-logos/sethu institue.png',
  SIT: '/college-logos/sethu institue.png',
  SMVEC: '/college-logos/smvec.png',
  SONA: '/college-logos/sona.png',
  SRI_SHANMUGA: '/college-logos/sri shanmuga.png',
  'SRI SHANMUGA': '/college-logos/sri shanmuga.png',
  'SRI SHANMUGHA': '/college-logos/sri shanmuga.png',
  SRIESHWAR: '/college-logos/srieshwar.png',
  'SRI ESHWAR': '/college-logos/srieshwar.png',
  SRM: '/college-logos/srm.png',
  SSEI: '/college-logos/sri shanmuga.png',
  VAIGAI: '/college-logos/vaigai.png',
  VCE: '/college-logos/vaigai.png',
  VIT: '/college-logos/vit.png',
};

export function getCollegeLogoUrl(
  collegeCode?: string,
  collegeName?: string,
  explicitLogoUrl?: string
): string {
  // 1. If explicit valid logo URL provided that is not Infoziant placeholder or broken external link
  if (
    explicitLogoUrl &&
    typeof explicitLogoUrl === 'string' &&
    explicitLogoUrl.trim() !== '' &&
    !explicitLogoUrl.includes('Infozianthead.png') &&
    !explicitLogoUrl.includes('clearbit')
  ) {
    return explicitLogoUrl.trim();
  }

  const cleanCode = (collegeCode || '').toUpperCase().trim();
  const cleanName = (collegeName || '').toLowerCase().trim();

  // 2. Direct code lookup
  if (cleanCode && COLLEGE_LOGO_MAP[cleanCode]) {
    return COLLEGE_LOGO_MAP[cleanCode];
  }

  // 3. Name-based keyword matchers
  if (cleanName.includes('nehru')) return '/college-logos/nehru.png';
  if (cleanName.includes('narayana guru') || cleanName.includes('narayanaguru')) return '/college-logos/narayanaguru.png';
  if (cleanName.includes('hindustan') || cleanName.includes('hits')) return '/college-logos/hits.png';
  if (cleanName.includes('kalasalingam') || cleanName.includes('klu')) return '/college-logos/klu.png';
  if (cleanName.includes('karpagam')) return '/college-logos/karpagam.png';
  if (cleanName.includes('karunya')) return '/college-logos/karunya.png';
  if (cleanName.includes('kumaraguru') || cleanName.includes('kct')) return '/college-logos/kumaraguru.png';
  if (cleanName.includes('rathinam')) return '/college-logos/Rathinam - RTC.png';
  if (cleanName.includes('ngp') || cleanName.includes('n.g.p')) return '/college-logos/ngp.png';
  if (cleanName.includes('kumarasamy') || cleanName.includes('mkce')) return '/college-logos/mkce.png';
  if (cleanName.includes('sethu')) return '/college-logos/sethu institue.png';
  if (cleanName.includes('shanmuga') || cleanName.includes('shanmugha') || cleanName.includes('ssei')) return '/college-logos/sri shanmuga.png';
  if (cleanName.includes('eshwar') || cleanName.includes('srieshwar') || cleanName.includes('sece')) return '/college-logos/srieshwar.png';
  if (cleanName.includes('panimalar')) return '/college-logos/panimalar.png';
  if (cleanName.includes('kamaraj')) return '/college-logos/kamaraj.png';
  if (cleanName.includes('psna')) return '/college-logos/psna.png';
  if (cleanName.includes('psg')) return '/college-logos/psg.png';
  if (cleanName.includes('smvec') || cleanName.includes('manakula')) return '/college-logos/smvec.png';
  if (cleanName.includes('dsu') || cleanName.includes('dhanalakshmi')) return '/college-logos/dsu.png';
  if (cleanName.includes('kiot') || cleanName.includes('knowledge')) return '/college-logos/kiot.jfif';
  if (cleanName.includes('sona')) return '/college-logos/sona.png';
  if (cleanName.includes('avs')) return '/college-logos/avs.png';
  if (cleanName.includes('aaa')) return '/college-logos/aaa.png';
  if (cleanName.includes('kgisl')) return '/college-logos/kgisl.png';
  if (cleanName.includes('mar ephraem') || cleanName.includes('mar ephream')) return '/college-logos/mar ephream.png';
  if (cleanName.includes('akshaya') || cleanName.includes('acet')) return '/college-logos/acet.png';
  if (cleanName.includes('anand') || cleanName.includes('aiht')) return '/college-logos/aiht.png';
  if (cleanName.includes('npr')) return '/college-logos/npr.png';
  if (cleanName.includes('vaigai')) return '/college-logos/vaigai.png';
  if (cleanName.includes('ifet')) return '/college-logos/ifet.png';
  if (cleanName.includes('egs') || cleanName.includes('pillay')) return '/college-logos/egs.png';
  if (cleanName.includes('gnyanamani') || cleanName.includes('gnanamani')) return '/college-logos/gnyanamani.png';
  if (cleanName.includes('christ')) return '/college-logos/christ.png';
  if (cleanName.includes('srm')) return '/college-logos/srm.png';
  if (cleanName.includes('vit') || cleanName.includes('vellore')) return '/college-logos/vit.png';
  if (cleanName.includes('mcet') || cleanName.includes('mahalingam')) return '/college-logos/MCET.png';
  if (cleanName.includes('mec') || cleanName.includes('muthayammal')) return '/college-logos/MEC.png';
  if (cleanName.includes('amcet') || cleanName.includes('annai mira')) return '/college-logos/AMCET.png';
  if (cleanName.includes('audisankar')) return '/college-logos/audisankar.png';
  if (cleanName.includes('bharathiyar')) return '/college-logos/bharathiyar institue.png';
  if (cleanName.includes('loyola') || cleanName.includes('layola') || cleanName.includes('licet')) return '/college-logos/layola.png';

  // 4. Fallback by code
  if (cleanCode && cleanCode !== 'IPOMS' && cleanCode !== 'COLLEGE') {
    return `/college-logos/${cleanCode.toLowerCase()}.png`;
  }

  return '/college-logos/Infozianthead.png';
}
