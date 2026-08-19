'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAssignmentModal({ onClose, onSuccess }: Props) {
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);

  const [coordinatorId, setCoordinatorId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hrName, setHrName] = useState('');
  const [hrMobile, setHrMobile] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [loading, setLoading] = useState(false);

  // Default Team Leader ID
  const TL_ID = '6a84719afa3bf51271bc1545';

  useEffect(() => {
    Promise.all([
      fetch(`${API}/coordinators`).then((r) => r.json()),
      fetch(`${API}/colleges`).then((r) => r.json()),
    ])
      .then(([corData, colData]) => {
        if (corData.success && corData.data.coordinators.length > 0) {
          setCoordinators(corData.data.coordinators);
          setCoordinatorId(corData.data.coordinators[0]._id);
        }
        if (colData.success && colData.data.colleges.length > 0) {
          setColleges(colData.data.colleges);
          setCollegeId(colData.data.colleges[0]._id);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !taskDescription.trim()) {
      alert('Company name and task description are mandatory.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/assigned-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_tl_id: TL_ID,
          assigned_to_coordinator_id: coordinatorId,
          college_id: collegeId,
          company_name: companyName.trim(),
          hr_name: hrName.trim(),
          hr_mobile: hrMobile.trim(),
          hr_email: hrEmail.trim(),
          task_description: taskDescription.trim(),
          priority,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Work assignment dispatched to coordinator dashboard successfully!');
        onSuccess();
        onClose();
      } else {
        alert(data.error?.message || 'Failed to assign work');
      }
    } catch (err) {
      console.error('Assign work error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel rounded-2xl w-full max-w-xl border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>➕</span> Assign Operational Task to Coordinator
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-base">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">

          {/* Coordinator & College Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Target Coordinator *
              </label>
              <select
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {coordinators.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.full_name} ({c.official_email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Assigned College *
              </label>
              <select
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    [{c.college_code}] {c.college_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Company & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Cisco Systems"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟠 Medium</option>
                <option value="low">🔵 Low</option>
              </select>
            </div>
          </div>

          {/* HR Contact Details (Optional) */}
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
            <span className="font-semibold text-slate-300 block text-[11px] uppercase tracking-wider">
              Corporate HR Contact (For Metadata Merge)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="HR Contact Name"
                value={hrName}
                onChange={(e) => setHrName(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="HR Phone (10-Digit)"
                value={hrMobile}
                onChange={(e) => setHrMobile(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <input
                type="email"
                placeholder="HR Official Email"
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Task Instructions */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Task Instructions *
            </label>
            <textarea
              rows={3}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="e.g. Call HR to confirm online technical assessment timing and student registration link."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md transition-colors"
            >
              {loading ? 'Dispatching…' : 'Dispatch Assignment →'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
