/**
 * api.js — Central API layer for Ranjan Nirman Portal
 * Dev: Vite proxies /api → http://localhost:8080 (see vite.config.js)
 * Prod: set VITE_API_BASE (e.g. https://api.example.com/api) or use same-origin /api
 */

const BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '') || '/api';

// ─── Session helpers ───────────────────────────────────────
const TOKEN_KEYS = ['accessToken', 'token'];

export const saveSession = (d) => {
  localStorage.setItem('userRole', d.role || '');
  localStorage.setItem('userEmail', d.email || '');
  localStorage.setItem('userName', d.name || d.email || '');
  localStorage.setItem('employeeId', d.employeeId || '');
  const tok = TOKEN_KEYS.map((k) => d[k]).find(Boolean);
  if (tok) localStorage.setItem('authToken', tok);
  else localStorage.removeItem('authToken');
};

export const getRole = () => localStorage.getItem('userRole') || '';
export const getEmail = () => localStorage.getItem('userEmail') || '';
export const getName = () => localStorage.getItem('userName') || '';
export const getEmployeeId = () => localStorage.getItem('employeeId') || '';
export const getAuthToken = () => localStorage.getItem('authToken') || '';

export const clearSession = () => {
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  localStorage.removeItem('employeeId');
  localStorage.removeItem('authToken');
};

/** Logged in if we have a role (legacy) or a JWT from the server */
export const isLoggedIn = () => !!(getRole() || getAuthToken());

function redirectToLoginIfUnauthorized() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  if (path.startsWith('/login')) return;
  clearSession();
  window.location.assign('/login');
}

// ─── Generic fetch helper ──────────────────────────────────
async function req(path, options = {}) {
  const headers = new Headers(options.headers || undefined);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const t = getAuthToken();
  if (t) headers.set('Authorization', `Bearer ${t}`);

  const res = await fetch(BASE + path, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    redirectToLoginIfUnauthorized();
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || 'Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : null;
}

// ─── Auth ──────────────────────────────────────────────────
export async function loginUser(email, password) {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = { message: 'Invalid response from server.' };
  }
  return { ok: res.ok, data };
}

// ─── Public quote lead (no Authorization header) ──────────
export async function submitQuoteRequest(payload) {
  const res = await fetch(`${BASE}/quote-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  return { ok: res.ok, status: res.status, data };
}

// ─── Projects ──────────────────────────────────────────────
export const fetchProjects = () => req('/projects');
export const addProject = (p) => req('/projects', { method: 'POST', body: JSON.stringify(p) });
export const updateProject = (id, p) => req(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(p) });
export const deleteProject = (id) => req(`/projects/${id}`, { method: 'DELETE' });

// ─── Employees ─────────────────────────────────────────────
export const fetchEmployees = () => req('/employees');
export const fetchEmployeeByEmail = (email) => req(`/employees/by-email/${encodeURIComponent(email)}`);
export const createEmployee = (e) => req('/employees', { method: 'POST', body: JSON.stringify(e) });
export const updateEmployee = (id, e) => req(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(e) });
export const deleteEmployee = (id) => req(`/employees/${id}`, { method: 'DELETE' });

// ─── Materials ─────────────────────────────────────────────
export const fetchMaterials = () => req('/materials');
export const addMaterial = (m) => req('/materials', { method: 'POST', body: JSON.stringify(m) });
export const updateMaterial = (id, m) => req(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(m) });
export const deleteMaterial = (id) => req(`/materials/${id}`, { method: 'DELETE' });

// ─── Timesheets ────────────────────────────────────────────
export const fetchAllTimesheets = () => req('/timesheets');
export const fetchMyTimesheets = (empId) => req(`/timesheets/employee/${empId}`);
export const submitTimesheet = (ts) => req('/timesheets', { method: 'POST', body: JSON.stringify(ts) });
export const deleteTimesheet = (id) => req(`/timesheets/${id}`, { method: 'DELETE' });

// ─── Leave Requests ────────────────────────────────────────
export const fetchAllLeaves = () => req('/leaves');
export const fetchMyLeaves = (empId) => req(`/leaves/employee/${empId}`);
export const submitLeave = (l) => req('/leaves', { method: 'POST', body: JSON.stringify(l) });
export const updateLeaveStatus = (id, status) =>
  req(`/leaves/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const deleteLeave = (id) => req(`/leaves/${id}`, { method: 'DELETE' });

// ─── Budgets ───────────────────────────────────────────────
export const fetchBudgets = () => req('/budgets');
export const fetchBudgetsByProject = (projId) => req(`/budgets/project/${projId}`);
export const createBudget = (b) => req('/budgets', { method: 'POST', body: JSON.stringify(b) });
export const updateBudget = (id, b) => req(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(b) });
export const deleteBudget = (id) => req(`/budgets/${id}`, { method: 'DELETE' });

// ─── Site Tasks ────────────────────────────────────────────
export const fetchAllTasks = () => req('/tasks');
export const fetchMyTasks = (empId) => req(`/tasks/employee/${empId}`);
export const createTask = (t) => req('/tasks', { method: 'POST', body: JSON.stringify(t) });
export const updateTaskStatus = (id, st) =>
  req(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: st }) });
export const updateTask = (id, task) => req(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) });
export const deleteTask = (id) => req(`/tasks/${id}`, { method: 'DELETE' });

// ─── Equipment Tracking ────────────────────────────────────
export const fetchEquipment = () => req('/equipment');
export const addEquipment = (eq) => req('/equipment', { method: 'POST', body: JSON.stringify(eq) });
export const updateEquipment = (id, eq) => req(`/equipment/${id}`, { method: 'PUT', body: JSON.stringify(eq) });
export const deleteEquipment = (id) => req(`/equipment/${id}`, { method: 'DELETE' });

// ─── Nepal Tender / Construction News Aggregator ───────────
export const fetchDudbcNotices = (province = '', district = '', source = '') => {
  const params = new URLSearchParams();
  if (province) params.set('province', province);
  if (district) params.set('district', district);
  if (source) params.set('source', source);
  const qs = params.toString() ? `?${params}` : '';
  return req(`/dudbc/notices${qs}`);
};
