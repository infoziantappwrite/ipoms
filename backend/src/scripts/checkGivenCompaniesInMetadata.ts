import mongoose from 'mongoose';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { connectDatabase, disconnectDatabase } from '../config/database';

interface InputCompany {
  rawName: string;
  hrName: string;
  mobile: string;
  email: string;
}

const INPUT_LIST: InputCompany[] = [
  { rawName: 'Ami', hrName: 'Mr. Senthil Kumar P', mobile: '9600054456', email: 'senthilkumarp@ami.com' },
  { rawName: 'Annalect', hrName: 'Abdulla', mobile: '9633697716', email: 'abdulla.kayakkool@annalect.com' },
  { rawName: 'Appstrail Technology', hrName: 'Mr. Rakesh Kumar', mobile: '9636606764 / 8801861737', email: 'rakesh@appstrail.com' },
  { rawName: 'Aptean', hrName: 'Mr Raja S P', mobile: '9566886894', email: 'Raja.SP@aptean.com' },
  { rawName: 'Arcadia', hrName: "Gopinath'", mobile: '8608341354', email: 'gopinath.raghunath@arcadia.com' },
  { rawName: 'Ascendion', hrName: 'Ms Meenakshi V', mobile: '9840790119', email: 'meenakshi.sivanandam@ascendion.com / unirelations.ind@ascendion.com' },
  { rawName: 'Ashok Leyland', hrName: 'Mr. Velumani RN', mobile: '9894448107', email: 'velumani.rn@ashokleyland.com / Midhuna.C@ashokleyland.com / Swetha.K2@ashokleyland.com' },
  { rawName: 'Ather Energy', hrName: 'Mr.Prabhu', mobile: '8066465757', email: 'prabhu.p@atherenergy.com' },
  { rawName: 'Avasoft', hrName: 'Ms. Vaisha Siva Kumar', mobile: '8925008708', email: 'Vaisha.S@avasoft.com' },
  { rawName: 'Belzabar', hrName: 'Ms.Priyanka', mobile: '9671935317', email: 'priyanka@belzabar.com' },
  { rawName: 'Bi3 Technologies', hrName: 'Ms Sushmitha Devaraj', mobile: '9361541512', email: 'sushmitha.devaraj@bi3technologies.com' },
  { rawName: 'Bootlabs', hrName: 'Ms. Haritha Govindaraj', mobile: '9361654944', email: 'haritha.govindaraj@bootlabstech.com' },
  { rawName: 'Bounteous', hrName: 'Rachna Sahani', mobile: '9760235656', email: 'rachna.sahani@bounteous.com' },
  { rawName: 'Brakes India', hrName: 'Mr. S Charles Premkumar', mobile: '7299038380 / 0 44 2652 6707', email: 'Charlespremkumar.S@brakesindia.co.in / hrd.corporate@brakesindia.co.in' },
  { rawName: 'CEI India', hrName: 'Mr. Vinoth Periasamy', mobile: '9994417713', email: 'pvinoth@ceiamerica.com' },
  { rawName: 'Celestica', hrName: 'Ms. Devi Amuthaganesan', mobile: '9789907369', email: 'devia@celestica.com' },
  { rawName: 'Jasmin Infotech', hrName: 'Ms.Sachigadev', mobile: '91 44 6604 9600', email: 'sachigadevi.selvaraj@jasmin-infotech.com' },
  { rawName: 'Jocata', hrName: 'Hanson', mobile: '9640909629', email: 'hanson.pakalapaty@jocata.com' },
  { rawName: 'Kaar Technologies', hrName: 'Mr. Murali', mobile: '9940202302', email: 'vmuralidharan@kaartech.com' },
  { rawName: 'Kone', hrName: 'Sai kiruba', mobile: '9789004466', email: 'm.saikiruba@kone.com' },
  { rawName: 'Kovan labs', hrName: 'Divya prabha', mobile: '9942659370', email: 'Divya.Jayaprakash@kovanlabs.com' },
  { rawName: 'Lincoln Electric', hrName: 'Mr. Karthik', mobile: '9884984564', email: 'Karthik_Devarajan@lincolnelectric.in' },
  { rawName: 'Lucid Imaging', hrName: 'Ms.Sumithra', mobile: '9942777444', email: 'sumithra.k@lucidimaging.in' },
  { rawName: 'Lumberfi', hrName: 'Ishana', mobile: '7389891357', email: 'ishana.dashoriya@lumberfi.com / recrui' },
  { rawName: 'Lumen Technology', hrName: 'Mr. Gnana Raj L, Arun / Ms Chaarvi', mobile: '9980352301 / 6363654501', email: 'arun.gnanarajl@lumen.com / Chaarvi.Singh@lumen.com' },
  { rawName: 'Mallow tech', hrName: 'Anuja', mobile: '9487033006', email: 'hr@mallow-tech.com' },
  { rawName: 'Maxlinear Technologies Pvt Ltd', hrName: 'Ms. Bibi ayesha', mobile: '9986614459', email: 'Ayesha.Yamin@associatemail.in' }
];

function normalize(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/private\s+limited/gi, 'pvt ltd')
    .replace(/pvt\.\s*ltd\.?/gi, 'pvt ltd')
    .replace(/limited/gi, 'ltd')
    .replace(/ltd\.?/gi, 'ltd')
    .replace(/technologies/gi, 'tech')
    .replace(/technology/gi, 'tech')
    .replace(/solutions/gi, 'sol')
    .replace(/services/gi, 'serv')
    .replace(/india/gi, '')
    .replace(/inc\.?/gi, '')
    .replace(/corp\.?/gi, '')
    .replace(/llp\.?/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

async function checkCompanies() {
  await connectDatabase();

  const allMetadata = await CompanyMetadata.find({ is_deleted: false }).lean();
  console.log(`\n🏢 Total Active Metadata Records in Database: ${allMetadata.length}`);

  const results: any[] = [];

  for (let i = 0; i < INPUT_LIST.length; i++) {
    const input = INPUT_LIST[i];
    const inputNorm = normalize(input.rawName);
    const cleanInputName = input.rawName.trim().toLowerCase();

    // Find all matching metadata records
    const matches: any[] = [];

    for (const meta of allMetadata) {
      const metaNorm = normalize(meta.company_name);
      const metaExact = meta.company_name.trim().toLowerCase();

      // Check exact match, normalized match, or substring/starts-with match
      if (
        metaExact === cleanInputName ||
        (metaNorm && inputNorm && (metaNorm === inputNorm || metaNorm.startsWith(inputNorm) || inputNorm.startsWith(metaNorm))) ||
        meta.company_name.toLowerCase().includes(cleanInputName) ||
        cleanInputName.includes(meta.company_name.toLowerCase())
      ) {
        matches.push(meta);
      }
    }

    results.push({
      index: i + 1,
      inputName: input.rawName,
      inputHr: input.hrName,
      inputMobile: input.mobile,
      inputEmail: input.email,
      matchCount: matches.length,
      matches: matches.map((m) => ({
        sno: m.serial_number,
        company_name: m.company_name,
        hr_name: m.hr_name || '—',
        primary_mobile: m.primary_mobile || '—',
        mobile_numbers: m.mobile_numbers || [],
        primary_email: m.primary_email || '—',
        email_ids: m.email_ids || [],
        is_placeholder: (m.serial_number >= 3807 && m.serial_number <= 3998) || !m.primary_mobile
      }))
    });
  }

  console.log('\n===============================================================');
  console.log('🔍 DETAILED METADATA MATCH RESULTS FOR 27 COMPANIES');
  console.log('===============================================================');

  for (const res of results) {
    console.log(`\n[#${res.index}] "${res.inputName}"`);
    console.log(`   Provided -> HR: ${res.inputHr} | Mobile: ${res.inputMobile} | Email: ${res.inputEmail}`);
    if (res.matchCount === 0) {
      console.log(`   ❌ Status: NOT FOUND IN METADATA DATABASE (New Company)`);
    } else {
      console.log(`   ✅ Status: FOUND (${res.matchCount} matching record(s)):`);
      for (const m of res.matches) {
        console.log(`      • S.No #${m.sno}: "${m.company_name}"`);
        console.log(`        DB HR: "${m.hr_name}" | DB Mobile: "${m.primary_mobile}" | DB Email: "${m.primary_email}"`);
        console.log(`        Is Placeholder / Needs Mobile? ${m.is_placeholder ? 'YES ⚠️' : 'NO (Already has mobile) ✅'}`);
      }
    }
  }

  await disconnectDatabase();
}

checkCompanies().catch(console.error);
