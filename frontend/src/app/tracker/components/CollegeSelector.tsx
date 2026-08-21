'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

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
    fetch(`${API}/colleges`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data?.colleges)) {
          setColleges(data.data.colleges);
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

