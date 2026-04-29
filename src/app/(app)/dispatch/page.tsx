'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Package, Clock, Wrench, X,
  Map, ListChecks, CalendarDays, Users, Layers, Loader2
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { JobModal } from '@/components/job-modal/job-modal';
import { BookSiteVisitDialog } from '@/components/job-modal/book-site-visit-dialog';
import { AddStaffDialog } from '@/components/dispatch/add-staff-dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { JobsPanel } from '@/components/dispatch/jobs-panel';
import { DispatchMap } from '@/components/dispatch/dispatch-map';
import { TasksView } from '@/components/dispatch/tasks-view';
import { CalendarView } from '@/components/dispatch/calendar-view';
import { StaffScheduleView } from '@/components/dispatch/staff-schedule-view';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';

const TABS = [
  { id: 'map',       label: 'Map',            icon: Map },
  { id: 'tasks',     label: 'Tasks',          icon: ListChecks },
  { id: 'calendar',  label: 'Calendar',       icon: CalendarDays },
  { id: 'schedules', label: 'Schedules',      icon: Users },
] as const;

type TabId = (typeof TABS)[number]['id'];



import { DispatchProvider, useDispatchData } from '@/components/providers/dispatch-provider';

export default function DispatchPage() {
  return (
    <DispatchProvider>
      <DispatchContent />
    </DispatchProvider>
  );
}

function DispatchContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const { staffLocations, loading: dataLoading, refresh: handleRefresh, error } = useDispatchData();
  const [activeTab,      setActiveTab]      = useState<TabId>('schedules');
  const [jobModalOpen,   setJobModalOpen]   = useState(false);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [addStaffOpen,   setAddStaffOpen]   = useState(false);
  const [selectedJobId,  setSelectedJobId]  = useState<string | undefined>();
  const supabase = createClient();

  const isAdminOrSales = ['Admin', 'Sales', 'Dispatcher'].includes(profile?.role || '');
  const isEngineer = profile?.role === 'Engineer' || profile?.role === 'Technician';

  const filteredTabs = TABS;

  useEffect(() => {
    if (isEngineer && !['tasks', 'map', 'calendar', 'schedules'].includes(activeTab)) {
        setActiveTab('tasks');
    }
  }, [profile, activeTab, isEngineer]);

  const handleJobDoubleClick = (jobId: string) => {
    setSelectedJobId(jobId);
    setJobModalOpen(true);
  };

  if (authLoading || dataLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-off-white/30">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-red-50/30 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-charcoal mb-2">Failed to Load Dispatch Data</h2>
        <p className="text-sm text-mid-gray mb-6 max-w-md">{error}</p>
        <Button onClick={handleRefresh} className="bg-primary hover:bg-primary-dark">
          Try Again
        </Button>
      </div>
    );
  }

  // Extract profiles from staffLocations for the top bar avatars
  const staffMembers = staffLocations.map(loc => loc.profile).filter(Boolean);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-7rem)] md:-m-6 md:mt-0 bg-white">
        
        {/* ── Top Header (Condensed for Mobile) ── */}
        <div className="bg-white border-b border-light-gray shrink-0 z-10">
          <div className="flex items-center h-14 md:h-16 px-3 md:px-4 gap-2">

            {/* Main Action */}
            {isAdminOrSales && (
              <div className="flex items-center pr-2 md:pr-4 border-r border-light-gray">
                <Button
                  id="dispatch-new-job-btn"
                  onClick={() => setBookDialogOpen(true)}
                  className="bg-primary hover:bg-primary-dark text-white gap-1.5 h-9 px-3 text-xs font-bold shadow-sm rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden xs:inline">New Job</span>
                </Button>
              </div>
            )}



            {/* Staff Section */}
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 justify-end md:justify-start">
              <div className="flex items-center -space-x-2 overflow-hidden">
                {staffMembers.slice(0, 3).map(s => (
                  <Avatar key={s?.id} className="w-7 h-7 md:w-8 md:h-8 border-2 border-white shadow-sm ring-1 ring-light-gray/50">
                    <AvatarFallback className="bg-primary/10 text-primary text-[9px] md:text-[10px] font-bold">
                      {s?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {staffMembers.length > 3 && (
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-off-white border-2 border-white shadow-sm flex items-center justify-center text-[9px] md:text-[10px] font-bold text-mid-gray ring-1 ring-light-gray/50">
                    +{staffMembers.length - 3}
                  </div>
                )}
              </div>
              {isAdminOrSales && (
                <button 
                  onClick={() => setAddStaffOpen(true)} 
                  className="w-7 h-7 md:w-8 md:h-8 rounded-xl border-2 border-dashed border-light-gray/60 flex items-center justify-center text-mid-gray hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Tab Navigation ── */}
          <div className="flex items-center px-2 md:px-4 overflow-x-auto no-scrollbar scroll-smooth">
            {filteredTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 md:px-5 py-3 md:py-3.5 text-[11px] md:text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-dark-gray/60 hover:text-charcoal hover:border-light-gray'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-mid-gray/50'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main View Content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          <div className="flex-1 min-w-0 overflow-auto bg-off-white/20">
            {activeTab === 'map'       && <DispatchMap onNewJob={() => setBookDialogOpen(true)} />}
            {activeTab === 'tasks'     && <TasksView onJobClick={handleJobDoubleClick} />}
            {activeTab === 'calendar'  && <CalendarView onJobClick={handleJobDoubleClick} />}
            {activeTab === 'schedules' && <StaffScheduleView onJobClick={handleJobDoubleClick} onScheduleUpdate={handleRefresh} />}
          </div>

          {/* Jobs Panel (Desktop Only) */}
          <div className="hidden lg:block">
            <JobsPanel onJobDoubleClick={handleJobDoubleClick} />
          </div>

          {/* Mobile Drawer Toggle */}
          <Sheet>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "lg:hidden fixed bottom-24 right-4 w-12 h-12 rounded-2xl shadow-xl bg-primary text-white border-none z-40 active:scale-95 transition-all"
              )}
            >
              <Layers className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-[300px] max-w-[85vw] border-none">
              <div className="h-full pt-10">
                <JobsPanel onJobDoubleClick={handleJobDoubleClick} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <BookSiteVisitDialog open={bookDialogOpen} onOpenChange={setBookDialogOpen} onSuccess={handleRefresh} />
      <JobModal open={jobModalOpen} onOpenChange={setJobModalOpen} jobId={selectedJobId} onSuccess={handleRefresh} />
      <AddStaffDialog open={addStaffOpen} onOpenChange={setAddStaffOpen} onSuccess={handleRefresh} />
    </>
  );
}

