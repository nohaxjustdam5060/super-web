import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || 'TEST-00000000-0000-0000-0000-000000000000';

function MercadoPagoBrick({ amount, orderId, onSubmitPayment }) {
  useEffect(() => {
    initMercadoPago(MP_PUBLIC_KEY, { locale: 'es-PE' });
  }, []);

  // Keep latest onSubmitPayment reference in a ref to prevent callback changes from re-rendering the SDK Brick
  const onSubmitPaymentRef = useRef(onSubmitPayment);
  useEffect(() => {
    onSubmitPaymentRef.current = onSubmitPayment;
  }, [onSubmitPayment]);

  // Memoize initialization object so object identity stays stable unless amount changes
  const initialization = useMemo(() => ({
    amount: Number(amount) || 100,
  }), [amount]);

  // Memoize customization object so object identity never changes
  const customization = useMemo(() => ({
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
  }), []);

  // Memoize onSubmit callback using the ref to access latest parent function
  const onSubmit = useCallback(async (param) => {
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
      if (onSubmitPaymentRef.current) {
        onSubmitPaymentRef.current({
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
            reject(err);
          });
      } else {
        resolve();
      }
    });
  }, [orderId]);

  const onError = useCallback(async (error) => {
    console.error('❌ [MercadoPago Brick Error]:', error);
  }, []);

  const onReady = useCallback(async () => {
    console.log('✅ [MercadoPago Brick Renderizado y Listo]');
  }, []);

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

// Wrap with React.memo so parent re-renders (like typing in invoice inputs) don't re-render or reload MercadoPagoBrick
export default React.memo(MercadoPagoBrick, (prevProps, nextProps) => {
  return prevProps.amount === nextProps.amount && prevProps.orderId === nextProps.orderId;
});
