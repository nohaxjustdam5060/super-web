if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const accessToken = process.env.MP_ACCESS_TOKEN || 'TEST-1962863895606120-080612-004eca80f1239c8f186f594c925bbd20-3566378754';

const client = new MercadoPagoConfig({
  accessToken
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

module.exports = {
  client,
  preferenceClient,
  paymentClient
};
