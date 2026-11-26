import React, { useState } from 'react';
import {
  MapPin,
  Home,
  Maximize2,
  CheckCircle2,
  Sparkles,
  Info,
  Calendar,
  X
} from 'lucide-react';
import { formatINR } from '../services/api';

export default function PropertyCard({ property, onScheduleVisit }) {
  const [modalOpen, setModalOpen] = useState(false);

  const isReady = property.availability === 'Ready to Move';

  return (
    <>
      <div className="bento-card overflow-hidden flex flex-col group">
        {/* Property Image with Badges */}
        <div className="relative h-48 w-full overflow-hidden bg-[#F5F2E9]">
          <img
            src={property.image_url}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold bg-[#FFFCF7] text-[#171717] border border-[#D6CDBB] shadow-sm">
              {property.property_id}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold border shadow-sm ${
                isReady
                  ? 'bg-[#E2F1E7] text-[#14532D] border-[#14532D]/20'
                  : 'bg-[#FFF1CC] text-[#854D0E] border-[#E5D8A8]'
              }`}
            >
              {property.availability}
            </span>
          </div>

          {/* Bottom Overlay Price & Location */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <div className="font-heading text-xl font-bold tracking-tight text-white drop-shadow-sm">
              {formatINR(property.price)}
            </div>
            <div className="flex items-center gap-1 font-sans text-xs text-white/95 drop-shadow-sm mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#E2F1E7]" />
              <span className="truncate">{property.location}, Bangalore</span>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#14532D] bg-[#E2F1E7] border border-[#14532D]/20 px-2 py-0.5 rounded-md">
                {property.property_type}
              </span>
              <span className="font-mono text-[11px] text-[#737373] font-semibold">
                {property.bhk} BHK • {property.area} SQFT
              </span>
            </div>

            <h3 className="font-heading font-bold text-[#171717] text-base line-clamp-1 group-hover:text-[#14532D] transition-colors tracking-tight">
              {property.name}
            </h3>

            <p className="font-sans text-xs text-[#737373] line-clamp-2 mt-1.5 leading-relaxed">
              {property.description}
            </p>

            {/* Amenities chips */}
            <div className="flex flex-wrap gap-1 mt-3">
              {(property.amenities || []).slice(0, 3).map((amenity, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[9px] uppercase tracking-wider bg-[#F5F2E9] text-[#171717] border border-[#D6CDBB] px-2 py-0.5 rounded-md font-semibold"
                >
                  {amenity}
                </span>
              ))}
              {(property.amenities || []).length > 3 && (
                <span className="font-mono text-[9px] uppercase bg-[#F5F2E9] text-[#737373] border border-[#D6CDBB] px-1.5 py-0.5 rounded-md font-semibold">
                  +{(property.amenities || []).length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 pt-3.5 border-t border-[#D6CDBB]/50 flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="flex-1 py-2 px-3 font-heading text-xs font-bold rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] text-[#171717] hover:bg-[#F5F2E9] hover:border-[#14532D] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:translate-y-0.5"
            >
              <Info className="w-3.5 h-3.5 text-[#737373]" />
              Specs
            </button>
            <button
              onClick={() => (onScheduleVisit ? onScheduleVisit(property) : setModalOpen(true))}
              className="flex-1 py-2 px-3 font-heading text-xs font-bold rounded-xl bg-[#14532D] text-white hover:bg-[#1e7842] border border-[#14532D] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:translate-y-0.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#E2F1E7]" />
              Book Visit
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFCF7] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-neo-lg relative border border-[#D6CDBB] animate-fade-in">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#171717]/70 text-white flex items-center justify-center hover:bg-[#171717] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative h-64 w-full">
              <img
                src={property.image_url}
                alt={property.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 text-white">
                <span className="font-mono text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[#14532D] text-white mb-2 inline-block">
                  {property.property_id} • {property.property_type}
                </span>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-white">{property.name}</h2>
                <div className="flex items-center gap-2 text-xs font-sans text-white/90 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#E2F1E7]" />
                  <span>{property.location}, Bangalore</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Highlight metrics */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB]">
                <div>
                  <div className="font-mono text-[10px] uppercase text-[#737373]">Configuration</div>
                  <div className="font-heading font-bold text-base text-[#171717] mt-0.5">{property.bhk} BHK</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-[#737373]">Carpet Area</div>
                  <div className="font-heading font-bold text-base text-[#171717] mt-0.5">{property.area} sq.ft</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-[#737373]">Price in INR</div>
                  <div className="font-heading font-bold text-base text-[#14532D] mt-0.5">{formatINR(property.price)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-heading font-bold text-sm text-[#171717] mb-2">Property Overview</h4>
                <p className="font-sans text-xs text-[#737373] leading-relaxed">{property.description}</p>
              </div>

              <div>
                <h4 className="font-heading font-bold text-sm text-[#171717] mb-2.5">Curated Amenities</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(property.amenities || []).map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F5F2E9] border border-[#D6CDBB]/70 font-sans text-xs text-[#171717]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#14532D] flex-shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#D6CDBB] flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase text-[#737373]">Availability</span>
                  <div className="font-heading font-bold text-xs text-[#171717]">{property.availability}</div>
                </div>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    if (onScheduleVisit) onScheduleVisit(property);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#14532D] text-white font-heading font-bold text-xs hover:bg-[#1e7842] border border-[#14532D] transition-colors cursor-pointer shadow-sm active:translate-y-0.5"
                >
                  Schedule Site Visit Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
