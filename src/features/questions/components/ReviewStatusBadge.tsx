import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ReviewStatusBadgeProps {
  status: 'not_reviewed' | 'reviewed';
  className?: string;
}

export const ReviewStatusBadge: React.FC<ReviewStatusBadgeProps> = ({ status, className = '' }) => {
  if (status === 'reviewed') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Revisada</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5" />
      <span>Não revisada</span>
    </span>
  );
};
