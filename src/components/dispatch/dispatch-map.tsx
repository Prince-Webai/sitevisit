'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Plus, MapPin as MapPinIcon, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { jobService } from '@/lib/supabase/service';
import { useAuth } from '@/components/providers/auth-provider';
import { DEFAULT_COORDS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import type { Job, StaffLocation } from '@/lib/types';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: DEFAULT_COORDS.lat,
  lng: DEFAULT_COORDS.lng,
};

const createStaffIcon = () => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="16" fill="#5C8F5A" stroke="white" stroke-width="2"/>
  <svg x="8" y="8" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-2 2v8.36a2 2 0 0 0 2 2h.01"/>
    <circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
  </svg>
</svg>
`)}`;

const createJobIcon = (isCaptured: boolean) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" fill="${isCaptured ? '#5C8F5A' : '#E3A25B'}" stroke="white" stroke-width="2"/>
  <path d="M12 7v10M7 12h10" stroke="white" stroke-width="2" stroke-linecap="round" opacity="${isCaptured ? '0' : '1'}"/>
  <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" opacity="${isCaptured ? '1' : '0'}"/>
</svg>
`)}`;

import { useDispatchData } from '@/components/providers/dispatch-provider';

export function DispatchMap({ onNewJob }: { onNewJob: () => void }) {
  const { jobs, staffLocations } = useDispatchData();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [selectedStaff, setSelectedStaff] = useState<StaffLocation | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);


  if (loadError) {
    return (
      <div className="flex-1 relative h-full min-w-0 flex items-center justify-center bg-red-50/30">
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-red-100 flex flex-col items-center gap-4 text-center max-w-sm">
           <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
             <Navigation className="w-8 h-8" />
           </div>
           <p className="text-sm font-black text-red-600 uppercase tracking-widest">Maps Integration Error</p>
           <p className="text-xs text-mid-gray font-medium">Please ensure Google Maps API is enabled in your Cloud Console and check billing status.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 relative h-full min-w-0 flex items-center justify-center bg-off-white/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-[10px] font-black text-mid-gray uppercase tracking-[0.2em]">Initializing Map Engine</p>
        </div>
      </div>
    );
  }

  // Jobs that have coordinates
  const jobsToDisplay = jobs.filter(j => j.latitude && j.longitude);

  return (
    <div className="flex-1 relative h-full min-w-0">
      <div className="absolute inset-0 z-0">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={12}
          center={defaultCenter}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            styles: [
              { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            ],
          }}
        >
          {/* Staff Markers */}
          {staffLocations.map((loc) => (
            <MarkerF
              key={loc.id}
              position={{ lat: Number(loc.latitude), lng: Number(loc.longitude) }}
              title={loc.profile?.full_name}
              icon={{
                url: createStaffIcon(),
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 20),
              }}
              label={{
                text: loc.profile?.full_name || 'Staff',
                className: 'map-marker-label',
                color: '#1a1a1a',
                fontSize: '10px',
                fontWeight: 'bold'
              }}
              onClick={() => {
                setSelectedJob(null);
                setSelectedStaff(loc);
              }}
            />
          ))}

          {/* Job Markers (Actual Coordinates) */}
          {jobsToDisplay.map((job) => (
            <MarkerF
              key={job.id}
              position={{ lat: Number(job.latitude!), lng: Number(job.longitude!) }}
              icon={{
                url: createJobIcon(true),
                scaledSize: new window.google.maps.Size(28, 28),
                anchor: new window.google.maps.Point(14, 14),
              }}
              onClick={() => {
                setSelectedStaff(null);
                setSelectedJob(job);
              }}
            />
          ))}

          {/* Info Windows */}
          {selectedStaff && (
            <InfoWindowF
              position={{ lat: Number(selectedStaff.latitude), lng: Number(selectedStaff.longitude) }}
              onCloseClick={() => setSelectedStaff(null)}
              options={{ pixelOffset: new window.google.maps.Size(0, -20) }}
            >
              <div className="font-sans p-2 min-w-[140px]">
                <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">On Site</p>
                <strong className="text-charcoal text-sm block mb-0.5">{selectedStaff.profile?.full_name}</strong>
                <span className="text-mid-gray text-[10px] font-bold uppercase tracking-tighter">{selectedStaff.profile?.role}</span>
              </div>
            </InfoWindowF>
          )}

          {selectedJob && (
            <InfoWindowF
              position={{ lat: Number(selectedJob.latitude!), lng: Number(selectedJob.longitude!) }}
              onCloseClick={() => setSelectedJob(null)}
              options={{ pixelOffset: new window.google.maps.Size(0, -14) }}
            >
              <div className="font-sans p-3 max-w-[220px] space-y-2">
                <div className="flex items-center justify-between gap-3">
                   <strong className="text-primary font-black text-xs uppercase tracking-widest">{selectedJob.job_number}</strong>
                   <Badge variant="secondary" className="bg-off-white text-[9px] font-black uppercase border-none">{selectedJob.status}</Badge>
                </div>
                <div>
                  <p className="text-charcoal text-sm font-bold leading-tight">{selectedJob.client?.first_name || 'Valued'} {selectedJob.client?.last_name || 'Client'}</p>
                  <div className="flex items-center gap-1 mt-1 text-mid-gray">
                    <MapPinIcon className="w-3 h-3 shrink-0" />
                    <p className="text-[10px] font-medium leading-relaxed">{selectedJob.address}</p>
                  </div>
                </div>
                {selectedJob.description && (
                  <p className="text-[10px] text-dark-gray line-clamp-2 bg-off-white p-1.5 rounded-lg border border-light-gray/50">{selectedJob.description}</p>
                )}
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </div>

      {/* Map legend */}
      <div className="absolute bottom-10 left-4 z-[10] bg-white/95 backdrop-blur-md rounded-2xl border border-light-gray p-4 shadow-2xl space-y-3 min-w-[160px]">
        <p className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em] mb-4 border-b border-light-gray pb-2">Map Legend</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 group">
            <div className="w-3.5 h-3.5 rounded-full bg-primary border-2 border-white shadow-md group-hover:scale-125 transition-transform" />
            <span className="text-[10px] font-bold text-dark-gray uppercase tracking-widest">Active Staff</span>
          </div>
          <div className="flex items-center gap-3 group">
            <div className="w-3.5 h-3.5 rounded-full bg-secondary border-2 border-white shadow-md group-hover:scale-125 transition-transform" />
            <span className="text-[10px] font-bold text-dark-gray uppercase tracking-widest">Uncaptured Site</span>
          </div>
          <div className="flex items-center gap-3 group">
            <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center border-2 border-white shadow-md group-hover:scale-125 transition-transform">
               <div className="w-1.5 h-1.5 rounded-full bg-white opacity-50" />
            </div>
            <span className="text-[10px] font-bold text-dark-gray uppercase tracking-widest">Captured Site</span>
          </div>
        </div>
        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <p className="text-[9px] text-red-500 font-bold mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
            ⚠ API Key missing in .env.local
          </p>
        )}
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
    </svg>
  );
}
