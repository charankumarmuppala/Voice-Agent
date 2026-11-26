import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  Building2,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { fetchProperties } from '../services/api';

export default function Properties({ onScheduleVisit }) {
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

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#171717] tracking-tight">
            Bangalore Property Portfolio
          </h2>
          <p className="text-xs sm:text-sm text-[#171717]/60 mt-1 font-sans">
            Browse verified listings across Whitefield, Electronic City, Sarjapur, Hebbal, and Yelahanka.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-2xl bg-[#E2F1E7] text-[#14532D] border border-[#D6CDBB]">
            {total} Properties Listed
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-mono font-semibold px-3 py-1.5 rounded-2xl bg-[#F5F2E9] text-[#171717] border border-[#D6CDBB] hover:bg-[#D6CDBB]/30 transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFCF7] p-5 rounded-3xl border border-[#D6CDBB] shadow-none space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#171717]/40 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by project name, developer, or keywords (e.g. Prestige, Villa, Pool, Metro)..."
            className="w-full pl-11 pr-4 py-2.5 text-xs bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] focus:outline-none focus:border-[#14532D]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#171717]/40 hover:text-[#171717]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Selectors Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Location */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#171717]/60 mb-1.5">
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] focus:outline-none focus:border-[#14532D]"
            >
              <option value="All">All Locations</option>
              <option value="Whitefield">Whitefield</option>
              <option value="Electronic City">Electronic City</option>
              <option value="Sarjapur">Sarjapur</option>
              <option value="Hebbal">Hebbal</option>
              <option value="Yelahanka">Yelahanka</option>
            </select>
          </div>

          {/* BHK */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#171717]/60 mb-1.5">
              Configuration
            </label>
            <select
              value={bhk}
              onChange={(e) => setBhk(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] focus:outline-none focus:border-[#14532D]"
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
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#171717]/60 mb-1.5">
              Budget Range
            </label>
            <select
              value={budgetTier}
              onChange={(e) => setBudgetTier(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] focus:outline-none focus:border-[#14532D]"
            >
              <option value="All">All Budgets</option>
              <option value="under1cr">Under ₹1 Crore</option>
              <option value="1to2cr">₹1 Cr - ₹2 Crore</option>
              <option value="2to3.5cr">₹2 Cr - ₹3.5 Crore</option>
              <option value="above3.5cr">Above ₹3.5 Crore</option>
            </select>
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#171717]/60 mb-1.5">
              Property Type
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] focus:outline-none focus:border-[#14532D]"
            >
              <option value="All">All Types</option>
              <option value="Apartment">Apartment</option>
              <option value="Villa">Villa</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Duplex">Duplex</option>
              <option value="Studio Apartment">Studio Apartment</option>
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#171717]/60 mb-1.5">
              Availability
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#F5F2E9] border border-[#D6CDBB] rounded-2xl text-[#171717] focus:outline-none focus:border-[#14532D]"
            >
              <option value="All">All Status</option>
              <option value="Ready to Move">Ready to Move</option>
              <option value="Under Construction">Under Construction</option>
            </select>
          </div>
        </div>
      </div>

      {/* Property Cards Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-[#14532D] animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-[#171717]/60">Querying FastAPI backend...</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-[#FFFCF7] rounded-3xl p-12 text-center border border-[#D6CDBB]">
          <Building2 className="w-12 h-12 text-[#171717]/30 mx-auto mb-3" />
          <h3 className="text-base font-heading font-bold text-[#171717]">No matching properties found</h3>
          <p className="text-xs text-[#171717]/60 mt-1 max-w-sm mx-auto font-sans">
            Try adjusting your search criteria or resetting filters to view all 30 properties.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 rounded-2xl bg-[#14532D] text-white text-xs font-heading font-bold hover:bg-[#14532D]/90 transition-colors border border-[#14532D]"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onScheduleVisit={onScheduleVisit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
