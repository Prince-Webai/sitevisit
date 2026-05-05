'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Users, FileCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Job } from '@/lib/types';

function AnimatedCounter({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 600;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{count.toLocaleString()}</span>;
}

interface KpiCardsProps {
  jobs: Job[];
  profiles: { status?: string }[];
}

export function KpiCards({ jobs, profiles }: KpiCardsProps) {
  const today = new Date().toISOString().split('T')[0];
  const todaysCount   = jobs.filter(j => j.scheduled_date?.startsWith(today)).length;
  const pendingCount  = jobs.filter(j => j.status === 'Lead').length;
  const teamOnSite    = profiles.filter(p => p.status === 'On Site').length;
  const teamEnRoute   = profiles.filter(p => p.status === 'En Route').length;
  const teamAvailable = profiles.filter(p => !p.status || p.status === 'Available').length;

  const kpis = [
    {
      title: 'Jobs Scheduled Today',
      value: todaysCount,
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-blue-50',
      trend: 'Booked for today',
      href: '/dispatch?tab=calendar'
    },
    {
      title: 'Team Status',
      value: -1, // Special rendering
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-blue-50',
      href: '/dispatch?tab=team'
    },
    {
      title: 'Pending Approvals',
      value: pendingCount,
      icon: FileCheck,
      color: 'text-secondary',
      bgColor: 'bg-orange-50',
      trend: 'Awaiting client response',
      href: '/dispatch?tab=queues'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Link
            key={kpi.title}
            href={kpi.href}
            className="block"
          >
            <Card
              className={`card-hover border-light-gray h-full animate-fade-in stagger-${index + 1} cursor-pointer transition-transform active:scale-95`}
              style={{ opacity: 0 }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium text-mid-gray uppercase tracking-wider">{kpi.title}</p>
                  <div className={`w-9 h-9 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                  </div>
                </div>

                {kpi.value === -1 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary/15 text-primary-dark border-0 hover:bg-primary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse-dot" />
                        {teamOnSite} On Site
                      </Badge>
                      <Badge className="bg-secondary/15 text-secondary-dark border-0 hover:bg-secondary/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary mr-1.5 animate-pulse-dot" />
                        {teamEnRoute} En Route
                      </Badge>
                      <Badge className="bg-gray-100 text-dark-gray border-0 hover:bg-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-mid-gray mr-1.5" />
                        {teamAvailable} Available
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-charcoal animate-count-up">
                      <AnimatedCounter value={kpi.value} />
                    </p>
                    {kpi.trend && (
                      <p className="text-xs text-mid-gray mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {kpi.trend}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
