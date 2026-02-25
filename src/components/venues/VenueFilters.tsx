import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, SlidersHorizontal } from 'lucide-react';
import { VenueType, BusyStatus, venueTypeLabels } from '@/types/venue';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface VenueFiltersProps {
  search: string;
  venueType: VenueType | 'all';
  city: string;
  priceRange: [number, number];
  openNow: boolean;
  busyFilter: BusyStatus | 'all';
  onSearchChange: (value: string) => void;
  onVenueTypeChange: (value: VenueType | 'all') => void;
  onCityChange: (value: string) => void;
  onPriceRangeChange: (value: [number, number]) => void;
  onOpenNowChange: (value: boolean) => void;
  onBusyFilterChange: (value: BusyStatus | 'all') => void;
}

export function VenueFilters({
  search,
  venueType,
  city,
  priceRange,
  openNow,
  busyFilter,
  onSearchChange,
  onVenueTypeChange,
  onCityChange,
  onPriceRangeChange,
  onOpenNowChange,
  onBusyFilterChange,
}: VenueFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const venueTypes: Array<VenueType | 'all'> = [
    'all', 'cafe', 'karaoke', 'pool_snooker', 'lounge',
  ];

  const activeFilterCount =
    (openNow ? 1 : 0) +
    (busyFilter !== 'all' ? 1 : 0) +
    (city ? 1 : 0) +
    (priceRange[0] > 0 || priceRange[1] < 500000 ? 1 : 0);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search venues..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          aria-label="Search venues"
        />
      </div>

      {/* Venue type */}
      <Select
        value={venueType}
        onValueChange={(v) => onVenueTypeChange(v as VenueType | 'all')}
      >
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Venue type">
          <SelectValue placeholder="Venue Type" />
        </SelectTrigger>
        <SelectContent>
          {venueTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type === 'all' ? 'All Types' : venueTypeLabels[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* More filters sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 relative">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">More Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter Venues</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Open now toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="open-now-toggle" className="cursor-pointer">
                Open now only
              </Label>
              <Switch
                id="open-now-toggle"
                checked={openNow}
                onCheckedChange={onOpenNowChange}
              />
            </div>

            {/* Busy level */}
            <div className="space-y-2">
              <Label>Busy level</Label>
              <Select
                value={busyFilter}
                onValueChange={(v) =>
                  onBusyFilterChange(v as BusyStatus | 'all')
                }
              >
                <SelectTrigger aria-label="Busy level filter">
                  <SelectValue placeholder="Any level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any level</SelectItem>
                  <SelectItem value="quiet">Quiet</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city-input">City</Label>
              <Input
                id="city-input"
                placeholder="Enter city..."
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
              />
            </div>

            {/* Price range */}
            <div className="space-y-4">
              <Label>Price range (per hour)</Label>
              <Slider
                value={priceRange}
                onValueChange={(value) =>
                  onPriceRangeChange(value as [number, number])
                }
                max={500000}
                step={10000}
                aria-label="Price range"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>₮{priceRange[0].toLocaleString()}</span>
                <span>₮{priceRange[1].toLocaleString()}</span>
              </div>
            </div>

            <Button className="w-full" onClick={() => setIsOpen(false)}>
              Apply Filters
            </Button>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  onOpenNowChange(false);
                  onBusyFilterChange('all');
                  onCityChange('');
                  onPriceRangeChange([0, 500000]);
                  setIsOpen(false);
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
