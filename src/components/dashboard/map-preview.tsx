'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Navigation, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { jobService } from '@/lib/supabase/service';
import type { StaffLocation } from '@/lib/types';

export function MapPreview() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStaff() {
      try {
        const data = await jobService.fetchStaffLocations();
        setStaff(data as StaffLocation[]);
      } catch (error) {
        console.error('Error loading map preview:', error);
      } finally {
        setLoading(false);
      }
    }
    loadStaff();
  }, []);

  return (
    <Card
      className="border-light-gray card-hover cursor-pointer group overflow-hidden h-full flex flex-col"
      onClick={() => router.push('/dispatch')}
    >
      <CardHeader className="pb-3 border-b border-light-gray bg-gray-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Navigation className="w-4 h-4 text-primary" />
             </div>
             <CardTitle className="text-base font-bold text-charcoal">Live Team Map</CardTitle>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-mid-gray flex items-center gap-1.5 group-hover:text-primary transition-colors">
            Dispatch Board
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-off-white/50">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-[9px] font-black text-mid-gray uppercase tracking-widest">Scanning Network</p>
          </div>
        ) : (
          <div className="relative h-full min-h-[300px] bg-gradient-to-br from-blue-50/50 to-indigo-50/50 overflow-hidden">
            {/* Grid lines to simulate map */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" className="text-primary">
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={`h${i}`}
                    x1="0" y1={`${8.33 * (i + 1)}%`}
                    x2="100%" y2={`${8.33 * (i + 1)}%`}
                    stroke="currentColor" strokeWidth="0.5"
                  />
                ))}
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={`v${i}`}
                    x1={`${8.33 * (i + 1)}%`} y1="0"
                    x2={`${8.33 * (i + 1)}%`} y2="100%"
                    stroke="currentColor" strokeWidth="0.5"
                  />
                ))}
              </svg>
            </div>

            {/* Staff pins - simulated random positions around center for preview */}
            {staff.slice(0, 5).map((loc, i) => {
              const positions = [
                { left: '35%', top: '40%' },
                { left: '60%', top: '55%' },
                { left: '45%', top: '25%' },
                { left: '20%', top: '65%' },
                { left: '75%', top: '35%' },
              ];
              const pos = positions[i % positions.length];
              const colors = ['bg-primary', 'bg-secondary', 'bg-blue-500'];

              return (
                <div
                  key={loc.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 hover:scale-110"
                  style={{ left: pos.left, top: pos.top }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className={`w-3.5 h-3.5 rounded-full ${colors[i % colors.length]} border-2 border-white shadow-lg animate-pulse-dot`} />
                    <div className={`absolute inset-0 w-3.5 h-3.5 rounded-full ${colors[i % colors.length]} opacity-30 animate-ping`} />
                  </div>
                </div>
              );
            })}

            {/* Region label */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-xl border border-light-gray group-hover:border-primary/30 transition-colors">
              <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                 <Navigation className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-charcoal uppercase tracking-tight">Chennai, TN</span>
                <span className="text-[8px] font-bold text-mid-gray uppercase tracking-widest">Active Zone</span>
              </div>
            </div>

            {/* Staff count */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-xl border border-light-gray group-hover:border-secondary/30 transition-colors">
              <div className="w-6 h-6 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-secondary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-charcoal uppercase tracking-tight">{staff.length} Members</span>
                <span className="text-[8px] font-bold text-mid-gray uppercase tracking-widest">Live Now</span>
              </div>
            </div>

            {staff.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-center p-8 bg-blue-50/20">
                <p className="text-[10px] font-black text-mid-gray uppercase tracking-widest">No active staff tracked currently</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
