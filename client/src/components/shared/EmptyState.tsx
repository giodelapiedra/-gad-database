import { InboxIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  /** @deprecated Use `subtitle` instead */
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon: Icon = InboxIcon,
  title,
  subtitle,
  description,
  action,
}: EmptyStateProps) {
  const sub = subtitle ?? description;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-[#A1A1AA]" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {sub && (
          <p className="max-w-xs text-xs text-muted-foreground">{sub}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
