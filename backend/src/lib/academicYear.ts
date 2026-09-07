import { SystemSettings } from '../models/SystemSettings';

// The single source of truth for "which season are we in right now" for every
// place that tags a NEW record with a year (Weekly Tracker rows, Active Leads,
// Daily Tracker -> Weekly promotions). An Administrator changes
// Settings -> System Config -> Academic Year / Graduating Batch once; every
// coordinator/Team Leader session picks it up immediately since they all read
// the same live setting via the API — no per-user config, no redeploy.
//
// Existing records already tagged with a prior year are never touched by this
// — only what NEW records get stamped with going forward.
//
// Two distinct concepts, both live here:
//  - academic_year: the SEASON range ("2026-2027" — when hiring is happening),
//    stored on the data model as the leading year (2026).
//  - graduating_batch_year: the single year of students being placed
//    ("2027 Batch") - independent, because a season spans two calendar years
//    but a graduating batch is always one.
const FALLBACK_ACADEMIC_YEAR = 2026;
const FALLBACK_BATCH_YEAR = 2027;
const CACHE_TTL_MS = 60_000;

interface CachedSeason {
  academicYear: number;
  graduatingBatchYear: number;
}

let cached: CachedSeason | null = null;
let cachedAt = 0;

function parseLeadingYear(label: string | undefined | null): number | null {
  if (!label) return null;
  const match = label.match(/\d{4}/);
  if (!match) return null;
  const year = Number(match[0]);
  return Number.isFinite(year) ? year : null;
}

async function loadSeason(): Promise<CachedSeason> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const settings = await SystemSettings.findOne({})
    .select('academic_year graduating_batch_year')
    .lean();

  const academicYear = parseLeadingYear(settings?.academic_year) ?? FALLBACK_ACADEMIC_YEAR;
  const graduatingBatchYear = Number(settings?.graduating_batch_year) || FALLBACK_BATCH_YEAR;

  cached = { academicYear, graduatingBatchYear };
  cachedAt = now;
  return cached;
}

export async function getCurrentAcademicYear(): Promise<number> {
  return (await loadSeason()).academicYear;
}

export async function getCurrentGraduatingBatchYear(): Promise<number> {
  return (await loadSeason()).graduatingBatchYear;
}

// Called by PATCH /settings whenever academic_year or graduating_batch_year
// changes, so the effect is immediate rather than waiting out the cache
// window.
export function clearAcademicYearCache(): void {
  cached = null;
  cachedAt = 0;
}
