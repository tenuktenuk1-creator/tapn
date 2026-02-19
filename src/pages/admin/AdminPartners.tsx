import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ArrowLeft,
  Check,
  X,
  MapPin,
  User,
  Clock,
  Eye,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      // Update partner_venues status to approved
      const { error: pvError } = await supabase
        .from('partner_venues')
        .update({ status: 'approved' })
        .eq('id', partnerVenueId);
      if (pvError) throw pvError;

      // Activate the venue so it shows publicly
      const { error: vError } = await supabase
        .from('venues')
        .update({ is_active: true })
        .eq('id', venueId);
      if (vError) throw vError;
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
      // Update partner_venues status to rejected
      const { error: pvError } = await supabase
        .from('partner_venues')
        .update({ status: 'rejected' })
        .eq('id', partnerVenueId);
      if (pvError) throw pvError;

      // Keep venue inactive
      const { error: vError } = await supabase
        .from('venues')
        .update({ is_active: false })
        .eq('id', venueId);
      if (vError) throw vError;
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

function StatusBadge({ status }: { status: string }) {
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

interface ConfirmAction {
  type: 'approve' | 'reject' | 'revoke';
  partnerVenueId: string;
  venueId: string;
  venueName: string;
}

export default function AdminPartners() {
  const { user, isAdmin, loading } = useAuth();
  const { data: partnerVenues, isLoading } = useAdminPartnerVenues();
  const approveMutation = useApprovePartnerVenue();
  const rejectMutation = useRejectPartnerVenue();
  const revokeMutation = useRevokePartnerVenue();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  if (loading) {
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const pending = partnerVenues?.filter(pv => pv.status === 'pending') || [];
  const approved = partnerVenues?.filter(pv => pv.status === 'approved') || [];
  const rejected = partnerVenues?.filter(pv => pv.status === 'rejected') || [];

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'approve') {
      await approveMutation.mutateAsync({ partnerVenueId: confirmAction.partnerVenueId, venueId: confirmAction.venueId });
    } else if (confirmAction.type === 'reject') {
      await rejectMutation.mutateAsync({ partnerVenueId: confirmAction.partnerVenueId, venueId: confirmAction.venueId });
    } else if (confirmAction.type === 'revoke') {
      await revokeMutation.mutateAsync({ partnerVenueId: confirmAction.partnerVenueId, venueId: confirmAction.venueId });
    }
    setConfirmAction(null);
  };

  const isActionLoading = approveMutation.isPending || rejectMutation.isPending || revokeMutation.isPending;

  function PartnerVenueTable({ rows, showActions }: { rows: PartnerVenueRow[]; showActions: 'pending' | 'approved' | 'none' }) {
    if (rows.length === 0) {
      return (
        <div className="text-center py-16 card-dark rounded-2xl">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No venues in this category</p>
        </div>
      );
    }

    return (
      <div className="card-dark rounded-2xl overflow-hidden">
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
                      <p className="text-xs text-muted-foreground font-mono">{pv.user_id.slice(0, 8)}…</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                    {venueTypeLabels[pv.venues?.venue_type as keyof typeof venueTypeLabels] || pv.venues?.venue_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="h-3 w-3" />
                    {pv.venues?.city}
                  </div>
                </TableCell>
                <TableCell className="text-foreground text-sm">
                  {pv.venues?.price_per_hour ? `₮${pv.venues.price_per_hour.toLocaleString()}` : '—'}
                </TableCell>
                <TableCell>
                  <StatusBadge status={pv.status} />
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
                          onClick={() => setConfirmAction({
                            type: 'approve',
                            partnerVenueId: pv.id,
                            venueId: pv.venue_id,
                            venueName: pv.venues?.name || 'this venue',
                          })}
                          disabled={isActionLoading}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                          onClick={() => setConfirmAction({
                            type: 'reject',
                            partnerVenueId: pv.id,
                            venueId: pv.venue_id,
                            venueName: pv.venues?.name || 'this venue',
                          })}
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
                        onClick={() => setConfirmAction({
                          type: 'revoke',
                          partnerVenueId: pv.id,
                          venueId: pv.venue_id,
                          venueName: pv.venues?.name || 'this venue',
                        })}
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
    <Layout>
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
              <span className="text-gradient">Management</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and approve partner venue requests
            </p>
          </div>
          {pending.length > 0 && (
            <Badge className="bg-yellow-500 text-black text-sm px-3 py-1">
              {pending.length} pending
            </Badge>
          )}
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pending Review', value: pending.length, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
            { label: 'Approved', value: approved.length, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Rejected', value: rejected.length, color: 'text-red-500', bg: 'bg-red-500/10' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`card-dark rounded-xl p-4 flex items-center gap-3 ${bg}`}>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* Tabs */}
        {!isLoading && (
          <Tabs defaultValue="pending">
            <TabsList className="mb-6 bg-secondary border border-border">
              <TabsTrigger value="pending" className="relative">
                Pending
                {pending.length > 0 && (
                  <span className="ml-2 bg-yellow-500 text-black text-xs font-bold rounded-full px-1.5 py-0.5">
                    {pending.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <PartnerVenueTable rows={pending} showActions="pending" />
            </TabsContent>
            <TabsContent value="approved">
              <PartnerVenueTable rows={approved} showActions="approved" />
            </TabsContent>
            <TabsContent value="rejected">
              <PartnerVenueTable rows={rejected} showActions="none" />
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
    </Layout>
  );
}
