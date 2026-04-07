import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PartnerApplication,
  ApplicationDocument,
  DOCUMENT_LABELS,
  VENUE_CATEGORY_LABELS,
  getMissingRequirements,
  computeCompletenessScore,
  REQUIRED_DOCS_BY_ROLE,
} from '@/types/application';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Step4ReviewProps {
  formData: Partial<PartnerApplication>;
  applicationId: string;
  documents: ApplicationDocument[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  /** Called when user clicks a missing-item error to jump to that field */
  onNavigateToField?: (key: string) => void;
  /** Called whenever the declaration checkbox changes — lifts state into parent formData */
  onDeclarationChange?: (value: boolean) => void;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function ReviewSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-foreground text-sm">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <div className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-muted-foreground text-sm w-44 flex-shrink-0">{label}</span>
      <span className="text-foreground text-sm break-all">{display}</span>
    </div>
  );
}

// ─── Masked field row ─────────────────────────────────────────────────────────

function MaskedFieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  const [revealed, setRevealed] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-muted-foreground text-sm w-44 flex-shrink-0">{label}</span>
      <span className="text-foreground text-sm font-mono flex items-center gap-2">
        {revealed ? value : '•'.repeat(Math.min(value.length, 12))}
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </span>
    </div>
  );
}

// ─── Completeness indicator ───────────────────────────────────────────────────

function CompletenessRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 flex-shrink-0">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={radius} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
          {score}%
        </span>
      </div>
      <div>
        <p className="font-semibold text-foreground">Application completeness</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {score === 100 ? 'Ready to submit!' : score >= 80 ? 'Almost ready' : 'Incomplete — see checklist below'}
        </p>
      </div>
    </div>
  );
}

// ─── Checklist item ───────────────────────────────────────────────────────────

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
      )}
      <span className={`text-sm ${ok ? 'text-foreground' : 'text-red-400'}`}>{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Step4Review({
  formData,
  applicationId: _applicationId,
  documents,
  onBack,
  onSubmit,
  isSubmitting,
  onNavigateToField,
  onDeclarationChange,
}: Step4ReviewProps) {
  // Initialize from formData so a restored draft pre-checks the box
  const [declaration, setDeclaration] = useState(formData.declaration_confirmed ?? false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const score = computeCompletenessScore(formData, documents);
  // Merge local declaration state so missing recomputes whenever the checkbox changes
  const missing = getMissingRequirements(
    { ...formData, declaration_confirmed: declaration },
    documents
  );

  const role = formData.role_at_venue ?? 'owner';
  const requiredDocs = REQUIRED_DOCS_BY_ROLE[role];
  const uploadedDocTypes = documents.map((d) => d.document_type);

  // Checklist booleans
  const step1Complete = !!(
    formData.full_name && formData.role_at_venue && formData.phone &&
    formData.business_email && formData.national_id
  );
  const step2Complete = !!(
    formData.venue_name && formData.venue_category && formData.address_line1 &&
    formData.city && formData.google_maps_link && formData.seating_capacity &&
    formData.avg_spend_per_person && formData.description && (formData.description?.length ?? 0) >= 50
  );
  const docsComplete = requiredDocs.every((dt) => uploadedDocTypes.includes(dt));

  // declaration_confirmed is already baked into `missing` via the merged object above
  const canSubmit = missing.length === 0;

  // Opening hours display
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const DAY_LABELS: Record<string, string> = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
  };

  const handleSubmitClick = () => {
    if (!canSubmit) return;
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    onSubmit();
  };

  return (
    <div className="space-y-6">
      {/* Completeness overview */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <CompletenessRing score={score} />
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="font-semibold text-foreground text-sm mb-3">Submission checklist</p>
        <CheckItem ok={step1Complete} label="Personal information complete" />
        <CheckItem ok={step2Complete} label="Venue details complete" />
        <CheckItem ok={docsComplete} label="All required documents uploaded" />
        <CheckItem ok={declaration} label="Declaration confirmed" />
      </div>

      {/* Application data review */}
      <ReviewSection title="1 — Your Identity & Contact">
        <div className="mt-2 space-y-0">
          <FieldRow label="Full name" value={formData.full_name} />
          <FieldRow label="Role at venue" value={
            formData.role_at_venue === 'owner' ? 'Venue Owner' :
            formData.role_at_venue === 'general_manager' ? 'General Manager' :
            formData.role_at_venue === 'authorized_manager' ? 'Authorized Manager' :
            formData.role_at_venue
          } />
          <FieldRow label="Phone" value={formData.phone} />
          <FieldRow label="Business email" value={formData.business_email} />
          <MaskedFieldRow label="National ID" value={formData.national_id} />
          <FieldRow label="LinkedIn" value={formData.linkedin_url} />
        </div>
      </ReviewSection>

      <ReviewSection title="2 — Venue Details">
        <div className="mt-2 space-y-0">
          <FieldRow label="Venue name" value={formData.venue_name} />
          <FieldRow label="Category" value={
            formData.venue_category ? VENUE_CATEGORY_LABELS[formData.venue_category] : undefined
          } />
          <FieldRow label="Address" value={[formData.address_line1, formData.address_line2].filter(Boolean).join(', ')} />
          <FieldRow label="City" value={formData.city} />
          <FieldRow label="Country" value={formData.country} />
          <FieldRow label="Google Maps" value={formData.google_maps_link} />
          <FieldRow label="Website" value={formData.website_url} />
          <FieldRow label="Instagram" value={formData.instagram_handle ? `@${formData.instagram_handle}` : undefined} />
          <FieldRow label="Seating capacity" value={formData.seating_capacity} />
          <FieldRow label="Private hire" value={formData.private_hire_available} />
          <FieldRow label="Avg spend / person" value={formData.avg_spend_per_person ? `₮${formData.avg_spend_per_person.toLocaleString()}` : undefined} />
          <FieldRow label="Description" value={formData.description} />
          {formData.opening_hours && (
            <div className="py-1.5">
              <p className="text-muted-foreground text-sm mb-1">Opening hours</p>
              <div className="grid grid-cols-1 gap-0.5 pl-2">
                {DAYS.map((day) => {
                  const h = formData.opening_hours?.[day];
                  return (
                    <div key={day} className="flex gap-3 text-sm">
                      <span className="text-muted-foreground w-24">{DAY_LABELS[day]}</span>
                      <span className="text-foreground">
                        {h?.closed ? 'Closed' : h ? `${h.open} – ${h.close}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ReviewSection>

      <ReviewSection title="3 — Verification Documents">
        <div className="mt-2 space-y-2">
          {requiredDocs.map((docType) => {
            const uploaded = documents.find((d) => d.document_type === docType);
            return (
              <div key={docType} className="flex items-center gap-3">
                {uploaded ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                )}
                <span className="text-sm text-foreground flex-1">{DOCUMENT_LABELS[docType]}</span>
                {uploaded ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                    {uploaded.file_name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                    Missing
                  </Badge>
                )}
              </div>
            );
          })}
          {/* Optional docs that were uploaded */}
          {documents
            .filter((d) => !requiredDocs.includes(d.document_type))
            .map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span className="text-sm text-foreground flex-1">{DOCUMENT_LABELS[d.document_type]}</span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                  {d.file_name}
                </Badge>
              </div>
            ))}
        </div>
      </ReviewSection>

      {/* Missing items warning — each item is clickable to jump to the field */}
      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <p className="text-amber-400 font-medium text-sm">
              {missing.length} item{missing.length !== 1 ? 's' : ''} required before you can submit
            </p>
            {onNavigateToField && (
              <span className="ml-auto text-xs text-amber-400/60">click to jump</span>
            )}
          </div>
          <div className="space-y-1">
            {missing.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateToField?.(item.id)}
                className={[
                  'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-amber-300',
                  'transition-colors duration-150',
                  onNavigateToField
                    ? 'hover:bg-amber-500/20 hover:text-amber-100 cursor-pointer active:bg-amber-500/30'
                    : 'cursor-default',
                ].join(' ')}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {item.label}
                {onNavigateToField && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-amber-400/50 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Declaration */}
      <div
        className={[
          'rounded-xl border p-5 transition-colors',
          !declaration
            ? 'border-amber-500/40 bg-amber-500/5'
            : 'border-white/10 bg-white/5',
        ].join(' ')}
      >
        <p className="font-semibold text-foreground text-sm mb-3">Declaration</p>
        <label className="flex items-start gap-3 cursor-pointer group">
          <Checkbox
            id="declaration-checkbox"
            checked={declaration}
            onCheckedChange={(v) => {
              const next = !!v;
              setDeclaration(next);
              onDeclarationChange?.(next);
            }}
            className="mt-0.5 flex-shrink-0"
          />
          <span className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
            I confirm that all information provided is accurate and complete, and that I am authorized to list
            this venue on TAPN. I understand that providing false or misleading information may result in permanent
            account suspension and legal consequences.
          </span>
        </label>
        {!declaration && (
          <p className="mt-2 text-xs text-amber-400 pl-7">
            You must accept this declaration before submitting.
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="border-white/20 flex-1">
          Back
        </Button>
        <Button
          onClick={handleSubmitClick}
          disabled={!canSubmit || isSubmitting}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting…
            </span>
          ) : (
            'Submit Application'
          )}
        </Button>
      </div>

      {/* Confirm modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Submit Application?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Once submitted, you <strong className="text-foreground">cannot edit</strong> your application.
              Our team will review it within 3–5 business days and notify you by email.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90">
              Yes, Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
