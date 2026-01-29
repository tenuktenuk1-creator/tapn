import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, List, Map } from 'lucide-react';
import { VenueType, venueTypeLabels, BusyStatus, busyStatusLabels } from '@/types/venue';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MapFiltersProps {
  search: string;
  venueType: VenueType | 'all';
  busyStatus: BusyStatus | 'all';
  viewMode: 'list' | 'map';
  onSearchChange: (value: string) => void;
  onVenueTypeChange: (value: VenueType | 'all') => void;
  onBusyStatusChange: (value: BusyStatus | 'all') => void;
  onViewModeChange: (value: 'list' | 'map') => void;
}

export function MapFilters({
  search,
  venueType,
  busyStatus,
  viewMode,
  onSearchChange,
  onVenueTypeChange,
  onBusyStatusChange,
  onViewModeChange,
}: MapFiltersProps) {
  const venueTypes: Array<VenueType | 'all'> = ['all', 'cafe', 'karaoke', 'pool_snooker', 'lounge'];
  const busyStatuses: Array<BusyStatus | 'all'> = ['all', 'quiet', 'moderate', 'busy'];

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as 'list' | 'map')}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search venues..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={venueType} onValueChange={(v) => onVenueTypeChange(v as VenueType | 'all')}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {venueTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type === 'all' ? 'All Types' : venueTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={busyStatus} onValueChange={(v) => onBusyStatusChange(v as BusyStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {busyStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'all' ? 'Any Status' : busyStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
