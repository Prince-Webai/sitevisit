'use client';

import { useState, useEffect } from 'react';
import { Clock, User, ArrowRight, FileText, CheckCircle, Send, PlusCircle, Loader2 } from 'lucide-react';
import { jobService } from '@/lib/supabase/service';
import type { AuditLog as AuditLogType } from '@/lib/types';

const actionIcons: Record<string, React.ReactNode> = {
  status_change: <ArrowRight className="w-3.5 h-3.5" />,
  assigned: <User className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />,
  created: <PlusCircle className="w-3.5 h-3.5" />,
  quote_sent: <Send className="w-3.5 h-3.5" />,
};

const actionColors: Record<string, string> = {
  status_change: 'bg-blue-100 text-blue-600',
  assigned: 'bg-purple-100 text-purple-600',
  completed: 'bg-primary/15 text-primary-dark',
  created: 'bg-secondary/15 text-secondary-dark',
  quote_sent: 'bg-cyan-100 text-cyan-600',
};

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await jobService.fetchAuditLogs();
        setLogs((data as AuditLogType[]) || []);
      } catch (error) {
        console.error('Error loading logs:', error);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-xs text-mid-gray font-medium">Fetching activity logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((log, index) => {
        const date = new Date(log.created_at);
        const formattedDate = date.toLocaleDateString('en-AU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const formattedTime = date.toLocaleTimeString('en-AU', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        return (
          <div key={log.id} className="relative flex gap-4 pb-6 px-6 group hover:bg-off-white/30 transition-colors">
            {/* Timeline line */}
            {index < logs.length - 1 && (
              <div className="absolute left-[39px] top-10 bottom-0 w-px bg-light-gray" />
            )}

            {/* Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10 shadow-sm border border-white ${
              actionColors[log.action] || 'bg-gray-100 text-mid-gray'
            }`}>
              {actionIcons[log.action] || <FileText className="w-3.5 h-3.5" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-sm text-charcoal leading-relaxed">
                <span className="font-bold text-primary">{log.user_name}</span>
                {' '}
                <span className="text-dark-gray">{log.details}</span>
              </p>
              <div className="flex items-center gap-2 mt-1.5 opacity-60">
                <Clock className="w-3 h-3 text-mid-gray" />
                <span className="text-[10px] font-bold text-mid-gray uppercase tracking-tighter">{formattedDate} • {formattedTime}</span>
              </div>
            </div>
          </div>
        );
      })}

      {logs.length === 0 && (
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 rounded-full bg-off-white flex items-center justify-center mx-auto mb-4 border border-dashed border-light-gray">
            <Clock className="w-8 h-8 text-light-gray" />
          </div>
          <p className="text-sm font-bold text-mid-gray uppercase tracking-widest">No activity recorded</p>
          <p className="text-xs text-mid-gray/60 mt-1">Activity logs will appear here as the system is used.</p>
        </div>
      )}
    </div>
  );
}
