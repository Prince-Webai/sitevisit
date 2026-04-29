'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, Save, 
  User, Camera, Sun, 
  Zap, ShieldCheck, CheckCircle2,
  BookMarked, RotateCcw, Loader2, Clock
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import { LocationCapturer } from './LocationCapturer';
import { PhotoInput } from './PhotoInput';
import { VideoInput } from './VideoInput';
import { createClient } from '@/lib/supabase/client';
import { siteVisitService } from '@/lib/supabase/site-visit-service';
import { jobService } from '@/lib/supabase/service';
import type { SiteVisitData } from '@/types/site-visit';

const STEPS = [
  { id: 1, title: 'Client & Context', icon: User },
  { id: 2, title: 'Perimeter Photos', icon: Camera },
  { id: 3, title: 'Solar Space Details', icon: Sun },
  { id: 4, title: 'Structure & Electrical', icon: Zap },
  { id: 5, title: 'Logistics & Personnel', icon: ShieldCheck },
  { id: 6, title: 'Declaration & Submission', icon: CheckCircle2 },
];

// Draft key per job — stored in localStorage for offline resilience
function getDraftKey(jobId?: string) {
  return jobId ? `tn_sv_draft_${jobId}` : 'tn_sv_draft_new';
}

export function SiteVisitForm({ jobId, onSuccess }: { jobId?: string, onSuccess?: () => void }) {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreLoading, setIsPreLoading] = useState(!!jobId);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const signatureRef = useRef<SignatureCanvas>(null);
  const supabase = createClient();
  const draftKey = getDraftKey(jobId);

  const methods = useForm<SiteVisitData>({
    defaultValues: {
      photos: {},
      videos: {},
      solarSpace: { southFacing: false },
      structure: { lightningArrestor: false, additionalPipe: false },
      electrical: { inverterLocation: 'Same floor' },
    }
  });

  const { watch, setValue, handleSubmit, reset, formState: { errors } } = methods;

  // ── 1. Check localStorage for a draft immediately on mount (sync/instant) ──
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        JSON.parse(saved); // validate it's parseable
        setShowDraftBanner(true); // show banner, let user decide
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Load DB data (async) ──
  useEffect(() => {
    async function loadData() {
      if (!jobId) return;
      setIsPreLoading(true);
      try {
        // Try to load existing completed site visit from DB
        const existingData = await siteVisitService.fetchByJobId(jobId);
        if (existingData) {
          // DB record exists — only reset if user hasn't restored a draft
          if (!showDraftBanner) reset(existingData);
          return;
        }

        // No site visit yet — pre-fill from job/client data
        const job = await jobService.fetchJobById(jobId);
        if (job) {
          setValue('clientName', `${job.client?.first_name || ''} ${job.client?.last_name || ''}`.trim() || 'Valued Client');
          setValue('clientPhone', job.client?.phone || job.client?.mobile || '');
          setValue('siteAddress', job.address || '');
          if (job.latitude && job.longitude) {
            setValue('siteGps', { lat: Number(job.latitude), lng: Number(job.longitude) });
          }
        }
      } catch (error) {
        console.error('Failed to load site visit or job data:', error);
      } finally {
        setIsPreLoading(false);
      }
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // ── 3. Auto-save form to localStorage on every change ──
  useEffect(() => {
    if (isPreLoading) return; // don't save while loading
    const subscription = methods.watch((values) => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(values));
        setLastSaved(new Date());
      } catch { /* storage quota exceeded — ignore */ }
    });
    return () => subscription.unsubscribe();
  }, [isPreLoading, draftKey, methods]);

  // ── Draft helpers ──
  const restoreDraft = useCallback(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        reset(JSON.parse(saved));
        toast.success('Draft restored! Continue where you left off.');
      } catch {
        toast.error('Could not restore draft.');
      }
    }
    setShowDraftBanner(false);
  }, [draftKey, reset]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setShowDraftBanner(false);
    toast('Draft discarded.');
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setLastSaved(null);
  }, [draftKey]);

  const nextStep = async () => {
    // Validate required fields before leaving Step 1
    if (currentStep === 1) {
      const valid = await methods.trigger(['clientName', 'clientPhone', 'siteAddress']);
      if (!valid) {
        toast.error('Please fill in all required fields before continuing.');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const onSubmit = async (data: SiteVisitData) => {
    if (!jobId) {
      toast.error('No job ID associated with this visit.');
      return;
    }

    setIsSubmitting(true);
    try {
      const signatureData = signatureRef.current?.isEmpty() 
        ? data.signature 
        : signatureRef.current?.toDataURL();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await siteVisitService.upsertSiteVisit(jobId, user.id, {
        ...data,
        signature: signatureData
      });

      // Clear the draft from localStorage on success
      clearDraft();
      toast.success('Site visit submitted successfully!');
      onSuccess?.();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit site visit. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const floors = watch('noOfFloors');
  const mountType = watch('structure.size');
  const lightningArrestor = watch('structure.lightningArrestor');

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-light-gray min-h-[600px] flex flex-col">

      {/* ── Draft Restore Banner ── */}
      <AnimatePresence>
        {showDraftBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-200 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <BookMarked className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800">Unsaved draft found</p>
                <p className="text-xs text-amber-600">You have a draft saved locally. Resume where you left off?</p>
              </div>
              <button
                onClick={restoreDraft}
                className="shrink-0 text-xs font-bold text-primary bg-white px-3 py-1.5 rounded-lg border border-primary/30 hover:bg-primary/5 transition-colors"
              >
                Resume Draft
              </button>
              <button
                onClick={discardDraft}
                className="shrink-0 text-xs text-mid-gray hover:text-charcoal transition-colors p-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Header */}
      <div className="bg-off-white border-b border-light-gray p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-charcoal">{t('site_visit_form')}</h1>
            <p className="text-xs text-mid-gray mt-1">Step {currentStep} of 6: {STEPS[currentStep-1].title}</p>
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-mid-gray">
                <Clock className="w-3 h-3" />
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => i18n.changeLanguage('en')}>EN</Button>
            <Button variant="outline" size="sm" onClick={() => i18n.changeLanguage('ta')}>TA</Button>
          </div>
        </div>

        <div className="relative h-2 bg-light-gray rounded-full overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / 6) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        
        <div className="flex justify-between mt-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5 w-12">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'bg-primary text-white scale-110 shadow-lg' : 
                  isCompleted ? 'bg-primary/20 text-primary' : 'bg-white text-mid-gray border border-light-gray'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* STEP 1: Client & Context */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {isPreLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-mid-gray">Loading job data...</p>
                    </div>
                  ) : (
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-charcoal">{t('client_name')} <span className="text-red-500">*</span></label>
                      <Input
                        {...methods.register('clientName', { required: 'Client name is required' })}
                        placeholder="e.g. John Doe"
                        className={errors.clientName ? 'border-red-400 focus-visible:ring-red-400' : ''}
                      />
                      {errors.clientName && <p className="text-xs text-red-500">{errors.clientName.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-charcoal">{t('client_phone')} <span className="text-red-500">*</span></label>
                      <Input
                        {...methods.register('clientPhone', { required: 'Client phone is required' })}
                        placeholder="e.g. +91 98765 43210"
                        className={errors.clientPhone ? 'border-red-400 focus-visible:ring-red-400' : ''}
                      />
                      {errors.clientPhone && <p className="text-xs text-red-500">{errors.clientPhone.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-charcoal">{t('site_address')} <span className="text-red-500">*</span></label>
                    <Textarea
                      {...methods.register('siteAddress', { required: 'Site address is required' })}
                      placeholder="Full address of the site"
                      className={`h-24 ${errors.siteAddress ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                    />
                    {errors.siteAddress && <p className="text-xs text-red-500">{errors.siteAddress.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-charcoal">{t('no_of_floors')}</label>
                      <Select onValueChange={(val) => setValue('noOfFloors', val || undefined as any)} value={floors || undefined}>
                        <SelectTrigger><SelectValue placeholder="Select floors" /></SelectTrigger>
                        <SelectContent>
                          {['B+G', 'G', 'G+1', 'G+2', 'G+3', 'G+4', 'Other'].map(v => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {floors === 'Other' && (
                        <Input {...methods.register('otherFloorValue')} placeholder="Specify floor value" className="mt-2" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-charcoal">{t('phase')}</label>
                      <Select onValueChange={(val) => setValue('phase', val || undefined as any)}>
                        <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                        <SelectContent>
                          {['Single Phase', 'Two Phase', 'Three Phase'].map(v => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <label className="text-sm font-semibold text-charcoal">Site Geolocation</label>
                    <LocationCapturer 
                      onCapture={(coords) => setValue('siteGps', coords)} 
                      value={watch('siteGps')}
                    />
                  </div>
                  </>
                  )}
                </div>
              )}

              {/* STEP 2: Perimeter Photos */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PhotoInput label="House Front Photo" path="house/front" jobId={jobId} onUpload={(url) => setValue('photos.front', url)} value={watch('photos.front')} />
                    <PhotoInput label="House Left Photo" path="house/left" jobId={jobId} onUpload={(url) => setValue('photos.left', url)} value={watch('photos.left')} />
                    <PhotoInput label="House Right Photo" path="house/right" jobId={jobId} onUpload={(url) => setValue('photos.right', url)} value={watch('photos.right')} />
                    <PhotoInput label="House Back Photo" path="house/back" jobId={jobId} onUpload={(url) => setValue('photos.back', url)} value={watch('photos.back')} />
                  </div>
                  <div className="pt-2">
                    <PhotoInput label="Solar System Location" path="house/solar" jobId={jobId} onUpload={(url) => setValue('photos.solarSystemLocation', url)} value={watch('photos.solarSystemLocation')} />
                  </div>
                </div>
              )}

              {/* STEP 3: Solar Space Details */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-1">Available Solar Area</h3>
                    <p className="text-xs text-mid-gray leading-relaxed">Measure the length and width of the roof or ground space intended for solar panel installation.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-charcoal">Length (m)</label>
                      <Input type="number" {...methods.register('solarSpace.length')} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-charcoal">Width (m)</label>
                      <Input type="number" {...methods.register('solarSpace.width')} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-off-white rounded-xl border border-light-gray">
                    <Checkbox 
                      id="south-facing" 
                      checked={watch('solarSpace.southFacing')} 
                      onCheckedChange={(val) => setValue('solarSpace.southFacing', !!val)}
                    />
                    <label htmlFor="south-facing" className="text-sm font-medium cursor-pointer">South Facing?</label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-charcoal">Shape of Area</label>
                    <Select onValueChange={(val) => setValue('solarSpace.shape', val || undefined as any)}>
                      <SelectTrigger><SelectValue placeholder="Select shape" /></SelectTrigger>
                      <SelectContent>
                        {['Rectangle', 'Square', 'L-Shape', 'Irregular', 'Other'].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <VideoInput label="Shadow Analysis (Video/Panorama)" path="videos/shadow" jobId={jobId} onUpload={(url) => setValue('videos.shadowAnalysis', url)} value={watch('videos.shadowAnalysis')} />
                </div>
              )}

              {/* STEP 4: Structure & Electrical */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-charcoal">Mount Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['HIGH RAISE', 'MID RAISE', 'LOW RAISE', 'CUSTOM DESIGN'].map(v => (
                        <Button
                          key={v}
                          type="button"
                          variant={mountType === v ? 'default' : 'outline'}
                          className={mountType === v ? 'bg-primary' : ''}
                          onClick={() => setValue('structure.size', v)}
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {mountType === 'CUSTOM DESIGN' && (
                    <PhotoInput label="Custom Structure Design" jobId={jobId} onUpload={(url) => setValue('photos.structureCustomDesign', url)} value={watch('photos.structureCustomDesign')} />
                  )}
                  
                  <div className="flex items-center gap-3 p-4 bg-off-white rounded-xl border border-light-gray">
                    <Checkbox 
                      id="lightning-arrestor" 
                      checked={lightningArrestor} 
                      onCheckedChange={(val) => setValue('structure.lightningArrestor', !!val)}
                    />
                    <label htmlFor="lightning-arrestor" className="text-sm font-medium cursor-pointer">Pipe required for lightning arrestor?</label>
                  </div>

                  {lightningArrestor && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-charcoal">Location of Lightning Arrestor</label>
                        <Input {...methods.register('structure.lightArrestorLocation')} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-charcoal">How much in Meters?</label>
                        <Input type="number" {...methods.register('structure.pipeLength')} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-charcoal">Inverter Location</label>
                    <Select onValueChange={(val) => setValue('electrical.inverterLocation', (val || 'Same floor') as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Same floor">Same floor</SelectItem>
                        <SelectItem value="Ground floor">Ground floor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <PhotoInput label="Inverter Location Photo" jobId={jobId} onUpload={(url) => setValue('photos.inverter', url)} value={watch('photos.inverter')} />
                  <VideoInput label="Plant to Inverter Video" jobId={jobId} onUpload={(url) => setValue('videos.plantToInverter', url)} value={watch('videos.plantToInverter')} />
                  <VideoInput label="Inverter to Earthing Video" jobId={jobId} onUpload={(url) => setValue('videos.inverterToEarthing', url)} value={watch('videos.inverterToEarthing')} />
                </div>
              )}

              {/* STEP 5: Logistics & Personnel */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PhotoInput label="Engineer Photo / Selfie" jobId={jobId} onUpload={(url) => setValue('photos.engineer', url)} value={watch('photos.engineer')} />
                    <PhotoInput label="Client Photo" jobId={jobId} onUpload={(url) => setValue('photos.client', url)} value={watch('photos.client')} />
                  </div>
                  <PhotoInput label="Location of ACDB and DCDB Earthing" jobId={jobId} onUpload={(url) => setValue('photos.acdbDcdb', url)} value={watch('photos.acdbDcdb')} />
                  <VideoInput label="Lightning Arrestor Earthing Location" jobId={jobId} onUpload={(url) => setValue('videos.lightningArrestorEarthing', url)} value={watch('videos.lightningArrestorEarthing')} />
                  <PhotoInput label="Road Access Photo" jobId={jobId} onUpload={(url) => setValue('photos.roadAccess', url)} value={watch('photos.roadAccess')} />
                </div>
              )}

              {/* STEP 6: Declaration & Signature */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl space-y-4">
                    <p className="text-sm font-medium text-charcoal leading-relaxed">
                      <span className="block mb-2 text-primary uppercase text-[10px] font-bold tracking-widest">English</span>
                      {t('declaration_en')}
                    </p>
                    <div className="h-px bg-primary/10" />
                    <p className="text-sm font-medium text-charcoal leading-relaxed">
                      <span className="block mb-2 text-primary uppercase text-[10px] font-bold tracking-widest">Tamil</span>
                      {t('declaration_ta')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-charcoal">{t('sign_here')}</label>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => signatureRef.current?.clear()}
                        className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        {t('clear')}
                      </Button>
                    </div>
                    <div className="border-2 border-light-gray rounded-xl bg-off-white overflow-hidden h-64 relative touch-none">
                      <SignatureCanvas
                        ref={signatureRef}
                        penColor="black"
                        canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </form>
      </FormProvider>

      {/* Footer Navigation */}
      <div className="bg-white border-t border-light-gray p-6 flex justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="h-12 px-8 font-semibold"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>

        {currentStep < 6 ? (
          <Button
            type="button"
            onClick={nextStep}
            className="h-12 px-8 bg-primary hover:bg-primary-dark font-semibold text-white shadow-lg shadow-primary/20"
          >
            {t('next')}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 px-8 bg-secondary hover:bg-orange-light font-bold text-white shadow-lg shadow-secondary/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t('submit')}
          </Button>
        )}
      </div>
    </div>
  );
}
