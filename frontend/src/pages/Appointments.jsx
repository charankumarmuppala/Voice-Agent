import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  MapPin,
  Clock,
  Phone,
  User,
  Building2,
  CheckCircle2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Mail,
  Sparkles
} from 'lucide-react';
import { fetchAppointments, createAppointment } from '../services/api';

const DEFAULT_SLOTS = [
  '10:00 AM',
  '11:30 AM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM'
];

function formatTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDate(isoStr) {
  if (!isoStr) return 'TBD';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch {
    return isoStr;
  }
}

function toLocalDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Appointments({ initialProperty }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    propertyName: initialProperty ? initialProperty.name : 'Prestige Willow Park',
    location: initialProperty ? initialProperty.location : 'Whitefield',
    dateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  });

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (initialProperty) {
      setForm(prev => ({
        ...prev,
        propertyName: initialProperty.name || prev.propertyName,
        location: initialProperty.location || prev.location
      }));
      setModalOpen(true);
    }
  }, [initialProperty]);

  async function loadAppointments() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Could not load appointments from database.');
    } finally {
      setLoading(false);
    }
  }

  // Group appointments by "YYYY-MM-DD"
  const appointmentsByDate = {};
  appointments.forEach((apt) => {
    if (!apt.date_time) return;
    try {
      const key = toLocalDateKey(new Date(apt.date_time));
      if (!appointmentsByDate[key]) appointmentsByDate[key] = [];
      appointmentsByDate[key].push(apt);
    } catch {}
  });

  // Calendar generation for currentDate's month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const selectedDateKey = toLocalDateKey(selectedDate);
  const selectedDateAppointments = appointmentsByDate[selectedDateKey] || [];
  const bookedTimes = selectedDateAppointments.map(a => formatTime(a.date_time));

  async function handleSchedule(e) {
    e.preventDefault();
    if (!form.customerName || !form.phone) return;
    setSubmitting(true);
    try {
      const payload = {
        customer_name: form.customerName,
        customer_phone: form.phone,
        property_name: form.propertyName,
        location: form.location,
        date_time: new Date(form.dateTime).toISOString(),
      };
      const created = await createAppointment(payload);
      setAppointments(prev => [created, ...prev]);
      setModalOpen(false);
      setForm({
        customerName: '',
        phone: '',
        propertyName: 'Prestige Willow Park',
        location: 'Whitefield',
        dateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16)
      });
    } catch (err) {
      alert('Failed to schedule visit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openModalForSlot(slot) {
    const d = new Date(selectedDate);
    const [time, modifier] = slot.split(' ');
    let [hours, minutes] = time.split(':');
    if (modifier === 'PM' && hours !== '12') hours = parseInt(hours, 10) + 12;
    if (modifier === 'AM' && hours === '12') hours = '00';
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm(prev => ({
      ...prev,
      dateTime: localISO
    }));
    setModalOpen(true);
  }

  return (
    <div className="p-6 sm:p-8 space-y-7 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
              Scheduled Property Walkthroughs
            </h2>
            <span className="neo-badge bg-[#FFDE59] text-[#111111]">
              Site Passes
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-[#111111]/70 mt-1 font-medium">
            Automated calendar booking, PDF brochure dispatches, and confirmed client visit passes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="neo-btn neo-btn-yellow px-4 py-2.5 text-xs gap-2"
          >
            <Plus className="w-4 h-4 text-[#111111]" />
            Schedule Site Pass
          </button>
          <button
            onClick={loadAppointments}
            className="neo-btn neo-btn-white p-2.5"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4 text-[#111111]" />
          </button>
        </div>
      </div>

      {error && (
        <div className="neo-card bg-[#FF8A80]/20 border-2 border-[#111111] text-[#111111] px-4 py-3 text-xs font-mono font-bold">
          {error}
        </div>
      )}

      {/* Bento Grid: 8-Column Calendar + 4-Column Day Timeline */}
      <div className="grid grid-cols-12 gap-5">
        {/* Calendar (8 columns) */}
        <div className="col-span-12 lg:col-span-8 neo-card p-6 sm:p-7 bg-white">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#111111]/15">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#111111]/70 font-bold">
                Calendar View
              </span>
              <h3 className="font-heading text-xl font-extrabold text-[#111111] mt-0.5">
                {monthName}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="neo-btn neo-btn-white w-8 h-8 font-bold"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4 text-[#111111]" />
              </button>
              <button
                onClick={nextMonth}
                className="neo-btn neo-btn-white w-8 h-8 font-bold"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4 text-[#111111]" />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 text-center font-mono text-[11px] uppercase tracking-wider text-[#111111] font-extrabold mb-2.5">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank cells before 1st */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 sm:h-20 rounded-sm bg-[#FFFDF5] border-2 border-dashed border-[#111111]/20" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(year, month, dayNum);
              const dateKey = toLocalDateKey(dateObj);
              const dayAppts = appointmentsByDate[dateKey] || [];
              const count = dayAppts.length;
              const isSelected = dateKey === selectedDateKey;
              const isToday = toLocalDateKey(new Date()) === dateKey;

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDate(dateObj)}
                  className={`h-16 sm:h-20 p-2 rounded-sm border-2 border-[#111111] transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#FFDE59] shadow-[3px_3px_0px_#111111]'
                      : count > 0
                      ? 'bg-[#B8F4B8] shadow-[2px_2px_0px_#111111] hover:bg-[#98EE98]'
                      : 'bg-white hover:bg-[#FFFDF5] shadow-[1px_1px_0px_#111111]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-heading text-xs sm:text-sm font-bold w-5 h-5 rounded-sm flex items-center justify-center ${
                        isToday
                          ? 'bg-[#111111] text-[#FFDE59] font-black'
                          : isSelected
                          ? 'text-[#111111] font-black'
                          : 'text-[#111111]'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>

                  {count > 0 && (
                    <div>
                      <span className="neo-badge bg-[#111111] text-white text-[9px] px-1 py-0.5 inline-flex">
                        {count} {count === 1 ? 'Pass' : 'Passes'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Timeline & Slots (4 columns) */}
        <div className="col-span-12 lg:col-span-4 neo-card p-6 flex flex-col justify-between bg-white">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#111111]/15">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#111111]/70">
                  Selected Date
                </span>
                <h4 className="font-heading text-base font-extrabold text-[#111111] mt-0.5">
                  {selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </h4>
              </div>
              <span className="neo-badge bg-[#B8F4B8] text-[#111111]">
                {selectedDateAppointments.length} Booked
              </span>
            </div>

            {/* Scheduled on this date */}
            <div className="space-y-2.5 mb-6">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#111111] block">
                Confirmed Walkthroughs
              </span>
              {selectedDateAppointments.length === 0 ? (
                <div className="p-4 rounded-sm bg-[#FFFDF5] border-2 border-dashed border-[#111111]/30 text-center font-mono text-xs text-[#111111]/60 uppercase tracking-wider font-bold">
                  No visits scheduled on this date.
                </div>
              ) : (
                selectedDateAppointments.map(a => (
                  <div key={a.appointment_id} className="p-3 rounded-sm border-2 border-[#111111] bg-[#B8F4B8] text-xs space-y-1 shadow-[2px_2px_0px_#111111]">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-black text-[#111111]">{a.customer_name}</span>
                      <span className="neo-badge bg-white text-[#111111]">
                        {formatTime(a.date_time)}
                      </span>
                    </div>
                    <div className="font-sans text-[#111111] font-bold truncate">{a.property_name}</div>
                    <div className="font-mono text-[#111111]/80 text-[10px] font-bold flex items-center justify-between pt-1">
                      <span>{a.location}</span>
                      <span>{a.customer_phone || 'Phone verified'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Time Slot Fast Booking */}
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#111111] block mb-2">
                Available Walkthrough Slots
              </span>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_SLOTS.map(slot => {
                  const isBooked = bookedTimes.includes(slot);
                  return (
                    <button
                      key={slot}
                      disabled={isBooked}
                      onClick={() => openModalForSlot(slot)}
                      className={`p-2.5 rounded-sm text-xs font-bold transition-all flex items-center justify-between ${
                        isBooked
                          ? 'bg-[#111111]/5 text-[#111111]/40 border-2 border-[#111111]/20 cursor-not-allowed'
                          : 'neo-btn neo-btn-white w-full'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-[#111111]" />
                        {slot}
                      </span>
                      <span className={`neo-badge ${isBooked ? 'bg-[#111111]/10 text-[#111111]/50' : 'bg-[#FFDE59] text-[#111111]'}`}>
                        {isBooked ? 'Booked' : 'Open'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Scheduled Site Passes Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg sm:text-xl font-extrabold text-[#111111] flex items-center gap-2 tracking-tight">
            <CalendarCheck className="w-5 h-5 text-[#111111]" />
            All Active Site Visit Passes ({appointments.length})
          </h3>
          <span className="neo-badge bg-[#FFDE59] text-[#111111]">
            SQLite Database Ground Truth
          </span>
        </div>

        {loading && (
          <div className="text-center py-12 font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
            Loading site passes...
          </div>
        )}

        {!loading && appointments.length === 0 && (
          <div className="neo-card p-12 text-center bg-white">
            <CalendarCheck className="w-10 h-10 text-[#111111]/40 mx-auto mb-2" />
            <p className="font-heading text-base font-extrabold text-[#111111]">No scheduled passes found.</p>
            <p className="font-sans text-xs text-[#111111]/70 mt-1 font-medium">
              Start an AI voice call to generate site walkthroughs or click "Schedule Site Pass" above.
            </p>
          </div>
        )}

        {!loading && appointments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {appointments.map((apt) => (
              <div
                key={apt.appointment_id}
                className="neo-card-interactive p-5 sm:p-6 flex flex-col justify-between bg-white"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] font-bold text-[#111111]/70">{apt.appointment_id}</span>
                    <span className="neo-badge bg-[#B8F4B8] text-[#111111] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#111111]" />
                      {apt.status}
                    </span>
                  </div>

                  <h4 className="font-heading font-extrabold text-[#111111] text-base leading-snug">{apt.property_name}</h4>
                  <div className="flex items-center gap-1 font-sans text-xs text-[#111111] mt-1 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-[#111111]" />
                    <span>{apt.location}, Bangalore</span>
                  </div>

                  <div className="mt-4 p-3.5 rounded-sm bg-[#FFFDF5] border-2 border-[#111111] space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#111111]">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#111111]" />
                      <span className="font-mono font-bold text-[#111111]">{formatDate(apt.date_time)} • {formatTime(apt.date_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#111111]">
                      <User className="w-3.5 h-3.5 text-[#111111]" />
                      <span className="font-sans font-bold text-[#111111]">{apt.customer_name}</span>
                    </div>
                    {apt.customer_phone && (
                      <div className="flex items-center gap-2 text-[#111111]">
                        <Phone className="w-3.5 h-3.5 text-[#111111] shrink-0" />
                        <span className="font-mono font-bold text-[#111111]">{apt.customer_phone}</span>
                      </div>
                    )}
                    {apt.customer_email && (
                      <div className="flex items-center justify-between text-[#111111] pt-0.5">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-[#111111] shrink-0" />
                          <span className="font-mono text-[#111111] font-bold truncate">{apt.customer_email}</span>
                        </div>
                        <span className={`neo-badge shrink-0 ml-2 ${
                          apt.email_status === 'Sent'
                            ? 'bg-[#B8F4B8] text-[#111111]'
                            : 'bg-[#FFDE59] text-[#111111]'
                        }`}>
                          {apt.email_status === 'Sent' ? 'Brochure Sent' : (apt.email_status || 'Pending')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-[#111111] flex items-center justify-between text-[11px] font-mono text-[#111111] font-bold">
                  <span>Site Visit Pass</span>
                  <span className="neo-badge bg-[#FFDE59] text-[#111111]">Confirmed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Booking Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="neo-card bg-white max-w-md w-full p-6 border-3 border-[#111111] shadow-[8px_8px_0px_#111111] relative animate-fade-in">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-[#111111] hover:opacity-70 cursor-pointer"
            >
              <X className="w-5 h-5 text-[#111111]" />
            </button>

            <div className="neo-badge bg-[#FFDE59] text-[#111111] inline-block mb-2">Walkthrough Pass</div>
            <h3 className="font-heading text-lg font-black text-[#111111] mb-1">
              Manual Site Visit Pass
            </h3>
            <p className="font-sans text-xs text-[#111111]/70 mb-5 font-medium">
              Record a prospective client walkthrough directly to the database.
            </p>

            <form onSubmit={handleSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-[#111111] mb-1">
                  Buyer Name
                </label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={e => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="e.g. Charan Kumar"
                  className="neo-input w-full px-3 py-2 text-[#111111] font-medium bg-white"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-[#111111] mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98450 12345"
                  className="neo-input w-full px-3 py-2 text-[#111111] font-medium bg-white"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase font-bold text-[#111111] mb-1">
                  Target Development
                </label>
                <input
                  type="text"
                  required
                  value={form.propertyName}
                  onChange={e => setForm(prev => ({ ...prev, propertyName: e.target.value }))}
                  className="neo-input w-full px-3 py-2 text-[#111111] font-medium bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#111111] mb-1">
                    Locality
                  </label>
                  <input
                    type="text"
                    required
                    value={form.location}
                    onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                    className="neo-input w-full px-3 py-2 text-[#111111] font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase font-bold text-[#111111] mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.dateTime}
                    onChange={e => setForm(prev => ({ ...prev, dateTime: e.target.value }))}
                    className="neo-input w-full px-3 py-2 text-[#111111] font-mono font-bold bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="neo-btn neo-btn-white px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="neo-btn neo-btn-yellow px-4 py-2 text-xs font-bold"
                >
                  {submitting ? 'Confirming...' : 'Create Site Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
