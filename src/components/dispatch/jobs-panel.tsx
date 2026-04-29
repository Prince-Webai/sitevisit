'use client';

import { useState, useEffect } from 'react';
import { Search, X, GripVertical, MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { jobService } from '@/lib/supabase/service';
import { useAuth } from '@/components/providers/auth-provider';
import type { Job } from '@/lib/types';

interface JobsPanelProps {
  onJobDoubleClick: (jobId: string) => void;
  refreshKey?: number;
}

function JobCard({ job, onDoubleClick }: { job: Job; onDoubleClick: () => void }) {
  const statusColors: Record<string, string> = {
    'Quote': 'bg-secondary',
    'Quote Sent': 'bg-secondary',
    'Lead': 'bg-secondary',
    'Work Order': 'bg-blue-500',
    'In Progress': 'bg-primary',
    'Completed': 'bg-primary',
  };
  const dotColor = statusColors[job.status] || 'bg-mid-gray';

  const statusLetters: Record<string, { letter: string; bg: string; text: string }> = {
    'Quote': { letter: 'Q', bg: 'bg-secondary', text: 'text-white' },
    'Quote Sent': { letter: 'Q', bg: 'bg-secondary', text: 'text-white' },
    'Lead': { letter: 'Q', bg: 'bg-secondary', text: 'text-white' },
    'Work Order': { letter: 'W', bg: 'bg-blue-500', text: 'text-white' },
    'In Progress': { letter: 'W', bg: 'bg-blue-500', text: 'text-white' },
    'Completed': { letter: 'C', bg: 'bg-primary', text: 'text-white' },
  };
  const badge = statusLetters[job.status] || { letter: '?', bg: 'bg-mid-gray', text: 'text-white' };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', job.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={onDoubleClick} // Enable single tap for mobile
      className="px-3 py-3 border-b border-light-gray hover:bg-off-white transition-colors cursor-grab active:cursor-grabbing group active:bg-off-white"
    >
      <div className="flex items-start gap-3">
        {/* Status badge circle */}
        <div className={`w-9 h-9 rounded-xl ${badge.bg} ${badge.text} flex items-center justify-center text-xs font-black shrink-0 shadow-sm border border-white/20`}>
          {badge.letter}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-charcoal truncate">
              {job.client?.first_name} {job.client?.last_name}
            </p>
            <span className="text-[10px] text-mid-gray font-bold ml-2 shrink-0">#{job.job_number.replace('TN-', '')}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-mid-gray/60 shrink-0" />
            <p className="text-xs text-mid-gray truncate leading-tight">{job.address}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
            <p className="text-[10px] text-dark-gray font-medium uppercase tracking-tight truncate">
              {job.status} • {job.description?.substring(0, 40)}
            </p>
          </div>
          
          <div className="hidden lg:flex mt-2 items-center text-[9px] text-primary font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-3 h-3 mr-0.5" />
            Drag to schedule
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobsPanel({ onJobDoubleClick, refreshKey }: JobsPanelProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All Jobs');

  useEffect(() => {
    let isMounted = true;
    async function loadJobs() {
      if (!user || !profile) return;
      try {
        const data = await jobService.fetchJobs({
          role: profile.role,
          userId: user.id
        });
        if (isMounted) setJobs(data);
      } catch (error) {
        console.error('Failed to load jobs');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (!authLoading) loadJobs();
    return () => { isMounted = false; };
  }, [refreshKey, user, profile, authLoading]);

  const filteredJobs = jobs.filter(j => {
    if (filter === 'Quotes' && j.status !== 'Lead') return false;
    if (filter === 'Work Orders' && j.status !== 'Work Order') return false;
    if (filter === 'Completed' && j.status !== 'Completed') return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        j.job_number.toLowerCase().includes(q) ||
        (j.client?.first_name?.toLowerCase() ?? '').includes(q) ||
        (j.client?.last_name?.toLowerCase() ?? '').includes(q) ||
        (j.address?.toLowerCase() ?? '').includes(q) ||
        (j.description && j.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="w-full lg:w-[300px] bg-white lg:border-l border-light-gray flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-light-gray shrink-0 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-charcoal">Unscheduled Jobs</h3>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{filteredJobs.length}</span>
        </div>

        <div className="space-y-2">
          {/* Filter */}
          <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
            <SelectTrigger className="h-9 text-xs bg-off-white border-light-gray/60 shadow-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Jobs">All Types</SelectItem>
              <SelectItem value="Quotes">Quotes & Leads</SelectItem>
              <SelectItem value="Work Orders">Work Orders</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mid-gray" />
            <Input
              id="jobs-panel-search"
              placeholder="Search by name, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-off-white border-light-gray/60 shadow-sm focus-visible:ring-primary/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mid-gray hover:text-charcoal transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Job Cards */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 lg:pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-12 h-12 rounded-full bg-off-white flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 text-mid-gray/40" />
            </div>
            <p className="text-xs font-bold text-mid-gray">No matching jobs found</p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onDoubleClick={() => onJobDoubleClick(job.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
