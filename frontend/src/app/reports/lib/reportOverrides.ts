/**
 * Presentation-only renames for the single-college Weekly Placement report.
 *
 * A person can retype a section title ("DRIVE IN PROGRESS") or a column heading ("Company Name") in the
 * report PREVIEW. The choice lives only on the generated report object (`section_titles`,
 * `column_headings`) - it never touches the Weekly Tracker data, the Report Builder, or any saved
 * setting - and every surface that draws the report (on-screen preview, A4 preview, image / PDF export)
 * reads it through these helpers, so what is on screen is what gets saved.
 *
 * Keys are the weekly section keys; a column is addressed by its position in the table.
 */
export type WeeklySectionKey =
  | 'completed_companies'
  | 'drive_in_progress'
  | 'upcoming_drives'
  | 'in_progress'
  | 'pipeline'
  | 'top_companies'
  | 'rejected_companies'
  | 'on_hold_by_college'
  | 'on_hold_by_hr';

/** The default title of each weekly section, as drawn today. */
export const WEEKLY_SECTION_TITLES: Record<WeeklySectionKey, string> = {
  completed_companies: 'COMPANIES COMPLETED',
  drive_in_progress: 'DRIVE IN PROGRESS',
  upcoming_drives: 'UPCOMING DRIVES',
  in_progress: 'COMPANIES IN PROGRESS',
  pipeline: 'COMPANIES IN PIPELINE',
  top_companies: 'TOP COMPANIES',
  rejected_companies: 'REJECTED COMPANIES',
  on_hold_by_college: 'COMPANIES ON HOLD BY COLLEGE',
  on_hold_by_hr: 'COMPANIES ON HOLD BY HR',
};

/** The section title to draw: the person's rename if there is one, else the default. */
export function sectionTitle(report: any, key: string, fallback: string): string {
  const v = report?.section_titles?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

/** The heading of column `index` in a section's table: the person's rename, else the default. */
export function columnHeading(report: any, key: string, index: number, fallback: string): string {
  const v = report?.column_headings?.[key]?.[index];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

/** Apply any column renames to a whole default heading row. */
export function applyColumnHeadings(report: any, key: string, headings: string[]): string[] {
  return headings.map((h, i) => columnHeading(report, key, i, h));
}

/** A new report object with one section title set (an empty value clears the rename). */
export function withSectionTitle(report: any, key: string, value: string): any {
  const next = { ...(report?.section_titles || {}) };
  if (value.trim()) next[key] = value.trim();
  else delete next[key];
  return { ...report, section_titles: next };
}

/** A new report object with one column heading set (an empty value clears the rename). */
export function withColumnHeading(report: any, key: string, index: number, value: string): any {
  const all = { ...(report?.column_headings || {}) };
  const section = { ...(all[key] || {}) };
  if (value.trim()) section[index] = value.trim();
  else delete section[index];
  all[key] = section;
  return { ...report, column_headings: all };
}
