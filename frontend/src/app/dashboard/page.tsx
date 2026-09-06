'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardHeader, DashboardRole } from './components/DashboardHeader';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { TeamLeaderDashboard } from './components/TeamLeaderDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { apiFetch } from '@/lib/api';
import { readSessionUser, roleOf } from '@/lib/session';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface AutoSyncAlert {
  _id: string;
  title: string;
  message: string;
  action_url?: string | null;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [role, setRole] = useState<DashboardRole>('coordinator');
  const [coordinatorId, setCoordinatorId] = useState<string | null>(null);
  const [sessionRead, setSessionRead] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoSyncAlert, setAutoSyncAlert] = useState<AutoSyncAlert | null>(null);

  // Identity comes from the signed-in session, not a hardcoded id: two
  // coordinators on the same machine must never see each other's work.
  useEffect(() => {
    const user = readSessionUser();
    setRole(roleOf(user));
    setCoordinatorId(user?._id ?? null);
    setSessionRead(true);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint =
        role === 'team_leader'
          ? '/dashboard/team-leader'
          : role === 'admin'
          ? '/dashboard/admin'
          : `/dashboard/coordinator${coordinatorId ? `?coordinator_id=${coordinatorId}` : ''}`;

      const res = await apiFetch(endpoint);
      if (res.success && res.data) {
        setDashboardData(res.data);
      } else {
        // Graceful fallback data so the dashboard is immediately accessible
        setDashboardData((prev: any) => prev || {
          greeting: {
            greeting: 'Welcome To iPOMS',
            period: 'morning',
            subtext: 'Real-time corporate outreach, drive schedules, and active institutional pipelines across partner colleges.',
          },
          kpi_summary: {
            calls_completed: 0,
            calls_assigned: 30,
            contacts_reached: 0,
            emails_sent: 0,
            leads_converted: 0,
            drives_confirmed: 0,
            pending_callbacks: 0,
            funnel_stages: [],
          },
          assigned_work: [],
          priority_college: null,
          today_tasks: [],
        });
        if (res.error?.message) {
          toast(res.error.message, 'info');
        }
      }
    } catch {
      // Offline / Network fallback
      setDashboardData((prev: any) => prev || {
        greeting: {
          greeting: 'Welcome To iPOMS',
          period: 'morning',
          subtext: 'Real-time corporate outreach, drive schedules, and active institutional pipelines across partner colleges.',
        },
        kpi_summary: {
          calls_completed: 0,
          calls_assigned: 30,
          contacts_reached: 0,
          emails_sent: 0,
          leads_converted: 0,
          drives_confirmed: 0,
          pending_callbacks: 0,
          funnel_stages: [],
        },
        assigned_work: [],
        priority_college: null,
        today_tasks: [],
      });
    } finally {
      setLoading(false);
    }
  }, [role, coordinatorId, toast]);

  // Waits for the session read so the first request already carries the right
  // identity — firing early would fetch one dashboard and then replace it.
  useEffect(() => {
    if (sessionRead) loadDashboard();
  }, [sessionRead, loadDashboard]);

  // Auto-sync review prompt: a coordinator's positive Daily Tracker calls that
  // went unsynced past 10 PM get auto-synced overnight (see
  // backend/src/jobs/positiveSyncReminder.ts) and raise a Notification here —
  // shown once, next morning, on the coordinator's own dashboard.
  useEffect(() => {
    if (!sessionRead || role !== 'coordinator' || !coordinatorId) return;
    (async () => {
      const res = await apiFetch(`/notifications?user_id=${coordinatorId}&tab=unread`);
      if (!res.success || !res.data) return;
      const list = (res.data as any).notifications as any[];
      const match = list?.find(
        (n) => n.action_url === '/weekly-tracker' && n.notification_type === 'reminder' && n.requires_acknowledgment
      );
      if (match) {
        setAutoSyncAlert({ _id: match._id, title: match.title, message: match.message, action_url: match.action_url });
      }
    })();
  }, [sessionRead, role, coordinatorId]);

  const acknowledgeAutoSyncAlert = useCallback(async () => {
    if (!autoSyncAlert || !coordinatorId) return;
    await apiFetch(`/notifications/${autoSyncAlert._id}/acknowledge`, {
      method: 'PATCH',
      body: JSON.stringify({ user_id: coordinatorId, response: 'acknowledged' }),
    });
  }, [autoSyncAlert, coordinatorId]);

  const handleAutoSyncReview = useCallback(async () => {
    const url = autoSyncAlert?.action_url || '/weekly-tracker';
    await acknowledgeAutoSyncAlert();
    setAutoSyncAlert(null);
    router.push(url);
  }, [autoSyncAlert, acknowledgeAutoSyncAlert, router]);

  const handleAutoSyncDismiss = useCallback(async () => {
    await acknowledgeAutoSyncAlert();
    setAutoSyncAlert(null);
  }, [acknowledgeAutoSyncAlert]);

  /** Signature feature: Metadata Merge Engine (Spec Section 12). */
  const handleLoadToMetadata = async (assignmentId: string) => {
    const res = await apiFetch(`/assigned-work/${assignmentId}/load-to-metadata`, { method: 'POST' });
    if (res.success) {
      toast(res.message || 'Contact merged into the Metadata Database.', 'success');
      loadDashboard();
    } else {
      toast(res.error?.message || 'Metadata merge failed.', 'error');
    }
  };

  /** Mark assignment completed (Spec Sections 9 & 10). */
  const handleMarkComplete = async (assignmentId: string) => {
    const res = await apiFetch(`/assigned-work/${assignmentId}/complete`, { method: 'PATCH' });
    if (res.success) {
      toast('Assignment marked done.', 'success');
      loadDashboard();
    } else {
      toast(res.error?.message || 'Could not complete the assignment.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-fg">
      <DashboardHeader />

      {loading && !dashboardData ? (
        <DashboardSkeleton />
      ) : (
        <>
          {role === 'coordinator' && (
            <CoordinatorDashboard
              data={dashboardData}
              onLoadToMetadata={handleLoadToMetadata}
              onMarkComplete={handleMarkComplete}
            />
          )}
          {role === 'team_leader' && (
            <TeamLeaderDashboard data={dashboardData} onRefresh={loadDashboard} />
          )}
          {role === 'admin' && <AdminDashboard data={dashboardData} onRefresh={loadDashboard} />}
        </>
      )}

      {autoSyncAlert && (
        <Modal
          open
          onClose={handleAutoSyncDismiss}
          title={autoSyncAlert.title}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={handleAutoSyncDismiss}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAutoSyncReview}>
                OK, review now
              </Button>
            </>
          }
        >
          <p className="text-body text-fg-subtle leading-relaxed">{autoSyncAlert.message}</p>
        </Modal>
      )}
    </div>
  );
}
