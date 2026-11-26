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
      <div className="bg-[#FFFCF7] rounded-3xl border border-[#D6CDBB] overflow-hidden shadow-none hover:border-[#14532D] transition-all flex flex-col group">
        {/* Property Image with Badges */}
        <div className="relative h-48 w-full overflow-hidden bg-[#F5F2E9]">
          <img
            src={property.image_url}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold bg-[#FFFCF7] text-[#171717] border border-[#D6CDBB] shadow-none">
              {property.property_id}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold border shadow-none ${
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
            <div className="flex items-center gap-1 font-sans text-xs text-white/90 drop-shadow-sm mt-0.5">
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
              <span className="font-mono text-[11px] text-[#171717]/60 font-semibold">
                {property.bhk} BHK • {property.area} SQFT
              </span>
            </div>

            <h3 className="font-heading font-bold text-[#171717] text-base line-clamp-1 group-hover:text-[#14532D] transition-colors tracking-tight">
              {property.name}
            </h3>

            <p className="font-sans text-xs text-[#171717]/65 line-clamp-2 mt-1.5 leading-relaxed">
              {property.description}
            </p>

            {/* Amenities chips */}
            <div className="flex flex-wrap gap-1 mt-3">
              {(property.amenities || []).slice(0, 3).map((amenity, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[9px] uppercase tracking-wider bg-[#F5F2E9] text-[#171717]/80 border border-[#D6CDBB]/70 px-2 py-0.5 rounded-md font-semibold"
                >
                  {amenity}
                </span>
              ))}
              {(property.amenities || []).length > 3 && (
                <span className="font-mono text-[9px] uppercase bg-[#F5F2E9] text-[#171717]/60 border border-[#D6CDBB]/70 px-1.5 py-0.5 rounded-md font-semibold">
                  +{(property.amenities || []).length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 pt-3.5 border-t border-[#D6CDBB]/60 flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="flex-1 py-2 px-3 font-heading text-xs font-bold rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] text-[#171717] hover:bg-[#F5F2E9] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-[#171717]/70" />
              Details
            </button>
            <button
              onClick={() => (onScheduleVisit ? onScheduleVisit(property) : setModalOpen(true))}
              className="flex-1 py-2 px-3 font-heading text-xs font-bold rounded-xl bg-[#14532D] text-white hover:bg-[#1e7842] border border-[#14532D] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-none"
            >
              <Calendar className="w-3.5 h-3.5 text-[#E2F1E7]" />
              Visit
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-64 w-full">
              <img
                src={property.image_url}
                alt={property.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-[#10B981] bg-black/40 px-2.5 py-1 rounded-md backdrop-blur-sm">
                  {property.property_id} • {property.property_type}
                </span>
                <h2 className="text-2xl font-bold mt-1 text-white">{property.name}</h2>
                <div className="flex items-center gap-1 text-sm text-slate-200 mt-1">
                  <MapPin className="w-4 h-4 text-[#10B981]" />
                  <span>{property.location}, Bangalore</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Key Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium">Price</div>
                  <div className="text-lg font-bold text-forest mt-0.5">
                    {formatINR(property.price)}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium">Configuration</div>
                  <div className="text-lg font-bold text-slate-800 mt-0.5">
                    {property.bhk} BHK
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium">Super Area</div>
                  <div className="text-lg font-bold text-slate-800 mt-0.5">
                    {property.area} sq.ft
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-xs text-slate-400 font-medium">Availability</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {property.availability}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-2">Description</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{property.description}</p>
              </div>

              {/* Amenities */}
              <div>
                <h4 className="font-semibold text-sm text-slate-900 mb-2">Amenities & Highlights</h4>
                <div className="flex flex-wrap gap-2">
                  {(property.amenities || []).map((amenity, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-100 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer Modal CTA */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Interested in this property?</div>
                  <div className="text-sm font-semibold text-forest">Connect with DreamSpace AI Agent</div>
                </div>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    if (onScheduleVisit) onScheduleVisit(property);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-forest text-white text-sm font-semibold hover:bg-forest-light transition-colors shadow"
                >
                  Schedule Site Visit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
