'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface College {
  _id: string;
  college_name: string;
  college_code: string;
  location?: string;
}

interface Props {
  selectedCollegeId: string;
  onSelect: (id: string, name: string) => void;
}

export function CollegeSelector({ selectedCollegeId, onSelect }: Props) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/colleges`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setColleges(data.data.colleges);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = colleges.find((c) => c._id === selectedCollegeId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 font-medium whitespace-nowrap">College:</span>
      <select
        value={selectedCollegeId}
        onChange={(e) => {
          const college = colleges.find((c) => c._id === e.target.value);
          if (college) onSelect(college._id, college.college_name);
        }}
        disabled={loading}
        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm px-3 py-2 rounded-lg 
                   focus:outline-none focus:border-blue-500 min-w-[220px] cursor-pointer
                   disabled:opacity-50"
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
        <span className="text-xs text-slate-500 hidden lg:inline">
          {selected.location}
        </span>
      )}
    </div>
  );
}
