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
  Mail
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

export default function Appointments() {
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
    propertyName: 'Prestige Willow Park',
    location: 'Whitefield',
    dateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  });

  useEffect(() => {
    loadAppointments();
  }, []);

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
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  const selectedDateKey = toLocalDateKey(selectedDate);
  const selectedDateAppointments = appointmentsByDate[selectedDateKey] || [];

  // Booked times on the selected date to mark slots
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

  function openModalForSlot(timeSlot) {
    const [time, period] = timeSlot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const dt = new Date(selectedDate);
    dt.setHours(hours, minutes, 0, 0);

    setForm(prev => ({
      ...prev,
      dateTime: dt.toISOString().slice(0, 16)
    }));
    setModalOpen(true);
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#171717] tracking-tight">
            Scheduled Property Visits
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#171717]/60 mt-1">
            Site visit bookings generated from AI Voice calls and customer reservations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAppointments}
            className="p-2.5 rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] text-[#171717]/60 hover:text-[#171717] hover:bg-[#F5F2E9] transition-colors"
            title="Refresh database"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#1e7842] text-white font-heading text-xs font-bold flex items-center gap-2 transition-colors border border-[#14532D] shadow-none cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#E2F1E7]" />
            Schedule Visit
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFF1CC] border border-[#E5D8A8] text-[#854D0E] px-4 py-3 rounded-2xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* Calendar & Selected Date Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Calendar View */}
        <div className="lg:col-span-2 bg-[#FFFCF7] rounded-3xl p-6 sm:p-7 border border-[#D6CDBB] shadow-none">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#14532D]" />
              <h3 className="font-heading text-lg sm:text-xl font-bold text-[#171717] tracking-tight">{monthName}</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="w-9 h-9 rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] hover:bg-[#F5F2E9] text-[#171717] font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="w-9 h-9 rounded-xl border border-[#D6CDBB] bg-[#FFFCF7] hover:bg-[#F5F2E9] text-[#171717] font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 text-center font-mono text-[11px] uppercase tracking-wider text-[#171717]/50 font-bold mb-2.5">
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
            {/* Blank cells before the 1st */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 rounded-2xl bg-[#F5F2E9]/40 border border-[#D6CDBB]/30" />
            ))}

            {/* Actual Month Days */}
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
                  className={`h-20 sm:h-24 p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#14532D] bg-[#E2F1E7]/40 ring-2 ring-[#14532D]'
                      : count > 0
                      ? 'border-[#14532D]/30 bg-[#E2F1E7] hover:border-[#14532D]'
                      : 'border-[#D6CDBB]/70 hover:border-[#D6CDBB] bg-[#FFFCF7]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-heading text-xs sm:text-sm font-bold w-6 h-6 rounded-lg flex items-center justify-center ${
                        isToday
                          ? 'bg-[#14532D] text-white'
                          : isSelected
                          ? 'text-[#14532D] font-extrabold'
                          : 'text-[#171717]'
                      }`}
                    >
                      {dayNum}
                    </span>
                  </div>

                  {/* Display actual appointment count on booked dates; leave free dates empty */}
                  {count > 0 && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider font-bold bg-[#14532D] text-white shadow-none">
                        {count} {count === 1 ? 'Visit' : 'Visits'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Appointments & Slot Availability */}
        <div className="bg-[#FFFCF7] rounded-3xl p-6 sm:p-7 border border-[#D6CDBB] shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D6CDBB]/50">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#171717]/60">Selected Date</span>
                <h4 className="font-heading text-base font-bold text-[#171717] mt-0.5">
                  {selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </h4>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20">
                {selectedDateAppointments.length} Booked
              </span>
            </div>

            {/* Appointments on this date */}
            <div className="space-y-3 mb-6">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#171717]/70 block">Scheduled Visits</span>
              {selectedDateAppointments.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB]/60 text-center font-mono text-xs text-[#171717]/50 uppercase tracking-wider">
                  No visits booked for this date.
                </div>
              ) : (
                selectedDateAppointments.map(a => (
                  <div key={a.appointment_id} className="p-3.5 rounded-2xl border border-[#14532D]/20 bg-[#E2F1E7] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-[#14532D]">{a.customer_name}</span>
                      <span className="font-mono text-[10px] font-bold text-[#14532D] bg-[#FFFCF7] px-2 py-0.5 rounded-md border border-[#14532D]/20">
                        {formatTime(a.date_time)}
                      </span>
                    </div>
                    <div className="font-sans text-[#171717] font-semibold truncate">{a.property_name}</div>
                    <div className="font-mono text-[#171717]/60 text-[10px] flex items-center justify-between pt-1">
                      <span>{a.location}</span>
                      <span>{a.customer_phone}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Time Slots Availability */}
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#171717]/70 block mb-2">Available Time Slots</span>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_SLOTS.map(slot => {
                  const isBooked = bookedTimes.includes(slot);
                  return (
                    <button
                      key={slot}
                      disabled={isBooked}
                      onClick={() => openModalForSlot(slot)}
                      className={`p-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between ${
                        isBooked
                          ? 'bg-[#F5F2E9] text-[#171717]/40 cursor-not-allowed border border-[#D6CDBB]/50'
                          : 'bg-[#FFFCF7] hover:bg-[#E2F1E7] hover:text-[#14532D] text-[#171717] border border-[#D6CDBB] cursor-pointer'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-[#171717]/50" />
                        {slot}
                      </span>
                      <span className={`font-mono text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${isBooked ? 'bg-[#D6CDBB]/50 text-[#171717]/60' : 'bg-[#E2F1E7] text-[#14532D]'}`}>
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

      {/* Upcoming Appointments List Below Calendar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg sm:text-xl font-bold text-[#171717] flex items-center gap-2 tracking-tight">
            <CalendarCheck className="w-5 h-5 text-[#14532D]" />
            Upcoming Scheduled Visits ({appointments.length})
          </h3>
          <span className="font-mono text-xs text-[#171717]/50 uppercase tracking-wider">Synced from SQLite</span>
        </div>

        {loading && (
          <div className="text-center py-10 font-mono text-xs text-[#171717]/50 uppercase tracking-wider">Loading records...</div>
        )}

        {!loading && appointments.length === 0 && (
          <div className="bg-[#FFFCF7] rounded-3xl p-10 border border-[#D6CDBB] text-center shadow-none">
            <CalendarCheck className="w-10 h-10 text-[#D6CDBB] mx-auto mb-2" />
            <p className="font-heading text-sm font-bold text-[#171717]">No appointments found</p>
            <p className="font-sans text-xs text-[#171717]/60 mt-1">
              Start a voice call or click "Schedule Visit" to book your first walkthrough.
            </p>
          </div>
        )}

        {!loading && appointments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {appointments.map((apt) => (
              <div
                key={apt.appointment_id}
                className="bg-[#FFFCF7] rounded-3xl p-5 sm:p-6 border border-[#D6CDBB] shadow-none hover:border-[#14532D] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[10px] font-bold text-[#171717]/50">{apt.appointment_id}</span>
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#14532D]" />
                      {apt.status}
                    </span>
                  </div>

                  <h4 className="font-heading font-bold text-[#171717] text-base leading-snug">{apt.property_name}</h4>
                  <div className="flex items-center gap-1 font-sans text-xs text-[#14532D] mt-1 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#14532D]" />
                    <span>{apt.location}, Bangalore</span>
                  </div>

                  <div className="mt-4 p-3.5 rounded-2xl bg-[#F5F2E9] border border-[#D6CDBB]/60 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-[#171717]">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#171717]/50" />
                      <span className="font-mono font-bold text-[#171717]">{formatDate(apt.date_time)} • {formatTime(apt.date_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#171717]">
                      <User className="w-3.5 h-3.5 text-[#171717]/50" />
                      <span className="font-sans font-semibold text-[#171717]">{apt.customer_name}</span>
                    </div>
                    {apt.customer_phone && (
                      <div className="flex items-center gap-2 text-[#171717]">
                        <Phone className="w-3.5 h-3.5 text-[#171717]/50 shrink-0" />
                        <span className="font-mono text-[#171717]/80">{apt.customer_phone}</span>
                      </div>
                    )}
                    {apt.customer_email && (
                      <div className="flex items-center justify-between text-[#171717] pt-0.5">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-[#171717]/50 shrink-0" />
                          <span className="font-mono text-[#171717]/80 truncate">{apt.customer_email}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold tracking-wider shrink-0 ml-2 ${
                          apt.email_status === 'Sent'
                            ? 'bg-[#E2F1E7] text-[#14532D] border border-[#14532D]/20'
                            : apt.email_status === 'Failed'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-[#FFF1CC] text-[#854D0E] border border-[#854D0E]/20'
                        }`}>
                          {apt.email_status === 'Sent' ? 'Brochure Sent' : (apt.email_status || 'Pending')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#D6CDBB]/50 font-mono text-[10px] uppercase tracking-wider text-[#171717]/50 flex items-center justify-between">
                  <span>Channel: EstateVoice AI</span>
                  <span className="truncate max-w-[50%] text-right font-sans">{apt.notes || ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFCF7] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-none border border-[#D6CDBB] relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-[#171717]/60 hover:text-[#171717] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading text-lg font-bold text-[#171717] mb-1">Book Site Tour</h3>
            <p className="font-sans text-xs text-[#171717]/60 mb-4">Connect buyer with DreamSpace sales representative.</p>

            <form onSubmit={handleSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#171717]/70 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="e.g. Suresh Gowda"
                  className="w-full px-3.5 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl focus:outline-none focus:border-[#14532D] font-sans text-xs"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#171717]/70 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98450 00000"
                  className="w-full px-3.5 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl focus:outline-none focus:border-[#14532D] font-sans text-xs"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#171717]/70 mb-1">Select Property</label>
                <select
                  value={form.propertyName}
                  onChange={(e) => {
                    const loc = e.target.value.includes('Electronic') ? 'Electronic City'
                      : e.target.value.includes('Sobha') ? 'Sarjapur'
                      : e.target.value.includes('Brigade') ? 'Hebbal'
                      : e.target.value.includes('Puravankara') ? 'Yelahanka'
                      : 'Whitefield';
                    setForm({ ...form, propertyName: e.target.value, location: loc });
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl focus:outline-none focus:border-[#14532D] font-sans text-xs cursor-pointer"
                >
                  <option value="Prestige Willow Park">Prestige Willow Park (Whitefield)</option>
                  <option value="Godrej Royale Woods">Godrej Royale Woods (Electronic City)</option>
                  <option value="Sobha Lake Haven Luxury Villas">Sobha Lake Haven (Sarjapur)</option>
                  <option value="Brigade Horizon Sky Penthouse">Brigade Horizon (Hebbal)</option>
                  <option value="Puravankara Palm Vista">Puravankara Palm Vista (Yelahanka)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider font-bold text-[#171717]/70 mb-1">Visit Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F5F2E9] border border-[#D6CDBB] rounded-xl focus:outline-none focus:border-[#14532D] font-sans text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#D6CDBB] text-[#171717] hover:bg-[#F5F2E9] font-heading font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#14532D] text-white font-heading font-bold text-xs hover:bg-[#1e7842] border border-[#14532D] disabled:opacity-60 cursor-pointer shadow-none"
                >
                  {submitting ? 'Booking...' : 'Confirm Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
