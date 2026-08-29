'use client';

import { useState, useEffect } from 'react';
import { Plus, X, User, Building2, Flame } from 'lucide-react';
import { SmoothSelect } from '@/components/ui/SmoothSelect';
import { apiFetch } from '@/lib/api';
import { readSessionUser } from '@/lib/session';

interface Props {
  initialCoordinatorId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAssignmentModal({ initialCoordinatorId, onClose, onSuccess }: Props) {
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);

  const [coordinatorId, setCoordinatorId] = useState(initialCoordinatorId || '');
  const [collegeId, setCollegeId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hrName, setHrName] = useState('');
  const [hrMobile, setHrMobile] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [corRes, colRes] = await Promise.all([
          apiFetch('/coordinators'),
          apiFetch('/colleges'),
        ]);

        if (corRes.success && corRes.data?.coordinators?.length > 0) {
          setCoordinators(corRes.data.coordinators);
          if (!initialCoordinatorId) {
            setCoordinatorId(corRes.data.coordinators[0]._id);
          } else {
            setCoordinatorId(initialCoordinatorId);
          }
        }
        if (colRes.success && colRes.data?.colleges?.length > 0) {
          setColleges(colRes.data.colleges);
          setCollegeId(colRes.data.colleges[0]._id);
        }
      } catch (err) {
        console.error('Failed to load coordinators/colleges:', err);
      }
    };

    fetchData();
  }, [initialCoordinatorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!companyName.trim() || !taskDescription.trim()) {
      setErrorMsg('Company name and task description are mandatory.');
      return;
    }

    const currentUser = readSessionUser();
    const senderId = currentUser?._id || (currentUser as any)?.id;

    setLoading(true);
    try {
      const res = await apiFetch('/assigned-work', {
        method: 'POST',
        body: JSON.stringify({
          sender_tl_id: senderId,
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

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error?.message || 'Failed to assign work. Please try again.');
      }
    } catch (err: any) {
      console.error('Assign work error:', err);
      setErrorMsg('Network error. Unable to reach server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Plus size={16} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Assign Operational Task
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispatch outreach tasks to coordinators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Target Coordinator & Assigned College */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Coordinator <span className="text-rose-500">*</span>
              </label>
              <SmoothSelect
                value={coordinatorId}
                onChange={setCoordinatorId}
                searchable={true}
                searchPlaceholder="Search coordinator…"
                icon={User}
                title="Target Coordinator"
                options={coordinators.map((c) => ({
                  value: c._id,
                  label: c.full_name,
                  sublabel: c.official_email,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned College <span className="text-rose-500">*</span>
              </label>
              <SmoothSelect
                value={collegeId}
                onChange={setCollegeId}
                searchable={true}
                searchPlaceholder="Search college…"
                icon={Building2}
                title="Assigned College"
                options={colleges.map((c) => ({
                  value: c._id,
                  label: c.college_name,
                  badge: c.college_code,
                }))}
              />
            </div>
          </div>

          {/* Company Name & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Cisco Systems"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <SmoothSelect
                value={priority}
                onChange={(val) => setPriority(val as any)}
                icon={Flame}
                title="Priority Level"
                options={[
                  { value: 'high', label: 'High Priority' },
                  { value: 'medium', label: 'Medium Priority' },
                  { value: 'low', label: 'Low Priority' },
                ]}
              />
            </div>
          </div>

          {/* Corporate HR Contact Details (Card) */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Corporate HR Contact (Optional)
              </span>
              <span className="text-[10px] text-slate-400">Merges into Metadata DB</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <input
                type="text"
                placeholder="HR Contact Name"
                value={hrName}
                onChange={(e) => setHrName(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
              <input
                type="text"
                placeholder="HR Phone (10-Digit)"
                value={hrMobile}
                onChange={(e) => setHrMobile(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
              <input
                type="email"
                placeholder="HR Official Email"
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Task Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Task Instructions <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="e.g. Call HR to confirm online technical assessment timing and student registration link."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {loading ? 'Dispatching…' : 'Dispatch Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

