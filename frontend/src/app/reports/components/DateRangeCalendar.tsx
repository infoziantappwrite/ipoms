'use client';

interface Props {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChangeRange: (start: string, end: string, calculatedLabel: string) => void;
}

export function formatPeriodFromDates(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return '';
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');

  const optShort: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const sStr = start.toLocaleDateString('en-IN', optShort);
  const eStr = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const monthName = start.toLocaleDateString('en-IN', { month: 'long' });
  const year = start.getFullYear();

  // Find Friday week index
  let fridayCount = 0;
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= start) {
    if (cur.getDay() === 5) fridayCount++;
    cur.setDate(cur.getDate() + 1);
  }
  const weekNum = fridayCount > 0 ? fridayCount : 1;
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays === 7 && start.getDay() === 5) {
    return `${monthName} ${year} • Week ${weekNum}: ${sStr} – ${eStr}`;
  } else if (diffDays === 14) {
    return `${monthName} ${year} • Weeks ${weekNum} & ${weekNum + 1}: ${sStr} – ${eStr}`;
  } else if (diffDays >= 28 && start.getDate() === 1) {
    return `${monthName} ${year} Consolidated (01 ${monthName.slice(0, 3)} – ${eStr})`;
  } else {
    return `${sStr} ${start.getFullYear()} – ${eStr}`;
  }
}

export function DateRangeCalendar({ startDate, endDate, onChangeRange }: Props) {
  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 shadow-2xs flex items-center gap-3 flex-wrap">
      {/* Start Date */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-xl px-2.5 py-1.5 shadow-2xs">
        <span className="text-micro font-bold text-slate-500 uppercase tracking-wider">From:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            const s = e.target.value;
            onChangeRange(s, endDate, formatPeriodFromDates(s, endDate));
          }}
          className="bg-transparent text-xs text-slate-800 font-semibold cursor-pointer outline-none"
        />
      </div>

      {/* End Date */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-xl px-2.5 py-1.5 shadow-2xs">
        <span className="text-micro font-bold text-slate-500 uppercase tracking-wider">To:</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            const end = e.target.value;
            onChangeRange(startDate, end, formatPeriodFromDates(startDate, end));
          }}
          className="bg-transparent text-xs text-slate-800 font-semibold cursor-pointer outline-none"
        />
      </div>
    </div>
  );
}
