import { MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationBannerProps {
  onRequestLocation: () => void;
  isLoading?: boolean;
}

export function LocationBanner({ onRequestLocation, isLoading }: LocationBannerProps) {
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">
            Turn on location to see nearest venues
          </p>
          <p className="text-xs text-muted-foreground">
            Using Ulaanbaatar city center as default
          </p>
        </div>
      </div>
      <Button 
        size="sm" 
        onClick={onRequestLocation}
        disabled={isLoading}
        className="shrink-0"
      >
        <Navigation className="h-4 w-4 mr-2" />
        {isLoading ? 'Getting...' : 'Enable Location'}
      </Button>
    </div>
  );
}
