import React, { useEffect } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-00000000-0000-0000-0000-000000000000';

export default function MercadoPagoBrick({ amount, orderId, onSubmitPayment }) {
  useEffect(() => {
    initMercadoPago(MP_PUBLIC_KEY, { locale: 'es-PE' });
  }, []);

  const initialization = {
    amount: Number(amount) || 100,
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
        theme: 'default',
      }
    }
  };

  const onSubmit = async (param) => {
    // Extract formData whether param is { selectedPaymentMethod, formData } or formData directly
    const formData = param?.formData || param;

    console.log('👉 [LOG PASO 1 - BRICK GENERÓ FORMDATA]:', {
      token: formData?.token ? `${formData.token.substring(0, 15)}...` : 'NO_TOKEN',
      payment_method_id: formData?.payment_method_id,
      installments: formData?.installments,
      issuer_id: formData?.issuer_id,
      payer_email: formData?.payer?.email,
      raw_formData: formData
    });

    return new Promise((resolve, reject) => {
      onSubmitPayment({
        ...formData,
        token: formData?.token,
        payment_method_id: formData?.payment_method_id,
        installments: formData?.installments,
        issuer_id: formData?.issuer_id,
        payer: formData?.payer,
        external_reference: orderId,
      })
        .then(() => resolve())
        .catch((err) => {
          console.error('❌ [MercadoPago Brick Submit Error]:', err);
          reject();
        });
    });
  };

  const onError = async (error) => {
    console.error('❌ [MercadoPago Brick Error]:', error);
  };

  const onReady = async () => {
    console.log('✅ [MercadoPago Brick Renderizado y Listo]');
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
