'use client';

import { useState } from 'react';
import {
  X,
  Layers,
  Calendar,
  Clock,
  Check,
  AlertCircle,
  Sparkles,
  Building2,
} from 'lucide-react';
import type { PendingTaskRow } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updates: Partial<PendingTaskRow>) => Promise<boolean>;
  selectedTasks: PendingTaskRow[];
  collegeName: string;
}

const CURRENT_STATUS_SUGGESTIONS = [
  'JD Received',
  'Awaiting Criteria',
  'Shortlisting Candidates',
  'Online Assessment Sent',
  'HR Round Scheduled',
  'Shortlist Shared',
  'Feedback Pending',
  'Drive Scheduled',
];

const ACTION_SUGGESTIONS = [
  'DB to be shared',
  'Drive date to be confirmed',
  'Drive date to be scheduled',
  'JD approval pending from college',
  'Shortlist confirmation awaited',
  'Follow-up with HR for drive slot',
  'Eligibility criteria clarification required',
];

export function BulkEditPendingTasksModal({
  isOpen,
  onClose,
  onSubmit,
  selectedTasks,
  collegeName,
}: Props) {
  // Enabled toggles for which fields to apply
  const [updateJdDate, setUpdateJdDate] = useState(false);
  const [jdReceivedDate, setJdReceivedDate] = useState('');

  const [updateDbSharedDate, setUpdateDbSharedDate] = useState(false);
  const [dbSharedDate, setDbSharedDate] = useState('');

  const [updateAction, setUpdateAction] = useState(false);
  const [actionToBeTaken, setActionToBeTaken] = useState('');

  const [updateCurrentStatus, setUpdateCurrentStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');

  const [updateDriveDate, setUpdateDriveDate] = useState(false);
  const [driveDate, setDriveDate] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !updateJdDate &&
      !updateDbSharedDate &&
      !updateAction &&
      !updateCurrentStatus &&
      !updateDriveDate
    ) {
      setErrorMessage('Please select at least one field to update across selected tasks.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const updates: any = {};
      if (updateJdDate) {
        updates.jd_received_date = jdReceivedDate ? new Date(jdReceivedDate).toISOString() : null;
      }
      if (updateDbSharedDate) {
        updates.db_shared_date = dbSharedDate ? new Date(dbSharedDate).toISOString() : null;
      }
      if (updateAction && actionToBeTaken.trim()) {
        updates.action_to_be_taken = actionToBeTaken.trim();
      }
      if (updateCurrentStatus && currentStatus.trim()) {
        updates.current_status = currentStatus.trim();
      }
      if (updateDriveDate) {
        updates.drive_date = driveDate ? new Date(driveDate).toISOString() : null;
      }

      const success = await onSubmit(updates);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply bulk updates.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bulk Edit Pending Tasks
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Updating <span className="font-semibold text-indigo-600">{selectedTasks.length} tasks</span> for {collegeName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected Companies Preview */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Selected Companies ({selectedTasks.length}):
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
            {selectedTasks.map((task) => (
              <span
                key={task._id}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-800 shadow-2xs"
              >
                <Building2 size={11} className="text-indigo-500" />
                {task.company_name}
              </span>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Check the boxes for the fields you want to update simultaneously across all {selectedTasks.length} selected tasks:
          </p>

          {/* Field 1: JD Received Date */}
          <div className={`p-3.5 rounded-xl border transition-all ${updateJdDate ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/50 border-slate-200'}`}>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateJdDate}
                onChange={(e) => setUpdateJdDate(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Update JD Received Date</span>
            </label>
            {updateJdDate && (
              <div className="pl-6.5 mt-1.5">
                <input
                  type="date"
                  value={jdReceivedDate}
                  onChange={(e) => setJdReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Field 2: DB Shared Date */}
          <div className={`p-3.5 rounded-xl border transition-all ${updateDbSharedDate ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/50 border-slate-200'}`}>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateDbSharedDate}
                onChange={(e) => setUpdateDbSharedDate(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Update DB Shared Date</span>
            </label>
            {updateDbSharedDate && (
              <div className="pl-6.5 mt-1.5">
                <input
                  type="date"
                  value={dbSharedDate}
                  onChange={(e) => setDbSharedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Field 3: Action to be Taken */}
          <div className={`p-3.5 rounded-xl border transition-all ${updateAction ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/50 border-slate-200'}`}>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateAction}
                onChange={(e) => setUpdateAction(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Update Action to be Taken</span>
            </label>
            {updateAction && (
              <div className="pl-6.5 mt-1.5 space-y-2">
                <textarea
                  value={actionToBeTaken}
                  onChange={(e) => setActionToBeTaken(e.target.value)}
                  rows={2}
                  placeholder="Type action manually or click a suggested preset below..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none font-medium"
                />
                <div className="flex flex-wrap gap-1.5">
                  {ACTION_SUGGESTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setActionToBeTaken(opt)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                        actionToBeTaken === opt
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      + {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Field 4: Current Status */}
          <div className={`p-3.5 rounded-xl border transition-all ${updateCurrentStatus ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/50 border-slate-200'}`}>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateCurrentStatus}
                onChange={(e) => setUpdateCurrentStatus(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Update Current Status</span>
            </label>
            {updateCurrentStatus && (
              <div className="pl-6.5 mt-1.5 space-y-2">
                <input
                  type="text"
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  placeholder="e.g. Online Assessment Sent, Drive Scheduled..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <div className="flex flex-wrap gap-1">
                  {CURRENT_STATUS_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCurrentStatus(s)}
                      className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                        currentStatus === s
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Field 5: Drive Date */}
          <div className={`p-3.5 rounded-xl border transition-all ${updateDriveDate ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/50 border-slate-200'}`}>
            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateDriveDate}
                onChange={(e) => setUpdateDriveDate(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Update Drive Date</span>
            </label>
            {updateDriveDate && (
              <div className="pl-6.5 mt-1.5">
                <input
                  type="date"
                  value={driveDate}
                  onChange={(e) => setDriveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Applying Updates...' : `Apply to ${selectedTasks.length} Task(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
