import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal } from 'lucide-react';
import { VenueType, venueTypeLabels } from '@/types/venue';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface VenueFiltersProps {
  search: string;
  venueType: VenueType | 'all';
  city: string;
  priceRange: [number, number];
  onSearchChange: (value: string) => void;
  onVenueTypeChange: (value: VenueType | 'all') => void;
  onCityChange: (value: string) => void;
  onPriceRangeChange: (value: [number, number]) => void;
}

export function VenueFilters({
  search,
  venueType,
  city,
  priceRange,
  onSearchChange,
  onVenueTypeChange,
  onCityChange,
  onPriceRangeChange,
}: VenueFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const venueTypes: Array<VenueType | 'all'> = ['all', 'cafe', 'karaoke', 'pool_snooker', 'lounge'];

  return (
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
        <SelectTrigger className="w-full sm:w-[180px]">
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

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">More Filters</span>
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter Venues</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                placeholder="Enter city..."
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <Label>Price Range (per hour)</Label>
              <Slider
                value={priceRange}
                onValueChange={(value) => onPriceRangeChange(value as [number, number])}
                max={500000}
                step={10000}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>₮{priceRange[0].toLocaleString()}</span>
                <span>₮{priceRange[1].toLocaleString()}</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => setIsOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}