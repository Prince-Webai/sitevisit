'use client';

import { useState } from 'react';
import { SiteVisitData } from '@/types/site-visit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, User, Calendar, Camera, Video, Ruler, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';

function VideoCard({ url, label }: { url: string; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="space-y-2">
      <div className="aspect-video relative rounded-lg border border-light-gray bg-black overflow-hidden shadow-md flex items-center justify-center">
        {failed ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <p className="text-white text-xs font-medium">Format not supported in browser</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="mt-1 px-3 py-1.5 bg-white text-charcoal text-[11px] font-bold rounded-md hover:bg-off-white transition-colors"
            >
              Download to view
            </a>
          </div>
        ) : (
          <video
            controls
            playsInline
            className="w-full h-full object-contain"
            onError={() => setFailed(true)}
          >
            <source src={url} type="video/mp4" />
            <source src={url} type="video/webm" />
          </video>
        )}
      </div>
      <p className="text-[10px] font-bold text-mid-gray uppercase tracking-tighter">{label}</p>
    </div>
  );
}

interface SiteVisitReportProps {
  data: SiteVisitData;
  date?: string;
}

export function SiteVisitReport({ data, date }: SiteVisitReportProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-charcoal">Site Assessment Report</h2>
          <p className="text-sm text-mid-gray flex items-center gap-2 mt-1">
            <Calendar className="w-3.5 h-3.5" />
            {date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recent Submission'}
          </p>
        </div>
        <Badge className="bg-primary text-white px-3 py-1">Completed</Badge>
      </div>

      {/* 1. Client & Context */}
      <Card className="border-light-gray shadow-sm overflow-hidden">
        <CardHeader className="bg-off-white/50 border-b border-light-gray py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Client & Site Context
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-mid-gray mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Client Name</p>
                <p className="text-sm font-semibold text-charcoal">{data.clientName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-mid-gray mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Phone Number</p>
                <p className="text-sm font-semibold text-charcoal">{data.clientPhone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-mid-gray mt-0.5" />
              <div>
                <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Site Address</p>
                <p className="text-sm font-medium text-charcoal leading-relaxed">{data.siteAddress}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Number of Floors</p>
              <p className="text-sm font-semibold text-charcoal">{data.noOfFloors === 'Other' ? data.otherFloorValue : data.noOfFloors}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Electrical Phase</p>
              <p className="text-sm font-semibold text-charcoal">{data.phase}</p>
            </div>
            {data.siteGps && (
              <div>
                <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">GPS Coordinates</p>
                <p className="text-xs font-mono text-primary">{data.siteGps.lat.toFixed(6)}, {data.siteGps.lng.toFixed(6)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Perimeter Photos */}
      <Card className="border-light-gray shadow-sm overflow-hidden">
        <CardHeader className="bg-off-white/50 border-b border-light-gray py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" />
            Perimeter & Site Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Object.entries(data.photos).map(([key, url]) => (
              url && (
                <div key={key} className="space-y-1.5">
                  <div className="aspect-square relative rounded-lg border border-light-gray bg-off-white overflow-hidden shadow-inner group">
                    <img 
                      src={url} 
                      alt={key} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>
                  <p className="text-[10px] font-bold text-mid-gray uppercase tracking-tighter text-center truncate px-1">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                </div>
              )
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Solar Space & Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-light-gray shadow-sm overflow-hidden">
          <CardHeader className="bg-off-white/50 border-b border-light-gray py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Ruler className="w-4 h-4 text-primary" />
              Solar Space Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Area Length</p>
                <p className="text-lg font-bold text-charcoal">{data.solarSpace.length}m</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Area Width</p>
                <p className="text-lg font-bold text-charcoal">{data.solarSpace.width}m</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-off-white rounded-lg border border-light-gray">
              <span className="text-sm font-medium">Orientation</span>
              <Badge className={data.solarSpace.southFacing ? 'bg-primary text-white' : 'bg-mid-gray text-white'}>
                {data.solarSpace.southFacing ? 'South Facing' : 'Non-South'}
              </Badge>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Area Shape</p>
              <p className="text-sm font-semibold text-charcoal">{data.solarSpace.shape || 'Standard'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-light-gray shadow-sm overflow-hidden">
          <CardHeader className="bg-off-white/50 border-b border-light-gray py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Structure & Electrical
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Mount Type</p>
              <p className="text-sm font-bold text-primary">{data.structure.size}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-mid-gray tracking-wider">Inverter Location</p>
              <p className="text-sm font-medium text-charcoal">{data.electrical.inverterLocation}</p>
            </div>
            {data.structure.lightningArrestor && (
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Lightning Arrestor</p>
                <p className="text-xs font-medium text-blue-700 mt-1">
                  Location: {data.structure.lightArrestorLocation} · {data.structure.pipeLength}m pipe
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Videos & Visual Analysis */}
      <Card className="border-light-gray shadow-sm overflow-hidden">
        <CardHeader className="bg-off-white/50 border-b border-light-gray py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            Video Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(data.videos).map(([key, url]) =>
              url ? (
                <VideoCard
                  key={key}
                  url={url}
                  label={key.replace(/([A-Z])/g, ' $1').trim()}
                />
              ) : null
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Signature */}
      {data.signature && (
        <Card className="border-light-gray shadow-sm overflow-hidden">
          <CardHeader className="bg-off-white/50 border-b border-light-gray py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Declaration & Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center">
            <div className="max-w-md w-full border-2 border-dashed border-light-gray rounded-xl p-4 bg-off-white/30">
              <img src={data.signature} alt="Client Signature" className="max-h-32 mx-auto" />
            </div>
            <p className="text-[10px] text-mid-gray mt-4 font-medium italic text-center">
              Digitally signed and verified at the time of site assessment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
