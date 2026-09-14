import React from 'react';

const PAYMENT_METHODS = [
  { id: 'visa', name: 'Visa', icon: '/icons/visa.svg' },
  { id: 'mastercard', name: 'Mastercard', icon: '/icons/mastercard.svg' },
  { id: 'amex', name: 'American Express', icon: '/icons/amex.svg' },
  { id: 'yape', name: 'Yape', icon: '/icons/yape.svg' }
];

export default function PaymentBadges({ className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {PAYMENT_METHODS.map((pm) => (
        <div
          key={pm.id}
          className="h-7 w-11 sm:h-8 sm:w-12 bg-white border border-gray-200 rounded-md flex items-center justify-center p-1 shadow-xs hover:border-gray-300 transition-colors flex-shrink-0"
          title={pm.name}
        >
          <img
            src={pm.icon}
            alt={pm.name}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain p-0.5"
          />
        </div>
      ))}
    </div>
  );
}
