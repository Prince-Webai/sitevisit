'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { jobService } from '@/lib/supabase/service';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import { User, Phone, Mail, MapPin, ClipboardList, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BookSiteVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: FormData = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

export function BookSiteVisitDialog({ open, onOpenChange, onSuccess }: BookSiteVisitDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [jobNumber, setJobNumber] = useState('');

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleClose = (v: boolean) => {
    if (!v) {
      setForm(EMPTY_FORM);
      setDone(false);
      setJobNumber('');
    }
    onOpenChange(v);
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) { toast.error('Customer first name is required'); return; }
    if (!form.phone.trim())     { toast.error('Phone number is required'); return; }
    if (!form.address.trim())   { toast.error('Site address is required'); return; }

    // Safety timeout — never hang longer than 15s
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast.error('Booking timed out. Please check your connection and try again.');
    }, 15000);

    try {
      setLoading(true);

      // 1. Check for duplicate phone first
      const supabase = createClient();
      const { data: clients, error: lookupError } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', form.phone.trim())
        .limit(1);

      if (lookupError) throw new Error(`Client lookup failed: ${lookupError.message}`);

      let clientId: string;
      if (clients && clients.length > 0) {
        // Reuse existing client instead of creating duplicate
        clientId = clients[0].id;
        toast('Existing client found for this phone number — linked to job.');
      } else {
        const client = await jobService.createClient({
          first_name: form.firstName.trim(),
          last_name:  form.lastName.trim() || '-',
          email:      form.email.trim() || null as any,
          phone:      form.phone.trim(),
          address:    form.address.trim(),
        });
        clientId = client.id;
      }

      // 2. Create the job as a Site Assessment
      const job = await jobService.createJob({
        client_id:           clientId,
        address:             form.address.trim(),
        status:              'Lead' as any,
        category:            'Site Assessment' as any,
        description:         form.notes.trim() || 'Site visit booked by sales',
        contact_name:        `${form.firstName} ${form.lastName}`.trim(),
        contact_email:       form.email.trim(),
        contact_phone:       form.phone.trim(),
        requires_site_visit: true,
        materials_status:    'Pending'
      });

      // 3. Log activity (non-blocking)
      if (user) {
        jobService.logActivity({
          userId: user.id,
          action: 'job_created',
          entityType: 'job',
          entityId: job.id,
          details: `Site Visit booked for ${form.firstName} ${form.lastName} by sales team.`
        }).catch(console.error);
      }

      clearTimeout(timeoutId);
      setJobNumber(job.job_number);
      setDone(true);
      onSuccess?.();
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Booking error:', err);
      toast.error(err?.message || 'Failed to book site visit. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-2xl overflow-hidden">

        {/* ── Success State ── */}
        {done ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-primary/30 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-charcoal">Site Visit Booked!</p>
              <p className="text-sm text-mid-gray mt-1">
                Job <span className="font-semibold text-primary">{jobNumber}</span> has been created.
              </p>
              <p className="text-xs text-mid-gray mt-1">
                Head to the <strong>Dispatch Board</strong> to allocate an engineer.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                className="border-light-gray text-dark-gray"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  handleClose(false);
                  window.location.href = '/dispatch';
                }}
                className="bg-primary hover:bg-primary-dark text-white gap-1.5"
              >
                Go to Dispatch Board <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-light-gray bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-charcoal">Book Site Visit</DialogTitle>
                  <p className="text-xs text-mid-gray mt-0.5">Enter customer details to create a site visit job</p>
                </div>
              </div>
            </DialogHeader>

            {/* ── Form ── */}
            <div className="px-6 py-5 space-y-5">

              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id="sv-first-name"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={set('firstName')}
                    className="h-10 bg-off-white border-light-gray focus:border-primary/50"
                  />
                  <Input
                    id="sv-last-name"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={set('lastName')}
                    className="h-10 bg-off-white border-light-gray focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <Input
                  id="sv-phone"
                  type="tel"
                  placeholder="e.g. 98765 43210"
                  value={form.phone}
                  onChange={set('phone')}
                  className="h-10 bg-off-white border-light-gray focus:border-primary/50"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-mid-gray" />
                  Email <span className="text-xs text-mid-gray font-normal">(optional)</span>
                </label>
                <Input
                  id="sv-email"
                  type="email"
                  placeholder="customer@email.com"
                  value={form.email}
                  onChange={set('email')}
                  className="h-10 bg-off-white border-light-gray focus:border-primary/50"
                />
              </div>

              {/* Site Address */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Site Address <span className="text-red-500">*</span>
                </label>
                <Input
                  id="sv-address"
                  placeholder="Full address or Google Maps link"
                  value={form.address}
                  onChange={set('address')}
                  className="h-10 bg-off-white border-light-gray focus:border-primary/50"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-charcoal">
                  Notes <span className="text-xs text-mid-gray font-normal">(optional)</span>
                </label>
                <Textarea
                  id="sv-notes"
                  placeholder="Any special requirements or notes..."
                  value={form.notes}
                  onChange={set('notes')}
                  className="min-h-[80px] bg-off-white border-light-gray focus:border-primary/50 resize-none"
                />
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 pb-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                className="flex-1 border-light-gray text-dark-gray"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                id="sv-submit"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold shadow-md shadow-primary/20 gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Booking...</>
                ) : (
                  <><ClipboardList className="w-4 h-4" /> Book Site Visit</>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
