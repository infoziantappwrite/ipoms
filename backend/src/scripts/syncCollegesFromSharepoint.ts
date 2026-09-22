import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { College } from '../models/College';

export const SHAREPOINT_EXCEL_URL =
  'https://infoziant-my.sharepoint.com/:x:/p/mohanaradha_a/IQDG6kI3OOzoSqDFzVKw-Z1aAUdwEZZ92lkYdc04tgKwmnQ?download=1';

export const COLLEGE_DEFAULT_LOCATIONS: Record<string, string> = {
  ACET: 'Puducherry',
  KIOT: 'Salem, Tamil Nadu',
  KLU: 'Virudhunagar, Tamil Nadu',
  KPR: 'Coimbatore, Tamil Nadu',
  KARPAGAM: 'Coimbatore, Tamil Nadu',
  AIHT: 'Kazhipattur, Chennai, Tamil Nadu',
  PSNA: 'Dindigul, Tamil Nadu',
  SMVEC: 'Puducherry',
  DSU: 'Perambalur / Trichy, Tamil Nadu',
  MKCE: 'Karur, Tamil Nadu',
  SONA: 'Salem, Tamil Nadu',
  KARUNYA: 'Coimbatore, Tamil Nadu',
  KAMARAJ: 'Virudhunagar, Tamil Nadu',
  NPR: 'Natham / Dindigul, Tamil Nadu',
  AVS: 'Salem, Tamil Nadu',
  AAA: 'Sivakasi, Tamil Nadu',
  KGISL: 'Coimbatore, Tamil Nadu',
  SSEI: 'Salem, Tamil Nadu',
  NGP: 'Coimbatore, Tamil Nadu',
  HITS: 'Padur, Chennai, Tamil Nadu',
  NEHRU: 'Coimbatore, Tamil Nadu',
  MAR: 'Kanyakumari, Tamil Nadu',
  MAREPHRAM: 'Kanyakumari, Tamil Nadu',
  MAREPHRA: 'Kanyakumari, Tamil Nadu',
  NGCE: 'Kanyakumari, Tamil Nadu',
  ACEW: 'Kanyakumari, Tamil Nadu',
  MCET: 'Pollachi, Coimbatore, Tamil Nadu',
  MEC: 'Rasipuram, Tamil Nadu',
};

export function parseDepartments(deptStr?: string): string[] {
  if (!deptStr || typeof deptStr !== 'string') return [];
  const lines = deptStr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsed: string[] = [];

  for (const line of lines) {
    if (line.toLowerCase().includes('program') || line.toLowerCase().includes('department')) {
      continue;
    }
    let cleaned = line.replace(/^[•\-\*]\s*/, '').trim();
    if (
      cleaned.toLowerCase().includes('artificial intelligence and data science') ||
      cleaned.toLowerCase().includes('ai & ds') ||
      cleaned.toLowerCase().includes('ai and ds')
    ) {
      if (cleaned.toLowerCase().startsWith('m.tech') || cleaned.toLowerCase().startsWith('m.e')) {
        parsed.push('M.Tech AI & DS');
      } else {
        parsed.push('AI & DS');
      }
    } else if (cleaned.toLowerCase().includes('computer science')) {
      parsed.push('CSE');
    } else if (cleaned.toLowerCase().includes('information technology')) {
      parsed.push('IT');
    } else if (cleaned.toLowerCase().includes('electrical and electronics') || cleaned.toLowerCase().includes('eee')) {
      parsed.push('EEE');
    } else if (cleaned.toLowerCase().includes('electronics and communication') || cleaned.toLowerCase().includes('ece')) {
      parsed.push('ECE');
    } else if (cleaned.toLowerCase().includes('mechanical')) {
      parsed.push('MECH');
    } else if (cleaned.toLowerCase().includes('robotics')) {
      parsed.push('Robotics & Automation');
    } else if (cleaned.toLowerCase().includes('civil')) {
      parsed.push('CIVIL');
    } else if (cleaned.toLowerCase().includes('business administration') || cleaned.toLowerCase().includes('mba')) {
      parsed.push('MBA');
    } else if (cleaned.toLowerCase().includes('computer applications') || cleaned.toLowerCase().includes('mca')) {
      parsed.push('MCA');
    } else {
      const shortName = cleaned.replace(/^B\.Tech\.?\s*–?\s*/i, '').replace(/^B\.E\.?\s*–?\s*/i, '').trim();
      if (shortName && shortName.length < 35) {
        parsed.push(shortName);
      }
    }
  }

  return Array.from(new Set(parsed));
}

function extractCellData(sheet: XLSX.WorkSheet, r: number, c: number): { value: string; link: string } {
  const cellAddress = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[cellAddress];
  if (!cell) return { value: '', link: '' };

  let value = (cell.w ?? cell.v ?? '').toString().trim();
  let link = '';

  if (cell.l?.Target) {
    link = cell.l.Target.toString().trim();
  } else if (typeof cell.f === 'string') {
    const match = cell.f.match(/HYPERLINK\(\s*"([^"]+)"/i);
    if (match) link = match[1].trim();
  }

  if (!link && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('www.') || value.includes('maps.google') || value.includes('goo.gl'))) {
    link = value;
  }

  return { value, link };
}

export function parseSheetRowsWithLinks(sheet: XLSX.WorkSheet): Record<string, { value: string; link: string }>[] {
  if (!sheet || !sheet['!ref']) return [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const headers: { col: number; name: string }[] = [];

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const { value } = extractCellData(sheet, range.s.r, C);
    if (value) {
      headers.push({ col: C, name: value.trim() });
    }
  }

  const rows: Record<string, { value: string; link: string }>[] = [];
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const rowObj: Record<string, { value: string; link: string }> = {};
    let hasData = false;

    for (const h of headers) {
      const data = extractCellData(sheet, R, h.col);
      rowObj[h.name] = data;
      if (data.value || data.link) hasData = true;
    }

    if (hasData) {
      rows.push(rowObj);
    }
  }

  return rows;
}

export function cleanValue(val?: any): string {
  if (val === null || val === undefined) return '';
  const str = val.toString().trim();
  if (
    !str ||
    str.startsWith('#') ||
    str.toUpperCase() === '#VALUE!' ||
    str.toUpperCase() === '#REF!' ||
    str.toUpperCase() === '#N/A' ||
    str.toUpperCase() === '#NAME?' ||
    str.toUpperCase() === 'NIL' ||
    str === '-' ||
    str === '--'
  ) {
    return '';
  }
  return str;
}

export function findLatestExcelFile(): string | null {
  const candidateDirs = [
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), '..'),
    path.resolve(__dirname, '../../..'),
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '..'),
  ];

  const fileNames = [
    'Colleges and Coordinators.xlsx',
    'Colleges_and_Coordinators.xlsx',
    'Colleges and Coordinators (1).xlsx',
    'Colleges_and_Coordinators (1).xlsx',
  ];

  const found: { path: string; mtime: number }[] = [];

  for (const dir of candidateDirs) {
    for (const name of fileNames) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath)) {
        try {
          const stats = fs.statSync(fullPath);
          found.push({ path: fullPath, mtime: stats.mtimeMs });
        } catch (e) {}
      }
    }
  }

  if (found.length === 0) return null;
  found.sort((a, b) => b.mtime - a.mtime);
  return found[0].path;
}

export async function syncCollegesFromExcel(bufferOrPath?: Buffer | string) {
  let workbook: XLSX.WorkBook;

  if (bufferOrPath) {
    if (typeof bufferOrPath === 'string') {
      workbook = XLSX.readFile(bufferOrPath);
    } else {
      workbook = XLSX.read(bufferOrPath, { type: 'buffer' });
    }
  } else {
    // Try live download from SharePoint first, verifying binary zip/xlsx headers
    try {
      console.log('Downloading live Excel from SharePoint via fetch:', SHAREPOINT_EXCEL_URL);
      const response = await fetch(SHAREPOINT_EXCEL_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*',
        },
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        if (buf.length > 500 && buf[0] === 0x50 && buf[1] === 0x4B) {
          console.log('Valid binary XLSX received from SharePoint!');
          workbook = XLSX.read(buf, { type: 'buffer' });
          // Save a copy locally to ensure persistence across restarts
          try {
            const rootDir = path.resolve(__dirname, '../../..');
            fs.writeFileSync(path.join(rootDir, 'Colleges_and_Coordinators.xlsx'), buf);
            fs.writeFileSync(path.join(rootDir, 'Colleges and Coordinators.xlsx'), buf);
          } catch (writeErr) {
            console.warn('Could not save local Excel backup:', writeErr);
          }
        } else {
          console.warn('SharePoint response is not binary XLSX. Falling back to latest local workbook.');
          const localPath = findLatestExcelFile();
          if (localPath) {
            console.log(`Using latest local workbook: ${localPath}`);
            workbook = XLSX.readFile(localPath);
          } else {
            throw new Error('No local workbook found and SharePoint response is not XLSX binary.');
          }
        }
      } else {
        throw new Error(`SharePoint HTTP ${response.status} ${response.statusText}`);
      }
    } catch (liveErr: any) {
      console.warn('SharePoint live fetch fallback:', liveErr.message);
      const localPath = findLatestExcelFile();
      if (localPath) {
        console.log(`Using latest local workbook: ${localPath}`);
        workbook = XLSX.readFile(localPath);
      } else {
        throw liveErr;
      }
    }
  }

  let updatedCount = 0;
  let insertedCount = 0;
  const results: any[] = [];
  let totalColleges = 0;

  // Process all sheets in the workbook (Sheet 1 colleges, Sheet 2 coordinators/additional details)
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const richRows = parseSheetRowsWithLinks(sheet);
    console.log(`Processing sheet "${sheetName}" with ${richRows.length} rows...`);

    for (const row of richRows) {
      const getField = (fieldNames: string[]) => {
        for (const name of fieldNames) {
          for (const key of Object.keys(row)) {
            if (key.trim().toLowerCase() === name.trim().toLowerCase()) {
              return row[key];
            }
          }
        }
        return { value: '', link: '' };
      };

      const nameData = getField(['College Name', 'College', 'Institution Name', 'Institute Name']);
      const codeData = getField(['Short Form', 'Code', 'College Code', 'Short Name']);

      const rawName = cleanValue(nameData.value);
      const rawCode = cleanValue(codeData.value).toUpperCase();

      // Only count and process valid college entries
      if (!rawName && !rawCode) continue;
      totalColleges++;

      const tpoName = cleanValue(getField(['TPO Name', 'Placement Officer', 'TPO', 'Coordinator Name', 'Coordinator', 'Contact Person']).value);
      const tpoEmail = cleanValue(getField(['Email ID', 'TPO Email', 'Email', 'Official Email', 'Contact Email']).value);
      const tpoPhone = cleanValue(getField(['TPO Contact Number', 'Phone', 'Mobile', 'Contact Number', 'Mobile Number', 'Phone Number']).value);
      const nirf = cleanValue(getField(['NIRF ranking', 'NIRF Ranking', 'NIRF', 'Rank']).value);
      const highestPkg = cleanValue(getField(['Highest package', 'Highest package ', 'Highest Package']).value);
      const lowestPkg = cleanValue(getField(['Lowest package', 'Lowest Package', 'Base Package']).value);

      const websiteData = getField(['College URL', 'Website', 'URL', 'Official Website']);
      const website = cleanValue(websiteData.link || websiteData.value);

      const addressData = getField(['Address', 'Landmarks', 'Campus Address', 'Location Details']);
      const address = cleanValue(addressData.value);

      const mapData = getField(['Map location', 'Map Location', 'Map', 'Google Map', 'Location Map']);
      const mapLocation = cleanValue(mapData.link || (mapData.value !== 'Map' ? mapData.value : ''));

      const inauguratedAt = cleanValue(getField(['Inaugurated at', 'Established', 'Year', 'Established Year']).value);
      const rawDept = cleanValue(getField(['Departments', 'Branches', 'Programs']).value);
      let location = cleanValue(getField(['Location', 'City', 'District']).value);

      // Fallback location for known partner colleges
      if (!location && rawCode && COLLEGE_DEFAULT_LOCATIONS[rawCode]) {
        location = COLLEGE_DEFAULT_LOCATIONS[rawCode];
      }

      const parsedDepts = parseDepartments(rawDept);

      // Match existing college by code or name
      let college = await College.findOne({
        $or: [
          ...(rawCode ? [{ college_code: new RegExp(`^${rawCode}$`, 'i') }] : []),
          ...(rawName ? [{ college_name: new RegExp(`^${rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : []),
        ],
      });

      const isNew = !college;
      if (!college) {
        college = new College({
          college_name: rawName,
          college_code: rawCode || rawName.substring(0, 6).toUpperCase(),
          status: 'active',
        });
        insertedCount++;
      } else {
        updatedCount++;
      }

      if (rawName && (!college.college_name || isNew)) college.college_name = rawName;
      if (rawCode && (!college.college_code || isNew)) college.college_code = rawCode;
      if (tpoName) college.tpo_name = tpoName;
      if (tpoEmail) college.tpo_email = tpoEmail;
      if (tpoPhone) college.tpo_contact_mobile = tpoPhone;
      if (nirf) college.nirf_ranking = nirf;
      if (highestPkg) college.highest_package_lpa = highestPkg;
      if (lowestPkg) college.lowest_package_lpa = lowestPkg;
      if (website) college.college_website = website;
      if (address) {
        college.landmarks = address;
        college.address = address;
      }
      if (mapLocation) {
        college.map_location = mapLocation;
      } else if (address || rawName) {
        college.map_location = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rawName} ${address || location}`.trim())}`;
      }
      if (inauguratedAt) college.established_year = inauguratedAt;
      
      // Clean up any old #VALUE! in DB
      if (location) {
        college.location = location;
      } else if (!college.location || college.location.startsWith('#')) {
        college.location = (rawCode && COLLEGE_DEFAULT_LOCATIONS[rawCode]) || 'Tamil Nadu, India';
      }

      if (parsedDepts.length > 0) college.departments = parsedDepts;
      if (rawDept && rawDept.length > 20) {
        college.placement_notes = `Academic Programs & Departments:\n${rawDept}`;
      }

      await college.save();
      results.push({
        _id: college._id,
        code: college.college_code,
        name: college.college_name,
        tpo_name: college.tpo_name,
        tpo_phone: college.tpo_contact_mobile,
        tpo_email: college.tpo_email,
        location: college.location,
        website: college.college_website,
        map_location: college.map_location,
        isNew,
      });
    }
  }

  return {
    success: true,
    totalRows: totalColleges,
    totalColleges,
    updatedCount,
    insertedCount,
    results,
  };
}

async function runStandaloneSync() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ipoms_db');
  console.log('Connected to MongoDB.');

  const localFile = path.resolve(__dirname, '../../../Colleges_and_Coordinators.xlsx');
  let result;
  if (fs.existsSync(localFile)) {
    console.log(`Using local file: ${localFile}`);
    result = await syncCollegesFromExcel(localFile);
  } else {
    result = await syncCollegesFromExcel();
  }

  console.log('Sync Complete Summary:', {
    totalRows: result.totalRows,
    updatedCount: result.updatedCount,
    insertedCount: result.insertedCount,
  });

  const acet = await College.findOne({ college_code: 'ACET' });
  console.log('\n=== ACET Profile after synchronization ===', {
    college_name: acet?.college_name,
    college_code: acet?.college_code,
    tpo_name: acet?.tpo_name,
    tpo_email: acet?.tpo_email,
    tpo_contact_mobile: acet?.tpo_contact_mobile,
    highest_package_lpa: acet?.highest_package_lpa,
    lowest_package_lpa: acet?.lowest_package_lpa,
    nirf_ranking: acet?.nirf_ranking,
    college_website: acet?.college_website,
    established_year: acet?.established_year,
    landmarks: acet?.landmarks,
    departments: acet?.departments,
    placement_notes: acet?.placement_notes,
  });

  await mongoose.disconnect();
}

if (require.main === module) {
  runStandaloneSync().catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
}
