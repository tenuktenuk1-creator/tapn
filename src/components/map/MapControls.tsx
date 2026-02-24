import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Locate, Maximize, Minimize, Clock } from 'lucide-react';

interface MapControlsProps {
  onLocate: () => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  fullscreenSupported: boolean;
  openNow: boolean;
  onOpenNowToggle: () => void;
}

export const MapControls = memo(function MapControls({
  onLocate,
  isFullscreen,
  onFullscreenToggle,
  fullscreenSupported,
  openNow,
  onOpenNowToggle,
}: MapControlsProps) {
  return (
    <div
      className="absolute top-3 right-3 flex flex-col gap-2 z-[5]"
      role="group"
      aria-label="Map controls"
    >
      {/* Locate me */}
      <Button
        size="icon"
        variant="secondary"
        className="h-10 w-10 shadow-md bg-background/90 backdrop-blur-sm border border-border hover:bg-background"
        onClick={onLocate}
        aria-label="Locate me"
        title="Locate me"
      >
        <Locate className="h-4 w-4" />
      </Button>

      {/* Fullscreen toggle */}
      {fullscreenSupported && (
        <Button
          size="icon"
          variant="secondary"
          className="h-10 w-10 shadow-md bg-background/90 backdrop-blur-sm border border-border hover:bg-background"
          onClick={onFullscreenToggle}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Open now quick filter */}
      <Button
        size="icon"
        variant={openNow ? 'default' : 'secondary'}
        className={`h-10 w-10 shadow-md backdrop-blur-sm border transition-colors ${
          openNow
            ? 'bg-green-600 border-green-500 hover:bg-green-700 text-white'
            : 'bg-background/90 border-border hover:bg-background'
        }`}
        onClick={onOpenNowToggle}
        aria-label={openNow ? 'Show all venues' : 'Show open venues only'}
        aria-pressed={openNow}
        title={openNow ? 'Showing: Open now' : 'Quick filter: Open now'}
      >
        <Clock className="h-4 w-4" />
      </Button>
    </div>
  );
});
