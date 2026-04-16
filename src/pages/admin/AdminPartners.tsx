import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ArrowLeft,
  Check,
  X,
  MapPin,
  Clock,
  Eye,
  Users,
  UserPlus,
  FileText,
  Search,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  useAdminApplications,
} from '@/hooks/usePartnerApplication';
import {
  PartnerApplication,
  ApplicationStatus,
  VENUE_CATEGORY_LABELS,
  RiskLevel,
} from '@/types/application';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { venueTypeLabels } from '@/types/venue';

// ─── Local venue-requests hooks (unchanged) ──────────────────────────────────

interface PartnerVenueRow {
  id: string;
  user_id: string;
  venue_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  venues: {
    id: string;
    name: string;
    venue_type: string;
    city: string;
    address: string;
    price_per_hour: number | null;
    images: string[] | null;
    is_active: boolean;
  };
}

function useAdminPartnerVenues() {
  return useQuery({
    queryKey: ['admin-partner-venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_venues')
        .select(`
          id,
          user_id,
          venue_id,
          status,
          created_at,
          venues (
            id,
            name,
            venue_type,
            city,
            address,
            price_per_hour,
            images,
            is_active
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PartnerVenueRow[];
    },
  });
}

function useApprovePartnerVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ partnerVenueId, venueId }: { partnerVenueId: string; venueId: string }) => {
      const { data: pv } = await supabase
        .from('partner_venues')
        .select('user_id, venues(name)')
        .eq('id', partnerVenueId)
        .single();

      const { error: pvError } = await supabase
        .from('partner_venues')
        .update({ status: 'approved' })
        .eq('id', partnerVenueId);
      if (pvError) throw pvError;

      const { error: vError } = await supabase
        .from('venues')
        .update({ is_active: true })
        .eq('id', venueId);
      if (vError) throw vError;

      if (pv?.user_id) {
        const venueName = (pv.venues as { name?: string } | null)?.name ?? 'your venue';
        void notify.venueApproved(pv.user_id, venueName, venueId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-venues'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast.success('Partner venue approved and activated');
    },
    onError: () => {
      toast.error('Failed to approve venue');
    },
  });
}

function useRejectPartnerVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ partnerVenueId, venueId }: { partnerVenueId: string; venueId: string }) => {
      const { data: pv } = await supabase
        .from('partner_venues')
        .select('user_id, venues(name)')
        .eq('id', partnerVenueId)
        .single();

      const { error: pvError } = await supabase
        .from('partner_venues')
        .update({ status: 'rejected' })
        .eq('id', partnerVenueId);
      if (pvError) throw pvError;

      const { error: vError } = await supabase
        .from('venues')
        .update({ is_active: false })
        .eq('id', venueId);
      if (vError) throw vError;

      if (pv?.user_id) {
        const venueName = (pv.venues as { name?: string } | null)?.name ?? 'your venue';
        void notify.venueRejected(pv.user_id, venueName, venueId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-venues'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast.success('Partner venue rejected');
    },
    onError: () => {
      toast.error('Failed to reject venue');
    },
  });
}

function useRevokePartnerVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ partnerVenueId, venueId }: { partnerVenueId: string; venueId: string }) => {
      const { error: pvError } = await supabase
        .from('partner_venues')
        .update({ status: 'rejected' })
        .eq('id', partnerVenueId);
      if (pvError) throw pvError;

      const { error: vError } = await supabase
        .from('venues')
        .update({ is_active: false })
        .eq('id', venueId);
      if (vError) throw vError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-venues'] });
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast.success('Partner venue revoked');
    },
    onError: () => {
      toast.error('Failed to revoke approval');
    },
  });
}

// ─── Status / Risk Badge components ──────────────────────────────────────────

function VenueStatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    pending: { className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'Pending' },
    approved: { className: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Approved' },
    rejected: { className: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Rejected' },
  };
  const c = config[status] || config.pending;
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus | string }) {
  const config: Record<string, { className: string; label: string }> = {
    draft: { className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: 'Draft' },
    submitted: { className: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Submitted' },
    under_verification: { className: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Under Verification' },
    needs_more_information: { className: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Needs Info' },
    approved: { className: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Approved' },
    rejected: { className: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Rejected' },
    withdrawn: { className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', label: 'Withdrawn' },
  };
  const c = config[status] || config.draft;
  return (
    <Badge variant="outline" className={`text-xs ${c.className}`}>
      {c.label}
    </Badge>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel | null | undefined }) {
  if (!risk) return null;
  const config: Record<RiskLevel, { className: string; icon: string; label: string }> = {
    low: { className: 'text-green-400', icon: '🟢', label: 'Low' },
    medium: { className: 'text-amber-400', icon: '🟡', label: 'Medium' },
    high: { className: 'text-red-400', icon: '🔴', label: 'High' },
  };
  const c = config[risk];
  return (
    <span className={`text-xs font-medium flex items-center gap-1 ${c.className}`}>
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${textColor}`}>{score}%</span>
    </div>
  );
}

// ─── Application status filter tabs ──────────────────────────────────────────

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_verification', label: 'Under Verification' },
  { value: 'needs_more_information', label: 'Needs Info' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// ─── Applications table ───────────────────────────────────────────────────────

function ApplicationsTab() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: applications = [], isLoading } = useAdminApplications(statusFilter);

  const filtered = applications.filter((app) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (app.venue_name?.toLowerCase().includes(q) ?? false) ||
      (app.full_name?.toLowerCase().includes(q) ?? false)
    );
  });

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by venue or applicant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-secondary border-border text-sm"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No partner applications yet</p>
          <p className="text-muted-foreground/60 text-sm mt-1">
            Applications submitted by venues will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground text-xs">Applicant</TableHead>
                <TableHead className="text-muted-foreground text-xs">Venue</TableHead>
                <TableHead className="text-muted-foreground text-xs">City</TableHead>
                <TableHead className="text-muted-foreground text-xs">Submitted</TableHead>
                <TableHead className="text-muted-foreground text-xs">Score</TableHead>
                <TableHead className="text-muted-foreground text-xs">Risk</TableHead>
                <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((app) => (
                <TableRow
                  key={app.id}
                  className="border-border hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => navigate(`/admin/partners/${app.id}`)}
                >
                  {/* Applicant */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                        {getInitials(app.full_name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-tight">
                          {app.full_name || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">{app.phone || '—'}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Venue */}
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {app.venue_name || '—'}
                      </p>
                      {app.venue_category && (
                        <Badge variant="outline" className="text-[10px] mt-0.5 border-primary/20 text-primary/80 bg-primary/5">
                          {VENUE_CATEGORY_LABELS[app.venue_category]}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* City */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{app.city || '—'}</span>
                  </TableCell>

                  {/* Submitted */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {app.submitted_at
                        ? format(new Date(app.submitted_at), 'MMM d, yyyy')
                        : '—'}
                    </span>
                  </TableCell>

                  {/* Score */}
                  <TableCell>
                    <ScoreBar score={app.completeness_score ?? 0} />
                  </TableCell>

                  {/* Risk */}
                  <TableCell>
                    <RiskBadge risk={app.risk_level} />
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <ApplicationStatusBadge status={app.status} />
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-xs gap-1 hover:bg-white/5"
                      onClick={() => navigate(`/admin/partners/${app.id}`)}
                    >
                      Review
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Venue requests table (unchanged logic) ───────────────────────────────────

interface ConfirmAction {
  type: 'approve' | 'reject' | 'revoke';
  partnerVenueId: string;
  venueId: string;
  venueName: string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AdminPartners() {
  const { data: partnerVenues, isLoading } = useAdminPartnerVenues();
  const approveMutation = useApprovePartnerVenue();
  const rejectMutation = useRejectPartnerVenue();
  const revokeMutation = useRevokePartnerVenue();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // KPI counts — fetch all non-draft, non-withdrawn apps for stats
  const { data: allApplications = [] } = useAdminApplications('all');

  const submittedCount = allApplications.filter((a) => a.status === 'submitted').length;
  const underVerificationCount = allApplications.filter(
    (a) => a.status === 'under_verification'
  ).length;
  const needsInfoCount = allApplications.filter(
    (a) => a.status === 'needs_more_information'
  ).length;
  const approvedCount = allApplications.filter((a) => a.status === 'approved').length;

  const pending = partnerVenues?.filter((pv) => pv.status === 'pending') || [];
  const approved = partnerVenues?.filter((pv) => pv.status === 'approved') || [];

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'approve') {
      await approveMutation.mutateAsync({
        partnerVenueId: confirmAction.partnerVenueId,
        venueId: confirmAction.venueId,
      });
    } else if (confirmAction.type === 'reject') {
      await rejectMutation.mutateAsync({
        partnerVenueId: confirmAction.partnerVenueId,
        venueId: confirmAction.venueId,
      });
    } else if (confirmAction.type === 'revoke') {
      await revokeMutation.mutateAsync({
        partnerVenueId: confirmAction.partnerVenueId,
        venueId: confirmAction.venueId,
      });
    }
    setConfirmAction(null);
  };

  const isActionLoading =
    approveMutation.isPending || rejectMutation.isPending || revokeMutation.isPending;

  function PartnerVenueTable({
    rows,
    showActions,
  }: {
    rows: PartnerVenueRow[];
    showActions: 'pending' | 'approved' | 'none';
  }) {
    if (rows.length === 0) {
      return (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No venues in this category</p>
        </div>
      );
    }

    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Venue</TableHead>
              <TableHead className="text-muted-foreground">Type</TableHead>
              <TableHead className="text-muted-foreground">Location</TableHead>
              <TableHead className="text-muted-foreground">Price/hr</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Submitted</TableHead>
              <TableHead className="text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((pv) => (
              <TableRow key={pv.id} className="border-border">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                      {pv.venues?.images?.[0] ? (
                        <img
                          src={pv.venues.images[0]}
                          alt={pv.venues.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{pv.venues?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {pv.user_id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                    {venueTypeLabels[pv.venues?.venue_type as keyof typeof venueTypeLabels] ||
                      pv.venues?.venue_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="h-3 w-3" />
                    {pv.venues?.city}
                  </div>
                </TableCell>
                <TableCell className="text-foreground text-sm">
                  {pv.venues?.price_per_hour
                    ? `₮${pv.venues.price_per_hour.toLocaleString()}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <VenueStatusBadge status={pv.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(pv.created_at), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {pv.venues?.id && (
                      <Link to={`/admin/venues/${pv.venues.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {showActions === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() =>
                            setConfirmAction({
                              type: 'approve',
                              partnerVenueId: pv.id,
                              venueId: pv.venue_id,
                              venueName: pv.venues?.name || 'this venue',
                            })
                          }
                          disabled={isActionLoading}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                          onClick={() =>
                            setConfirmAction({
                              type: 'reject',
                              partnerVenueId: pv.id,
                              venueId: pv.venue_id,
                              venueName: pv.venues?.name || 'this venue',
                            })
                          }
                          disabled={isActionLoading}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {showActions === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                        onClick={() =>
                          setConfirmAction({
                            type: 'revoke',
                            partnerVenueId: pv.id,
                            venueId: pv.venue_id,
                            venueName: pv.venues?.name || 'this venue',
                          })
                        }
                        disabled={isActionLoading}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <>
    <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              <span className="text-foreground">Partner </span>
              <span className="text-gradient">Applications</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and verify partner onboarding requests
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Submitted</p>
            <p className="text-2xl font-bold text-blue-400">{submittedCount}</p>
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Under Verification</p>
            <p className="text-2xl font-bold text-purple-400">{underVerificationCount}</p>
            <div className="w-2 h-2 rounded-full bg-purple-400 mt-2" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Needs Info</p>
            <p className="text-2xl font-bold text-amber-400">{needsInfoCount}</p>
            <div className="w-2 h-2 rounded-full bg-amber-400 mt-2" />
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Approved</p>
            <p className="text-2xl font-bold text-green-400">{approvedCount}</p>
            <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Tabs */}
        {!isLoading && (
          <Tabs defaultValue="applications">
            <TabsList className="mb-6 bg-secondary border border-border">
              <TabsTrigger value="applications" className="relative">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Applications
                {submittedCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                    {submittedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="venue-requests" className="relative">
                Venue Requests
                {pending.length > 0 && (
                  <span className="ml-2 bg-yellow-500 text-black text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pending.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved Partners ({approved.length})
              </TabsTrigger>
            </TabsList>

            {/* Applications tab — new rich system */}
            <TabsContent value="applications">
              <ApplicationsTab />
            </TabsContent>

            {/* Venue Requests tab — unchanged */}
            <TabsContent value="venue-requests">
              <PartnerVenueTable rows={pending} showActions="pending" />
            </TabsContent>

            {/* Approved Partners tab — unchanged */}
            <TabsContent value="approved">
              <PartnerVenueTable rows={approved} showActions="approved" />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {confirmAction?.type === 'approve' && 'Approve Partner Venue'}
              {confirmAction?.type === 'reject' && 'Reject Partner Venue'}
              {confirmAction?.type === 'revoke' && 'Revoke Partner Approval'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'approve' &&
                `Approve "${confirmAction.venueName}"? The venue will be made active and visible to users.`}
              {confirmAction?.type === 'reject' &&
                `Reject "${confirmAction?.venueName}"? The venue will remain inactive.`}
              {confirmAction?.type === 'revoke' &&
                `Revoke approval for "${confirmAction?.venueName}"? The venue will be deactivated.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border" disabled={isActionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isActionLoading}
              className={
                confirmAction?.type === 'approve'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              }
            >
              {isActionLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : confirmAction?.type === 'approve' ? (
                'Approve'
              ) : confirmAction?.type === 'reject' ? (
                'Reject'
              ) : (
                'Revoke'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
