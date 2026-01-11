import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  GripVertical,
  Calendar,
  Moon,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useVenues } from '@/hooks/useVenues';
import { PublicVenue, venueTypeLabels } from '@/types/venue';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface PlannedStop {
  id: string;
  venue: PublicVenue;
  startTime: string;
  endTime: string;
}

export default function PlanANight() {
  const { data: venues, isLoading } = useVenues();
  const [plannedStops, setPlannedStops] = useState<PlannedStop[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');

  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 14;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const addStop = () => {
    if (!selectedVenueId || !venues) return;
    
    const venue = venues.find(v => v.id === selectedVenueId);
    if (!venue) return;

    const newStop: PlannedStop = {
      id: crypto.randomUUID(),
      venue,
      startTime,
      endTime,
    };

    setPlannedStops([...plannedStops, newStop]);
    setSelectedVenueId('');
    
    // Auto-advance times for next stop
    const nextStart = endTime;
    const nextEndHour = parseInt(endTime.split(':')[0]) + 2;
    setStartTime(nextStart);
    setEndTime(`${Math.min(nextEndHour, 25).toString().padStart(2, '0')}:00`);
  };

  const removeStop = (id: string) => {
    setPlannedStops(plannedStops.filter(stop => stop.id !== id));
  };

  const calculateTotalDuration = () => {
    if (plannedStops.length === 0) return 0;
    let total = 0;
    plannedStops.forEach(stop => {
      const start = parseInt(stop.startTime.split(':')[0]);
      const end = parseInt(stop.endTime.split(':')[0]);
      total += end - start;
    });
    return total;
  };

  const venueTypeColorMap: Record<string, string> = {
    cafe: 'bg-orange-500',
    karaoke: 'bg-pink-500',
    pool_snooker: 'bg-blue-500',
    lounge: 'bg-purple-500',
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Moon className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Plan a <span className="text-gradient">Night</span>
            </h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Create your perfect night out by adding venues in sequence. 
            Assign time blocks and visualize your evening timeline.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Add Venue Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Add a Stop
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Venue</Label>
                  <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a venue..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoading ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">Loading...</div>
                      ) : venues && venues.length > 0 ? (
                        venues.map(venue => (
                          <SelectItem key={venue.id} value={venue.id}>
                            <div className="flex items-center gap-2">
                              <span>{venue.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({venueTypeLabels[venue.venue_type]})
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-3 text-sm text-muted-foreground">No venues available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger>
                        <Clock className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Select value={endTime} onValueChange={setEndTime}>
                      <SelectTrigger>
                        <Clock className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full gradient-primary"
                  onClick={addStop}
                  disabled={!selectedVenueId}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Plan
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Add venues in the order you want to visit them
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-display flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Your Night Timeline
                </CardTitle>
                {plannedStops.length > 0 && (
                  <Badge variant="secondary">
                    {calculateTotalDuration()} hours total
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {plannedStops.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No stops planned yet</p>
                    <p className="text-sm">
                      Select venues from the left panel to build your perfect night out
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plannedStops.map((stop, index) => (
                      <div key={stop.id} className="relative">
                        {/* Connector line */}
                        {index < plannedStops.length - 1 && (
                          <div className="absolute left-6 top-full h-4 w-0.5 bg-border" />
                        )}
                        
                        <div className="card-dark rounded-xl p-4 flex items-center gap-4">
                          {/* Order number */}
                          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                            {index + 1}
                          </div>
                          
                          {/* Venue info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-display font-semibold text-foreground">
                                {stop.venue.name}
                              </h4>
                              <Badge 
                                className={`${venueTypeColorMap[stop.venue.venue_type]} text-white border-0 text-xs`}
                              >
                                {venueTypeLabels[stop.venue.venue_type]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {stop.startTime} - {stop.endTime}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {stop.venue.city}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Link to={`/venues/${stop.venue.id}`}>
                              <Button variant="ghost" size="sm">
                                View <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeStop(stop.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Stops</p>
                          <p className="font-display font-semibold text-xl">{plannedStops.length} venues</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-display font-semibold text-xl text-primary">
                            {calculateTotalDuration()} hours
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-center text-muted-foreground mt-4">
                        Book each venue individually when you're ready to confirm your night
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
