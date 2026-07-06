import type { LucideIcon } from 'lucide-react';

interface BottomNavIconProps {
  icon: LucideIcon;
  color: string;
  borderColor?: string;
}

export default function BottomNavIcon({ icon: Icon, color, borderColor = '#e2e8f0' }: BottomNavIconProps) {
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white shadow-sm"
      style={{ borderColor, color }}
    >
      <Icon size={17} strokeWidth={2.4} />
    </span>
  );
}
