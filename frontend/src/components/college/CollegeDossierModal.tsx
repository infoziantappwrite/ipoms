'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Award,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Calendar,
  Compass,
  FileText,
  Edit3,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Layers,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { triggerHaptic } from '@/lib/haptics';
import type { College } from '@/components/CollegeSelector';

export interface ParsedPrograms {
  ugCourses: string[];
  pgCourses: string[];
  specialNotes: string;
}

export function parseUgPgPrograms(placementNotes?: string, fallbackDepartments?: string[]): ParsedPrograms {
  const ugCourses: string[] = [];
  const pgCourses: string[] = [];
  const noteLines: string[] = [];

  if (placementNotes && placementNotes.trim()) {
    const lines = placementNotes.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let section: 'none' | 'ug' | 'pg' | 'notes' = 'none';

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('academic programs') || lower.includes('departments:')) {
        section = 'none';
        continue;
      }
      if (lower.includes('undergraduate') || lower.includes('(ug)')) {
        section = 'ug';
        continue;
      }
      if (lower.includes('postgraduate') || lower.includes('(pg)')) {
        section = 'pg';
        continue;
      }

      const cleaned = line.replace(/^[•\-\*]\s*/, '').trim();
      if (!cleaned) continue;

      if (section === 'ug') {
        ugCourses.push(cleaned);
      } else if (section === 'pg') {
        pgCourses.push(cleaned);
      } else {
        noteLines.push(line);
      }
    }
  }

  // If no UG/PG courses found in placement_notes, categorize fallbackDepartments
  if (ugCourses.length === 0 && pgCourses.length === 0 && fallbackDepartments && fallbackDepartments.length > 0) {
    for (const dept of fallbackDepartments) {
      const lower = dept.toLowerCase();
      if (
        lower.startsWith('m.') ||
        lower.startsWith('m.tech') ||
        lower.startsWith('m.e') ||
        lower.startsWith('mba') ||
        lower.startsWith('mca') ||
        lower.startsWith('m.sc') ||
        lower.startsWith('ms') ||
        lower.includes('master') ||
        lower.includes('postgraduate')
      ) {
        pgCourses.push(dept);
      } else {
        ugCourses.push(dept);
      }
    }
  }

  return {
    ugCourses,
    pgCourses,
    specialNotes: noteLines.join('\n').trim(),
  };
}

interface Props {
  collegeId: string;
  initialCollege?: College | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: College) => void;
}

export function CollegeDossierModal({
  collegeId,
  initialCollege,
  isOpen,
  onClose,
  onUpdated,
}: Props) {
  const { toast } = useToast();
  const [college, setCollege] = useState<College | null>(initialCollege || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncingSharepoint, setIsSyncingSharepoint] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Form edit states
  const [form, setForm] = useState({
    college_name: '',
    college_code: '',
    location: '',
    college_website: '',
    logo_url: '',
    tpo_name: '',
    tpo_designation: '',
    tpo_contact_mobile: '',
    tpo_email: '',
    tpo_alternate_mobile: '',
    tpo_alternate_email: '',
    ug_courses: [] as string[],
    pg_courses: [] as string[],
    nirf_ranking: '',
    highest_package_lpa: '',
    lowest_package_lpa: '',
    established_year: '',
    landmarks: '',
    address: '',
    map_location: '',
    accreditations: '',
    special_notes: '',
  });

  const [newUgInput, setNewUgInput] = useState('');
  const [newPgInput, setNewPgInput] = useState('');

  // Load latest college data on open
  useEffect(() => {
    if (!isOpen || !collegeId) return;

    setLoading(true);
    apiFetch<{ college: College }>(`/colleges/${collegeId}`)
      .then((res) => {
        if (res.success && res.data?.college) {
          const c = res.data.college;
          setCollege(c);
          initForm(c);
        } else if (initialCollege) {
          setCollege(initialCollege);
          initForm(initialCollege);
        }
      })
      .catch((err) => {
        console.error('Failed to load college profile:', err);
        if (initialCollege) {
          setCollege(initialCollege);
          initForm(initialCollege);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, collegeId]);

  const initForm = (c: College) => {
    const parsed = parseUgPgPrograms(c.placement_notes, c.departments);
    setForm({
      college_name: c.college_name || '',
      college_code: c.college_code || '',
      location: c.location || '',
      college_website: c.college_website || '',
      logo_url: c.logo_url || '',
      tpo_name: c.tpo_name || '',
      tpo_designation: c.tpo_designation || 'Head - Placements & Corporate Relations',
      tpo_contact_mobile: c.tpo_contact_mobile || '',
      tpo_email: c.tpo_email || '',
      tpo_alternate_mobile: c.tpo_alternate_mobile || '',
      tpo_alternate_email: c.tpo_alternate_email || '',
      ug_courses: parsed.ugCourses.length > 0 ? parsed.ugCourses : ['CSE', 'IT', 'AI & DS', 'ECE', 'EEE', 'MECH'],
      pg_courses: parsed.pgCourses,
      nirf_ranking: c.nirf_ranking || '',
      highest_package_lpa: c.highest_package_lpa || '',
      lowest_package_lpa: c.lowest_package_lpa || '',
      established_year: c.established_year ? String(c.established_year) : '',
      landmarks: c.landmarks || '',
      address: c.address || c.landmarks || '',
      map_location: c.map_location || '',
      accreditations: c.accreditations || '',
      special_notes: parsed.specialNotes || '',
    });
  };

  const handleSyncSharepoint = async () => {
    setIsSyncingSharepoint(true);
    triggerHaptic('medium');
    try {
      const res = await apiFetch<any>('/colleges/sync-sharepoint', { method: 'POST' });
      if (res.success) {
        toast(res.message || 'Synchronized from Colleges & Coordinators Excel', 'success');
        // Reload current college
        if (collegeId) {
          const fresh = await apiFetch<{ college: College }>(`/colleges/${collegeId}`);
          if (fresh.success && fresh.data?.college) {
            setCollege(fresh.data.college);
            initForm(fresh.data.college);
            onUpdated?.(fresh.data.college);
          }
        }
      } else {
        toast(res.error?.message || 'Failed to sync from SharePoint', 'error');
      }
    } catch (err: any) {
      toast('Network error syncing from SharePoint', 'error');
    } finally {
      setIsSyncingSharepoint(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    triggerHaptic('light');
    toast(`Copied ${label} to clipboard`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const cleanText = (str?: string, fallback = '—') => {
    if (!str || str.startsWith('#') || str.toUpperCase() === 'NIL' || str === '-') return fallback;
    return str;
  };

  const getMapEmbedQuery = () => {
    if (college?.map_location && !college.map_location.startsWith('http') && college.map_location.length > 3 && !college.map_location.includes('#')) {
      return college.map_location;
    }
    const q = `${cleanText(college?.college_name, '')} ${cleanText(college?.address || college?.landmarks || college?.location, '')}`.trim();
    return q || 'Tamil Nadu, India';
  };

  const handleAddUgCourse = () => {
    const val = newUgInput.trim();
    if (val && !form.ug_courses.includes(val)) {
      setForm((prev) => ({ ...prev, ug_courses: [...prev.ug_courses, val] }));
      setNewUgInput('');
      triggerHaptic('light');
    }
  };

  const handleRemoveUgCourse = (course: string) => {
    setForm((prev) => ({ ...prev, ug_courses: prev.ug_courses.filter((c) => c !== course) }));
    triggerHaptic('light');
  };

  const handleAddPgCourse = () => {
    const val = newPgInput.trim();
    if (val && !form.pg_courses.includes(val)) {
      setForm((prev) => ({ ...prev, pg_courses: [...prev.pg_courses, val] }));
      setNewPgInput('');
      triggerHaptic('light');
    }
  };

  const handleRemovePgCourse = (course: string) => {
    setForm((prev) => ({ ...prev, pg_courses: prev.pg_courses.filter((c) => c !== course) }));
    triggerHaptic('light');
  };

  const handleSave = async () => {
    if (!collegeId) return;
    setSaving(true);
    triggerHaptic('medium');

    try {
      // Reconstruct placement_notes in the clean standard format
      const noteLines: string[] = [];
      if (form.ug_courses.length > 0 || form.pg_courses.length > 0) {
        noteLines.push('Academic Programs & Departments:');
        if (form.ug_courses.length > 0) {
          noteLines.push('Undergraduate (UG) Programs');
          form.ug_courses.forEach((c) => noteLines.push(c));
        }
        if (form.pg_courses.length > 0) {
          noteLines.push('Postgraduate (PG) Programs');
          form.pg_courses.forEach((c) => noteLines.push(c));
        }
      }
      if (form.special_notes.trim()) {
        if (noteLines.length > 0) noteLines.push('');
        noteLines.push(form.special_notes.trim());
      }

      const combinedDepartments = [
        ...form.ug_courses.map((c) => c.replace(/^B\.Tech\.?\s*–?\s*/i, '').replace(/^B\.E\.?\s*–?\s*/i, '').trim()),
        ...form.pg_courses.map((c) => c.replace(/^M\.Tech\.?\s*–?\s*/i, '').replace(/^M\.E\.?\s*–?\s*/i, '').trim()),
      ].filter(Boolean);

      const payload = {
        college_name: form.college_name.trim(),
        location: form.location.trim(),
        college_website: form.college_website.trim(),
        logo_url: form.logo_url.trim(),
        tpo_name: form.tpo_name.trim(),
        tpo_designation: form.tpo_designation.trim(),
        tpo_contact_mobile: form.tpo_contact_mobile.trim(),
        tpo_email: form.tpo_email.trim(),
        tpo_alternate_mobile: form.tpo_alternate_mobile.trim(),
        tpo_alternate_email: form.tpo_alternate_email.trim(),
        departments: combinedDepartments.length > 0 ? combinedDepartments : form.ug_courses,
        nirf_ranking: form.nirf_ranking.trim(),
        highest_package_lpa: form.highest_package_lpa.trim(),
        lowest_package_lpa: form.lowest_package_lpa.trim(),
        established_year: form.established_year.trim(),
        landmarks: form.landmarks.trim() || form.address.trim(),
        address: form.address.trim() || form.landmarks.trim(),
        map_location: form.map_location.trim(),
        accreditations: form.accreditations.trim(),
        placement_notes: noteLines.join('\n').trim(),
      };

      const res = await apiFetch<{ college: College }>(`/colleges/${collegeId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data?.college) {
        setCollege(res.data.college);
        setIsEditing(false);
        toast('College placement dossier updated successfully', 'success');
        onUpdated?.(res.data.college);
      } else {
        toast(res.error?.message || 'Failed to update college details', 'error');
      }
    } catch (err: any) {
      console.error('Update college error:', err);
      toast('Network error updating college details', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="relative px-5 py-4 border-b border-border/80 bg-surface-sunken/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* College Logo / Badge */}
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 flex items-center justify-center shrink-0 shadow-xs overflow-hidden p-1">
              {college?.logo_url ? (
                <img
                  src={college.logo_url}
                  alt={college.college_code || 'College'}
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <img
                  src="/university.gif"
                  alt="College"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-fg truncate">
                  {college?.college_name || 'College Dossier'}
                </h3>
                {college?.college_code && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {college.college_code}
                  </span>
                )}
                {college?.established_year && (
                  <span className="text-micro text-fg-subtle">
                    Est. {cleanText(String(college.established_year))}
                  </span>
                )}
              </div>
              <p className="text-xs text-fg-muted flex items-center gap-1.5 mt-0.5 truncate">
                <MapPin size={12} className="shrink-0 text-fg-subtle" />
                <span className="truncate">{cleanText(college?.location, 'Tamil Nadu, India')}</span>
                {college?.college_website && !college.college_website.startsWith('#') && (
                  <>
                    <span>•</span>
                    <a
                      href={college.college_website.startsWith('http') ? college.college_website : `https://${college.college_website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-0.5 shrink-0"
                    >
                      <Globe size={11} />
                      <span>Website</span>
                      <ExternalLink size={10} />
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Sync from SharePoint Excel */}
            <button
              type="button"
              onClick={handleSyncSharepoint}
              disabled={isSyncingSharepoint}
              aria-label="Sync from Excel"
              title="Sync latest college & TPO details from Colleges & Coordinators SharePoint Excel"
              className="flex items-center justify-center w-8 h-8 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={isSyncingSharepoint ? 'animate-spin' : ''} />
            </button>

            {/* Close Cross */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors shrink-0 cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-fg text-xs custom-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-fg-subtle">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-xs font-medium">Loading placement dossier…</p>
            </div>
          ) : isEditing ? (
            /* ─────────────────────────────────────────────────────────────
               EDIT FORM MODE
            ─────────────────────────────────────────────────────────────── */
            <div className="space-y-5">
              {/* Section 1: Basic Information */}
              <div className="bg-surface-sunken/50 border border-border/70 rounded-xl p-4 space-y-3.5">
                <h4 className="font-bold text-xs text-primary flex items-center gap-1.5">
                  <Building2 size={14} />
                  <span>Institutional Profile</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">College Name</label>
                    <input
                      type="text"
                      value={form.college_name}
                      onChange={(e) => setForm({ ...form, college_name: e.target.value })}
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Location / City</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Coimbatore, Tamil Nadu"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Official Website URL</label>
                    <input
                      type="text"
                      value={form.college_website}
                      onChange={(e) => setForm({ ...form, college_website: e.target.value })}
                      placeholder="e.g. https://www.college.edu.in"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Established Year</label>
                    <input
                      type="text"
                      value={form.established_year}
                      onChange={(e) => setForm({ ...form, established_year: e.target.value })}
                      placeholder="e.g. 1998"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Google Maps URL / Location Pin</label>
                    <input
                      type="text"
                      value={form.map_location}
                      onChange={(e) => setForm({ ...form, map_location: e.target.value })}
                      placeholder="e.g. https://maps.app.goo.gl/... or 11.9344, 79.8329"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">College Logo URL</label>
                    <input
                      type="text"
                      value={form.logo_url}
                      onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                      placeholder="e.g. https://example.com/logo.png"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Address</label>
                    <input
                      type="text"
                      value={form.landmarks}
                      onChange={(e) => setForm({ ...form, landmarks: e.target.value, address: e.target.value })}
                      placeholder="e.g. Achariyapuram, Villianur, Uruvaiyar, Puducherry – 605110, India"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Training & Placement Officer (TPO) */}
              <div className="bg-surface-sunken/50 border border-border/70 rounded-xl p-4 space-y-3.5">
                <h4 className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Briefcase size={14} />
                  <span>Training & Placement Officer (TPO) Contacts</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">TPO Officer Name</label>
                    <input
                      type="text"
                      value={form.tpo_name}
                      onChange={(e) => setForm({ ...form, tpo_name: e.target.value })}
                      placeholder="e.g. Dr. K. Ramesh"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Designation</label>
                    <input
                      type="text"
                      value={form.tpo_designation}
                      onChange={(e) => setForm({ ...form, tpo_designation: e.target.value })}
                      placeholder="e.g. Head - Placements & Corporate Relations"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Primary Mobile Number</label>
                    <input
                      type="text"
                      value={form.tpo_contact_mobile}
                      onChange={(e) => setForm({ ...form, tpo_contact_mobile: e.target.value })}
                      placeholder="e.g. 9840123456"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Primary Email ID</label>
                    <input
                      type="email"
                      value={form.tpo_email}
                      onChange={(e) => setForm({ ...form, tpo_email: e.target.value })}
                      placeholder="e.g. placements@college.edu.in"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Alternate / Desk Mobile</label>
                    <input
                      type="text"
                      value={form.tpo_alternate_mobile}
                      onChange={(e) => setForm({ ...form, tpo_alternate_mobile: e.target.value })}
                      placeholder="e.g. 044-24567890"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Alternate Email ID</label>
                    <input
                      type="email"
                      value={form.tpo_alternate_email}
                      onChange={(e) => setForm({ ...form, tpo_alternate_email: e.target.value })}
                      placeholder="e.g. tpo.office@college.edu.in"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Rankings & Package Stats */}
              <div className="bg-surface-sunken/50 border border-border/70 rounded-xl p-4 space-y-3.5">
                <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <TrendingUp size={14} />
                  <span>Rankings, Accreditations & Packages</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">NIRF Ranking</label>
                    <input
                      type="text"
                      value={form.nirf_ranking}
                      onChange={(e) => setForm({ ...form, nirf_ranking: e.target.value })}
                      placeholder="e.g. Rank 101-150 Band / Top 50"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Accreditations</label>
                    <input
                      type="text"
                      value={form.accreditations}
                      onChange={(e) => setForm({ ...form, accreditations: e.target.value })}
                      placeholder="e.g. NAAC A++, NBA, Tier-1 Autonomous"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Highest Package (Last Drive)</label>
                    <input
                      type="text"
                      value={form.highest_package_lpa}
                      onChange={(e) => setForm({ ...form, highest_package_lpa: e.target.value })}
                      placeholder="e.g. 12.5 LPA"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-micro font-bold text-fg-subtle mb-1">Lowest / Base Package</label>
                    <input
                      type="text"
                      value={form.lowest_package_lpa}
                      onChange={(e) => setForm({ ...form, lowest_package_lpa: e.target.value })}
                      placeholder="e.g. 3.5 LPA"
                      className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-primary outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Academic Programs (UG & PG Side-by-Side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* UG Programs Edit Card */}
                <div className="bg-blue-500/[0.04] dark:bg-blue-500/[0.06] border border-blue-500/25 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-blue-500/15 pb-2">
                      <h4 className="font-bold text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <GraduationCap size={15} className="text-blue-600 dark:text-blue-400" />
                        <span>Undergraduate (UG) Courses</span>
                      </h4>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono px-2 py-0.5 rounded-full bg-blue-500/15">
                        {form.ug_courses.length} courses
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[50px] max-h-48 overflow-y-auto custom-scrollbar p-0.5">
                      {form.ug_courses.length > 0 ? (
                        form.ug_courses.map((course) => (
                          <span
                            key={course}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-blue-200 dark:border-blue-800/60 text-fg text-micro font-semibold shadow-2xs group"
                          >
                            <span className="truncate max-w-[200px]">{course}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveUgCourse(course)}
                              className="text-fg-subtle hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                              title={`Remove ${course}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <p className="text-micro text-fg-subtle italic py-2">No UG courses added yet</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-blue-500/15">
                    <input
                      type="text"
                      value={newUgInput}
                      onChange={(e) => setNewUgInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddUgCourse();
                        }
                      }}
                      placeholder="e.g. B.Tech. – AI & DS"
                      className="flex-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddUgCourse}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      <Plus size={13} />
                      <span>Add UG</span>
                    </button>
                  </div>
                </div>

                {/* PG Programs Edit Card */}
                <div className="bg-purple-500/[0.04] dark:bg-purple-500/[0.06] border border-purple-500/25 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-purple-500/15 pb-2">
                      <h4 className="font-bold text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Award size={15} className="text-purple-600 dark:text-purple-400" />
                        <span>Postgraduate (PG) Courses</span>
                      </h4>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 font-mono px-2 py-0.5 rounded-full bg-purple-500/15">
                        {form.pg_courses.length} courses
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[50px] max-h-48 overflow-y-auto custom-scrollbar p-0.5">
                      {form.pg_courses.length > 0 ? (
                        form.pg_courses.map((course) => (
                          <span
                            key={course}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-purple-200 dark:border-purple-800/60 text-fg text-micro font-semibold shadow-2xs group"
                          >
                            <span className="truncate max-w-[200px]">{course}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePgCourse(course)}
                              className="text-fg-subtle hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                              title={`Remove ${course}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <p className="text-micro text-fg-subtle italic py-2">No PG courses added yet</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-purple-500/15">
                    <input
                      type="text"
                      value={newPgInput}
                      onChange={(e) => setNewPgInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPgCourse();
                        }
                      }}
                      placeholder="e.g. M.Tech. – AI & DS / MBA"
                      className="flex-1 bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg focus:border-purple-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPgCourse}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      <Plus size={13} />
                      <span>Add PG</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 5: Placement Operational Notes */}
              <div className="bg-surface-sunken/50 border border-border/70 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <FileText size={14} />
                  <span>Coordinator Placement Notes & Instructions</span>
                </h4>
                <textarea
                  rows={3}
                  value={form.special_notes}
                  onChange={(e) => setForm({ ...form, special_notes: e.target.value })}
                  placeholder="Special instructions for visiting companies, dress code, interview hall capacity, laptop lab setups, etc."
                  className="w-full bg-surface border border-border rounded-lg p-2.5 text-xs text-fg focus:border-primary outline-none resize-y"
                />
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               READ ONLY VIEW MODE
            ─────────────────────────────────────────────────────────────── */
            <div className="space-y-4">
              {/* 1. Placement Officer (TPO) Highlight Card */}
              <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-fg">
                        {cleanText(college?.tpo_name, 'Placement Officer')}
                      </h4>
                      <p className="text-[11px] text-fg-subtle">
                        {cleanText(college?.tpo_designation, 'Head - Placements & Corporate Relations')}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Primary TPO
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-emerald-500/15">
                  {/* Phone */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface/70 border border-border/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone size={13} className="text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-fg-subtle block">Mobile Number</span>
                        <span className="font-mono font-bold text-fg truncate block">
                          {cleanText(college?.tpo_contact_mobile, '—')}
                        </span>
                      </div>
                    </div>
                    {college?.tpo_contact_mobile && !college.tpo_contact_mobile.startsWith('#') && (
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`tel:${college.tpo_contact_mobile}`}
                          className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                          title="Call TPO"
                        >
                          <Phone size={12} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(college?.tpo_contact_mobile || '', 'TPO Mobile')}
                          className="p-1 rounded hover:bg-surface-raised text-fg-subtle hover:text-fg transition-colors"
                          title="Copy Mobile"
                        >
                          {copiedField === 'TPO Mobile' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface/70 border border-border/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail size={13} className="text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-fg-subtle block">Official Email</span>
                        <span className="font-mono text-xs font-semibold text-fg truncate block">
                          {cleanText(college?.tpo_email, '—')}
                        </span>
                      </div>
                    </div>
                    {college?.tpo_email && !college.tpo_email.startsWith('#') && (
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`mailto:${college.tpo_email}`}
                          className="p-1 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                          title="Email TPO"
                        >
                          <Mail size={12} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(college?.tpo_email || '', 'TPO Email')}
                          className="p-1 rounded hover:bg-surface-raised text-fg-subtle hover:text-fg transition-colors"
                          title="Copy Email"
                        >
                          {copiedField === 'TPO Email' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Alternate Phone */}
                  {college?.tpo_alternate_mobile && !college.tpo_alternate_mobile.startsWith('#') && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface/70 border border-border/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone size={13} className="text-fg-subtle shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-fg-subtle block">Desk / Alt Mobile</span>
                          <span className="font-mono font-medium text-fg truncate block">
                            {cleanText(college.tpo_alternate_mobile, '—')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(college.tpo_alternate_mobile || '', 'Alt Mobile')}
                        className="p-1 rounded hover:bg-surface-raised text-fg-subtle hover:text-fg transition-colors"
                        title="Copy Alt Mobile"
                      >
                        {copiedField === 'Alt Mobile' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}

                  {/* Alternate Email */}
                  {college?.tpo_alternate_email && !college.tpo_alternate_email.startsWith('#') && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-surface/70 border border-border/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail size={13} className="text-fg-subtle shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-fg-subtle block">Alt Email</span>
                          <span className="font-mono text-xs text-fg truncate block">
                            {cleanText(college.tpo_alternate_email, '—')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(college.tpo_alternate_email || '', 'Alt Email')}
                        className="p-1 rounded hover:bg-surface-raised text-fg-subtle hover:text-fg transition-colors"
                        title="Copy Alt Email"
                      >
                        {copiedField === 'Alt Email' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Key Package Grid (Highest & Lowest) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-sunken border border-border/80 text-center">
                  <span className="text-[10px] uppercase font-bold text-fg-subtle block mb-0.5">
                    Highest Package
                  </span>
                  <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {cleanText(college?.highest_package_lpa, '—')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-sunken border border-border/80 text-center">
                  <span className="text-[10px] uppercase font-bold text-fg-subtle block mb-0.5">
                    Lowest Package
                  </span>
                  <span className="text-base font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                    {cleanText(college?.lowest_package_lpa, '—')}
                  </span>
                </div>
              </div>

              {/* 3. Rankings & Accreditations */}
              <div className="p-3.5 rounded-xl bg-surface-sunken border border-border/80 space-y-2">
                <span className="text-micro font-bold text-primary uppercase flex items-center gap-1">
                  <Award size={13} />
                  <span>Rankings & Accreditations</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface/70 border border-border/60">
                    <span className="text-fg-subtle">NIRF Ranking:</span>
                    <span className="font-bold text-fg">{cleanText(college?.nirf_ranking, '—')}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-surface/70 border border-border/60">
                    <span className="text-fg-subtle">Accreditation:</span>
                    <span className="font-bold text-fg">{cleanText(college?.accreditations, 'Autonomous / NAAC A++')}</span>
                  </div>
                </div>
              </div>

              {/* 4. Academic Programs & Specializations (Side-by-Side 2-Column UG & PG) */}
              {(() => {
                const parsed = parseUgPgPrograms(college?.placement_notes, college?.departments);
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Undergraduate (UG) Card */}
                      <div className="p-4 rounded-xl bg-blue-500/[0.04] dark:bg-blue-500/[0.06] border border-blue-500/20 shadow-2xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 border-b border-blue-500/15 pb-2">
                            <span className="text-micro font-bold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1.5 tracking-wider">
                              <GraduationCap size={15} className="text-blue-600 dark:text-blue-400" />
                              <span>Undergraduate (UG) Programs</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/15 text-blue-700 dark:text-blue-300">
                              {parsed.ugCourses.length} {parsed.ugCourses.length === 1 ? 'Course' : 'Courses'}
                            </span>
                          </div>

                          {parsed.ugCourses.length > 0 ? (
                            <div className="space-y-1.5 pt-0.5">
                              {parsed.ugCourses.map((course, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-surface/90 border border-border/80 text-xs font-medium text-fg shadow-2xs hover:border-blue-500/40 transition-colors"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                  <span className="leading-snug">{course}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-fg-subtle italic py-2">No UG programs listed</p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-blue-500/10 text-[10px] font-semibold text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider">
                          Bachelor Degrees • Engineering & Technology
                        </div>
                      </div>

                      {/* Postgraduate (PG) Card */}
                      <div className="p-4 rounded-xl bg-purple-500/[0.04] dark:bg-purple-500/[0.06] border border-purple-500/20 shadow-2xs space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2 border-b border-purple-500/15 pb-2">
                            <span className="text-micro font-bold text-purple-700 dark:text-purple-300 uppercase flex items-center gap-1.5 tracking-wider">
                              <Award size={15} className="text-purple-600 dark:text-purple-400" />
                              <span>Postgraduate (PG) Programs</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/15 text-purple-700 dark:text-purple-300">
                              {parsed.pgCourses.length} {parsed.pgCourses.length === 1 ? 'Course' : 'Courses'}
                            </span>
                          </div>

                          {parsed.pgCourses.length > 0 ? (
                            <div className="space-y-1.5 pt-0.5">
                              {parsed.pgCourses.map((course, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-surface/90 border border-border/80 text-xs font-medium text-fg shadow-2xs hover:border-purple-500/40 transition-colors"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                  <span className="leading-snug">{course}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-fg-subtle italic py-2">No PG programs listed</p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-purple-500/10 text-[10px] font-semibold text-purple-600/80 dark:text-purple-400/80 uppercase tracking-wider">
                          Master Degrees • Management & Advanced Tech
                        </div>
                      </div>
                    </div>

                    {/* 5. Creative Interactive Campus Map & Address View */}
                    <div className="rounded-xl bg-surface-sunken border border-border/80 overflow-hidden shadow-2xs space-y-0">
                      {/* Map View Header Bar */}
                      <div className="px-4 py-2.5 bg-surface-raised/70 border-b border-border/70 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="text-micro font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1 tracking-wider">
                            <MapPin size={13} />
                            <span>Address & Live Campus Map</span>
                          </span>
                        </div>

                        {/* Map Controls */}
                        <div className="flex items-center gap-1.5">
                          {/* Roadmap / Satellite Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setMapType((prev) => (prev === 'roadmap' ? 'satellite' : 'roadmap'));
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-surface hover:bg-surface-raised border border-border text-fg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title="Toggle between Street Roadmap and Satellite Drone View"
                          >
                            <Layers size={11} className="text-primary" />
                            <span>{mapType === 'satellite' ? 'Satellite' : 'Roadmap'}</span>
                          </button>

                          {/* Expand / Collapse Map */}
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setIsMapExpanded((prev) => !prev);
                            }}
                            className="p-1 rounded-lg bg-surface hover:bg-surface-raised border border-border text-fg-subtle hover:text-fg shadow-2xs transition-colors cursor-pointer"
                            title={isMapExpanded ? 'Collapse Map' : 'Expand Map View'}
                          >
                            {isMapExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                          </button>
                        </div>
                      </div>

                      {/* Live Google Map Interactive Iframe */}
                      <div className={`relative w-full bg-zinc-100 dark:bg-zinc-900 transition-all duration-300 ${isMapExpanded ? 'h-72' : 'h-44'}`}>
                        <iframe
                          title="Campus Map Location"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(getMapEmbedQuery())}&t=${mapType === 'satellite' ? 'k' : 'm'}&z=15&ie=UTF8&iwloc=&output=embed`}
                          className="w-full h-full border-0"
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>

                      {/* Address Description & Action Bar */}
                      <div className="p-3.5 bg-surface border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-fg font-medium leading-relaxed">
                            {college?.address || college?.landmarks || college?.location || 'Tamil Nadu, India'}
                          </p>
                        </div>

                        {/* Copy Address Button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(college?.address || college?.landmarks || college?.location || '', 'Address')}
                          className="p-1.5 rounded-lg bg-surface-sunken hover:bg-surface-raised border border-border text-fg-subtle hover:text-fg transition-colors cursor-pointer shadow-2xs shrink-0"
                          title="Copy Address to clipboard"
                        >
                          {copiedField === 'Address' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* 6. Special Notes & Instructions (only if non-program notes exist) */}
                    {parsed.specialNotes ? (
                      <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1">
                        <span className="text-micro font-bold text-amber-800 dark:text-amber-300 uppercase flex items-center gap-1">
                          <FileText size={13} />
                          <span>Special Notes & Instructions</span>
                        </span>
                        <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-wrap">
                          {parsed.specialNotes}
                        </p>
                      </div>
                    ) : null}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-5 py-3 border-t border-border/80 bg-surface-sunken/60 flex items-center justify-between gap-3 shrink-0">
          <span className="text-micro text-fg-subtle">
            {isEditing ? 'Editing college dossier' : `Institutional Reference • ${college?.college_code || ''}`}
          </span>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-fg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.5} />}
                  <span>Save Changes</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsEditing(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-border text-fg text-xs font-bold shadow-2xs hover:shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 size={13} className="text-primary" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
