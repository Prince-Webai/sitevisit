'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { jobService } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import type { Job } from '@/lib/types';

const VIEWS = ['Day', 'Week', '2 weeks', 'Month'] as const;

interface StaffScheduleViewProps {
  onJobClick: (jobId: string) => void;
  onScheduleUpdate?: () => void;
}

import { useDispatchData } from '@/components/providers/dispatch-provider';

export function StaffScheduleView({ onJobClick, onScheduleUpdate }: StaffScheduleViewProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const { jobs, staffProfiles, loading: providerLoading, refresh } = useDispatchData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView]                 = useState<string>('Day');
  const [dragOverRow, setDragOverRow]   = useState<string | null>(null);
  const [dragSlot, setDragSlot]         = useState<number | null>(null);
  
  const staffMembers = useMemo(() => {
    const seen = new Set();
    return (staffProfiles || [])
      .filter((p: any) => ['Engineer', 'Technician'].includes(p.role)) // Only show Engineers/Technicians
      .filter((p: any) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
  }, [staffProfiles]);

  const loading = providerLoading || authLoading;

  const gridRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Dynamically generate columns based on view
  const columns = useMemo(() => {
    if (view === 'Day') {
      return Array.from({ length: 12 }).map((_, i) => {
        const h = 7 + i;
        const label = h > 12 ? `${h - 12} pm` : h === 12 ? '12 pm' : `${h} am`;
        const date = new Date(selectedDate);
        date.setHours(h, 0, 0, 0);
        return { label, date, isDay: false };
      });
    }
    
    const daysCount = view === 'Week' ? 7 : view === '2 weeks' ? 14 : 30;
    const cols = [];
    let startDate = new Date(selectedDate);
    if (view === 'Month') {
      startDate.setDate(1);
    } else {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
    }

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      cols.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        date: d,
        isDay: true
      });
    }
    return cols;
  }, [view, selectedDate]);

  const isTimeView = view === 'Day';
  const COL_WIDTH = isTimeView ? 90 : 120;
  const STAFF_COL_W = 100; // Reduced for mobile



  const dateLabelShort = selectedDate.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short'
  });
  
  const dateLabelFull = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  const prevDay = () => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  const nextDay = () => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  const goToday = () => setSelectedDate(new Date());

  const clientXToSlot = useCallback((clientX: number): number => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const scrollLeft = gridRef.current.scrollLeft;
    const x = clientX - rect.left + scrollLeft - STAFF_COL_W;
    const idx = Math.floor(x / COL_WIDTH);
    return Math.max(0, Math.min(columns.length - 1, idx));
  }, [columns.length, COL_WIDTH, STAFF_COL_W]);

  const handleRowDragOver = useCallback((e: React.DragEvent, staffId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRow(staffId);
    setDragSlot(clientXToSlot(e.clientX));
  }, [clientXToSlot]);

  const handleRowDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverRow(null);
      setDragSlot(null);
    }
  }, []);

  const handleRowDrop = useCallback(async (e: React.DragEvent, staffId: string) => {
    e.preventDefault();
    setDragOverRow(null);
    setDragSlot(null);

    const jobId = e.dataTransfer.getData('text/plain');
    if (!jobId) {
      toast.error('Could not read job. Try again.');
      return;
    }

    const slotIndex = clientXToSlot(e.clientX);
    const col = columns[slotIndex];
    if (!col) return;

    const scheduledDate = new Date(col.date);
    if (col.isDay) {
      scheduledDate.setHours(9, 0, 0, 0);
    }

    try {
      const assignedJob = await jobService.assignJob(jobId, staffId, scheduledDate.toISOString());
      
      // Log activity
      if (user) {
        // Find staff name
        const staff = staffMembers.find(s => s.id === staffId);
        await jobService.logActivity({
          userId: user.id,
          action: 'assigned',
          entityType: 'job',
          entityId: jobId,
          details: `Allocated to ${staff?.full_name || 'Staff member'} for ${col.label}`
        });
      }

      refresh();
      toast.success(`Assigned at ${col.label}`);
      onScheduleUpdate?.();
    } catch (err) {
      console.error('Assign error:', err);
      toast.error('Failed to assign job.');
    }
  }, [clientXToSlot, columns, onScheduleUpdate]);

  const getSlotIndex = useCallback((job: Job) => {
    if (!job.scheduled_date) return -1;
    const d = new Date(job.scheduled_date);
    
    if (isTimeView) {
      if (d.toDateString() !== selectedDate.toDateString()) return -1;
      const localHour = d.getHours();
      return Math.max(0, Math.min(columns.length - 1, localHour - 7));
    } else {
      return columns.findIndex(c => c.date.toDateString() === d.toDateString());
    }
  }, [isTimeView, selectedDate, columns]);

  const getJobsForStaff = useCallback((staffId: string) =>
    jobs.filter(j => {
      if (!j.assigned_to || !j.scheduled_date || j.assigned_to !== staffId) return false;
      return getSlotIndex(j) >= 0;
    }), [jobs, getSlotIndex]);

  const getDuration = (job: Job) => {
    if (!isTimeView) return 1;
    return job.estimated_hours ? Math.max(1, Math.ceil(Number(job.estimated_hours))) : 1;
  };

  const removeAssignment = async (jobId: string) => {
    try {
      await jobService.updateJob(jobId, { assigned_to: null as any, scheduled_date: null as any });
      refresh();
      toast.success('Assignment removed');
      onScheduleUpdate?.();
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* ── Compact Responsive Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 border-b border-light-gray bg-white shrink-0 gap-3">
        
        {/* Date & Nav Group */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-off-white rounded-lg p-0.5 border border-light-gray/60">
            <button onClick={prevDay} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all active:scale-90">
              <ChevronLeft className="w-4 h-4 text-dark-gray" />
            </button>
            <Popover>
              <PopoverTrigger className="px-2 py-1.5 text-xs font-bold text-charcoal flex items-center gap-1.5 hover:bg-white rounded-md transition-all">
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                <span className="hidden xs:inline">{dateLabelFull}</span>
                <span className="xs:hidden">{dateLabelShort}</span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
            <button onClick={nextDay} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all active:scale-90">
              <ChevronRight className="w-4 h-4 text-dark-gray" />
            </button>
          </div>
          <button onClick={goToday} className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/5 border border-primary/20 px-3 py-2 rounded-lg hover:bg-primary hover:text-white transition-all active:scale-95">
            Today
          </button>
        </div>
        
        {/* View Toggles (Scrollable on mobile) */}
        <div className="flex items-center overflow-x-auto no-scrollbar bg-off-white rounded-lg p-1 border border-light-gray/60 w-full sm:w-auto justify-between sm:justify-start">
          {VIEWS.map(v => (
            <button 
              key={v} 
              onClick={() => setView(v)}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight rounded-md transition-all whitespace-nowrap ${
                view === v ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-mid-gray hover:text-charcoal'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Schedule Grid ── */}
      <div ref={gridRef} className="flex-1 overflow-auto bg-white select-none relative scroll-smooth no-scrollbar md:scrollbar">
        <div style={{ minWidth: STAFF_COL_W + columns.length * COL_WIDTH }}>

          {/* Time header */}
          <div className="flex border-b border-light-gray sticky top-0 bg-white z-30 h-10">
            <div style={{ width: STAFF_COL_W }} className="shrink-0 px-3 flex items-center border-r border-light-gray bg-off-white/80 backdrop-blur-md sticky left-0 z-40 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
              <span className="text-[9px] text-mid-gray uppercase tracking-widest font-black">Staff</span>
            </div>
            {columns.map((col, i) => (
              <div key={i} style={{ width: COL_WIDTH }} className="shrink-0 px-2 flex items-center justify-center border-r border-light-gray bg-off-white/50 text-center">
                <span className={`text-[10px] font-bold tracking-tight ${col.date.toDateString() === new Date().toDateString() ? 'text-secondary' : 'text-mid-gray'}`}>
                  {col.label}
                </span>
              </div>
            ))}
          </div>

          {/* Staff rows */}
          {staffMembers.map(staff => {
            const assignedJobs = getJobsForStaff(staff.id);
            const isOver = dragOverRow === staff.id;

            return (
              <div key={staff.id} className="flex border-b border-light-gray group/row" style={{ minHeight: 64 }}>
                {/* Staff Info (Sticky Left) */}
                <div style={{ width: STAFF_COL_W }} className="shrink-0 px-2 py-3 border-r border-light-gray bg-white sticky left-0 z-20 shadow-[2px_0_8px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center gap-1 group-hover/row:bg-off-white/30 transition-colors">
                  <Avatar className="w-8 h-8 shrink-0 ring-2 ring-off-white">
                    <AvatarFallback className="bg-primary text-white text-[10px] font-black uppercase">
                      {staff.full_name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[9px] font-bold text-charcoal w-full text-center px-1 leading-tight line-clamp-2">
                    {staff.full_name}
                  </span>
                </div>

                {/* Slots Area */}
                <div
                  className="relative flex-1"
                  style={{ width: columns.length * COL_WIDTH, height: 64 }}
                  onDragOver={(e) => handleRowDragOver(e, staff.id)}
                  onDragLeave={handleRowDragLeave}
                  onDrop={(e) => handleRowDrop(e, staff.id)}
                >
                  {/* Grid lines */}
                  <div className="flex h-full pointer-events-none">
                    {columns.map((_, i) => (
                      <div
                        key={i}
                        style={{ width: COL_WIDTH }}
                        className={`h-full border-r border-light-gray/50 shrink-0 transition-colors ${
                          isOver && dragSlot === i ? 'bg-primary/10' : ''
                        }`}
                      />
                    ))}
                  </div>

                  {/* Hover indicator */}
                  {isOver && dragSlot !== null && (
                    <div
                      className={`absolute top-0 bottom-0 pointer-events-none z-10 ${isTimeView ? 'w-0.5 bg-primary' : 'bg-primary/10'}`}
                      style={{ left: dragSlot * COL_WIDTH, width: isTimeView ? 2 : COL_WIDTH }}
                    />
                  )}

                  {/* Job blocks */}
                  {assignedJobs.map(job => {
                    const si = getSlotIndex(job);
                    if (si < 0) return null;
                    const dur = getDuration(job);
                    const isQuote = ['Quote', 'Quote Sent', 'Lead'].includes(job.status);
                    
                    return (
                      <div
                        key={job.id}
                        className={`absolute top-1.5 h-[52px] overflow-hidden rounded-lg cursor-pointer group/block z-20 shadow-sm border transition-all hover:scale-[1.02] active:scale-95
                          ${isQuote ? 'bg-secondary/10 border-secondary/30' : 'bg-blue-50 border-blue-200'}`}
                        style={{ left: si * COL_WIDTH + 4, width: dur * COL_WIDTH - 8 }}
                        onClick={() => onJobClick(job.id)}
                      >
                        <div className="px-2.5 h-full flex flex-col justify-center overflow-hidden">
                          <p className={`text-[10px] font-black truncate uppercase tracking-tight ${isQuote ? 'text-secondary-dark' : 'text-blue-700'}`}>
                            {job.client?.first_name}
                          </p>
                          <p className={`text-[9px] font-bold truncate opacity-80 ${isQuote ? 'text-secondary' : 'text-blue-500'}`}>
                            {job.job_number}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeAssignment(job.id); }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 shadow-sm flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {staffMembers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-off-white/30">
              <div className="w-16 h-16 rounded-full bg-off-white flex items-center justify-center mb-4 border border-light-gray/60">
                <Loader2 className="w-8 h-8 text-light-gray" />
              </div>
              <p className="text-sm font-bold text-mid-gray">No staff members assigned</p>
              <p className="text-xs text-mid-gray/70 mt-1">Add staff to view their schedules</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Hint ── */}
      <div className="bg-off-white/80 backdrop-blur-sm border-t border-light-gray px-4 py-2 shrink-0 text-center">
        <p className="text-[9px] font-black uppercase tracking-widest text-mid-gray/60">
          Scroll horizontally to view times · Tap to open job
        </p>
      </div>
    </div>
  );
}
