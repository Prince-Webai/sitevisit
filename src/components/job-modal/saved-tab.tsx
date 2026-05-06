'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, User, Loader2, RefreshCw } from 'lucide-react';
import { jobService } from '@/lib/supabase/service';
import { Button } from '@/components/ui/button';

import { AuditLog } from '@/lib/types';

export function SavedTab({ jobId }: { jobId?: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await jobService.fetchAuditLogsByJobId(jobId);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    Promise.resolve().then(() => loadLogs());
  }, [loadLogs]);

  return (
    <div className="p-6 bg-off-white min-h-full space-y-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-charcoal">Job Activity Log</h3>
            <p className="text-[10px] text-mid-gray uppercase tracking-widest font-bold mt-1">Timeline of system events and updates</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadLogs} 
            disabled={loading}
            className="h-8 text-[10px] font-bold uppercase tracking-wider bg-white"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-light-gray shadow-sm">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-xs text-mid-gray font-bold uppercase tracking-widest">Retrieving History...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-light-gray text-center px-10 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-off-white flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-mid-gray" />
            </div>
            <p className="text-sm font-bold text-charcoal mb-1">No activity recorded yet</p>
            <p className="text-xs text-mid-gray">New events and updates for this job will appear here automatically.</p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {logs.map((log, index) => {
              const date = new Date(log.created_at);
              const formattedDate = date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const formattedTime = date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <div key={log.id} className="relative flex gap-4 pb-8 group">
                  {/* Timeline line */}
                  {index < logs.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-light-gray/50 group-hover:bg-primary/20 transition-colors" />
                  )}

                  {/* Timeline dot */}
                  <div className="relative shrink-0 mt-1">
                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center border-2 border-white shadow-sm transition-all ${
                      index === 0
                        ? 'bg-primary text-white ring-4 ring-primary/10'
                        : 'bg-off-white text-mid-gray group-hover:bg-white group-hover:text-primary group-hover:border-primary/20'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-charcoal truncate">
                        {log.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <span className="text-[9px] font-black text-mid-gray/50 uppercase tracking-tighter whitespace-nowrap">{formattedDate}</span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-dark-gray mt-0.5 line-clamp-2">{log.details}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-mid-gray bg-off-white px-2 py-0.5 rounded-full border border-light-gray/50">
                        <User className="w-2.5 h-2.5" />
                        {log.user_name || 'Staff User'}
                      </div>
                      <span className="text-[10px] text-mid-gray/40 font-medium">{formattedTime}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
