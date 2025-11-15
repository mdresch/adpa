'use client';

import { CheckCircle2, Clock, XCircle, FileSignature } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SignatureStatus = 'pending' | 'signed' | 'rejected' | 'expired';

export type SignatureStatusBadgeProps = {
  status: SignatureStatus;
  className?: string;
};

export const SignatureStatusBadge = ({ status, className }: SignatureStatusBadgeProps) => {
  const statusConfig = {
    pending: {
      label: 'Pending',
      icon: Clock,
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    signed: {
      label: 'Signed',
      icon: CheckCircle2,
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    expired: {
      label: 'Expired',
      icon: FileSignature,
      variant: 'secondary' as const,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn('flex items-center gap-1.5', config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

