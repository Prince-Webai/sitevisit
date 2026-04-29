'use client';

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HistoryFilters } from '@/components/history/history-filters';
import { HistoryTable } from '@/components/history/history-table';
import { AuditLog } from '@/components/history/audit-log';
import { jobService } from '@/lib/supabase/service';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2 } from 'lucide-react';
import type { Job } from '@/lib/types';

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('All');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [allHistoryJobs, setAllHistoryJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      if (!user || !profile) return;
      setLoading(true);
      try {
        const jobs = await jobService.fetchJobs({
          role: profile.role,
          userId: user.id,
          statuses: ['Completed', 'Cancelled', 'Unsuccessful', 'Archived']
        });
        setAllHistoryJobs(jobs);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) loadHistory();
  }, [user, profile, authLoading]);

  // Apply frontend filters
  const filteredJobs = useMemo(() => {
    let jobs = allHistoryJobs;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      jobs = jobs.filter(j =>
        j.job_number.toLowerCase().includes(q) ||
        (j.client?.first_name || '').toLowerCase().includes(q) ||
        (j.client?.last_name || '').toLowerCase().includes(q) ||
        j.address.toLowerCase().includes(q) ||
        (j.system_size || '').toLowerCase().includes(q) ||
        (j.description || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter.length > 0) {
      jobs = jobs.filter(j => statusFilter.includes(j.status));
    }

    // Date range filter
    if (dateRange !== 'All') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let startDate: Date;

      switch (dateRange) {
        case 'Today':
          startDate = today;
          break;
        case 'Yesterday':
          startDate = new Date(today.getTime() - 86400000);
          break;
        case 'Last 7 Days':
          startDate = new Date(today.getTime() - 7 * 86400000);
          break;
        case 'This Month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0);
      }

      jobs = jobs.filter(j => {
        const date = (j.completed_date || j.updated_at) ? new Date(j.completed_date || j.updated_at) : null;
        return date && date >= startDate;
      });
    }

    return jobs;
  }, [allHistoryJobs, search, statusFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const paginatedJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading || authLoading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-charcoal">History</h1>
        <p className="text-sm text-dark-gray mt-0.5">View completed jobs, invoices, and activity logs</p>
      </div>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="bg-off-white border border-light-gray p-1">
          <TabsTrigger
            value="jobs"
            className="data-[state=active]:bg-white data-[state=active]:text-charcoal data-[state=active]:shadow-sm px-6"
          >
            Job History
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-white data-[state=active]:text-charcoal data-[state=active]:shadow-sm px-6"
          >
            Recent Changes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4 mt-0">
          <HistoryFilters
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            dateRange={dateRange}
            onDateRangeChange={(v) => { setDateRange(v); setPage(1); }}
            statusFilter={statusFilter}
            onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
          />

          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium text-mid-gray">
              {filteredJobs.length} record{filteredJobs.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-light-gray shadow-sm overflow-hidden">
            <HistoryTable
              jobs={paginatedJobs}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <div className="bg-white border border-light-gray rounded-2xl shadow-sm py-4 overflow-hidden">
            <div className="px-6 pb-4 border-b border-light-gray mb-4">
              <p className="text-sm font-bold text-charcoal">Account Activity Log</p>
              <p className="text-xs text-mid-gray mt-1">Real-time view of all significant system changes.</p>
            </div>
            <AuditLog />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
