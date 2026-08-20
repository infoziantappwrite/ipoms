'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardHeader, DashboardRole } from './components/DashboardHeader';
import { CoordinatorDashboard } from './components/CoordinatorDashboard';
import { TeamLeaderDashboard } from './components/TeamLeaderDashboard';
import { AdminDashboard } from './components/AdminDashboard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function DashboardPage() {
  const [role, setRole] = useState<DashboardRole>('coordinator');

  // Derive role from stored user object on first render
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('ipoms_user');
      if (!stored) return;
      const user = JSON.parse(stored);
      const codes: string[] = user.role_codes ?? [];
      if (codes.includes('ADMINISTRATOR') || codes.includes('ADMIN')) setRole('admin');
      else if (codes.includes('TEAM_LEADER')) setRole('team_leader');
      else setRole('coordinator');
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Default Coordinator ID (will come from JWT session)
  const COORDINATOR_ID = '6a84719afa3bf51271bc1548';

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = `${API}/dashboard/coordinator?coordinator_id=${COORDINATOR_ID}`;
      if (role === 'team_leader') endpoint = `${API}/dashboard/team-leader`;
      if (role === 'admin') endpoint = `${API}/dashboard/admin`;

      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Signature Feature: Metadata Merge Engine (Spec Section 12)
  const handleLoadToMetadata = async (assignmentId: string) => {
    try {
      const res = await fetch(`${API}/assigned-work/${assignmentId}/load-to-metadata`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        alert(`⚡ Contact successfully merged into Metadata Database! (${data.message})`);
        loadDashboard();
      } else {
        alert(data.error?.message || 'Metadata merge failed');
      }
    } catch (err) {
      console.error('Load to metadata error:', err);
    }
  };

  // Mark Assignment Completed (Spec Section 9 & 10)
  const handleMarkComplete = async (assignmentId: string) => {
    try {
      const res = await fetch(`${API}/assigned-work/${assignmentId}/complete`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        loadDashboard();
      } else {
        alert(data.error?.message || 'Failed to complete assignment');
      }
    } catch (err) {
      console.error('Complete assignment error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-fg flex flex-col selection:bg-primary selection:text-white">

      {/* ── Top Header & Role Switcher ────────────────────────────────────── */}
      <DashboardHeader
        greetingData={dashboardData?.greeting}
      />

      {/* ── Role Views ────────────────────────────────────────────────────── */}
      {role === 'coordinator' && (
        <CoordinatorDashboard
          data={dashboardData}
          onLoadToMetadata={handleLoadToMetadata}
          onMarkComplete={handleMarkComplete}
        />
      )}

      {role === 'team_leader' && (
        <TeamLeaderDashboard
          data={dashboardData}
          onRefresh={loadDashboard}
        />
      )}

      {role === 'admin' && (
        <AdminDashboard
          data={dashboardData}
        />
      )}

    </div>
  );
}
