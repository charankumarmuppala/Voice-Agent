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
      <div className="neo-card-interactive overflow-hidden flex flex-col group bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] transition-colors">
        {/* Property Image with Badges */}
        <div className="relative h-48 w-full overflow-hidden border-b-2 border-[#111111] dark:border-[#E5E5E5] bg-[#FFFDF5] dark:bg-[#181818]">
          <img
            src={property.image_url}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
            <span className="neo-badge bg-[#FFFDF5] dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] border-2 border-[#111111] dark:border-[#E5E5E5]">
              {property.property_id}
            </span>
            <span
              className={`neo-badge border-2 border-[#111111] dark:border-[#E5E5E5] ${
                isReady
                  ? 'bg-[#B8F4B8] text-[#111111]'
                  : 'bg-[#FFDE59] text-[#111111]'
              }`}
            >
              {property.availability}
            </span>
          </div>

          {/* Bottom Overlay Price & Location */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <div className="inline-block bg-[#FFDE59] text-[#111111] px-2.5 py-0.5 border-2 border-[#111111] dark:border-[#E5E5E5] rounded-sm font-heading font-black text-base shadow-neo-sm dark:shadow-[2px_2px_0px_#E5E5E5]">
              {formatINR(property.price)}
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="neo-badge bg-[#B4A7FF] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5]">
                {property.property_type}
              </span>
              <span className="font-mono text-[11px] text-[#111111] dark:text-[#B3B3B3] font-bold">
                {property.bhk} BHK • {property.area} SQFT
              </span>
            </div>

            <h3 className="font-heading font-black text-[#111111] dark:text-[#F5F5F5] text-base line-clamp-1 group-hover:text-[#FFDE59] transition-colors tracking-tight">
              {property.name}
            </h3>

            <div className="flex items-center gap-1 font-sans text-xs text-[#111111] dark:text-[#B3B3B3] font-semibold mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFDE59] flex-shrink-0" />
              <span className="truncate">{property.location}, Bengaluru</span>
            </div>

            <p className="font-sans text-xs text-[#111111]/70 dark:text-[#A3A3A3] line-clamp-2 mt-2 leading-relaxed font-medium">
              {property.description}
            </p>

            {/* Amenities chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(property.amenities || []).slice(0, 3).map((amenity, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[9px] uppercase font-bold bg-[#FFFDF5] dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] border border-[#111111] dark:border-[#E5E5E5] px-1.5 py-0.5 rounded-sm"
                >
                  {amenity}
                </span>
              ))}
              {(property.amenities || []).length > 3 && (
                <span className="font-mono text-[9px] uppercase font-black bg-[#B4A7FF] text-[#111111] border border-[#111111] dark:border-[#E5E5E5] px-1.5 py-0.5 rounded-sm">
                  +{(property.amenities || []).length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 pt-3 border-t-2 border-[#111111] dark:border-[#E5E5E5] flex items-center gap-2">
            <button
              onClick={() => setModalOpen(true)}
              className="neo-btn neo-btn-white dark:bg-[#181818] dark:text-[#F5F5F5] dark:border-[#E5E5E5] flex-1 py-1.5 px-2 text-xs"
            >
              <Info className="w-3.5 h-3.5 mr-1" />
              Specs
            </button>
            <button
              onClick={() => (onScheduleVisit ? onScheduleVisit(property) : setModalOpen(true))}
              className="neo-btn neo-btn-yellow flex-1 py-1.5 px-2 text-xs"
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Book Visit
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-none flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFDF5] dark:bg-[#1E1E1E] rounded-md max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-neo-xl dark:shadow-[8px_8px_0px_#E5E5E5] relative border-3 border-[#111111] dark:border-[#E5E5E5] animate-pop text-[#111111] dark:text-[#F5F5F5]">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-sm bg-[#FF8A80] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] flex items-center justify-center shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
            >
              <X className="w-4 h-4 text-[#111111]" />
            </button>

            <div className="relative h-64 w-full border-b-2 border-[#111111] dark:border-[#E5E5E5]">
              <img
                src={property.image_url}
                alt={property.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-4 right-4">
                <span className="neo-badge bg-[#FFDE59] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] mb-2 inline-block font-black">
                  {property.property_id} • {property.property_type}
                </span>
                <div className="bg-white/95 dark:bg-[#1E1E1E]/95 p-3 border-2 border-[#111111] dark:border-[#E5E5E5] rounded-sm shadow-neo-sm dark:shadow-[2px_2px_0px_#E5E5E5] inline-block">
                  <h2 className="font-heading text-xl sm:text-2xl font-black text-[#111111] dark:text-[#F5F5F5] tracking-tight">{property.name}</h2>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#111111] dark:text-[#B3B3B3] mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFDE59]" />
                    <span>{property.location}, Bengaluru</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5 bg-[#FFFDF5] dark:bg-[#1E1E1E]">
              {/* Highlight metrics */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-sm bg-white dark:bg-[#181818] border-2 border-[#111111] dark:border-[#E5E5E5] shadow-neo-sm dark:shadow-[2px_2px_0px_#E5E5E5]">
                <div>
                  <div className="font-mono text-[10px] uppercase font-bold text-[#111111]/70 dark:text-[#A3A3A3]">Configuration</div>
                  <div className="font-heading font-black text-base text-[#111111] dark:text-[#F5F5F5] mt-0.5">{property.bhk} BHK</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase font-bold text-[#111111]/70 dark:text-[#A3A3A3]">Carpet Area</div>
                  <div className="font-heading font-black text-base text-[#111111] dark:text-[#F5F5F5] mt-0.5">{property.area} sq.ft</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase font-bold text-[#111111]/70 dark:text-[#A3A3A3]">Price in INR</div>
                  <div className="font-heading font-black text-base text-[#111111] mt-0.5 bg-[#FFDE59] inline-block px-1.5 border border-[#111111]">
                    {formatINR(property.price)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-heading font-black text-sm uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5] mb-1.5">Property Overview</h4>
                <p className="font-sans text-xs text-[#111111] dark:text-[#B3B3B3] leading-relaxed font-medium bg-white dark:bg-[#181818] p-3 border-2 border-[#111111] dark:border-[#E5E5E5] rounded-sm">
                  {property.description}
                </p>
              </div>

              <div>
                <h4 className="font-heading font-black text-sm uppercase tracking-wider text-[#111111] dark:text-[#F5F5F5] mb-2">Curated Amenities</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(property.amenities || []).map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-sm bg-white dark:bg-[#181818] border-2 border-[#111111] dark:border-[#E5E5E5] font-sans text-xs font-bold text-[#111111] dark:text-[#F5F5F5]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#111111] dark:text-[#B8F4B8] flex-shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t-2 border-[#111111] dark:border-[#E5E5E5] flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase font-bold text-[#111111]/70 dark:text-[#A3A3A3]">Availability</span>
                  <div className="font-heading font-black text-xs text-[#111111] dark:text-[#FFDE59] uppercase">{property.availability}</div>
                </div>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    if (onScheduleVisit) onScheduleVisit(property);
                  }}
                  className="neo-btn neo-btn-yellow px-5 py-2 text-xs font-black uppercase"
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
