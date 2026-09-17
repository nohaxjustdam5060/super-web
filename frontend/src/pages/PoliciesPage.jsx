import React, { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Truck, 
  CreditCard, 
  RefreshCw, 
  ShieldCheck, 
  ArrowLeft, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  Clock,
  MapPin,
  Building2
} from 'lucide-react';
import PaymentBadges from '../components/PaymentBadges';

const TABS = [
  { id: 'terminos', label: 'Términos y Condiciones', icon: FileText },
  { id: 'envios', label: 'Envíos y Despacho', icon: Truck },
  { id: 'pagos', label: 'Métodos de Pago y Facturación', icon: CreditCard },
  { id: 'devoluciones', label: 'Devoluciones y Cambios', icon: RefreshCw },
  { id: 'garantia', label: 'Garantía y Servicio Técnico', icon: ShieldCheck }
];

export default function PoliciesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'terminos';

  // Ensure valid tab
  const activeTabObj = TABS.find((t) => t.id === currentTab) || TABS[0];
  const activeTab = activeTabObj.id;

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [currentTab]);

  return (
    <div className="bg-gray-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation back */}
        <div className="print:hidden">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-brand-red transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a la tienda
          </Link>
        </div>

        {/* Header Hero Banner */}
        <div className="bg-brand-dark text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold text-brand-red-accent uppercase tracking-widest block mb-2">
                Legal y Transparencia
              </span>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Términos, Garantías y Políticas Oficiales
              </h1>
              <p className="text-sm text-gray-300 mt-2 max-w-2xl leading-relaxed">
                En SUPERLAPTOP nos respaldan la transparencia y el cumplimiento normativo (Ley N° 29571 y Ley N° 29733). 
                Revisa aquí nuestras políticas comerciales, tiempos de envío, coberturas de garantía y facturación.
              </p>
            </div>

            <div className="flex-shrink-0 bg-gray-900/80 p-4 rounded-2xl border border-gray-800 text-xs text-gray-300 space-y-1">
              <p className="font-bold text-white text-sm">SUPERLAPTOP E.I.R.L.</p>
              <p>RUC: 20608594210</p>
              <p>Atención: Lunes a Sábado 9:00 a 19:00</p>
              <Link 
                to="/libro-de-reclamaciones" 
                className="inline-flex items-center text-brand-red-accent font-bold hover:underline mt-2 pt-1 border-t border-gray-800"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Libro de Reclamaciones Virtual
              </Link>
            </div>
          </div>
        </div>

        {/* Layout: Left Sidebar Tabs / Right Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Navigation Tabs Menu */}
          <div className="lg:col-span-3 space-y-2 sticky top-24 z-10 print:hidden">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 space-y-1">
              <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider px-3 py-2 block">
                Secciones Legales
              </span>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-brand-red text-white shadow-md shadow-red-600/20'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Policy Content Card */}
          <div className="lg:col-span-9 bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-10 space-y-6">
            
            {/* ========================================================================= */}
            {/* TAB 1: TÉRMINOS Y CONDICIONES                                             */}
            {/* ========================================================================= */}
            {activeTab === 'terminos' && (
              <div className="space-y-6 text-gray-800 leading-relaxed">
                <div className="border-b border-gray-200 pb-4">
                  <span className="text-xs font-bold text-brand-red uppercase tracking-wider">Normativa Oficial</span>
                  <h2 className="text-2xl font-black text-gray-900 mt-1">Términos y Condiciones de Uso y Compra</h2>
                  <p className="text-xs text-gray-500 mt-1">Última actualización: Enero 2026</p>
                </div>

                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  Al navegar y comprar en este sitio aceptas los términos siguientes. Si no estás de acuerdo, te pedimos no usar el sitio.
                </p>

                <div className="space-y-6 text-sm">
                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">1. Identificación del vendedor</h3>
                    <p className="text-gray-700">
                      El vendedor opera bajo la razón social <strong>SUPERLAPTOP E.I.R.L.</strong> y RUC <strong>20608594210</strong> declarados en la página Nosotros y en cada comprobante de venta. Las transacciones se realizan en Soles (PEN) salvo indicación contraria.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">2. Precios</h3>
                    <p className="text-gray-700">
                      Todos los precios incluyen IGV. Los precios pueden cambiar sin previo aviso, salvo para pedidos ya pagados — esos quedan al precio del momento de la compra. Las promociones tienen plazo y stock limitado; el sistema deja de aplicarlas automáticamente al agotarse.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">3. Aceptación del pedido</h3>
                    <p className="text-gray-700">
                      El pedido se considera aceptado cuando se confirma el pago. Hasta ese momento podemos cancelarlo si hay error de precio, falta de stock real, o motivos justificados que comunicamos al cliente.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">4. Pagos</h3>
                    <p className="text-gray-700">
                      Aceptamos los medios listados en Métodos de pago. Los datos sensibles los procesa la pasarela bancaria; no almacenamos tarjetas en nuestros sistemas.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">5. Envío y entrega</h3>
                    <p className="text-gray-700">
                      Las condiciones y tiempos están en la página Envíos. El riesgo de pérdida pasa al comprador al momento de la entrega.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">6. Devoluciones y garantía</h3>
                    <p className="text-gray-700">
                      Aplican las políticas de Devoluciones y Garantía. En caso de conflicto, puedes acudir al Libro de Reclamaciones.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">7. Cuenta de usuario</h3>
                    <p className="text-gray-700">
                      Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que ocurran bajo tu cuenta. Avísanos de inmediato ante cualquier uso no autorizado.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">8. Uso permitido</h3>
                    <p className="text-gray-700">No está permitido:</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      <li>Acceder de forma automatizada para extraer datos (scraping) salvo acuerdo expreso.</li>
                      <li>Suplantar identidades o usar datos de pago ajenos.</li>
                      <li>Interferir con el funcionamiento del sitio.</li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">9. Propiedad intelectual</h3>
                    <p className="text-gray-700">
                      Las imágenes, textos, marcas y diseños son de sus respectivos titulares. Su uso comercial sin autorización está prohibido.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">10. Privacidad</h3>
                    <p className="text-gray-700">
                      El tratamiento de datos personales se rige por la Política de privacidad conforme a la Ley 29733.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">11. Resolución de conflictos</h3>
                    <p className="text-gray-700">
                      En caso de conflicto, las partes se someten primero al Libro de Reclamaciones y, supletoriamente, a los tribunales del distrito judicial de Lima.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-extrabold text-base text-gray-900">12. Modificaciones</h3>
                    <p className="text-gray-700">
                      Estos términos pueden actualizarse. La versión vigente es siempre la publicada en este sitio. Los cambios importantes se notifican por correo a las cuentas registradas.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: ENVÍOS Y DESPACHO                                                 */}
            {/* ========================================================================= */}
            {activeTab === 'envios' && (
              <div className="space-y-6 text-gray-800 leading-relaxed">
                <div className="border-b border-gray-200 pb-4">
                  <span className="text-xs font-bold text-brand-red uppercase tracking-wider">Logística Nacional</span>
                  <h2 className="text-2xl font-black text-gray-900 mt-1">Políticas de Envío y Despacho</h2>
                  <p className="text-xs text-gray-500 mt-1">Despachos seguros a todo el Perú</p>
                </div>

                <p className="text-sm text-gray-700">
                  Hacemos envíos a todo el país. Despachamos los pedidos pagados de lunes a sábado.
                </p>

                <div className="space-y-4 text-sm text-gray-700">
                  <h3 className="font-extrabold text-base text-gray-900">Tiempos de entrega estimados:</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li><strong>Lima Metropolitana:</strong> 24 a 48 horas hábiles</li>
                    <li><strong>Provincias capitales:</strong> 3 a 5 días hábiles</li>
                    <li><strong>Zonas rurales:</strong> 5 a 10 días hábiles</li>
                  </ul>
                  <p className="text-xs text-gray-500 italic">
                    * Los tiempos son estimados; pueden variar según la empresa de transporte y las condiciones del lugar de entrega.
                  </p>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Costo del envío:</h3>
                  <p>
                    El costo varía según el peso del producto y la ciudad de destino. Se calcula automáticamente en el checkout antes de pagar.
                  </p>
                  <p>
                    Envío gratis disponible en pedidos sobre cierto monto en Lima Metropolitana — el descuento se aplica solo al cumplir el monto mínimo configurado.
                  </p>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Cómo seguir el envío:</h3>
                  <p>
                    Una vez despachado el paquete, recibes por correo y/o WhatsApp el código de seguimiento de la empresa de transporte para rastrear tu orden.
                  </p>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Recepción del pedido:</h3>
                  <p>
                    Revisa el paquete antes de firmar la recepción. Si llega visiblemente dañado, deja constancia con el transportista y avísanos el mismo día.
                  </p>
                  <p>
                    Si nadie está en la dirección al momento de la entrega, el transportista deja un aviso y reintenta otra vez (normalmente al día siguiente). Tras el segundo intento fallido, el paquete vuelve al almacén para reagendar la entrega.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: MÉTODOS DE PAGO Y FACTURACIÓN                                     */}
            {/* ========================================================================= */}
            {activeTab === 'pagos' && (
              <div className="space-y-6 text-gray-800 leading-relaxed">
                <div className="border-b border-gray-200 pb-4">
                  <span className="text-xs font-bold text-brand-red uppercase tracking-wider">Pasarela Segura & SUNAT</span>
                  <h2 className="text-2xl font-black text-gray-900 mt-1">Métodos de Pago</h2>
                  <p className="text-xs text-gray-500 mt-1">Procesamiento 100% cifrado de extremo a extremo</p>
                </div>

                <p className="text-sm text-gray-700">
                  Aceptamos las siguientes formas de pago. Todas las transacciones se procesan con cifrado y los datos de tu tarjeta nunca pasan por nuestros servidores — los procesa directamente la pasarela bancaria.
                </p>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 block mb-3 uppercase tracking-wider">Medios de Pago Homologados</span>
                  <PaymentBadges />
                </div>

                <div className="space-y-4 text-sm text-gray-700">
                  <h3 className="font-extrabold text-base text-gray-900">1. Tarjetas de crédito y débito:</h3>
                  <p>
                    Visa, Mastercard, American Express y Diners Club. Pago en una sola cuota o en cuotas según las condiciones de tu banco emisor.
                  </p>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">2. Billeteras digitales:</h3>
                  <p>
                    Yape, Plin y otras billeteras electrónicas habilitadas por la pasarela de pago.
                  </p>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">3. Transferencia bancaria:</h3>
                  <p>
                    Si prefieres pagar por transferencia, te facilitamos los datos bancarios al confirmar el pedido. El pedido se reserva durante 24 horas a la espera de la recepción del comprobante de pago.
                  </p>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">4. Pago contra entrega:</h3>
                  <p>
                    Disponible para zonas seleccionadas de Lima Metropolitana. Verifica en el checkout si tu dirección califica para esta modalidad.
                  </p>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Seguridad:</h3>
                  <p>
                    Procesamos los pagos con pasarelas certificadas PCI DSS. La conexión está protegida con cifrado HTTPS/SSL de extremo a extremo. Nunca te pediremos claves ni códigos de seguridad de tus tarjetas por correo ni mensajería.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: DEVOLUCIONES Y CAMBIOS                                            */}
            {/* ========================================================================= */}
            {activeTab === 'devoluciones' && (
              <div className="space-y-6 text-gray-800 leading-relaxed">
                <div className="border-b border-gray-200 pb-4">
                  <span className="text-xs font-bold text-brand-red uppercase tracking-wider">Satisfacción Garantizada</span>
                  <h2 className="text-2xl font-black text-gray-900 mt-1">Políticas de Devolución y Cambios</h2>
                  <p className="text-xs text-gray-500 mt-1">Condiciones para devoluciones conforme a la Ley N° 29571</p>
                </div>

                <p className="text-sm text-gray-700">
                  Aceptamos devoluciones dentro de los 7 días calendario desde que el producto fue entregado, siempre que se cumplan las condiciones detalladas abajo. Esta política se enmarca en el Código de Protección y Defensa del Consumidor (Ley 29571).
                </p>

                <div className="space-y-4 text-sm text-gray-700">
                  <h3 className="font-extrabold text-base text-gray-900">Condiciones para la devolución:</h3>
                  <p>El producto debe estar:</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Sin uso.</li>
                    <li>En su empaque original, completo y en buen estado.</li>
                    <li>Con todos sus accesorios, manuales, cables y obsequios incluidos.</li>
                    <li>Acompañado de la boleta o factura electrónica de la compra.</li>
                  </ul>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Productos que NO admiten devolución:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Productos personalizados o hechos a pedido.</li>
                    <li>Software o licencias digitales ya activadas.</li>
                    <li>Productos vendidos como outlet u open-box (estado expresamente declarado al comprar).</li>
                  </ul>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Cómo solicitar la devolución:</h3>
                  <ol className="list-decimal pl-5 space-y-1.5 text-gray-700">
                    <li>Comunícate por WhatsApp o correo dentro de los 7 días calendario posteriores a la recepción.</li>
                    <li>Te enviamos las instrucciones para el envío de retorno.</li>
                    <li>Al recibir el producto y verificar su estado íntegro, procesamos el reembolso por la misma vía de pago original.</li>
                    <li>El reembolso se refleja en tu cuenta entre 5 y 15 días hábiles dependiendo de la entidad bancaria emisora.</li>
                  </ol>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Costo del envío de retorno:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Si el producto llegó con fallas o equivocado, nosotros cubrimos el costo íntegro del retorno.</li>
                    <li>Si corresponde a un desistimiento o cambio de opinión, el costo del envío de retorno corre por cuenta del cliente.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: GARANTÍA Y SERVICIO TÉCNICO                                        */}
            {/* ========================================================================= */}
            {activeTab === 'garantia' && (
              <div className="space-y-6 text-gray-800 leading-relaxed">
                <div className="border-b border-gray-200 pb-4">
                  <span className="text-xs font-bold text-brand-red uppercase tracking-wider">Respaldo de Fabricante</span>
                  <h2 className="text-2xl font-black text-gray-900 mt-1">Políticas de Garantía y Servicio Técnico</h2>
                  <p className="text-xs text-gray-500 mt-1">Garantía oficial de fábrica en todos los equipos y componentes</p>
                </div>

                <p className="text-sm text-gray-700">
                  Todos nuestros productos cuentan con garantía oficial de fábrica según la marca y el tipo de componente o equipo.
                </p>

                <div className="space-y-4 text-sm text-gray-700">
                  <h3 className="font-extrabold text-base text-gray-900">Tiempo de garantía:</h3>
                  <p>
                    El tiempo de garantía estándar es de 12 meses, salvo que la ficha técnica del producto especifique un periodo mayor (24 o 36 meses según fabricante).
                  </p>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Qué cubre la garantía:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Defectos de fabricación de origen.</li>
                    <li>Fallas funcionales no causadas por mal uso ni negligencia.</li>
                    <li>Componentes internos de hardware.</li>
                  </ul>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Qué NO cubre:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li>Golpes, caídas, quiñes o daños por líquidos.</li>
                    <li>Pantallas rotas, rajadas o dañadas por presión externa.</li>
                    <li>Uso indebido del producto, sobrevoltaje o instalación de software/firmware no autorizado.</li>
                    <li>Modificaciones físicas, rotura de sellos de seguridad o intervención de terceros no autorizados.</li>
                    <li>Pérdida o deterioro de accesorios y cables.</li>
                    <li>Desgaste normal por uso continuado.</li>
                  </ul>

                  <h3 className="font-extrabold text-base text-gray-900 pt-2">Cómo activar la garantía:</h3>
                  <ol className="list-decimal pl-5 space-y-1.5 text-gray-700">
                    <li>Comunícate con nosotros por WhatsApp o correo detallando la falla detectada.</li>
                    <li>Te indicaremos las pautas para derivar el equipo al servicio técnico oficial o centro autorizado.</li>
                    <li>El servicio técnico emite un diagnóstico formal (plazo habitual entre 7 y 21 días según evaluación).</li>
                    <li>De proceder la garantía, se repara o cambia el producto sin costo alguno. En caso contrario, se informa el motivo antes de cualquier gasto adicional.</li>
                  </ol>

                  <p className="text-xs text-gray-500 italic pt-2">
                    * Es indispensable presentar la boleta o factura electrónica de compra para todo trámite de garantía.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
