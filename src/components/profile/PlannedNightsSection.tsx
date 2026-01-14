import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlannedNights, useDeletePlannedNight, useUpdatePlannedNight } from '@/hooks/usePlannedNights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Moon, 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Trash2, 
  Plus,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, isAfter, isBefore, isToday } from 'date-fns';
import { venueTypeLabels } from '@/types/venue';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function PlannedNightsSection() {
  const navigate = useNavigate();
  const { data: plannedNights = [], isLoading } = usePlannedNights();
  const deletePlannedNight = useDeletePlannedNight();
  const updatePlannedNight = useUpdatePlannedNight();

  const now = new Date();
  const upcomingNights = plannedNights.filter(
    n => n.status === 'upcoming' && (isAfter(new Date(n.planned_date), now) || isToday(new Date(n.planned_date)))
  );
  const pastNights = plannedNights.filter(
    n => n.status !== 'upcoming' || (isBefore(new Date(n.planned_date), now) && !isToday(new Date(n.planned_date)))
  );

  const handleDelete = async (id: string) => {
    try {
      await deletePlannedNight.mutateAsync(id);
      toast.success('Plan deleted');
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await updatePlannedNight.mutateAsync({ id, updates: { status: 'completed' } });
      toast.success('Marked as completed');
    } catch (error) {
      toast.error('Failed to update plan');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await updatePlannedNight.mutateAsync({ id, updates: { status: 'cancelled' } });
      toast.success('Plan cancelled');
    } catch (error) {
      toast.error('Failed to cancel plan');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="card-dark border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Moon className="h-5 w-5 text-primary" />
          My Planned Nights
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-border"
          onClick={() => navigate('/plan-a-night')}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Plan
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="upcoming">Upcoming ({upcomingNights.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastNights.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : upcomingNights.length === 0 ? (
              <div className="text-center py-8">
                <Moon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No planned nights yet</p>
                <Button 
                  variant="outline" 
                  className="border-border"
                  onClick={() => navigate('/plan-a-night')}
                >
                  Plan Your Night
                </Button>
              </div>
            ) : (
              upcomingNights.map((night) => (
                <PlannedNightCard 
                  key={night.id}
                  night={night}
                  getStatusBadge={getStatusBadge}
                  onDelete={() => handleDelete(night.id)}
                  onMarkComplete={() => handleMarkComplete(night.id)}
                  onCancel={() => handleCancel(night.id)}
                  showActions
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : pastNights.length === 0 ? (
              <div className="text-center py-8">
                <Moon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No past nights</p>
              </div>
            ) : (
              pastNights.map((night) => (
                <PlannedNightCard 
                  key={night.id}
                  night={night}
                  getStatusBadge={getStatusBadge}
                  onDelete={() => handleDelete(night.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface PlannedNightCardProps {
  night: any;
  getStatusBadge: (status: string) => React.ReactNode;
  onDelete: () => void;
  onMarkComplete?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

function PlannedNightCard({ 
  night, 
  getStatusBadge, 
  onDelete, 
  onMarkComplete, 
  onCancel,
  showActions 
}: PlannedNightCardProps) {
  const venueTypeColorMap: Record<string, string> = {
    cafe: 'bg-orange-500',
    karaoke: 'bg-pink-500',
    pool_snooker: 'bg-blue-500',
    lounge: 'bg-purple-500',
  };

  return (
    <div className="rounded-lg bg-secondary/50 border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-display font-semibold text-foreground">{night.name}</h4>
          {getStatusBadge(night.status)}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(night.planned_date), 'EEEE, MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {night.stops?.length || 0} stops
          </span>
        </div>
      </div>

      {/* Stops Timeline */}
      {night.stops && night.stops.length > 0 && (
        <div className="p-4 space-y-3">
          {night.stops.map((stop: any, index: number) => (
            <div key={stop.id} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm truncate">
                    {stop.venue?.name || 'Unknown Venue'}
                  </span>
                  {stop.venue?.venue_type && (
                    <Badge 
                      className={`${venueTypeColorMap[stop.venue.venue_type] || 'bg-gray-500'} text-white border-0 text-xs`}
                    >
                      {venueTypeLabels[stop.venue.venue_type as keyof typeof venueTypeLabels]}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stop.start_time?.slice(0, 5)} - {stop.end_time?.slice(0, 5)}
                </span>
              </div>
              <Link to={`/venues/${stop.venue_id}`}>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="p-3 border-t border-border flex items-center justify-end gap-2">
        {showActions && night.status === 'upcoming' && (
          <>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
              onClick={onMarkComplete}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
              onClick={onCancel}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your planned night "{night.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}