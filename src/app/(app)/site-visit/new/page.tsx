'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SiteVisitForm } from '@/components/site-visit/SiteVisitForm';
import { Loader2 } from 'lucide-react';

function NewSiteVisitContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId') || undefined;

  return (
    <div className="p-4 md:p-8 bg-off-white min-h-screen">
      <div className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-charcoal">New Site Survey</h1>
        <p className="text-mid-gray mt-1">Complete all 6 steps to submit the solar site assessment.</p>
      </div>
      
      <SiteVisitForm jobId={jobId} />
    </div>
  );
}

export default function NewSiteVisitPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <NewSiteVisitContent />
    </Suspense>
  );
}
