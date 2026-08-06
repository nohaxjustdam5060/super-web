import React from 'react';
import { MapPin, ExternalLink, Clock } from 'lucide-react';

export default function LocationMap() {
  const address = "Jr. Velarde 172, Lima";
  const schedule = "Lunes a Sábado, 9:00 a 19:00";
  const lat = -12.0553434;
  const lng = -77.0389792;

  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&t=&z=17&ie=UTF8&iwloc=&output=embed`;
  
  return (
    <section className="max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-brand-red font-black text-xs uppercase tracking-widest flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 mr-1" />
            Tienda Física
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-0.5">Visítanos en Lima</h2>
          <p className="text-sm text-gray-500">Encuentra asesoría personalizada y recojo inmediato de pedidos</p>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[400px] rounded-3xl overflow-hidden border border-gray-200 shadow-xl group">
        {/* Google Maps iFrame */}
        <iframe
          title="Ubicación de la Tienda SUPER"
          src={embedUrl}
          className="w-full h-full border-0 grayscale-[20%] contrast-[1.05] group-hover:grayscale-0 transition-all duration-700"
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Top-Left Overlay Button */}
        <a
          href={mapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-4 left-4 z-10 bg-slate-900/90 hover:bg-brand-red text-white backdrop-blur-md border border-slate-700/80 px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 shadow-2xl transition-all duration-300 active:scale-95"
        >
          <span>Abrir en Maps</span>
          <ExternalLink className="w-4 h-4 text-brand-red-accent group-hover:text-white" />
        </a>
        
        {/* Bottom-Left Overlay Card */}
        <a
          href={mapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 left-4 z-10 max-w-[calc(100%-2rem)] sm:max-w-md bg-slate-900/95 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/90 p-4 rounded-2xl shadow-2xl transition-all duration-300 hover:border-brand-red/60 group/card"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-red/20 text-brand-red-accent border border-brand-red/30 flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="font-black text-sm sm:text-base text-white group-hover/card:text-brand-red-accent transition-colors truncate">
                {address}
              </h3>
              <div className="flex items-center text-xs text-gray-300 space-x-1.5 pt-0.5">
                <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate">{schedule}</span>
              </div>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
