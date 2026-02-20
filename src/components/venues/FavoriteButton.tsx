import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useIsFavorited, useToggleFavorite } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';

interface FavoriteButtonProps {
  venueId: string;
  venueName?: string;
  /** 'icon' = small icon-only button, 'full' = full button with label */
  variant?: 'icon' | 'full';
  className?: string;
}

export function FavoriteButton({
  venueId,
  venueName = 'this venue',
  variant = 'full',
  className = '',
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const { data: isFavorited = false, isLoading } = useIsFavorited(venueId);
  const toggle = useToggleFavorite();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.info('Sign in to save favorites');
      return;
    }

    try {
      await toggle.mutateAsync({ venueId, isFavorited });
      toast.success(
        isFavorited
          ? `Removed ${venueName} from favorites`
          : `Saved ${venueName} to favorites ❤️`
      );
    } catch {
      toast.error('Failed to update favorites');
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading || toggle.isPending}
        className={`p-2 rounded-full transition-all duration-200 ${
          isFavorited
            ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20'
            : 'text-muted-foreground bg-black/30 hover:bg-black/50 backdrop-blur-sm'
        } ${className}`}
        title={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
      >
        <Heart
          className={`h-4 w-4 transition-all ${
            isFavorited ? 'fill-red-500 scale-110' : ''
          } ${toggle.isPending ? 'animate-pulse' : ''}`}
        />
      </button>
    );
  }

  return (
    <Button
      variant={isFavorited ? 'default' : 'outline'}
      onClick={handleClick}
      disabled={isLoading || toggle.isPending}
      className={`gap-2 transition-all duration-200 ${
        isFavorited
          ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 hover:text-red-300'
          : 'border-muted-foreground/30 text-muted-foreground hover:border-red-400 hover:text-red-400'
      } ${className}`}
    >
      <Heart
        className={`h-4 w-4 transition-all ${
          isFavorited ? 'fill-red-400' : ''
        } ${toggle.isPending ? 'animate-pulse' : ''}`}
      />
      {isFavorited ? 'Saved' : 'Save'}
    </Button>
  );
}
