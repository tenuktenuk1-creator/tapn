import { Badge } from '@/components/ui/badge';
import { BusyStatus, busyStatusLabels, busyStatusColors } from '@/types/venue';

interface BusyBadgeProps {
  status: BusyStatus;
  showPulse?: boolean;
  className?: string;
}

export function BusyBadge({ status, showPulse = true, className = '' }: BusyBadgeProps) {
  const colors = busyStatusColors[status];
  
  return (
    <Badge 
      className={`${colors.bg} ${colors.text} border-0 rounded-full text-xs font-medium ${className}`}
    >
      {showPulse && (
        <span className="w-2 h-2 rounded-full bg-current mr-1.5 animate-pulse" />
      )}
      {busyStatusLabels[status]}
    </Badge>
  );
}
