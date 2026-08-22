'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export interface College {
  _id: string;
  college_name: string;
  college_code: string;
  location?: string;
  logo_url?: string;
}

interface Props {
  selectedCollegeId: string;
  onSelect: (id: string, name: string) => void;
  onSelectCollege?: (col: College) => void;
}

export function CollegeSelector({ selectedCollegeId, onSelect, onSelectCollege }: Props) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Scoping happens server-side: a coordinator gets only their own assigned
    // colleges back, a Team Leader/Admin gets the full roster — see
    // GET /api/v1/colleges in routePolicy.ts / server.ts.
    apiFetch('/colleges')
      .then((data) => {
        if (data.success && Array.isArray((data.data as any)?.colleges)) {
          setColleges((data.data as any).colleges);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = colleges.find((c) => c._id === selectedCollegeId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-fg-subtle font-medium whitespace-nowrap">College:</span>
      <select
        value={selectedCollegeId}
        onChange={(e) => {
          const college = colleges.find((c) => c._id === e.target.value);
          if (college) {
            onSelect(college._id, college.college_name);
            if (onSelectCollege) onSelectCollege(college);
          }
        }}
        disabled={loading}
        className="bg-surface border border-border-strong text-fg text-xs sm:text-sm px-3 py-2 rounded-xl 
                   min-w-[220px] cursor-pointer disabled:opacity-50"
      >
        <option value="">
          {loading ? 'Loading colleges…' : '— Select College —'}
        </option>
        {colleges.map((c) => (
          <option key={c._id} value={c._id}>
            [{c.college_code}] {c.college_name}
          </option>
        ))}
      </select>
      {selected && (
        <span className="text-xs text-fg-subtle hidden lg:inline">
          {selected.location}
        </span>
      )}
    </div>
  );
}

