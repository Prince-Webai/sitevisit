'use client';

import { useState } from 'react';
import { Package, Clock, Wrench, MapPin, Loader2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/auth-provider';
import { useDispatchData } from '@/components/providers/dispatch-provider';
import type { Job } from '@/lib/types';

interface QueuesViewProps {
  onJobClick: (jobId: string) => void;
  refreshKey?: number;
}

function QueueJobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-light-gray p-3.5 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group active:scale-[0.98]"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-black text-primary uppercase tracking-wider">{job.job_number}</span>
        <Badge variant="secondary" className="text-[9px] px-2 py-0.5 h-auto bg-off-white text-mid-gray border-none font-bold">
          {job.status}
        </Badge>
      </div>
      <p className="text-sm font-bold text-charcoal">
        {job.client?.first_name} {job.client?.last_name}
      </p>
      <div className="flex items-center gap-1.5 mt-2">
        <MapPin className="w-3 h-3 text-mid-gray/50 shrink-0" />
        <p className="text-xs text-mid-gray truncate leading-tight flex-1">{job.address}</p>
        <ChevronRight className="w-3.5 h-3.5 text-light-gray group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}

export function QueuesView({ onJobClick }: QueuesViewProps) {
  const { jobs, loading: providerLoading } = useDispatchData();
  const { loading: authLoading } = useAuth();
  const [activeQueue, setActiveQueue] = useState(0);

  const loading = providerLoading || authLoading;

  const partsOnOrder = jobs.filter(j => j.materials_status === 'Pending' || j.materials_status === 'Ordered');
  const pendingQuotes = jobs.filter(j => j.status === 'Lead');
  const workshop = jobs.filter(j => j.category === 'Service');

  const queues = [
    {
      title: 'Parts',
      fullName: 'Parts on Order',
      icon: Package,
      iconColor: 'text-secondary',
      iconBg: 'bg-orange-50',
      items: partsOnOrder,
    },
    {
      title: 'Quotes',
      fullName: 'Pending Quotes',
      icon: Clock,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      items: pendingQuotes,
    },
    {
      title: 'Service',
      fullName: 'Workshop / Service',
      icon: Wrench,
      iconColor: 'text-primary',
      iconBg: 'bg-green-50',
      items: workshop,
    },
  ];

  if (loading || authLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-off-white/30">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full bg-off-white/20 flex flex-col">
      {/* Mobile-First Header Tabs */}
      <div className="px-4 pt-3 shrink-0">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-light-gray/60 shadow-sm">
          {queues.map((q, i) => {
            const Icon = q.icon;
            const isActive = activeQueue === i;
            return (
              <button
                key={q.title}
                onClick={() => setActiveQueue(i)}
                className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-mid-gray hover:bg-off-white active:scale-95'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : q.iconColor}`} />
                <span className="text-[10px] font-black uppercase tracking-tight">{q.title}</span>
                <Badge 
                  variant="secondary" 
                  className={`text-[9px] px-1.5 h-4 border-none font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-off-white text-mid-gray'}`}
                >
                  {q.items.length}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
        {/* Desktop Grid Layout (Hidden on Mobile) */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          {queues.map(q => {
            const Icon = q.icon;
            return (
              <div key={q.title} className="flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 rounded-xl ${q.iconBg} flex items-center justify-center shadow-sm`}>
                    <Icon className={`w-4 h-4 ${q.iconColor}`} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-charcoal">{q.fullName}</h3>
                </div>
                <div className="space-y-3">
                  {q.items.length === 0 ? (
                    <div className="py-12 px-4 rounded-2xl border-2 border-dashed border-light-gray flex flex-col items-center justify-center bg-white/50">
                      <p className="text-xs font-bold text-mid-gray/60 uppercase tracking-widest">Queue Empty</p>
                    </div>
                  ) : (
                    q.items.map(job => <QueueJobCard key={job.id} job={job} onClick={() => onJobClick(job.id)} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile-Only View (Current Selected Queue) */}
        <div className="md:hidden flex flex-col h-full">
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-mid-gray/80 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${queues[activeQueue].iconColor.replace('text', 'bg')}`} />
              {queues[activeQueue].fullName}
            </h3>
          </div>
          <div className="space-y-3 pb-24">
            {queues[activeQueue].items.length === 0 ? (
              <div className="py-20 px-4 rounded-3xl border-2 border-dashed border-light-gray/40 flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm">
                <p className="text-xs font-black text-mid-gray/40 uppercase tracking-[0.1em]">No records found</p>
              </div>
            ) : (
              queues[activeQueue].items.map(job => (
                <QueueJobCard key={job.id} job={job} onClick={() => onJobClick(job.id)} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
