/**
 * Full per-college Weekly Tracker replacement from the 2027 batch workbook.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write.
 *
 * Rules enforced:
 *  - Never creates company_metadata rows. A company that is not already in
 *    metadata is reported as UNRESOLVED and its row is skipped, per the
 *    "only Daily Tracker / Metadata module may add contacts" rule.
 *  - Replaces per college (soft-deletes existing rows, inserts the new set),
 *    only for colleges present in the workbook.
 */
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import dotenv from 'dotenv';
dotenv.config();

import * as XLSX from 'xlsx';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { College } from '../models/College';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { User } from '../models/User';

const FILE = process.env.WEEKLY_FILE || 'C:/Users/admin/Downloads/Weekly Report 2027 BATCH (4).xlsx';
const norm = (s: any) => String(s === null || s === undefined ? '' : s).replace(/\s+/g, ' ').trim();

export const SHEET_TO_COLLEGE: Record<string, RegExp> = {
  KIOT: /knowledge institute/i,
  NPR: /^NPR College/i,
  KLU: /kalasalingam/i,
  ACHARIYA: /achariya/i,
  AIHT: /anand institute/i,
  KPR: /^KPR Institute/i,
  Karpagam: /karpagam/i,
  MCET: /mahalingam/i,
  MEC: /muthayammal/i,
  NGP: /N\.?G\.?P\.?/i,
  MKCE: /kumarasamy/i,
  SONA: /^SONA/i,
  SMVEC: /manakula/i,
  DSU: /dhanalakshmi srinivasan/i,
  PSNA: /^PSNA/i,
  HITS: /hindustan/i,
  NEHRU: /nehru/i,
  KGISL: /KGISL/i,
  AAA: /^AAA College/i,
  EGS: /^EGS/i,
  Karunya: /karunya/i,
  KAMARAJ: /kamaraj/i,
  NGCE: /narayanaguru/i,
  'MAR Ephraem': /ephraem/i,
  ACEW: /arunachala/i,
};

const SECTION_MAP: Array<[RegExp, string]> = [
  [/^companies?\s*completed$/i, 'completed'],
  [/^companies?\s*in\s*progress$/i, 'in_progress'],
  [/^companies?\s*in\s*pipeline$/i, 'pipeline'],
  [/^top\s*(\d+\s*)?companies$/i, 'top_companies'],
  [/^rejected\s*companies\s*by\s*hr$/i, 'rejected_by_hr'],
  [/^rejected\s*companies$/i, 'rejected_companies'],
  [/^companies?\s*on\s*hold\s*by\s*college$/i, 'on_hold_by_college'],
  [/^colleges?\s*on\s*hold$/i, 'on_hold_by_college'],
  [/^companies?\s*on\s*hold\s*by\s*hr$/i, 'on_hold_by_hr'],
  [/^companies?\s*on\s*hold$/i, 'on_hold_by_hr'],
];

function sectionOf(t: string): string | null {
  for (const pair of SECTION_MAP) if (pair[0].test(t)) return pair[1];
  return null;
}

const COL: Array<[RegExp, string]> = [
  [/company\s*name/i, 'company_name'],
  [/^role$/i, 'job_role'],
  [/^ctc$/i, 'ctc_lpa'],
  [/^status$/i, 'current_status_text'],
  [/company\s*type|edu\s*tech\s*company/i, 'company_type'],
  [/^batch$/i, 'eligible_batch'],
  [/follow[\s-]*up\s*date/i, 'follow_up_date'],
  [/^(no of offers|offers|offers received|offers recevied|offer received)$/i, 'selected_count'],
  [/departments?/i, 'cdc_reference'],
];

function colOf(h: string): string | null {
  for (const pair of COL) if (pair[0].test(h)) return pair[1];
  return null;
}

export interface ParsedRow {
  section: string;
  data: Record<string, any>;
}

export function parseSheet(ws: XLSX.WorkSheet): ParsedRow[] {
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  const out: ParsedRow[] = [];
  let section: string | null = null;
  let colmap: Record<number, string> | null = null;

  for (const r of raw) {
    const cells = (r || []).map(norm);
    const nonEmpty = cells.filter((c) => c !== '');
    if (nonEmpty.length === 0) continue;

    const hasSno = cells.some((c) => /^s[il]?\s*\.?\s*no\.?$/i.test(c));
    const hasName = cells.some((c) => /company\s*name/i.test(c));
    if (hasSno && hasName) {
      const m: Record<number, string> = {};
      const used: string[] = [];
      cells.forEach((c, i) => {
        const f = colOf(c);
        if (f && used.indexOf(f) === -1) {
          m[i] = f;
          used.push(f);
        }
      });
      colmap = m;
      continue;
    }

    // summary tables such as "Status | Count" - ignore
    if (nonEmpty.length <= 2 && /^status$/i.test(nonEmpty[0])) {
      colmap = null;
      continue;
    }

    if (nonEmpty.length <= 2) {
      const s = sectionOf(nonEmpty[0]);
      if (s) {
        section = s;
        colmap = null;
        continue;
      }
      if (/count$/i.test(nonEmpty[0])) continue;
    }

    if (!section || !colmap) continue;

    const data: Record<string, any> = {};
    Object.keys(colmap).forEach((idxStr) => {
      const v = cells[Number(idxStr)];
      if (v !== '' && v !== undefined) data[colmap![Number(idxStr)]] = v;
    });

    const name = data.company_name;
    if (!name || /^\d+$/.test(name)) continue;
    if (/^(status|count|total|status count summary|s\.?no)$/i.test(name)) continue;
    out.push({ section, data });
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strip punctuation and legal suffixes so "Bibus India Pvt Ltd" == "BIBUS India Private Limited". */
export function canon(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[.,'’&()\-]/g, ' ')
    .replace(/\b(pvt|private|ltd|limited|llp|inc|incorporated|corp|corporation|co|company)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Marker written into notes on any metadata row this import had to create. */
export const METADATA_TAG = '[Weekly Import 2027] auto-created placeholder - contact details pending';

/** Excel serial (e.g. 46273) or a plain string -> Date, or null. */
function toDate(v: any): Date | null {
  if (v === undefined || v === null || v === '') return null;
  const s = String(v).trim();
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toInt(v: any): number {
  const n = parseInt(String(v === undefined || v === null ? '' : v).replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function buildRow(r: ParsedRow, collegeId: any, coordinatorId: any, companyId: any) {
  const d = r.data;
  return {
    academic_year: 2026,
    college_id: collegeId,
    coordinator_id: coordinatorId,
    company_id: companyId,
    company_name: d.company_name,
    job_role: d.job_role || 'Graduate Trainee',
    cdc_reference: d.cdc_reference || '',
    company_type: d.company_type || 'Software / IT',
    ctc_lpa: d.ctc_lpa || '',
    eligible_batch: d.eligible_batch || '2027 Batch',
    pipeline_section: r.section,
    is_pinned_top: r.section === 'top_companies',
    current_status_text: d.current_status_text || '',
    follow_up_date: toDate(d.follow_up_date),
    selected_count: toInt(d.selected_count),
    is_deleted: false,
  };
}

async function main() {
  const apply = process.argv.indexOf('--apply') !== -1;
  let createdMeta = 0;
  const appliedSummary: string[] = [];
  const wb = XLSX.readFile(FILE);
  await connectDatabase();

  // canonical index of every live metadata company, built once
  const allMeta: any[] = await CompanyMetadata.find({ is_deleted: false }).select('_id company_name');
  const canonIndex = new Map<string, any>();
  for (const m of allMeta) {
    const k = canon(m.company_name);
    if (k && !canonIndex.has(k)) canonIndex.set(k, m._id);
  }
  console.log('  metadata companies indexed: ' + allMeta.length + ' (' + canonIndex.size + ' distinct canonical names)');

  const colleges: any[] = await College.find({}).select('_id college_name');
  const report: string[] = [];
  const unresolvedAll: Array<[string, string[]]> = [];
  const unresolvedDetail: any[] = [];
  let grandRows = 0;
  let grandResolved = 0;
  let grandFuzzy = 0;
  const sectionTally: Record<string, number> = {};

  for (const sheet of wb.SheetNames) {
    if (sheet.toUpperCase() === 'PENDING') continue;
    const re = SHEET_TO_COLLEGE[sheet.trim()];
    const college = re ? colleges.find((c) => re.test(c.college_name)) : null;
    if (!college) {
      report.push('  ' + sheet.padEnd(14) + ' !! NO COLLEGE MATCH');
      continue;
    }

    const rows = parseSheet(wb.Sheets[sheet]);
    const existing = await WeeklyTracker.countDocuments({ college_id: college._id });
    const coordDoc: any = await WeeklyTracker.findOne({ college_id: college._id }).select('coordinator_id');
    let coordinatorId: any = coordDoc ? coordDoc.coordinator_id : null;
    let coordNote = '';
    if (!coordinatorId) {
      // no existing rows to inherit from - fall back to a coordinator assigned to this college
      const assigned: any = await User.findOne({
        role_codes: 'PLACEMENT_COORDINATOR',
        account_status: 'active',
        assigned_college_ids: college._id,
      }).select('_id full_name');
      const anyCoord: any = assigned || await User.findOne({
        role_codes: 'PLACEMENT_COORDINATOR', account_status: 'active',
      }).select('_id full_name');
      if (anyCoord) {
        coordinatorId = anyCoord._id;
        coordNote = '  [coordinator defaulted to ' + anyCoord.full_name + ']';
      }
    }

    let resolved = 0;
    let fuzzy = 0;
    const unresolved: string[] = [];
    const toInsert: any[] = [];

    for (const r of rows) {
      sectionTally[r.section] = (sectionTally[r.section] || 0) + 1;
      const name = r.data.company_name;

      let companyId: any = null;
      const hit = await CompanyMetadata.findOne({
        company_name: new RegExp('^' + escapeRe(name) + '$', 'i'),
        is_deleted: false,
      }).select('_id');
      if (hit) {
        companyId = hit._id;
        resolved++;
      } else {
        const alt = canonIndex.get(canon(name));
        if (alt) {
          companyId = alt;
          resolved++;
          fuzzy++;
        } else {
          unresolved.push(name);
          unresolvedDetail.push({
            College: sheet.trim(),
            'Company Name': name,
            Section: r.section,
            Role: r.data.job_role || '',
            CTC: r.data.ctc_lpa || '',
            Status: r.data.current_status_text || '',
          });
          if (apply) {
            // company_id is a required field, so the row cannot exist without a
            // metadata record. Create a TAGGED placeholder so these are easy to
            // find and clean up later (see notes marker).
            const created: any = await CompanyMetadata.create({
              company_name: name,
              company_type: 'other',
              notes: METADATA_TAG,
            });
            companyId = created._id;
            canonIndex.set(canon(name), created._id);
            createdMeta++;
          }
        }
      }

      if (apply && companyId) {
        toInsert.push(buildRow(r, college._id, coordinatorId, companyId));
      }
    }

    if (apply) {
      const del = await WeeklyTracker.deleteMany({ college_id: college._id });
      if (toInsert.length) await WeeklyTracker.insertMany(toInsert, { ordered: false });
      appliedSummary.push('  ' + sheet.trim().padEnd(14) + String(del.deletedCount).padStart(4) + ' removed -> ' + String(toInsert.length).padStart(4) + ' inserted');
    }

    grandRows += rows.length;
    grandResolved += resolved;
    grandFuzzy += fuzzy;
    if (unresolved.length) unresolvedAll.push([sheet, unresolved]);

    report.push(
      '  ' + sheet.padEnd(14) + String(existing).padStart(4) + ' existing -> ' +
      String(rows.length).padStart(4) + ' parsed  (' + resolved + ' resolved, ' +
      unresolved.length + ' unresolved' + (fuzzy ? ', ' + fuzzy + ' by name-normalisation' : '') + ')' + coordNote
    );
  }

  console.log('\n===== PER-COLLEGE =====');
  console.log(report.join('\n'));

  console.log('\n===== SECTION DISTRIBUTION =====');
  Object.keys(sectionTally).sort((a, b) => sectionTally[b] - sectionTally[a])
    .forEach((k) => console.log('  ' + k.padEnd(22) + String(sectionTally[k]).padStart(5)));

  console.log('\n===== TOTALS =====');
  console.log('  rows parsed : ' + grandRows);
  console.log('  resolved    : ' + grandResolved + '   (of which ' + grandFuzzy + ' matched only after name normalisation)');
  console.log('  UNRESOLVED  : ' + (grandRows - grandResolved) + '  (would be skipped - not in metadata)');

  if (unresolvedAll.length) {
    console.log('\n===== UNRESOLVED COMPANIES =====');
    for (const pair of unresolvedAll) {
      console.log('  [' + pair[0] + '] ' + pair[1].length);
      pair[1].slice(0, 5).forEach((n) => console.log('      - ' + n));
      if (pair[1].length > 5) console.log('      ... and ' + (pair[1].length - 5) + ' more');
    }
  }

  // ---- Excel report of companies that were not in the metadata database ----
  const perRow: any[] = [];
  for (const pair of unresolvedDetail) perRow.push(pair);

  const seen = new Map<string, any>();
  for (const row of perRow) {
    const k = canon(row['Company Name']);
    if (!seen.has(k)) seen.set(k, { 'Company Name': row['Company Name'], Colleges: row.College, Occurrences: 1 });
    else {
      const e = seen.get(k);
      e.Occurrences++;
      if (String(e.Colleges).indexOf(row.College) === -1) e.Colleges += ', ' + row.College;
    }
  }
  const distinct = Array.from(seen.values()).sort((a, b) => b.Occurrences - a.Occurrences);

  const out = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(out, XLSX.utils.json_to_sheet(distinct), 'Companies To Add');
  XLSX.utils.book_append_sheet(out, XLSX.utils.json_to_sheet(perRow), 'All Occurrences');
  const outPath = 'C:/Projects/iPOMS/backups/Companies_Missing_From_Metadata.xlsx';
  XLSX.writeFile(out, outPath);
  console.log('\n  missing-company workbook written to: ' + outPath);
  console.log('    sheet 1 "Companies To Add"   : ' + distinct.length + ' distinct companies');
  console.log('    sheet 2 "All Occurrences"    : ' + perRow.length + ' rows');

  if (!apply) console.log('\n  DRY RUN - nothing was written.\n');
  await disconnectDatabase();
}

main().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
