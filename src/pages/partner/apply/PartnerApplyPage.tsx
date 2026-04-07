import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import {
  useMyApplication,
  useUpsertDraft,
  useSubmitApplication,
} from '@/hooks/usePartnerApplication';
import { PartnerApplication, ApplicationDocument, FIELD_MAP, highlightField } from '@/types/application';

import { PartnerApplyLayout } from './PartnerApplyLayout';
import { Step1Identity } from './steps/Step1Identity';
import { Step2Venue } from './steps/Step2Venue';
import { Step3Documents } from './steps/Step3Documents';
import { Step4Review } from './steps/Step4Review';

type Step = 1 | 2 | 3 | 4;

export default function PartnerApplyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PartnerApplication>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [initialized, setInitialized] = useState(false);
  // Field to scroll-to after a step transition triggered from the missing-items list
  const [pendingHighlight, setPendingHighlight] = useState<string | null>(null);

  const { data: existingApp, isLoading: appLoading } = useMyApplication();
  const upsertDraft = useUpsertDraft(applicationId);
  const submitApplication = useSubmitApplication();

  // Debounce timer ref for auto-save
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount / data load: initialize state from existing application
  useEffect(() => {
    if (appLoading || initialized) return;

    if (existingApp) {
      const { status } = existingApp;
      if (
        status === 'submitted' ||
        status === 'under_verification' ||
        status === 'needs_more_information'
      ) {
        navigate('/partner/apply/status', { replace: true });
        return;
      }
      if (status === 'approved') {
        navigate('/partner/dashboard', { replace: true });
        return;
      }
      if (status === 'draft') {
        setApplicationId(existingApp.id);
        setFormData(existingApp);
        setStep((existingApp.current_step as Step) || 1);
        setInitialized(true);
        return;
      }
    }

    // No application or unrecognized status → start fresh
    setInitialized(true);
  }, [existingApp, appLoading, initialized, navigate]);

  // Auto-save: debounce 30 seconds after any formData change
  useEffect(() => {
    if (!initialized || !user) return;
    if (!formData || Object.keys(formData).length === 0) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const id = await upsertDraft.mutateAsync({ ...formData, current_step: step });
        if (!applicationId) setApplicationId(id);
        setLastSaved(new Date());
      } catch (err) {
        // onError in useUpsertDraft already shows the toast; log for debugging
        console.error('[auto-save error]', err);
      }
    }, 30_000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, step, initialized, user]);

  // Manual save draft
  const handleSaveDraft = async () => {
    if (!user) return;
    try {
      const id = await upsertDraft.mutateAsync({ ...formData, current_step: step });
      if (!applicationId) setApplicationId(id);
      setLastSaved(new Date());
      toast.success('Draft saved');
    } catch (err) {
      // onError in useUpsertDraft already toasts the real message; log here for debugging
      console.error('[handleSaveDraft error]', err);
    }
  };

  // Advance to next step, merging new data + saving draft
  const handleNext = async (data: Partial<PartnerApplication>) => {
    const merged = { ...formData, ...data, current_step: step + 1 };
    setFormData(merged);

    try {
      const id = await upsertDraft.mutateAsync(merged);
      if (!applicationId) setApplicationId(id);
      setLastSaved(new Date());
    } catch (err) {
      // onError in useUpsertDraft already shows the toast; log for debugging
      console.error('[handleNext draft save error]', err);
    }

    setStep((prev) => Math.min(prev + 1, 4) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Go back to previous step
  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1) as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Called when user clicks a missing-item row in Step 4's error list.
   * Looks up the FIELD_MAP to find which step and field id to target.
   * If already on the right step → highlight immediately.
   * Otherwise → navigate to the step and set a pending highlight to fire after mount.
   */
  const navigateToField = (key: string) => {
    const mapping = FIELD_MAP[key];
    if (!mapping) return;

    if (mapping.step === step) {
      // Same step — scroll + highlight directly (no remount needed)
      highlightField(mapping.fieldId);
      return;
    }

    // Different step — navigate first, then highlight after the component mounts
    setPendingHighlight(mapping.fieldId);
    setStep(mapping.step as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final submission
  const handleSubmit = async () => {
    if (!applicationId) {
      toast.error('Application not saved yet. Please try again.');
      return;
    }
    try {
      await submitApplication.mutateAsync(applicationId);
      navigate('/partner/apply/status', { replace: true });
    } catch {
      // Error is toasted by hook
    }
  };

  // Loading states
  if (authLoading || appLoading || !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(240_10%_4%)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[hsl(240_10%_4%)] px-4 text-center">
        <h2 className="mb-3 text-2xl font-bold text-white">Sign in to Apply</h2>
        <p className="mb-6 text-muted-foreground">
          You need to be signed in to apply as a TAPN partner.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const documents: ApplicationDocument[] = existingApp?.documents ?? [];

  return (
    <PartnerApplyLayout
      step={step}
      lastSaved={lastSaved}
      onSaveDraft={handleSaveDraft}
    >
      {step === 1 && (
        <Step1Identity
          formData={formData}
          onNext={handleNext}
          initialFocusField={pendingHighlight}
          onClearHighlight={() => setPendingHighlight(null)}
        />
      )}

      {step === 2 && (
        <Step2Venue
          formData={formData}
          onNext={handleNext}
          onBack={handleBack}
          initialFocusField={pendingHighlight}
          onClearHighlight={() => setPendingHighlight(null)}
        />
      )}

      {step === 3 && (
        <Step3Documents
          formData={formData}
          applicationId={applicationId}
          onNext={() => {
            setStep(4);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBack={handleBack}
          documents={documents}
          initialFocusField={pendingHighlight}
          onClearHighlight={() => setPendingHighlight(null)}
        />
      )}

      {step === 4 && applicationId && (
        <Step4Review
          formData={formData}
          applicationId={applicationId}
          documents={documents}
          onBack={handleBack}
          onSubmit={handleSubmit}
          isSubmitting={submitApplication.isPending}
          onNavigateToField={navigateToField}
        />
      )}

      {step === 4 && !applicationId && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <p className="text-muted-foreground">
            Something went wrong — no application ID found. Please go back and try again.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 text-primary underline"
          >
            Go back
          </button>
        </div>
      )}
    </PartnerApplyLayout>
  );
}
