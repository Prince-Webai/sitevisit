'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronDown, Printer, FileText, Receipt, MoreHorizontal, Loader2, Trash2 } from 'lucide-react';
import { DetailsTab } from './details-tab';
import { SavedTab } from './saved-tab';
import { SiteVisitForm } from '../site-visit/SiteVisitForm';
import { SiteVisitReport } from '../site-visit/SiteVisitReport';
import { siteVisitService } from '@/lib/supabase/site-visit-service';
import type { SiteVisitData } from '@/types/site-visit';
import { jobService } from '@/lib/supabase/service';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'site-visit', label: 'Assessment' },
  { id: 'activity', label: 'Activity' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface JobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string;
  onSuccess?: () => void;
}

export function JobModal({ open, onOpenChange, jobId, onSuccess }: JobModalProps) {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [createdByName, setCreatedByName] = useState<string | null>(null);
  const isEditing = !!jobId;

  const handleDelete = async () => {
    if (!jobId || !user) return;

    try {
      setIsDeleting(true);
      
      // Fetch job number for logging
      const job = await jobService.fetchJobById(jobId);
      const jobNumber = job?.job_number || 'Unknown';

      await jobService.deleteJob(jobId);
      
      // Log activity — pass userName directly so no extra DB round-trip is needed
      await jobService.logActivity({
        userId: user.id,
        userName: profile?.full_name,
        action: 'job_deleted',
        entityType: 'job',
        entityId: jobId,
        details: `Deleted Job #${jobNumber}`
      });

      toast.success(`Job #${jobNumber} deleted successfully`);
      setDeleteConfirmOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to delete job:', err);
      toast.error('Failed to delete job');
    } finally {
      setIsDeleting(false);
    }
  };

  // Load creator name when modal opens for an existing job
  useEffect(() => {
    if (!open || !jobId) {
      Promise.resolve().then(() => setCreatedByName(null));
      return;
    }
    jobService.fetchJobById(jobId).then(job => {
      setCreatedByName(job?.created_by_profile?.full_name ?? null);
    }).catch(() => {});
  }, [open, jobId]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:max-w-[1000px] h-[85vh] p-0 flex flex-col gap-0 bg-white overflow-hidden [&>button]:top-4 [&>button]:right-4"
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-light-gray shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-charcoal">
                {isEditing ? `Edit Job` : 'New Job'}
              </DialogTitle>
              {isEditing && createdByName && (
                <p className="text-xs text-mid-gray mt-0.5">
                  Created by <span className="font-semibold text-dark-gray">{createdByName}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 mr-6">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 gap-1.5 px-3 text-xs rounded-md border border-light-gray bg-white hover:bg-off-white transition-colors font-medium">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    More
                    <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Printer className="w-4 h-4" /> Print Quote
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <FileText className="w-4 h-4" /> Print Work Order
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Receipt className="w-4 h-4" /> Print Invoice
                  </DropdownMenuItem>
                  {profile?.role === 'Admin' && isEditing && (
                    <>
                      <div className="h-px bg-light-gray my-1" />
                      <DropdownMenuItem 
                        onClick={() => setDeleteConfirmOpen(true)}
                        disabled={isDeleting}
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5"
                      >
                        <Trash2 className="w-4 h-4" /> 
                        {isDeleting ? 'Deleting...' : 'Delete Job'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Bar */}
        <div className="flex border-b border-light-gray shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-all relative ${
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-mid-gray hover:text-dark-gray'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <DetailsTab jobId={jobId} onSuccess={() => {
              onSuccess?.();
              onOpenChange(false);
            }} />
          )}
          {activeTab === 'site-visit' && jobId && (
            <SiteVisitTab jobId={jobId} onSuccess={onSuccess} />
          )}
          {activeTab === 'activity' && <SavedTab jobId={jobId} />}
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">Delete this Job?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the job, all associated site visit data, and activity logs.
            This action <strong>cannot be undone</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete Job'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function SiteVisitTab({ jobId, onSuccess }: { jobId: string, onSuccess?: () => void }) {
  const { profile } = useAuth();
  const [data, setData] = useState<SiteVisitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const visit = await siteVisitService.fetchByJobId(jobId);
        setData(visit);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  const handleSuccess = async () => {
    // 1. Reload the report data
    const visit = await siteVisitService.fetchByJobId(jobId);
    setData(visit);
    setIsEditing(false); // Back to report view
    
    // 2. Trigger modal-level success
    onSuccess?.();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // If visit is completed and we're not in edit mode, show report
  if (data && !isEditing) {
    return (
      <div className="p-6 bg-off-white min-h-full space-y-4">
        <div className="max-w-4xl mx-auto flex justify-end">
          {['Admin', 'Engineer', 'Technician', 'Dispatcher'].includes(profile?.role || '') && (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
            >
              Edit Assessment
            </button>
          )}
        </div>
        <SiteVisitReport data={data} />
      </div>
    );
  }

  // Otherwise show the form
  return (
    <div className="p-6 bg-off-white min-h-full">
      {isEditing && (
        <div className="max-w-4xl mx-auto mb-4 flex justify-start">
          <button 
            onClick={() => setIsEditing(false)}
            className="text-xs font-bold text-mid-gray hover:text-charcoal flex items-center gap-1.5"
          >
            ← Back to Report
          </button>
        </div>
      )}
      <SiteVisitForm jobId={jobId} onSuccess={handleSuccess} />
    </div>
  );
}


