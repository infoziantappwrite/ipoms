'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Building2,
  Search,
  Users,
  Database,
  Calendar,
  LogOut,
  Sparkles,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Company {
  _id: string;
  serial_number: number;
  company_name: string;
  hr_name: string;
  primary_mobile: string;
  primary_email: string;
  company_type: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(3550);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('ipoms_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const fetchCompanies = async (query = '', pageNum = 1) => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/v1/companies/search', {
        params: {
          q: query,
          page: pageNum,
          limit: 25,
        },
      });

      if (res.data.success) {
        setCompanies(res.data.data.companies);
        setTotalPages(res.data.data.pagination.totalPages);
        setTotalCount(res.data.data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCompanies(searchQuery, page);
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, page]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ipoms_token');
      localStorage.removeItem('ipoms_user');
    }
    router.push('/');
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'software':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'construction':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'pharma':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'banking':
      case 'finance':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'core_engineering':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-slate-700/30 text-slate-400 border-slate-700/50';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              INFOZIANT <span className="text-blue-400 font-extrabold">iPOMS</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                Version 1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">Master Company Database & Placement CRM</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-3 bg-slate-800/60 px-3.5 py-1.5 rounded-xl border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-300 font-medium">
              {user?.fullName || 'Administrator'}
            </span>
            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded uppercase font-bold">
              {user?.roles?.[0] || 'ADMIN'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* KPI Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Master Database</p>
              <p className="text-2xl font-bold text-white mt-1">{totalCount.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Indexed in MongoDB
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Database className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Academic Batch</p>
              <p className="text-2xl font-bold text-white mt-1">2026–2027</p>
              <p className="text-[11px] text-blue-400 mt-1">Active Reporting Cycle</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Governance</p>
              <p className="text-2xl font-bold text-white mt-1">4 Roles</p>
              <p className="text-[11px] text-emerald-400 mt-1">RBAC Active</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Coordinators</p>
              <p className="text-2xl font-bold text-white mt-1">15–20 Team</p>
              <p className="text-[11px] text-slate-400 mt-1">~3 Colleges / Member</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Master Search & Filter Toolbar */}
        <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by company, HR name, phone, or email..."
              className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => fetchCompanies(searchQuery, page)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-2 border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">S.No</th>
                  <th className="py-3.5 px-6">Company Name</th>
                  <th className="py-3.5 px-6">HR Contact</th>
                  <th className="py-3.5 px-6">Mobile Number</th>
                  <th className="py-3.5 px-6">Email Address</th>
                  <th className="py-3.5 px-4 text-center">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {companies.length > 0 ? (
                  companies.map((c, idx) => (
                    <tr
                      key={c._id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4 text-center text-slate-500 font-mono">
                        {(page - 1) * 25 + idx + 1}
                      </td>
                      <td className="py-3 px-6 font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {c.company_name}
                      </td>
                      <td className="py-3 px-6 text-slate-300">
                        {c.hr_name || <span className="text-slate-600 italic">—</span>}
                      </td>
                      <td className="py-3 px-6 text-slate-300">
                        {c.primary_mobile ? (
                          <span className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {c.primary_mobile}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-slate-300">
                        {c.primary_email ? (
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {c.primary_email}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium border uppercase tracking-wider ${getBadgeColor(
                            c.company_type
                          )}`}
                        >
                          {c.company_type || 'OTHER'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      {isLoading ? 'Loading companies from MongoDB...' : 'No companies found matching your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="bg-slate-950/80 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-medium">{(page - 1) * 25 + 1}</span> to{' '}
              <span className="text-white font-medium">
                {Math.min(page * 25, totalCount)}
              </span>{' '}
              of <span className="text-white font-medium">{totalCount.toLocaleString()}</span> companies
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 bg-slate-800/80 rounded-lg text-white font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
