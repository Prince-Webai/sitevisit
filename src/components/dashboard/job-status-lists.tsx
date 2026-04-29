'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle2, ArrowRight, Loader2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { jobService } from '@/lib/supabase/service';
import { useAuth } from '@/components/providers/auth-provider';
import type { Job } from '@/lib/types';

interface JobCardProps {
  job: Job;
  onClick?: () => void;
}

function JobCard({ job, onClick }: JobCardProps) {
  const isQuote = ['Lead', 'Site Visit'].includes(job.status);
  
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-white rounded-xl border border-light-gray hover:border-primary/50 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-black text-primary uppercase tracking-wider">{job.job_number}</span>
        <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 font-bold uppercase tracking-tighter ${
          isQuote ? 'bg-secondary/15 text-secondary-dark' : 'bg-primary/10 text-primary-dark'
        }`}>
          {job.status}
        </Badge>
      </div>
      <p className="text-sm font-bold text-charcoal truncate">{job.client?.first_name} {job.client?.last_name}</p>
      
      <div className="mt-2 flex items-center gap-1.5 text-mid-gray group-hover:text-charcoal transition-colors">
        <MapPin className="w-3 h-3 shrink-0" />
        <p className="text-[10px] font-medium truncate leading-tight">{job.address}</p>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center text-[10px] text-mid-gray group-hover:text-primary transition-colors font-bold uppercase tracking-widest">
          <span>Details</span>
          <ArrowRight className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {job.scheduled_date && (
          <div className="flex items-center gap-1 text-[9px] font-black text-dark-gray/60 bg-off-white px-2 py-0.5 rounded-md border border-light-gray/40">
            <Clock className="w-2.5 h-2.5" />
            {new Date(job.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </button>
  );
}

interface JobStatusListsProps {
  onJobClick?: (jobId: string) => void;
  refreshKey?: number;
}

export function JobStatusLists({ onJobClick, refreshKey }: JobStatusListsProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user || !profile) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await jobService.fetchJobs({ 
          role: profile.role, 
          userId: user.id 
        });
        setJobs(data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) loadData();
  }, [user, profile, authLoading, refreshKey]);

  if (loading) {
     return (
      <Card className="border-light-gray h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[10px] font-black text-mid-gray uppercase tracking-widest">Refreshing Schedule...</p>
        </div>
      </Card>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  
  const todaysJobs = jobs.filter(j => j.scheduled_date?.startsWith(today) && j.status !== 'Completed');
  const upcomingJobs = jobs.filter(j => {
    if (!j.scheduled_date || j.status === 'Completed') return false;
    const schedDate = j.scheduled_date.split('T')[0];
    return schedDate > today;
  });
  const completedJobs = jobs.filter(j => j.status === 'Completed').sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const sections = [
    {
      title: "Today's Visits",
      icon: Clock,
      color: 'text-primary',
      bg: 'bg-primary/5',
      items: todaysJobs,
    },
    {
      title: "Upcoming",
      icon: Calendar,
      color: 'text-secondary',
      bg: 'bg-secondary/5',
      items: upcomingJobs,
    },
    {
      title: "Completed",
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
      items: completedJobs,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sections.map(section => {
        const Icon = section.icon;
        return (
          <Card key={section.title} className="border-light-gray flex flex-col bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="py-3 px-4 border-b border-light-gray shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${section.bg} flex items-center justify-center shrink-0 border border-black/5`}>
                  <Icon className={`w-4 h-4 ${section.color}`} />
                </div>
                <CardTitle className="text-sm font-bold text-charcoal uppercase tracking-tight">
                  {section.title}
                </CardTitle>
                <Badge variant="secondary" className="ml-auto text-[10px] font-black bg-off-white text-mid-gray border border-light-gray/50">
                  {section.items.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-3 overflow-y-auto max-h-[500px] no-scrollbar">
              <div className="space-y-3">
                {section.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                     <Icon className="w-8 h-8 mb-2 stroke-[1.5px]" />
                     <p className="text-[10px] font-black uppercase tracking-widest">No jobs found</p>
                  </div>
                ) : (
                  section.items.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={() => onJobClick?.(job.id)}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
