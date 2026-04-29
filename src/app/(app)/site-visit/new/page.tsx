'use client';

export const dynamic = 'force-dynamic';

import { SiteVisitForm } from '@/components/site-visit/SiteVisitForm';

export default function NewSiteVisitPage() {
  return (
    <div className="p-4 md:p-8 bg-off-white min-h-screen">
      <div className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-charcoal">New Site Survey</h1>
        <p className="text-mid-gray mt-1">Complete all 6 steps to submit the solar site assessment.</p>
      </div>
      
      <SiteVisitForm />
    </div>
  );
}
