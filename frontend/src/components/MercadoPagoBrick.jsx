import React, { useEffect } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-00000000-0000-0000-0000-000000000000';

export default function MercadoPagoBrick({ amount, orderId, onSubmitPayment }) {
  useEffect(() => {
    initMercadoPago(MP_PUBLIC_KEY, { locale: 'es-PE' });
  }, []);

  const initialization = {
    amount: Number(amount) || 100,
    preferenceId: `<PREFERENCE_ID>`,
  };

  const customization = {
    paymentMethods: {
      ticket: 'all',
      bankTransfer: 'all',
      creditCard: 'all',
      debitCard: 'all',
      mercadoPago: 'all',
    },
    visual: {
      style: {
        theme: 'default', // 'default' | 'dark' | 'bootstrap' | 'flat'
      }
    }
  };

  const onSubmit = async ({ selectedPaymentMethod, formData }) => {
    return new Promise((resolve, reject) => {
      onSubmitPayment(formData)
        .then(() => resolve())
        .catch(() => reject());
    });
  };

  const onError = async (error) => {
    console.error('[MercadoPago Brick Error]:', error);
  };

  const onReady = async () => {
    console.log('[MercadoPago Brick Ready]');
  };

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <Payment
        initialization={initialization}
        customization={customization}
        onSubmit={onSubmit}
        onReady={onReady}
        onError={onError}
      />
    </div>
  );
}
