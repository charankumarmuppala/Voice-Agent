const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Fetch health status of the backend API
 */
export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch API health:', err);
    return { status: 'offline', error: err.message };
  }
}

/**
 * Fetch properties with optional filtering parameters
 */
export async function fetchProperties(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.location && params.location !== 'All') query.append('location', params.location);
  if (params.bhk && params.bhk !== 'All') query.append('bhk', params.bhk);
  if (params.property_type && params.property_type !== 'All') query.append('property_type', params.property_type);
  if (params.min_price) query.append('min_price', params.min_price);
  if (params.max_price) query.append('max_price', params.max_price);
  if (params.availability && params.availability !== 'All') query.append('availability', params.availability);
  if (params.page) query.append('page', params.page);
  if (params.page_size) query.append('page_size', params.page_size);
  const url = `${API_BASE_URL}/properties${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch properties: ${res.statusText}`);
  return await res.json();
}

export async function fetchPropertyById(id) {
  const res = await fetch(`${API_BASE_URL}/properties/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch property details: ${res.statusText}`);
  return await res.json();
}

export async function fetchPropertyStats() {
  const res = await fetch(`${API_BASE_URL}/properties/stats`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  return await res.json();
}

/**
 * Format currency to Indian Lakhs (L) and Crores (Cr)
 */
export function formatINR(amount) {
  if (amount === undefined || amount === null) return '₹0';
  const val = Number(amount);
  if (val >= 10000000) {
    const cr = (val / 10000000).toFixed(2);
    return `₹${cr.replace(/\.00$/, '')} Cr`;
  } else if (val >= 100000) {
    const lk = (val / 100000).toFixed(2);
    return `₹${lk.replace(/\.00$/, '')} Lakh`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

/**
 * Voice / Call Agent Endpoints
 */
export async function startCall(payload = {}) {
  const res = await fetch(`${API_BASE_URL}/calls/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to start call: ${res.statusText}`);
  return await res.json();
}

export async function sendCallMessage(sessionId, message) {
  const res = await fetch(`${API_BASE_URL}/calls/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error(`Failed to send message: ${res.statusText}`);
  return await res.json();
}

export async function endCall(sessionId, notes = '') {
  const res = await fetch(`${API_BASE_URL}/calls/${sessionId}/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });
  if (!res.ok) throw new Error(`Failed to end call: ${res.statusText}`);
  return await res.json();
}

export async function fetchCalls(page = 1, pageSize = 20) {
  const res = await fetch(`${API_BASE_URL}/calls?page=${page}&page_size=${pageSize}`);
  if (!res.ok) throw new Error(`Failed to fetch calls: ${res.statusText}`);
  return await res.json();
}

export async function fetchCallDetails(sessionId) {
  const res = await fetch(`${API_BASE_URL}/calls/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to fetch call details: ${res.statusText}`);
  return await res.json();
}

/**
 * Appointments Endpoints
 */
export async function fetchAppointments() {
  const res = await fetch(`${API_BASE_URL}/appointments`);
  if (!res.ok) throw new Error(`Failed to fetch appointments: ${res.statusText}`);
  return await res.json();
}

export async function createAppointment(payload = {}) {
  const res = await fetch(`${API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to create appointment: ${res.statusText}`);
  return await res.json();
}

/**
 * Leads Endpoints
 */
export async function fetchLeads() {
  const res = await fetch(`${API_BASE_URL}/leads`);
  if (!res.ok) throw new Error(`Failed to fetch leads: ${res.statusText}`);
  return await res.json();
}

// Aliases
export const startVoiceCall = startCall;
export const sendVoiceMessage = sendCallMessage;
export const endVoiceCall = endCall;
export const fetchVoiceHistory = fetchCallDetails;

