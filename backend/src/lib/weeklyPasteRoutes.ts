import { Express, Request, Response } from 'express';
import { Types } from 'mongoose';
import { WeeklyTracker } from '../models/WeeklyTracker';
import { CompanyMetadata } from '../models/CompanyMetadata';
import { College } from '../models/College';
import { getCurrentAcademicYear, getCurrentGraduatingBatchYear } from './academicYear';
import { validateAndNormalizeMultiMobile, validateAndNormalizeMultiEmail } from './contactRules';

/**
 * POST /api/v1/weekly-tracker/bulk-paste
 *
 * One route serves both halves of the Weekly Tracker "Paste" button:
 *   dry_run: true   -> validate everything and describe what WOULD happen (the preview screen)
 *   dry_run: false  -> do it
 * Both go through the same planning code, so the preview can never promise something the save
 * then refuses. Nothing is written in a dry run.
 *
 * The company name is always the key. Contact / Email / Role are ADDED to what a row already has
 * (nothing is overwritten); CTC and the three dates replace the current value; a blank pasted cell
 * never erases anything. New rows are only created when no date column is pasted, and only into the
 * section the user picked. Follow-up dates must be today or later (IST); JD-received and
 * DB-shared dates may be in the past.
 */

const MAX_ROWS = 200;

// The 9 sections the Weekly Tracker page renders.
export const PASTE_SECTIONS = [
  'completed',
  'drive_in_progress',
  'in_drive',
  'in_progress',
  'pipeline',
  'top_companies',
  'rejected_companies',
  'on_hold_by_college',
  'on_hold_by_hr',
] as const;

const PASTE_FIELDS = ['job_role', 'ctc_lpa', 'contact', 'email', 'follow_up_date', 'jd_received_date', 'db_shared_date'] as const;
type PasteField = (typeof PASTE_FIELDS)[number];
const DATE_FIELDS: PasteField[] = ['follow_up_date', 'jd_received_date', 'db_shared_date'];

interface PasteRowIn {
  row_no: number;
  company_name?: string;
  job_role?: string;
  ctc_lpa?: string;
  contact?: string;
  email?: string;
  follow_up_date?: string;
  jd_received_date?: string;
  db_shared_date?: string;
}

interface PlannedRow {
  row_no: number;
  company_name: string;
  action: 'create' | 'update' | 'error';
  errors: string[];
  warnings: string[];
  changes: string[];
  write?: () => Promise<{ row_id: string; before?: Record<string, any> }>;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Day-first dates. Returns 'YYYY-MM-DD' or an error message. */
export function parsePasteDate(raw: string): { iso?: string; error?: string } {
  const s = String(raw || '').trim();
  if (!s) return { error: 'Date is empty' };
  let y: number, m: number, d: number;
  let match: RegExpMatchArray | null;
  if ((match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    y = +match[1]; m = +match[2]; d = +match[3];
  } else if ((match = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) {
    d = +match[1]; m = +match[2]; y = +match[3];
  } else if ((match = s.match(/^(\d{1,2})[\s\-\/.]([A-Za-z]{3,9})[\s\-\/.,]+(\d{4})$/))) {
    d = +match[1]; m = MONTHS[match[2].toLowerCase()] || 0; y = +match[3];
  } else if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2}$/.test(s)) {
    return { error: `"${s}" - please use a 4-digit year (e.g. 30/09/2026)` };
  } else {
    return { error: `"${s}" is not a date I understand (use DD/MM/YYYY, e.g. 30/09/2026, or 30 Sep 2026)` };
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (!m || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { error: `"${s}" is not a real calendar date` };
  }
  if (y < 2000 || y > 2100) return { error: `"${s}" - year looks wrong` };
  return { iso: `${y}-${pad(m)}-${pad(d)}` };
}

function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1];
  return `${+d} ${mon} ${y}`;
}

/** Bare numbers / ranges get " LPA" like the Add Company form does; anything else is kept as typed. */
function normalizeCtc(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (/^\d+(\.\d+)?(\s*-\s*\d+(\.\d+)?)?$/.test(t)) return `${t.replace(/\s*-\s*/, ' - ')} LPA`;
  return t;
}

function splitList(v: string | undefined | null, seps: RegExp): string[] {
  return String(v || '').split(seps).map((x) => x.trim()).filter(Boolean);
}

function mergeCaseInsensitive(existing: string[], incoming: string[]): { merged: string[]; added: string[] } {
  const merged = [...existing];
  const added: string[] = [];
  const have = new Set(existing.map((x) => x.toLowerCase()));
  for (const item of incoming) {
    if (!have.has(item.toLowerCase())) {
      have.add(item.toLowerCase());
      merged.push(item);
      added.push(item);
    }
  }
  return { merged, added };
}

async function syncContactsToMetadata(meta: any, mobiles: string[], emails: string[]) {
  try {
    let changed = false;
    for (const mob of mobiles) {
      if (!meta.mobile_numbers.includes(mob)) { meta.mobile_numbers.push(mob); changed = true; }
    }
    for (const em of emails) {
      if (!meta.email_ids.includes(em)) { meta.email_ids.push(em); changed = true; }
    }
    if (changed) {
      if (!meta.primary_mobile && meta.mobile_numbers.length > 0) meta.primary_mobile = meta.mobile_numbers[0];
      if (!meta.primary_email && meta.email_ids.length > 0) meta.primary_email = meta.email_ids[0];
      await meta.save();
    }
  } catch (err) {
    console.error('Weekly paste -> CompanyMetadata sync error:', err);
  }
}

interface Deps {
  notifyForeignCollegeOwners: (actorUserId: string | undefined, collegeId: any, companyName: string, action: 'created' | 'updated' | 'deleted') => Promise<void>;
  getFridayWeekBounds: () => { startFriday: Date; endThursday: Date; weekNumber: number };
}

export function registerWeeklyPasteRoutes(app: Express, deps: Deps) {
  app.post('/api/v1/weekly-tracker/bulk-paste', async (req: Request, res: Response) => {
    try {
      const { college_id, section, fields, rows, dry_run = true } = req.body || {};
      const userId = req.user?.userId;

      if (!college_id || !Types.ObjectId.isValid(String(college_id))) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid college is required.' } });
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'There is nothing to paste.' } });
      }
      if (rows.length > MAX_ROWS) {
        return res.status(400).json({ success: false, error: { code: 'TOO_MANY_ROWS', message: `Please paste at most ${MAX_ROWS} rows at a time.` } });
      }
      const fieldSet = new Set<PasteField>((Array.isArray(fields) ? fields : []).filter((f: any) => (PASTE_FIELDS as readonly string[]).includes(f)));
      const hasDate = DATE_FIELDS.some((f) => fieldSet.has(f));
      if (section && !(PASTE_SECTIONS as readonly string[]).includes(section)) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown section.' } });
      }
      const college = await College.findById(college_id).select('_id college_name');
      if (!college) {
        return res.status(404).json({ success: false, error: { code: 'COLLEGE_NOT_FOUND', message: 'College not found.' } });
      }
      const collegeObjId = new Types.ObjectId(String(college_id));

      const canCreate = !hasDate; // dates are only ever added to companies already on the tracker
      const today = todayIST();
      const seen = new Set<string>();
      const planned: PlannedRow[] = [];

      const resolvedYear = await getCurrentAcademicYear();
      const batchYear = await getCurrentGraduatingBatchYear();
      const { startFriday, endThursday, weekNumber } = deps.getFridayWeekBounds();

      for (const r of rows as PasteRowIn[]) {
        const name = String(r.company_name || '').trim();
        const p: PlannedRow = { row_no: r.row_no, company_name: name, action: 'error', errors: [], warnings: [], changes: [] };
        planned.push(p);

        if (!name) { p.errors.push('Company name is empty'); continue; }
        const key = name.toLowerCase().replace(/\s+/g, ' ');
        if (seen.has(key)) { p.errors.push('This company appears more than once in the paste'); continue; }
        seen.add(key);

        // ── validate every pasted value first (same rules as editing by hand)
        let mobiles: string[] = [];
        let emails: string[] = [];
        let roles: string[] = [];
        let ctc = '';
        const dates: Partial<Record<PasteField, string>> = {};

        if (fieldSet.has('contact') && String(r.contact || '').trim()) {
          const v = validateAndNormalizeMultiMobile(String(r.contact));
          if (!v.valid) p.errors.push(`Contact: ${v.error || 'invalid number'}`);
          else mobiles = splitList(v.normalized, /,/);
        }
        if (fieldSet.has('email') && String(r.email || '').trim()) {
          const v = validateAndNormalizeMultiEmail(String(r.email));
          if (!v.valid) p.errors.push(`Email: ${v.error || 'invalid email'}`);
          else emails = splitList(v.normalized, /,/);
        }
        if (fieldSet.has('job_role')) roles = splitList(r.job_role, /[,;]+/);
        if (fieldSet.has('ctc_lpa') && String(r.ctc_lpa || '').trim()) ctc = normalizeCtc(String(r.ctc_lpa));
        for (const f of DATE_FIELDS) {
          if (!fieldSet.has(f) || !String(r[f] || '').trim()) continue;
          const pd = parsePasteDate(String(r[f]));
          if (pd.error) { p.errors.push(`${f === 'follow_up_date' ? 'Follow-up date' : f === 'jd_received_date' ? 'JD received date' : 'DB shared date'}: ${pd.error}`); continue; }
          if (f === 'follow_up_date' && pd.iso! < today) {
            p.errors.push(`Follow-up date ${fmtDate(pd.iso!)} is in the past - it must be today or later`);
            continue;
          }
          dates[f] = pd.iso;
        }
        if (p.errors.length) continue;

        // ── find the company's existing row in THIS college by the name the tracker already uses;
        //    only fall back to the Metadata record (which can spell the name differently) if none.
        const nameRx = new RegExp(`^${escapeRegex(name)}$`, 'i');
        let existingRows: any[] = await WeeklyTracker.find({ college_id: collegeObjId, is_deleted: { $ne: true }, company_name: nameRx });
        let meta: any = null;
        if (existingRows.length > 0) {
          meta = (existingRows[0].company_id && (await CompanyMetadata.findById(existingRows[0].company_id))) || (await CompanyMetadata.findOne({ company_name: nameRx, is_deleted: false }));
        } else {
          meta = await CompanyMetadata.findOne({ company_name: nameRx, is_deleted: false });
          if (meta) {
            existingRows = await WeeklyTracker.find({ college_id: collegeObjId, is_deleted: { $ne: true }, company_id: meta._id });
          }
        }

        if (existingRows.length > 1) {
          p.errors.push(`This company already has ${existingRows.length} rows in this college - edit them directly`);
          continue;
        }

        // ───────────── UPDATE an existing row ─────────────
        if (existingRows.length === 1) {
          const row = existingRows[0];
          p.action = 'update';
          const set: Record<string, any> = {};
          const before: Record<string, any> = {
            job_role: row.job_role, ctc_lpa: row.ctc_lpa, contact_number: row.contact_number, mobile_numbers: row.mobile_numbers,
            email_id: row.email_id, email_ids: row.email_ids, follow_up_date: row.follow_up_date,
            jd_received_date: row.jd_received_date, db_shared_date: row.db_shared_date,
          };

          if (roles.length) {
            const m = mergeCaseInsensitive(splitList(row.job_role, /[,;]+/), roles);
            if (m.added.length) { set.job_role = m.merged.join(', '); p.changes.push(`Role: + ${m.added.join(', ')}`); }
          }
          if (ctc && ctc !== (row.ctc_lpa || '').trim()) {
            set.ctc_lpa = ctc;
            p.changes.push(`CTC: ${row.ctc_lpa ? `${row.ctc_lpa} → ` : ''}${ctc}`);
          }
          if (mobiles.length) {
            const existingM = (row.mobile_numbers && row.mobile_numbers.length ? row.mobile_numbers : splitList(row.contact_number, /,/)) as string[];
            const m = mergeCaseInsensitive(existingM, mobiles);
            if (m.added.length) {
              set.mobile_numbers = m.merged;
              set.contact_number = row.contact_number || m.merged[0];
              p.changes.push(`Contact: + ${m.added.join(', ')}`);
            }
          }
          if (emails.length) {
            const existingE = (row.email_ids && row.email_ids.length ? row.email_ids : splitList(row.email_id, /,/)) as string[];
            const m = mergeCaseInsensitive(existingE.map((e: string) => e.toLowerCase()), emails);
            if (m.added.length) {
              set.email_ids = m.merged;
              set.email_id = row.email_id || m.merged[0];
              p.changes.push(`Email: + ${m.added.join(', ')}`);
            }
          }
          for (const f of DATE_FIELDS) {
            const iso = dates[f];
            if (!iso) continue;
            const cur = row[f] ? new Date(row[f]).toISOString().slice(0, 10) : '';
            if (cur !== iso) {
              set[f] = new Date(`${iso}T00:00:00.000Z`);
              p.changes.push(`${f === 'follow_up_date' ? 'Follow-up' : f === 'jd_received_date' ? 'JD received' : 'DB shared'}: ${cur ? `${fmtDate(cur)} → ` : ''}${fmtDate(iso)}`);
            }
          }
          if (Object.keys(set).length === 0) {
            p.warnings.push('Already up to date - nothing to change');
          }
          p.write = async () => {
            if (Object.keys(set).length) {
              set.updated_at = new Date();
              await WeeklyTracker.updateOne({ _id: row._id }, { $set: set });
              if (meta && (mobiles.length || emails.length)) await syncContactsToMetadata(meta, mobiles, emails);
            }
            return { row_id: String(row._id), before };
          };
          continue;
        }

        // ───────────── CREATE a new row ─────────────
        if (!canCreate) {
          p.errors.push('Not on this college\'s Weekly Tracker yet - dates can only be added to companies already on it');
          continue;
        }
        if (!meta) {
          p.errors.push('Not in the Metadata database - add it via Daily Tracker or the Metadata module first');
          continue;
        }
        p.action = 'create';
        const finalRole = roles.length ? roles.join(', ') : 'Graduate Trainee';
        if (!roles.length) p.warnings.push('No role given - saved as "Graduate Trainee"');
        if (!ctc) p.warnings.push('No CTC given - you can fill it in later');
        p.changes.push('New company row');
        const targetSection = section || '';
        p.write = async () => {
          if (!targetSection) throw new Error('Choose a section first');
          const created: any = await WeeklyTracker.create({
            academic_year: resolvedYear,
            college_id: collegeObjId,
            coordinator_id: new Types.ObjectId(String(userId)),
            company_id: meta._id,
            company_name: name,
            job_role: finalRole,
            contact_number: mobiles[0] || '',
            mobile_numbers: mobiles,
            email_id: emails[0] || '',
            email_ids: emails,
            company_type: 'Software / IT',
            ctc_lpa: ctc,
            eligible_batch: `${batchYear} Batch`,
            pipeline_section: targetSection,
            current_status_text: 'Added via Paste',
            week_number: weekNumber,
            week_start_date: startFriday,
            week_end_date: endThursday,
            is_pinned_top: targetSection === 'top_companies',
          });
          if (mobiles.length || emails.length) await syncContactsToMetadata(meta, mobiles, emails);
          return { row_id: String(created._id) };
        };
      }

      const summary = {
        total: planned.length,
        create: planned.filter((p) => p.action === 'create').length,
        update: planned.filter((p) => p.action === 'update').length,
        error: planned.filter((p) => p.action === 'error').length,
        needs_section: planned.some((p) => p.action === 'create'),
      };

      const outRows = (results: Record<number, any> = {}) =>
        planned.map((p) => ({
          row_no: p.row_no,
          company_name: p.company_name,
          action: p.action,
          errors: p.errors,
          warnings: p.warnings,
          changes: p.changes,
          ...(results[p.row_no] || {}),
        }));

      if (dry_run) {
        return res.json({ success: true, dry_run: true, data: { summary, rows: outRows() } });
      }

      // ───────────── apply ─────────────
      if (summary.needs_section && !section) {
        return res.status(400).json({ success: false, error: { code: 'SECTION_REQUIRED', message: 'Choose which section the new companies should go into.' } });
      }

      const results: Record<number, any> = {};
      let created = 0;
      let updated = 0;
      let failed = 0;
      for (const p of planned) {
        if (p.action === 'error' || !p.write) continue;
        try {
          const out = await p.write();
          results[p.row_no] = { applied: true, ...out };
          if (p.action === 'create') created++;
          else if (p.changes.length) updated++;
        } catch (err: any) {
          failed++;
          results[p.row_no] = { applied: false, apply_error: err?.message || 'Could not save this row' };
        }
      }

      if (created + updated > 0) {
        deps
          .notifyForeignCollegeOwners(userId, collegeObjId, `${created + updated} pasted compan${created + updated === 1 ? 'y' : 'ies'}`, created > 0 && updated === 0 ? 'created' : 'updated')
          .catch(() => {});
      }

      return res.json({
        success: true,
        dry_run: false,
        message: `Pasted: ${created} added, ${updated} updated${summary.error + failed ? `, ${summary.error + failed} skipped` : ''}.`,
        data: { summary: { ...summary, created, updated, failed }, rows: outRows(results) },
      });
    } catch (error: any) {
      console.error('POST /weekly-tracker/bulk-paste error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Paste failed' } });
    }
  });
}
