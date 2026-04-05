import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock, AlertCircle, XCircle, ArrowRight,
  Building2, Calendar, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useMyApplication } from '@/hooks/usePartnerApplication';
import { format } from 'date-fns';
import { VENUE_CATEGORY_LABELS } from '@/types/application';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  submitted: {
    icon: Clock,
    iconClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10 border-blue-500/20',
    title: 'Application Under Review',
    badge: { label: 'Under Review', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  },
  under_verification: {
    icon: Clock,
    iconClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10 border-purple-500/20',
    title: 'Application Under Verification',
    badge: { label: 'Under Verification', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  },
  needs_more_information: {
    icon: AlertCircle,
    iconClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    title: 'Additional Information Required',
    badge: { label: 'Action Required', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  },
  approved: {
    icon: CheckCircle2,
    iconClass: 'text-green-400',
    bgClass: 'bg-green-500/10 border-green-500/20',
    title: "You're an Approved TAPN Partner!",
    badge: { label: 'Approved', className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  },
  rejected: {
    icon: XCircle,
    iconClass: 'text-red-400',
    bgClass: 'bg-red-500/10 border-red-500/20',
    title: 'Application Not Approved',
    badge: { label: 'Rejected', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  },
};

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium text-muted-foreground tabular-nums">{score}%</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PartnerApplyStatus() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: application, isLoading } = useMyApplication();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Redirect draft users back to the form
  useEffect(() => {
    if (!isLoading && application && application.status === 'draft') {
      navigate('/partner/apply', { replace: true });
    }
    if (!isLoading && !application) {
      navigate('/partner/apply', { replace: true });
    }
  }, [isLoading, application, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[hsl(240_10%_4%)] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!application) return null;

  const { status } = application;
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-[hsl(240_10%_4%)] flex flex-col">
      {/* Minimal top nav */}
      <header className="border-b border-white/10 px-6 py-4">
        <Link to="/" className="text-foreground font-bold text-lg tracking-tight">
          TAPN
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-xl space-y-6">

          {/* Status hero card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`rounded-2xl border p-8 text-center ${config.bgClass}`}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.1 }}
              className="flex justify-center mb-4"
            >
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <Icon className={`h-8 w-8 ${config.iconClass}`} />
              </div>
            </motion.div>

            <Badge variant="outline" className={`mb-3 ${config.badge.className}`}>
              {config.badge.label}
            </Badge>

            <h1 className="text-2xl font-bold text-foreground mb-2">{config.title}</h1>

            {/* Status-specific messages */}
            {(status === 'submitted' || status === 'under_verification') && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                We've received your application for{' '}
                <strong className="text-foreground">{application.venue_name || 'your venue'}</strong>.
                Our team will review it within <strong className="text-foreground">3–5 business days</strong>.
                You'll receive an email notification when a decision is made.
              </p>
            )}

            {status === 'approved' && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                Congratulations! <strong className="text-foreground">{application.venue_name}</strong> is now
                live on TAPN. Head to your dashboard to complete your venue listing and start receiving bookings.
              </p>
            )}

            {status === 'rejected' && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                Unfortunately your application was not approved at this time.
                {application.reapply_after && new Date(application.reapply_after) > new Date() && (
                  <> You may reapply after{' '}
                    <strong className="text-foreground">
                      {format(new Date(application.reapply_after), 'MMMM d, yyyy')}
                    </strong>.
                  </>
                )}
              </p>
            )}
          </motion.div>

          {/* Application summary card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4"
          >
            <h2 className="font-semibold text-foreground text-sm">Application Summary</h2>

            <div className="space-y-3">
              {application.venue_name && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">{application.venue_name}</p>
                    {application.venue_category && (
                      <p className="text-xs text-muted-foreground">
                        {VENUE_CATEGORY_LABELS[application.venue_category]}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {application.submitted_at && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    Submitted {format(new Date(application.submitted_at), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}

              {typeof application.completeness_score === 'number' && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1.5">Application completeness</p>
                    <ScoreBar score={application.completeness_score} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Needs more info — what's requested */}
          {status === 'needs_more_information' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <h2 className="font-semibold text-amber-400 text-sm">What's needed</h2>
              </div>
              <p className="text-sm text-amber-300 leading-relaxed">
                Our review team has requested additional information. Please contact us at{' '}
                <a href="mailto:partner@tapn.mn" className="underline hover:text-amber-100 transition-colors">
                  partner@tapn.mn
                </a>{' '}
                or check your email for specific instructions.
              </p>
            </motion.div>
          )}

          {/* Rejection reason */}
          {status === 'rejected' && (application.rejection_reason || application.rejection_notes) && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 space-y-3"
            >
              <h2 className="font-semibold text-red-400 text-sm">Reason for rejection</h2>
              {application.rejection_reason && (
                <p className="text-sm text-foreground font-medium">{application.rejection_reason}</p>
              )}
              {application.rejection_notes && (
                <p className="text-sm text-muted-foreground leading-relaxed">{application.rejection_notes}</p>
              )}
            </motion.div>
          )}

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {status === 'approved' && (
              <Button
                asChild
                className="w-full bg-primary hover:bg-primary/90 h-12 text-base"
              >
                <Link to="/partner/dashboard">
                  Go to Partner Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}

            {(status === 'submitted' || status === 'under_verification') && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-3">
                  Questions? Email us at{' '}
                  <a href="mailto:partner@tapn.mn" className="text-primary hover:underline">
                    partner@tapn.mn
                  </a>
                </p>
                <Button asChild variant="outline" className="border-white/20">
                  <Link to="/">Back to homepage</Link>
                </Button>
              </div>
            )}

            {status === 'rejected' && (
              <div className="space-y-3">
                {application.reapply_after && new Date(application.reapply_after) <= new Date() ? (
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link to="/partner/apply">Start New Application</Link>
                  </Button>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    You may reapply after{' '}
                    <strong className="text-foreground">
                      {application.reapply_after
                        ? format(new Date(application.reapply_after), 'MMMM d, yyyy')
                        : '30 days'}
                    </strong>
                  </p>
                )}
                <Button asChild variant="outline" className="w-full border-white/20">
                  <Link to="/">Back to homepage</Link>
                </Button>
              </div>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
