import React from 'react';

interface StockBadgeProps {
  quantity: number;
  threshold: number;
}

export const StockBadge = ({ quantity, threshold }: StockBadgeProps) => {
  if (quantity === 0) {
    return (
      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">
        Rupture
      </span>
    );
  }
  
  if (quantity <= threshold) {
    return (
      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold border border-orange-200">
        Critique
      </span>
    );
  }

  return (
    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
      En stock
    </span>
  );
};