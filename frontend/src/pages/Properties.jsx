import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  Building2,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  MapPin
} from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { fetchProperties } from '../services/api';

export default function Properties({ onScheduleVisit, darkMode }) {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('All');
  const [bhk, setBhk] = useState('All');
  const [propertyType, setPropertyType] = useState('All');
  const [availability, setAvailability] = useState('All');
  const [budgetTier, setBudgetTier] = useState('All');

  useEffect(() => {
    loadProperties();
  }, [search, location, bhk, propertyType, availability, budgetTier]);

  async function loadProperties() {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (location !== 'All') params.location = location;
      if (bhk !== 'All') params.bhk = bhk;
      if (propertyType !== 'All') params.property_type = propertyType;
      if (availability !== 'All') params.availability = availability;

      // Budget presets
      if (budgetTier === 'under1cr') {
        params.max_price = 10000000;
      } else if (budgetTier === '1to2cr') {
        params.min_price = 10000000;
        params.max_price = 20000000;
      } else if (budgetTier === '2to3.5cr') {
        params.min_price = 20000000;
        params.max_price = 35000000;
      } else if (budgetTier === 'above3.5cr') {
        params.min_price = 35000000;
      }

      const res = await fetchProperties(params);
      setProperties(res.properties || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleResetFilters() {
    setSearch('');
    setLocation('All');
    setBhk('All');
    setPropertyType('All');
    setAvailability('All');
    setBudgetTier('All');
  }

  const hasActiveFilters =
    search ||
    location !== 'All' ||
    bhk !== 'All' ||
    propertyType !== 'All' ||
    availability !== 'All' ||
    budgetTier !== 'All';

  const locationsList = ['All', 'Whitefield', 'Electronic City', 'Sarjapur', 'Hebbal', 'Yelahanka'];

  return (
    <div className="p-6 sm:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#111111] dark:text-[#F5F5F5] tracking-tight">
              Bengaluru Property Portfolio
            </h2>
            <span className="neo-badge bg-[#FFDE59] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] font-black">
              30 Verified
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-[#111111]/70 dark:text-[#B3B3B3] mt-1 font-medium">
            Ground-truth listings indexed with multilingual semantic embeddings across Bengaluru tech corridors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="neo-badge bg-[#B8F4B8] text-[#111111] border-2 border-[#111111] dark:border-[#E5E5E5] px-3 py-1.5 text-xs font-mono font-black uppercase tracking-wider">
            {total} Properties Found
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="neo-btn neo-btn-white dark:bg-[#1E1E1E] dark:text-[#F5F5F5] dark:border-[#E5E5E5] text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5 text-[#111111] dark:text-[#F5F5F5]" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="neo-card p-5 space-y-4 bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5] dark:shadow-[4px_4px_0px_#E5E5E5] transition-colors">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#111111] dark:text-[#FFDE59] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project name, developer, or lifestyle keywords (e.g. Prestige, Sobha, Smart Home, Infinity Pool)..."
            className="neo-input w-full pl-11 pr-10 py-2.5 text-xs font-medium text-[#111111] dark:text-[#F5F5F5] dark:bg-[#181818] dark:border-[#E5E5E5] dark:placeholder-[#A3A3A3]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#111111] dark:text-[#F5F5F5] hover:opacity-70 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Micro-Market Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="font-mono text-[10px] uppercase font-bold text-[#111111] dark:text-[#B3B3B3] flex-shrink-0 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#111111] dark:text-[#FFDE59]" />
            Corridor:
          </span>
          {locationsList.map((loc) => (
            <button
              key={loc}
              onClick={() => setLocation(loc)}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-sm border-2 border-[#111111] dark:border-[#E5E5E5] transition-all cursor-pointer whitespace-nowrap ${
                location === loc
                  ? 'bg-[#FFDE59] text-[#111111] shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_#E5E5E5]'
                  : 'bg-white dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] hover:bg-[#FFFDF5] dark:hover:bg-[#252525] shadow-[1px_1px_0px_#111111] dark:shadow-[1px_1px_0px_#E5E5E5]'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>

        {/* Secondary Filter Selectors Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t-2 border-[#111111]/15 dark:border-[#E5E5E5]/15">
          {/* BHK */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#111111] dark:text-[#B3B3B3] font-bold mb-1">
              Configuration
            </label>
            <select
              value={bhk}
              onChange={(e) => setBhk(e.target.value)}
              className="neo-input w-full px-3 py-2 text-xs font-mono font-bold text-[#111111] dark:text-[#F5F5F5] bg-white dark:bg-[#181818] dark:border-[#E5E5E5]"
            >
              <option value="All">All BHKs</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4 BHK</option>
              <option value="5">5 BHK</option>
            </select>
          </div>

          {/* Budget Tier */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#111111] dark:text-[#B3B3B3] font-bold mb-1">
              Budget Range
            </label>
            <select
              value={budgetTier}
              onChange={(e) => setBudgetTier(e.target.value)}
              className="neo-input w-full px-3 py-2 text-xs font-mono font-bold text-[#111111] dark:text-[#F5F5F5] bg-white dark:bg-[#181818] dark:border-[#E5E5E5]"
            >
              <option value="All">All Budgets</option>
              <option value="under1cr">Under ₹1.00 Cr</option>
              <option value="1to2cr">₹1.00 Cr - ₹2.00 Cr</option>
              <option value="2to3.5cr">₹2.00 Cr - ₹3.50 Cr</option>
              <option value="above3.5cr">Above ₹3.50 Cr</option>
            </select>
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#111111] dark:text-[#B3B3B3] font-bold mb-1">
              Asset Class
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="neo-input w-full px-3 py-2 text-xs font-mono font-bold text-[#111111] dark:text-[#F5F5F5] bg-white dark:bg-[#181818] dark:border-[#E5E5E5]"
            >
              <option value="All">All Types</option>
              <option value="Apartment">Apartment</option>
              <option value="Villa">Luxury Villa</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Plot">Gated Plot</option>
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#111111] dark:text-[#B3B3B3] font-bold mb-1">
              Possession Status
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="neo-input w-full px-3 py-2 text-xs font-mono font-bold text-[#111111] dark:text-[#F5F5F5] bg-white dark:bg-[#181818] dark:border-[#E5E5E5]"
            >
              <option value="All">All Statuses</option>
              <option value="Ready to Move">Ready to Move</option>
              <option value="Under Construction">Under Construction</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div className="text-center py-20 text-xs font-mono font-bold text-[#111111] dark:text-[#B3B3B3]">
          Loading properties from SQLite catalog...
        </div>
      ) : properties.length === 0 ? (
        <div className="neo-card p-12 text-center bg-white dark:bg-[#1E1E1E] dark:border-[#E5E5E5]">
          <Building2 className="w-10 h-10 text-[#111111]/40 dark:text-[#B3B3B3]/40 mx-auto mb-3" />
          <h3 className="font-heading font-extrabold text-base text-[#111111] dark:text-[#F5F5F5]">No properties matched your criteria.</h3>
          <p className="font-sans text-xs text-[#111111]/70 dark:text-[#B3B3B3] mt-1 font-medium">
            Try resetting your filters or adjusting your budget parameters.
          </p>
          <button
            onClick={handleResetFilters}
            className="neo-btn neo-btn-yellow px-4 py-2 text-xs font-bold mt-4"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {properties.map((prop) => (
            <PropertyCard
              key={prop.id}
              property={prop}
              onScheduleVisit={onScheduleVisit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
