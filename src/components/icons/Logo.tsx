import { Coffee } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
}

export function Logo({ className, iconSize = 24, showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Coffee size={iconSize} className="text-primary" />
      {showText && <span className="text-xl font-bold text-primary">{APP_NAME}</span>}
    </div>
  );
}
