'use client';

import { useCallback, useEffect, useState } from 'react';

import { DashboardHeader, DashboardRole } from './components/DashboardHeader';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { TeamLeaderDashboard } from './components/TeamLeaderDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { apiFetch } from '@/lib/api';
import { readSessionUser, roleOf } from '@/lib/session';
import { useToast } from '@/components/ui/Toast';

export default function DashboardPage() {
  const { toast } = useToast();

  const [role, setRole] = useState<DashboardRole>('coordinator');
  const [coordinatorId, setCoordinatorId] = useState<string | null>(null);
  const [sessionRead, setSessionRead] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      <DashboardHeader
        greetingData={dashboardData?.greeting}
        callsCompleted={dashboardData?.kpi_summary?.calls_completed}
        callsTarget={dashboardData?.kpi_summary?.calls_assigned}
      />

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
          {role === 'admin' && <AdminDashboard data={dashboardData} />}
        </>
      )}
    </div>
  );
}
