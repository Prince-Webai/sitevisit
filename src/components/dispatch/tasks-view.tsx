import { useState, useEffect } from 'react';
import { jobService } from '@/lib/supabase/service';
import { useAuth } from '@/components/providers/auth-provider';
import type { Job } from '@/lib/types';

interface TasksViewProps {
  onJobClick: (jobId: string) => void;
  refreshKey?: number;
}

import { useDispatchData } from '@/components/providers/dispatch-provider';

export function TasksView({ onJobClick }: TasksViewProps) {
  const { jobs, loading } = useDispatchData();


  const jobsWithTasks = jobs.filter(j =>
    !['Completed', 'Cancelled', 'Archived'].includes(j.status)
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Table Header (Desktop Only) */}
      <div className="hidden md:grid grid-cols-6 bg-off-white border-b border-light-gray text-[11px] uppercase tracking-wider text-mid-gray font-bold">
        <div className="px-4 py-3 col-span-1">Task ▾</div>
        <div className="px-4 py-3">Customer</div>
        <div className="px-4 py-3">Job #</div>
        <div className="px-4 py-3">Staff Member</div>
        <div className="px-4 py-3">Due Date</div>
        <div className="px-4 py-3">Task Status</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {jobsWithTasks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-mid-gray italic px-6">
              Tasks will show here when they&apos;re assigned to a Staff member in a job&apos;s checklist
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {jobsWithTasks.map(job => (
              <div
                key={job.id}
                onClick={() => onJobClick(job.id)}
                className="group cursor-pointer border-b border-light-gray hover:bg-off-white/40 transition-colors"
              >
                {/* Desktop Grid Layout */}
                <div className="hidden md:grid grid-cols-6 items-center">
                  <div className="px-4 py-4 col-span-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate" title={job.description || ''}>
                      {job.description || 'No description'}
                    </p>
                  </div>
                  <div className="px-4 py-4 min-w-0">
                    <p className="text-sm text-dark-gray truncate">{job.client?.first_name} {job.client?.last_name}</p>
                  </div>
                  <div className="px-4 py-4 min-w-0">
                    <span className="text-sm font-bold text-primary">{job.job_number}</span>
                  </div>
                  <div className="px-4 py-4 min-w-0">
                    <p className="text-sm text-dark-gray">
                      {job.assigned_to ? 'Assigned' : '—'}
                    </p>
                  </div>
                  <div className="px-4 py-4 min-w-0">
                    <p className="text-sm text-dark-gray">
                      {job.scheduled_date
                        ? new Date(job.scheduled_date).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'
                      }
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      job.status === 'Work Order' ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : job.status === 'Completed' ? 'bg-primary/10 text-primary-dark border border-primary/20'
                      : job.status === 'Site Visit' ? 'bg-secondary/10 text-secondary-dark border border-secondary/20'
                      : 'bg-off-white text-mid-gray border border-light-gray'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-xs font-bold text-primary mb-0.5">{job.job_number}</p>
                      <p className="text-sm font-bold text-charcoal truncate">{job.client?.first_name} {job.client?.last_name}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      job.status === 'Work Order' ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : job.status === 'Completed' ? 'bg-primary/10 text-primary-dark border border-primary/20'
                      : job.status === 'Site Visit' ? 'bg-secondary/10 text-secondary-dark border border-secondary/20'
                      : 'bg-off-white text-mid-gray border border-light-gray'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs text-dark-gray line-clamp-2 leading-relaxed bg-off-white/50 p-2 rounded-lg italic">
                    {job.description || 'No description provided for this task.'}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-light-gray" />
                      <p className="text-[10px] text-mid-gray font-bold uppercase tracking-tighter">
                        Due: {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <p className="text-[10px] text-mid-gray font-bold uppercase tracking-tighter">
                      Staff: {job.assigned_to ? 'Assigned' : 'Unassigned'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
