import { useState, useRef, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  useAdminApplicationDetail,
  useAdminUpdateStatus,
  useAdminUpdateChecklist,
  useAdminAddNote,
  useDocumentSignedUrl,
} from '@/hooks/usePartnerApplication';
import {
  PartnerApplication,
  ApplicationDocument,
  VerificationChecks,
  ReviewLog,
  DocumentType,
  DOCUMENT_LABELS,
  VENUE_CATEGORY_LABELS,
  REQUIRED_DOCS_BY_ROLE,
} from '@/types/application';
import { ApplicationStatusBadge, RiskBadge } from './AdminPartners';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ExternalLink,
  Check,
  X,
  FileText,
  AlertTriangle,
  Clock,
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  Linkedin,
  Globe,
  Instagram,
  ChevronRight,
  Users,
  Calendar,
  Eye,
  Shield,
  MessageSquare,
  Activity,
  Info,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// ─── DocumentViewButton ───────────────────────────────────────────────────────
// A sub-component that calls useDocumentSignedUrl internally so the hook is
// never called inside a loop.

function DocumentViewButton({
  storagePath,
  label,
}: {
  storagePath: string;
  label?: string;
}) {
  const { data: signedUrl, isLoading } = useDocumentSignedUrl(storagePath);

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-border text-xs gap-1 hover:bg-white/5"
      disabled={isLoading || !signedUrl}
      onClick={() => {
        if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
      ) : (
        <Eye className="h-3 w-3" />
      )}
      {label ?? 'View'}
    </Button>
  );
}

// ─── PhotoThumbnail ───────────────────────────────────────────────────────────

function PhotoThumbnail({ storagePath }: { storagePath: string }) {
  const { data: signedUrl } = useDocumentSignedUrl(storagePath);

  return (
    <div
      className="w-24 h-24 rounded-lg bg-secondary border border-border overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => {
        if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer');
      }}
    >
      {signedUrl ? (
        <img src={signedUrl} alt="Venue photo" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor =
    score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Completeness</span>
        <span className={`font-semibold ${textColor}`}>{score}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ─── Event type labels ────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  application_submitted: 'Application submitted by applicant',
  review_started: 'Review started',
  checklist_updated: 'Verification checklist updated',
  info_requested: 'Additional information requested',
  note_added: 'Note added',
  application_approved: 'Application approved',
  application_rejected: 'Application rejected',
  role_upgraded: 'Partner role granted',
};

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  application_submitted: <FileText className="h-3.5 w-3.5 text-blue-400" />,
  review_started: <PlayCircle className="h-3.5 w-3.5 text-purple-400" />,
  checklist_updated: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  info_requested: <Info className="h-3.5 w-3.5 text-amber-400" />,
  note_added: <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />,
  application_approved: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
  application_rejected: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  role_upgraded: <Shield className="h-3.5 w-3.5 text-green-400" />,
};

// ─── Rejection reasons ────────────────────────────────────────────────────────

const REJECTION_REASONS = [
  'Insufficient business documentation',
  'Cannot verify venue ownership',
  'Venue does not meet TAPN standards',
  'Duplicate / suspected fraudulent application',
  'Invalid or expired documents',
  'Venue outside service area',
  'Other',
];

// ─── Info request items ───────────────────────────────────────────────────────

const INFO_REQUEST_ITEMS = [
  'Updated business registration',
  'Clearer photo of ID document',
  'Authorization letter from owner',
  'Proof of address (recent)',
  'Higher quality venue photos',
  'Venue website / social media link',
  'Phone call required',
];

// ─── Checklist field definitions ──────────────────────────────────────────────

const CHECKLIST_FIELDS: Array<{ key: keyof VerificationChecks; label: string }> = [
  { key: 'documents_reviewed', label: 'Documents reviewed' },
  { key: 'phone_call_verified', label: 'Verified by phone call' },
  { key: 'business_registration_confirmed', label: 'Business registration confirmed' },
  { key: 'address_confirmed', label: 'Address confirmed' },
  { key: 'website_verified', label: 'Website / social verified' },
  { key: 'social_media_verified', label: 'Social media verified' },
  { key: 'owner_identity_confirmed', label: 'Owner identity confirmed' },
];

// ─── Opening hours day order ──────────────────────────────────────────────────

const DAYS_ORDER = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

// ─── Helper: initials ─────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── ApproveModal ─────────────────────────────────────────────────────────────

function ApproveModal({
  open,
  onClose,
  onConfirm,
  application,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  application: PartnerApplication;
  isLoading: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="bg-card border-border max-w-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
            >
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Confirm Approval
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 text-sm text-muted-foreground leading-relaxed">
                You are about to approve{' '}
                <span className="font-semibold text-foreground">{application.venue_name}</span> as a
                TAPN Partner. This will upgrade{' '}
                <span className="font-semibold text-foreground">{application.full_name}</span>'s role
                to Partner and unlock their dashboard.
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={onClose} disabled={isLoading} className="border-border">
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={onConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      Confirm Approval
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

// ─── RejectModal ──────────────────────────────────────────────────────────────

function RejectModal({
  open,
  onClose,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm(reason, notes);
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="bg-card border-border max-w-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
            >
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-400" />
                  Reject Application
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    Rejection reason <span className="text-red-400">*</span>
                  </label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger className="bg-secondary border-border text-sm">
                      <SelectValue placeholder="Select a reason…" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {REJECTION_REASONS.map((r) => (
                        <SelectItem key={r} value={r} className="text-sm">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    Additional notes (optional)
                  </label>
                  <Textarea
                    placeholder="Add any additional context…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-secondary border-border text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={onClose} disabled={isLoading} className="border-border">
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleConfirm}
                  disabled={isLoading || !reason}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1.5" />
                      Confirm Rejection
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

// ─── RequestInfoModal ─────────────────────────────────────────────────────────

function RequestInfoModal({
  open,
  onClose,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: string[], message: string) => void;
  isLoading: boolean;
}) {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const toggleItem = (item: string) => {
    setCheckedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleConfirm = () => {
    onConfirm(checkedItems, message);
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="bg-card border-border max-w-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
            >
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <Info className="h-5 w-5 text-amber-400" />
                  Request Additional Information
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    Select items to request:
                  </p>
                  {INFO_REQUEST_ITEMS.map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`info-${item}`}
                        checked={checkedItems.includes(item)}
                        onCheckedChange={() => toggleItem(item)}
                      />
                      <label
                        htmlFor={`info-${item}`}
                        className="text-sm text-foreground cursor-pointer"
                      >
                        {item}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">
                    Message to applicant
                  </label>
                  <Textarea
                    placeholder="Additional instructions or context for the applicant…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-secondary border-border text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={onClose} disabled={isLoading} className="border-border">
                  Cancel
                </Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={handleConfirm}
                  disabled={isLoading || checkedItems.length === 0}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-1.5" />
                      Send Request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

// ─── VerificationChecklistCard ────────────────────────────────────────────────

function VerificationChecklistCard({
  application,
  adminId,
}: {
  application: PartnerApplication;
  adminId: string;
}) {
  const updateChecklist = useAdminUpdateChecklist();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checks = application.verification_checks;

  const [localChecks, setLocalChecks] = useState<Record<string, boolean>>({
    documents_reviewed: checks?.documents_reviewed ?? false,
    phone_call_verified: checks?.phone_call_verified ?? false,
    business_registration_confirmed: checks?.business_registration_confirmed ?? false,
    address_confirmed: checks?.address_confirmed ?? false,
    website_verified: checks?.website_verified ?? false,
    social_media_verified: checks?.social_media_verified ?? false,
    owner_identity_confirmed: checks?.owner_identity_confirmed ?? false,
  });
  const [notes, setNotes] = useState<string>(checks?.notes ?? '');

  const verifiedCount = Object.values(localChecks).filter(Boolean).length;
  const total = CHECKLIST_FIELDS.length;

  const debouncedSave = useCallback(
    (nextChecks: Record<string, boolean>, nextNotes: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateChecklist.mutate({
          applicationId: application.id,
          checks: { ...(nextChecks as Partial<VerificationChecks>), notes: nextNotes },
          adminId,
        });
      }, 1000);
    },
    [application.id, adminId, updateChecklist]
  );

  const handleCheckChange = (key: string, value: boolean) => {
    const next = { ...localChecks, [key]: value };
    setLocalChecks(next);
    debouncedSave(next, notes);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    debouncedSave(localChecks, value);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-400" />
          Verification Checklist
        </h3>
        <span className="text-xs text-muted-foreground">
          {verifiedCount} of {total} verified
        </span>
      </div>

      <div className="space-y-2.5">
        {CHECKLIST_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-2.5">
            <Checkbox
              id={`check-${field.key}`}
              checked={localChecks[field.key] ?? false}
              onCheckedChange={(v) => handleCheckChange(field.key, !!v)}
            />
            <label
              htmlFor={`check-${field.key}`}
              className="text-sm text-foreground cursor-pointer"
            >
              {field.label}
            </label>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${(verifiedCount / total) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{verifiedCount} of {total} items completed</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Checklist notes</label>
        <Textarea
          placeholder="Add notes about the verification…"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="bg-secondary border-border text-sm resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}

// ─── InternalNotesCard ────────────────────────────────────────────────────────

function InternalNotesCard({
  application,
  adminId,
}: {
  application: PartnerApplication;
  adminId: string;
}) {
  const addNote = useAdminAddNote();
  const [noteText, setNoteText] = useState('');

  const noteLogs = (application.review_logs ?? []).filter(
    (l) => l.event_type === 'note_added'
  );

  const handleAdd = () => {
    if (!noteText.trim()) return;
    addNote.mutate(
      { applicationId: application.id, note: noteText.trim(), adminId },
      { onSuccess: () => setNoteText('') }
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-zinc-400" />
        Internal Notes
      </h3>

      {noteLogs.length > 0 && (
        <div className="space-y-3">
          {noteLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-xs font-bold shrink-0 mt-0.5">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed">
                  {(log.metadata as { note?: string })?.note ?? ''}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          placeholder="Add an internal note…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className="bg-secondary border-border text-sm resize-none"
          rows={2}
        />
        <Button
          size="sm"
          variant="outline"
          className="border-border w-full text-xs gap-1"
          onClick={handleAdd}
          disabled={addNote.isPending || !noteText.trim()}
        >
          {addNote.isPending ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
          ) : (
            <MessageSquare className="h-3 w-3" />
          )}
          Add Note
        </Button>
      </div>
    </div>
  );
}

// ─── ReviewHistoryCard ────────────────────────────────────────────────────────

function ReviewHistoryCard({ logs }: { logs: ReviewLog[] }) {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Activity className="h-4 w-4 text-zinc-400" />
        Review History
      </h3>

      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((log, i) => (
            <div key={log.id} className="flex items-start gap-2.5">
              {/* Timeline dot */}
              <div className="relative flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                  {EVENT_TYPE_ICONS[log.event_type] ?? (
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                {i < sorted.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 min-h-[16px]" />
                )}
              </div>
              <div className="pb-3 flex-1 min-w-0">
                <p className="text-xs text-foreground leading-tight">
                  {EVENT_TYPE_LABELS[log.event_type] ?? log.event_type}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })} ·{' '}
                  <span className="capitalize">{log.actor_type}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ActionsCard ──────────────────────────────────────────────────────────────

function ActionsCard({
  application,
  adminId,
  onApprove,
  onReject,
  onRequestInfo,
  onStartReview,
  isLoading,
}: {
  application: PartnerApplication;
  adminId: string;
  onApprove: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
  onStartReview: () => void;
  isLoading: boolean;
}) {
  const { status } = application;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Actions</h3>
        <ApplicationStatusBadge status={status} />
      </div>

      <Separator className="bg-border" />

      <div className="space-y-2">
        {status === 'submitted' && (
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm gap-2"
            onClick={onStartReview}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Start Review
              </>
            )}
          </Button>
        )}

        {(status === 'under_verification' || status === 'needs_more_information') && (
          <>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white text-sm gap-2"
              onClick={onApprove}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Approve Application
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-sm gap-2"
              onClick={onRequestInfo}
              disabled={isLoading}
            >
              <Info className="h-4 w-4" />
              Request More Info
            </Button>
            <Button
              variant="outline"
              className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm gap-2"
              onClick={onReject}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
              Reject Application
            </Button>
          </>
        )}

        {status === 'approved' && (
          <Button
            variant="outline"
            className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm gap-2"
            disabled={isLoading}
            onClick={onReject}
          >
            <X className="h-4 w-4" />
            Revoke Approval
          </Button>
        )}

        {status === 'rejected' && (
          <Button
            variant="outline"
            className="w-full border-border text-sm gap-2"
            disabled={isLoading}
            onClick={onStartReview}
          >
            <PlayCircle className="h-4 w-4" />
            Allow Reapplication
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPartnerDetail() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { user, isAdmin, loading } = useAuth();

  const { data: application, isLoading, error } = useAdminApplicationDetail(
    applicationId ?? null
  );

  const updateStatus = useAdminUpdateStatus();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [requestInfoOpen, setRequestInfoOpen] = useState(false);

  if (loading || isLoading) {
    return (
      <AdminLayout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (error || !application) {
    return (
      <AdminLayout>
        <div className="container py-8">
          <div className="text-center py-20">
            <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <p className="text-foreground font-semibold">Application not found</p>
            <p className="text-muted-foreground text-sm mt-1">
              The application ID does not exist or could not be loaded.
            </p>
            <Link to="/admin/partners">
              <Button variant="outline" className="mt-4 border-border gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Partners
              </Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const adminId = user.id;
  const isMutating = updateStatus.isPending;

  // Documents split by type
  const docs = application.documents ?? [];
  const photoDocs = docs.filter(
    (d) => d.document_type === 'venue_photo' || d.document_type === 'venue_photo_extra'
  );
  const verificationDocs = docs.filter(
    (d) => d.document_type !== 'venue_photo' && d.document_type !== 'venue_photo_extra'
  );

  // Required docs for applicant's role
  const role = application.role_at_venue ?? 'owner';
  const requiredDocTypes = REQUIRED_DOCS_BY_ROLE[role] ?? [];

  // All document types to show in verification section (exclude photo types)
  const allVerificationDocTypes: DocumentType[] = [
    'business_registration',
    'trade_license',
    'proof_of_address',
    'applicant_id',
    'authorization_letter',
    'owner_id',
    'lease_agreement',
  ];

  const handleApprove = () => {
    updateStatus.mutate(
      { applicationId: application.id, action: 'approve', adminId },
      { onSuccess: () => setApproveOpen(false) }
    );
  };

  const handleReject = (reason: string, notes: string) => {
    updateStatus.mutate(
      {
        applicationId: application.id,
        action: 'reject',
        adminId,
        rejectionReason: reason,
        rejectionNotes: notes,
      },
      { onSuccess: () => setRejectOpen(false) }
    );
  };

  const handleRequestInfo = (items: string[], message: string) => {
    updateStatus.mutate(
      {
        applicationId: application.id,
        action: 'request_info',
        adminId,
        requestedItems: items,
        message,
      },
      { onSuccess: () => setRequestInfoOpen(false) }
    );
  };

  const handleStartReview = () => {
    updateStatus.mutate({ applicationId: application.id, action: 'start_review', adminId });
  };

  return (
    <AdminLayout>
      <div className="container py-8 max-w-[1400px]">
        {/* Top section */}
        <div className="mb-6 space-y-3">
          {/* Back + breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/admin/partners">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Partners
              </Button>
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium truncate">
              {application.venue_name ?? 'Application'}
            </span>
          </div>

          {/* Title row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">
                {application.venue_name ?? 'Unnamed Venue'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <ApplicationStatusBadge status={application.status} />
                <RiskBadge risk={application.risk_level} />
                {application.venue_category && (
                  <Badge variant="outline" className="text-xs border-primary/20 text-primary/80 bg-primary/5">
                    {VENUE_CATEGORY_LABELS[application.venue_category]}
                  </Badge>
                )}
              </div>
            </div>

            {application.status === 'submitted' && (
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shrink-0"
                onClick={handleStartReview}
                disabled={isMutating}
              >
                {isMutating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4" />
                    Start Review
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
          {/* ── Left column ── */}
          <div className="space-y-6 min-w-0">
            {/* Card 1: Applicant Overview */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Applicant Overview
              </h2>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                  {getInitials(application.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-foreground">
                    {application.full_name ?? '—'}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {application.role_at_venue?.replace('_', ' ') ?? '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{application.phone ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{application.business_email ?? '—'}</span>
                </div>
                {application.linkedin_url && (
                  <a
                    href={application.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Linkedin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">LinkedIn Profile</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span className="tracking-wider">•••••••••</span>
                  <span className="text-xs text-muted-foreground/60">(National ID — admin only)</span>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Submitted{' '}
                  {application.submitted_at
                    ? format(new Date(application.submitted_at), 'MMM d, yyyy')
                    : '—'}
                </span>
                {application.submitted_at && (
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(application.submitted_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              <ScoreBar score={application.completeness_score ?? 0} />
            </div>

            {/* Card 2: Venue Information */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Venue Information
              </h2>
              <div>
                <h3 className="text-xl font-bold text-foreground">{application.venue_name ?? '—'}</h3>
                {application.venue_category && (
                  <Badge variant="outline" className="mt-1 text-xs border-primary/20 text-primary/80 bg-primary/5">
                    {VENUE_CATEGORY_LABELS[application.venue_category]}
                  </Badge>
                )}
              </div>

              {/* Address */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p>{application.address_line1 ?? '—'}</p>
                  {application.address_line2 && <p>{application.address_line2}</p>}
                  <p>
                    {[application.city, application.country].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
              </div>

              {/* External links */}
              <div className="flex flex-wrap gap-2">
                {application.google_maps_link && (
                  <a
                    href={application.google_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="border-border text-xs gap-1 hover:bg-white/5">
                      <MapPin className="h-3 w-3" />
                      Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
                {application.website_url && (
                  <a
                    href={application.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="border-border text-xs gap-1 hover:bg-white/5">
                      <Globe className="h-3 w-3" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
                {application.instagram_handle && (
                  <a
                    href={`https://instagram.com/${application.instagram_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="border-border text-xs gap-1 hover:bg-white/5">
                      <Instagram className="h-3 w-3" />
                      @{application.instagram_handle.replace('@', '')}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                )}
              </div>

              <Separator className="bg-border" />

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Seating Capacity</p>
                  <p className="text-foreground font-medium mt-0.5">
                    {application.seating_capacity ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Private Hire</p>
                  <p className="text-foreground font-medium mt-0.5">
                    {application.private_hire_available ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Spend / Person</p>
                  <p className="text-foreground font-medium mt-0.5">
                    {application.avg_spend_per_person
                      ? `₮${application.avg_spend_per_person.toLocaleString()}`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Opening hours */}
              {application.opening_hours && (
                <>
                  <Separator className="bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Opening Hours</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {DAYS_ORDER.map((day) => {
                        const hours = application.opening_hours?.[day];
                        return (
                          <div key={day} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-muted-foreground w-24">{day}</span>
                            {!hours || hours.closed ? (
                              <span className="text-muted-foreground/50">Closed</span>
                            ) : (
                              <span className="text-foreground">
                                {hours.open} – {hours.close}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Description */}
              {application.description && (
                <>
                  <Separator className="bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">Description</p>
                    <p className="text-sm text-foreground leading-relaxed">{application.description}</p>
                  </div>
                </>
              )}
            </div>

            {/* Card 3: Venue Photos */}
            {photoDocs.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Venue Photos
                </h2>
                <div className="flex flex-wrap gap-3">
                  {photoDocs.map((doc) => (
                    <PhotoThumbnail key={doc.id} storagePath={doc.storage_path} />
                  ))}
                </div>
              </div>
            )}

            {/* Card 4: Verification Documents */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Verification Documents
              </h2>
              <div className="space-y-2">
                {allVerificationDocTypes.map((docType) => {
                  const uploaded = verificationDocs.find((d) => d.document_type === docType);
                  const isRequired = requiredDocTypes.includes(docType);

                  return (
                    <div
                      key={docType}
                      className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {uploaded ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                        ) : (
                          <XCircle className={`h-4 w-4 shrink-0 ${isRequired ? 'text-amber-400' : 'text-muted-foreground/40'}`} />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {DOCUMENT_LABELS[docType]}
                          </p>
                          {!uploaded && isRequired && (
                            <p className="text-[10px] text-amber-400">Required for {role.replace('_', ' ')}</p>
                          )}
                          {uploaded && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {uploaded.file_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {uploaded ? (
                        <DocumentViewButton storagePath={uploaded.storage_path} />
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-muted-foreground/20 text-muted-foreground/50 shrink-0">
                          Not uploaded
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column (sticky) ── */}
          <div className="space-y-4 xl:sticky xl:top-6">
            {/* Risk Assessment */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Risk Assessment
              </h3>

              <div className="flex items-center gap-3">
                <div
                  className={`text-lg font-bold ${
                    application.risk_level === 'low'
                      ? 'text-green-400'
                      : application.risk_level === 'medium'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {application.risk_level?.toUpperCase() ?? 'N/A'}
                </div>
                <RiskBadge risk={application.risk_level} />
              </div>

              <Separator className="bg-border" />

              {!application.fraud_flags || application.fraud_flags.length === 0 ? (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  No risk flags detected
                </div>
              ) : (
                <div className="space-y-2">
                  {application.fraud_flags.map((flag) => (
                    <div key={flag.id} className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                          flag.severity === 'HIGH'
                            ? 'bg-red-400'
                            : flag.severity === 'MEDIUM'
                            ? 'bg-amber-400'
                            : 'bg-zinc-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-tight">{flag.label}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${
                          flag.severity === 'HIGH'
                            ? 'border-red-500/30 text-red-400'
                            : flag.severity === 'MEDIUM'
                            ? 'border-amber-500/30 text-amber-400'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {flag.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verification Checklist */}
            <VerificationChecklistCard application={application} adminId={adminId} />

            {/* Internal Notes */}
            <InternalNotesCard application={application} adminId={adminId} />

            {/* Review History */}
            <ReviewHistoryCard logs={application.review_logs ?? []} />

            {/* Actions */}
            <ActionsCard
              application={application}
              adminId={adminId}
              onApprove={() => setApproveOpen(true)}
              onReject={() => setRejectOpen(true)}
              onRequestInfo={() => setRequestInfoOpen(true)}
              onStartReview={handleStartReview}
              isLoading={isMutating}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ApproveModal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
        application={application}
        isLoading={isMutating}
      />
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        isLoading={isMutating}
      />
      <RequestInfoModal
        open={requestInfoOpen}
        onClose={() => setRequestInfoOpen(false)}
        onConfirm={handleRequestInfo}
        isLoading={isMutating}
      />
    </AdminLayout>
  );
}
