import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  Send, 
  User, 
  ShoppingBag, 
  Building2,
  Download,
  Loader2,
  FileCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axiosClient from '../api/axiosClient';

const DOC_SPECS = {
  DNI: { label: 'DNI (Documento Nacional de Identidad)', maxLength: 8, exactLength: 8, numericOnly: true, placeholder: '8 dígitos numéricos' },
  RUC: { label: 'RUC (Registro Único de Contribuyente)', maxLength: 11, exactLength: 11, numericOnly: true, placeholder: '11 dígitos numéricos' },
  CE: { label: 'Carné de Extranjería (CE)', maxLength: 12, minLength: 4, numericOnly: false, placeholder: '4 a 12 caracteres' },
  PASAPORTE: { label: 'Pasaporte', maxLength: 12, minLength: 4, numericOnly: false, placeholder: '4 a 12 caracteres' }
};

const sanitizeDocNumber = (value, docType) => {
  const spec = DOC_SPECS[docType] || { maxLength: 12, numericOnly: false };
  if (spec.numericOnly) {
    return value.replace(/\D/g, '').slice(0, spec.maxLength);
  }
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, spec.maxLength);
};

export default function ComplaintsBookPage() {
  // Form State
  const [formData, setFormData] = useState({
    doc_type: 'DNI',
    doc_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    department: 'Lima',
    province: 'Lima',
    district: '',
    is_minor: false,
    guardian_name: '',
    guardian_doc_type: 'DNI',
    guardian_doc_number: '',
    contracted_good_type: 'PRODUCTO',
    claimed_amount: '',
    currency: 'PEN',
    good_description: '',
    claim_type: 'RECLAMO',
    claim_detail: '',
    consumer_request: '',
    data_consent: false,
    truth_consent: false
  });

  const [loading, setLoading] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successClaim, setSuccessClaim] = useState(null);
  const sheetRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDocTypeChange = (e) => {
    const newType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      doc_type: newType,
      doc_number: sanitizeDocNumber(prev.doc_number, newType)
    }));
  };

  const handleDocNumberChange = (e) => {
    const sanitized = sanitizeDocNumber(e.target.value, formData.doc_type);
    setFormData((prev) => ({
      ...prev,
      doc_number: sanitized
    }));
  };

  const handleGuardianDocTypeChange = (e) => {
    const newType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      guardian_doc_type: newType,
      guardian_doc_number: sanitizeDocNumber(prev.guardian_doc_number, newType)
    }));
  };

  const handleGuardianDocNumberChange = (e) => {
    const sanitized = sanitizeDocNumber(e.target.value, formData.guardian_doc_type || 'DNI');
    setFormData((prev) => ({
      ...prev,
      guardian_doc_number: sanitized
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. Legal Consents
    if (!formData.data_consent || !formData.truth_consent) {
      setErrorMessage('Debe aceptar los términos de tratamiento de datos personales y la declaración de veracidad.');
      return;
    }

    // 2. Mandatory consumer fields
    if (!formData.doc_number || !formData.first_name || !formData.last_name || !formData.email || !formData.phone || !formData.address) {
      setErrorMessage('Por favor complete todos los datos del consumidor.');
      return;
    }

    // 3. Dynamic Document Validation for Consumer
    if (formData.doc_type === 'DNI' && formData.doc_number.length !== 8) {
      setErrorMessage('El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }
    if (formData.doc_type === 'RUC' && formData.doc_number.length !== 11) {
      setErrorMessage('El RUC debe tener exactamente 11 dígitos numéricos.');
      return;
    }
    if ((formData.doc_type === 'CE' || formData.doc_type === 'PASAPORTE') && formData.doc_number.length < 4) {
      setErrorMessage(`El número de ${formData.doc_type === 'CE' ? 'Carné de Extranjería' : 'Pasaporte'} debe tener al menos 4 caracteres.`);
      return;
    }

    // 4. Minor / Guardian validation if applicable
    if (formData.is_minor) {
      if (!formData.guardian_name.trim() || !formData.guardian_doc_number.trim()) {
        setErrorMessage('Por favor complete los datos obligatorios del padre, madre o tutor.');
        return;
      }
      const gType = formData.guardian_doc_type || 'DNI';
      if (gType === 'DNI' && formData.guardian_doc_number.length !== 8) {
        setErrorMessage('El DNI del apoderado/tutor debe tener exactamente 8 dígitos numéricos.');
        return;
      }
      if (gType === 'RUC' && formData.guardian_doc_number.length !== 11) {
        setErrorMessage('El RUC del apoderado/tutor debe tener exactamente 11 dígitos numéricos.');
        return;
      }
      if ((gType === 'CE' || gType === 'PASAPORTE') && formData.guardian_doc_number.length < 4) {
        setErrorMessage(`El documento del apoderado/tutor (${gType}) debe tener al menos 4 caracteres.`);
        return;
      }
    }

    // 5. Contracted Good & Claim Details
    if (!formData.good_description.trim()) {
      setErrorMessage('Por favor detalle la descripción del bien contratado.');
      return;
    }

    if (!formData.claim_detail.trim() || !formData.consumer_request.trim()) {
      setErrorMessage('Por favor detalle los hechos de su reclamación y su pedido concreto.');
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post('/claims', {
        ...formData,
        claimed_amount: formData.claimed_amount ? parseFloat(formData.claimed_amount) : 0
      });

      if (res.data.success) {
        setSuccessClaim(res.data.claim);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMessage(res.data.message || 'Error al procesar la reclamación.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Ocurrió un error al enviar el formulario. Por favor verifique su conexión e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!sheetRef.current || !successClaim) return;
    setDownloadingPDF(true);
    try {
      const element = sheetRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 8;
      const contentWidth = pdfWidth - (margin * 2);
      const imgProps = pdf.getImageProperties(imgData);
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;

      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, '', 'FAST');
      heightLeft -= (pdfHeight - (margin * 2));

      while (heightLeft > 0) {
        position = margin - (contentHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, '', 'FAST');
        heightLeft -= (pdfHeight - (margin * 2));
      }

      const fileName = `Hoja_Reclamacion_${successClaim.claim_code || 'REC'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  const resetForm = () => {
    setSuccessClaim(null);
    setFormData({
      doc_type: 'DNI',
      doc_number: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      department: 'Lima',
      province: 'Lima',
      district: '',
      is_minor: false,
      guardian_name: '',
      guardian_doc_type: 'DNI',
      guardian_doc_number: '',
      contracted_good_type: 'PRODUCTO',
      claimed_amount: '',
      currency: 'PEN',
      good_description: '',
      claim_type: 'RECLAMO',
      claim_detail: '',
      consumer_request: '',
      data_consent: false,
      truth_consent: false
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Navigation back */}
        <div className="mb-6 print:hidden">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-brand-red transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a la tienda
          </Link>
        </div>

        {/* Legal Header Card */}
        <div className="bg-brand-dark text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-800 mb-8 print:border-gray-300 print:bg-white print:text-black print:shadow-none">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-800 print:border-gray-300">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-8 h-8 text-brand-red" />
              </div>
              <div>
                <span className="text-xs font-bold text-brand-red uppercase tracking-wider block">
                  Conforme a Ley N° 29571 y D.S. N° 011-2011-PCM
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white print:text-black">
                  LIBRO DE RECLAMACIONES VIRTUAL
                </h1>
              </div>
            </div>

            {/* Provider Data Badge */}
            <div className="text-left sm:text-right text-xs text-gray-400 print:text-gray-700 bg-gray-900/60 print:bg-gray-100 p-3 rounded-lg border border-gray-800 print:border-gray-300">
              <p className="font-bold text-white print:text-black">SUPERLAPTOP E.I.R.L.</p>
              <p>RUC: 20608594210</p>
              <p>Jr.Velarde 172, Lima</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-300 print:text-gray-700 mt-4 leading-relaxed">
            Estimado cliente, de acuerdo a lo dispuesto por el Código de Protección y Defensa del Consumidor, 
            SUPERLAPTOP pone a su disposición este Libro de Reclamaciones Virtual. Todas las solicitudes serán 
            atendidas en un plazo no mayor a <strong className="text-brand-red-accent print:text-black">15 días hábiles</strong>.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* CASE 1: SUCCESS CONFIRMATION SCREEN (PRINTABLE / PDF SHEET)               */}
        {/* ========================================================================= */}
        {successClaim ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-10 mb-10 print:shadow-none print:border-none print:p-0">
            
            {/* PDF Printable Document Container */}
            <div ref={sheetRef} className="bg-white p-4 sm:p-6 rounded-xl space-y-6 text-gray-900">
              
              {/* Document Official Header */}
              <div className="border-b-2 border-gray-900 pb-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-black text-brand-red uppercase tracking-widest block">
                      SUPERLAPTOP E.I.R.L. &bull; RUC: 20608594210
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                      LIBRO DE RECLAMACIONES VIRTUAL
                    </h2>
                    <p className="text-xs text-gray-500">
                      Conforme a la Ley N° 29571 y D.S. N° 011-2011-PCM &bull; Jr.Velarde 172, Lima
                    </p>
                  </div>
                  
                  <div className="bg-gray-100 border border-gray-300 rounded-xl p-3 text-left sm:text-right flex-shrink-0">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Hoja de Reclamación N°
                    </span>
                    <span className="text-base sm:text-lg font-black text-gray-900 font-mono block">
                      {successClaim.claim_code}
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      {new Date(successClaim.created_at || Date.now()).toLocaleString('es-PE')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Plazo Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed space-y-1">
                <div className="flex items-center space-x-2 font-bold text-blue-950">
                  <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Plazo Legal de Atención: Máximo 15 días hábiles</span>
                </div>
                <p>
                  Se ha remitido una copia fiel de esta constancia al correo electrónico: <strong>{successClaim.email}</strong>. Conforme al Código de Protección y Defensa del Consumidor, SUPERLAPTOP brindará respuesta formal a los hechos expuestos dentro del plazo legal.
                </p>
              </div>

              {/* Summary Data Sections */}
              <div className="space-y-5 text-sm text-gray-800">
                
                {/* 1. Consumidor */}
                <div className="border border-gray-300 rounded-xl p-4 sm:p-5 bg-gray-50/70">
                  <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm uppercase tracking-wider border-b border-gray-200 pb-2 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2 text-brand-red flex-shrink-0" />
                    1. Identificación del Consumidor Reclamante
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                    <p><span className="text-gray-500">Nombres y Apellidos:</span> <strong className="text-gray-900">{successClaim.first_name} {successClaim.last_name}</strong></p>
                    <p><span className="text-gray-500">Documento:</span> <strong className="text-gray-900">{successClaim.doc_type} {successClaim.doc_number}</strong></p>
                    <p><span className="text-gray-500">Correo Electrónico:</span> <strong className="text-gray-900">{successClaim.email}</strong></p>
                    <p><span className="text-gray-500">Teléfono / Celular:</span> <strong className="text-gray-900">{successClaim.phone}</strong></p>
                    <p className="sm:col-span-2">
                      <span className="text-gray-500">Domicilio:</span> <strong className="text-gray-900">{successClaim.address}</strong>
                      {(successClaim.district || successClaim.province || successClaim.department) && (
                        <span className="text-gray-600"> ({[successClaim.district, successClaim.province, successClaim.department].filter(Boolean).join(', ')})</span>
                      )}
                    </p>

                    {successClaim.is_minor && successClaim.guardian_name && (
                      <div className="sm:col-span-2 pt-2 border-t border-gray-200 mt-1">
                        <span className="text-[11px] font-bold text-gray-700 uppercase block mb-1">Padre, Madre o Tutor (Menor de edad):</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <p><span className="text-gray-500">Nombre del Tutor:</span> <strong className="text-gray-900">{successClaim.guardian_name}</strong></p>
                          <p><span className="text-gray-500">Documento Tutor:</span> <strong className="text-gray-900">{successClaim.guardian_doc_type || 'DNI'} {successClaim.guardian_doc_number}</strong></p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Bien Contratado */}
                <div className="border border-gray-300 rounded-xl p-4 sm:p-5 bg-gray-50/70">
                  <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm uppercase tracking-wider border-b border-gray-200 pb-2 mb-3 flex items-center">
                    <ShoppingBag className="w-4 h-4 mr-2 text-brand-red flex-shrink-0" />
                    2. Identificación del Bien Contratado
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                    <p><span className="text-gray-500">Tipo de Bien:</span> <strong className="text-gray-900 uppercase">{successClaim.contracted_good_type}</strong></p>
                    <p><span className="text-gray-500">Monto Reclamado:</span> <strong className="text-gray-900">{successClaim.currency || 'PEN'} S/ {Number(successClaim.claimed_amount || 0).toFixed(2)}</strong></p>
                    <p className="sm:col-span-2"><span className="text-gray-500">Descripción del Bien:</span> <strong className="text-gray-900">{successClaim.good_description}</strong></p>
                  </div>
                </div>

                {/* 3. Reclamación y Pedido */}
                <div className="border border-gray-300 rounded-xl p-4 sm:p-5 bg-gray-50/70">
                  <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm uppercase tracking-wider border-b border-gray-200 pb-2 mb-3 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-brand-red flex-shrink-0" />
                    3. Detalle de la Reclamación y Pedido del Consumidor
                  </h3>
                  <div className="space-y-3 text-xs sm:text-sm">
                    <p>
                      <span className="text-gray-500">Naturaleza de la Reclamación:</span>{' '}
                      <span className="inline-block px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-brand-red uppercase text-xs">
                        {successClaim.claim_type}
                      </span>
                    </p>
                    <div>
                      <span className="text-gray-500 block mb-1">Detalle de los hechos:</span>
                      <div className="p-3 bg-white border border-gray-300 rounded-lg text-gray-800 whitespace-pre-line text-xs sm:text-sm">
                        {successClaim.claim_detail}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Pedido concreto del consumidor:</span>
                      <div className="p-3 bg-white border border-gray-300 rounded-lg text-gray-800 whitespace-pre-line font-medium text-xs sm:text-sm">
                        {successClaim.consumer_request}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legal Certification Footer */}
                <div className="text-[11px] text-gray-500 text-center border-t border-gray-200 pt-3">
                  <p>Constancia virtual de reclamación expedida en cumplimiento del D.S. N° 011-2011-PCM y la Ley N° 29571 &bull; SUPERLAPTOP E.I.R.L.</p>
                </div>

              </div>

            </div>

            {/* Action Buttons (Download PDF / Reset) */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200 print:hidden">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="w-full sm:w-auto px-6 py-3.5 bg-brand-red text-white rounded-xl font-bold text-sm hover:bg-brand-red-accent transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-red-600/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {downloadingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Generando PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    <span>Descargar Constancia en PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Registrar otra reclamación
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: REGISTRATION FORM (INDECOPI 3 OFFICIAL SECTIONS)                   */
          /* ========================================================================= */
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* ------------------------------------------------------------- */}
            {/* SECCIÓN 1: DATOS DEL CONSUMIDOR RECLAMANTE                    */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-200 mb-6">
                <div className="w-8 h-8 rounded-lg bg-brand-red/10 text-brand-red font-black flex items-center justify-center text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">
                    Identificación del Consumidor Reclamante
                  </h2>
                  <p className="text-xs text-gray-500">Datos personales del titular que formula la reclamación</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                
                {/* Tipo de Documento */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Tipo de Documento *
                  </label>
                  <select
                    name="doc_type"
                    value={formData.doc_type}
                    onChange={handleDocTypeChange}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 cursor-pointer"
                  >
                    <option value="DNI">DNI (Documento Nacional de Identidad)</option>
                    <option value="RUC">RUC (Registro Único de Contribuyente)</option>
                    <option value="CE">Carné de Extranjería (CE)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>

                {/* Número de Documento (Validación Dinámica) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Número de Documento *
                    </label>
                    <span className="text-[11px] font-mono text-gray-400">
                      {formData.doc_number.length} / {DOC_SPECS[formData.doc_type]?.maxLength || 12}
                    </span>
                  </div>
                  <input
                    type="text"
                    name="doc_number"
                    required
                    maxLength={DOC_SPECS[formData.doc_type]?.maxLength || 12}
                    placeholder={DOC_SPECS[formData.doc_type]?.placeholder || 'Número de documento'}
                    value={formData.doc_number}
                    onChange={handleDocNumberChange}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 font-mono tracking-wide"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    {formData.doc_type === 'DNI' && 'Ingrese exactamente 8 dígitos numéricos.'}
                    {formData.doc_type === 'RUC' && 'Ingrese exactamente 11 dígitos numéricos.'}
                    {(formData.doc_type === 'CE' || formData.doc_type === 'PASAPORTE') && 'Máximo 12 caracteres alfanuméricos.'}
                  </span>
                </div>

                {/* Nombres */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    placeholder="Ej: Carlos Alberto"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  />
                </div>

                {/* Apellidos */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Apellidos o Razón Social *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    required
                    placeholder="Ej: Mendoza García"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  />
                </div>

                {/* Correo Electrónico */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Correo Electrónico (Para envío de constancia y respuesta) *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="cliente@ejemplo.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  />
                </div>

                {/* Teléfono / Celular */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Teléfono / Celular *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="Ej: 999 888 777"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 font-mono"
                  />
                </div>

                {/* Domicilio */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Domicilio (Dirección Completa) *
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    placeholder="Ej: Av. Los Jazmines 450, Dpto 302"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  />
                </div>

                {/* Departamento, Provincia, Distrito */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Departamento
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Distrito / Provincia
                  </label>
                  <input
                    type="text"
                    name="district"
                    placeholder="Ej: Miraflores, Lima"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                  />
                </div>

              </div>

              {/* Menor de edad Checkbox */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="is_minor"
                    checked={formData.is_minor}
                    onChange={handleChange}
                    className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red accent-brand-red"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">
                    El consumidor reclamante es menor de edad (Requiere datos del padre, madre o tutor)
                  </span>
                </label>

                {formData.is_minor && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Nombre completo del Tutor *
                      </label>
                      <input
                        type="text"
                        name="guardian_name"
                        required={formData.is_minor}
                        placeholder="Nombres y Apellidos del representante"
                        value={formData.guardian_name}
                        onChange={handleChange}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-red"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Tipo Doc. Tutor *
                      </label>
                      <select
                        name="guardian_doc_type"
                        value={formData.guardian_doc_type}
                        onChange={handleGuardianDocTypeChange}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-red cursor-pointer"
                      >
                        <option value="DNI">DNI (8 dígitos)</option>
                        <option value="RUC">RUC (11 dígitos)</option>
                        <option value="CE">CE (Hasta 12)</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          N° Doc. Tutor *
                        </label>
                        <span className="text-[10px] font-mono text-gray-400">
                          {formData.guardian_doc_number.length} / {DOC_SPECS[formData.guardian_doc_type || 'DNI']?.maxLength || 12}
                        </span>
                      </div>
                      <input
                        type="text"
                        name="guardian_doc_number"
                        required={formData.is_minor}
                        maxLength={DOC_SPECS[formData.guardian_doc_type || 'DNI']?.maxLength || 12}
                        placeholder={DOC_SPECS[formData.guardian_doc_type || 'DNI']?.placeholder || 'N° Documento'}
                        value={formData.guardian_doc_number}
                        onChange={handleGuardianDocNumberChange}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 font-mono outline-none focus:border-brand-red"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* ------------------------------------------------------------- */}
            {/* SECCIÓN 2: IDENTIFICACIÓN DEL BIEN CONTRATADO                 */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-200 mb-6">
                <div className="w-8 h-8 rounded-lg bg-brand-red/10 text-brand-red font-black flex items-center justify-center text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">
                    Identificación del Bien Contratado
                  </h2>
                  <p className="text-xs text-gray-500">Detalle del producto o servicio objeto de la reclamación</p>
                </div>
              </div>

              <div className="space-y-6">
                
                {/* Selector Producto vs Servicio */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Tipo de Bien Contratado *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, contracted_good_type: 'PRODUCTO' }))}
                      className={`py-3.5 px-4 rounded-xl border-2 font-black text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        formData.contracted_good_type === 'PRODUCTO'
                          ? 'border-brand-red bg-brand-red text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>PRODUCTO</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, contracted_good_type: 'SERVICIO' }))}
                      className={`py-3.5 px-4 rounded-xl border-2 font-black text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                        formData.contracted_good_type === 'SERVICIO'
                          ? 'border-brand-red bg-brand-red text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>SERVICIO</span>
                    </button>
                  </div>
                </div>

                {/* Monto Reclamado */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Monto Reclamado en Soles (S/.)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 font-bold text-gray-500 text-sm">
                      S/
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="claimed_amount"
                      placeholder="0.00"
                      value={formData.claimed_amount}
                      onChange={handleChange}
                      className="w-full bg-white border border-gray-300 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 font-mono"
                    />
                  </div>
                </div>

                {/* Descripción del Bien */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Descripción del Producto / Servicio (N° de Pedido, Modelo, SKU) *
                  </label>
                  <textarea
                    name="good_description"
                    required
                    rows="3"
                    placeholder="Ej: Laptop ASUS ROG Strix G16 - Pedido #ORD-849202 o Servicio de Mantenimiento"
                    value={formData.good_description}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 leading-relaxed"
                  />
                </div>

              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* SECCIÓN 3: DETALLE DE LA RECLAMACIÓN Y PEDIDO                */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-200 mb-6">
                <div className="w-8 h-8 rounded-lg bg-brand-red/10 text-brand-red font-black flex items-center justify-center text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight">
                    Detalle de la Reclamación y Pedido del Consumidor
                  </h2>
                  <p className="text-xs text-gray-500">Defina la naturaleza de su insatisfacción y la solución requerida</p>
                </div>
              </div>

              {/* Selector Reclamo vs Queja con Explicación INDECOPI */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Tipo de Reclamación (Seleccione una opción) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Tarjeta Reclamo */}
                  <div
                    onClick={() => setFormData(p => ({ ...p, claim_type: 'RECLAMO' }))}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.claim_type === 'RECLAMO'
                        ? 'border-brand-red bg-red-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-sm text-gray-900 flex items-center">
                        <span className={`w-3.5 h-3.5 rounded-full mr-2 border-2 ${
                          formData.claim_type === 'RECLAMO' ? 'bg-brand-red border-brand-red' : 'border-gray-400 bg-white'
                        }`} />
                        RECLAMO
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-100 text-brand-red">
                        Bienes / Servicios
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Disconformidad relacionada a los <strong>productos o servicios</strong> adquiridos (fallas, garantías, incumplimiento de características).
                    </p>
                  </div>

                  {/* Tarjeta Queja */}
                  <div
                    onClick={() => setFormData(p => ({ ...p, claim_type: 'QUEJA' }))}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.claim_type === 'QUEJA'
                        ? 'border-brand-red bg-red-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-sm text-gray-900 flex items-center">
                        <span className={`w-3.5 h-3.5 rounded-full mr-2 border-2 ${
                          formData.claim_type === 'QUEJA' ? 'bg-brand-red border-brand-red' : 'border-gray-400 bg-white'
                        }`} />
                        QUEJA
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                        Atención al Público
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Disconformidad <strong>no relacionada</strong> directamente a los productos; malestar o descontento respecto a la atención al cliente o trato recibido.
                    </p>
                  </div>

                </div>
              </div>

              {/* Detalle de los hechos */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Detalle de los Hechos (Explicación clara del motivo de su {formData.claim_type.toLowerCase()}) *
                </label>
                <textarea
                  name="claim_detail"
                  required
                  rows="4"
                  placeholder="Describa con la mayor precisión posible lo sucedido, fechas, canales de contacto utilizados y circunstancias..."
                  value={formData.claim_detail}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-300 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 leading-relaxed"
                />
              </div>

              {/* Pedido Concreto */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Pedido Concreto del Consumidor (Solución solicitada) *
                </label>
                <textarea
                  name="consumer_request"
                  required
                  rows="3"
                  placeholder="Indique puntualmente qué solicita (ej. cambio de equipo por garantía de fábrica, reembolso del importe, reparación técnica, etc.)"
                  value={formData.consumer_request}
                  onChange={handleChange}
                  className="w-full bg-white border border-gray-300 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 leading-relaxed"
                />
              </div>

            </div>

            {/* ------------------------------------------------------------- */}
            {/* CONSENTIMIENTOS LEGALES & SUBMIT                             */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 space-y-4">
              
              <label className="flex items-start space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="truth_consent"
                  checked={formData.truth_consent}
                  onChange={handleChange}
                  className="w-5 h-5 mt-0.5 text-brand-red rounded border-gray-300 focus:ring-brand-red accent-brand-red flex-shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  Declaro ser el titular del servicio/producto o su representante legal debidamente acreditado y que la información proporcionada en esta hoja de reclamación es verídica conforme a ley.
                </span>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="data_consent"
                  checked={formData.data_consent}
                  onChange={handleChange}
                  className="w-5 h-5 mt-0.5 text-brand-red rounded border-gray-300 focus:ring-brand-red accent-brand-red flex-shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  Acepto el tratamiento de mis datos personales de acuerdo a la <strong>Ley N° 29733</strong> (Ley de Protección de Datos Personales) para fines exclusivos de la gestión, evaluación y notificación de la respuesta a esta reclamación.
                </span>
              </label>

              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-600 flex items-center space-x-2.5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-8 bg-brand-red text-white rounded-xl font-black text-base hover:bg-brand-red-accent transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-red-600/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span>Generando Hoja de Reclamación...</span>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>ENVIAR HOJA DE RECLAMACIÓN</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </form>
        )}

      </div>
    </div>
  );
}
