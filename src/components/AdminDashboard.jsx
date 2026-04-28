import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchProjects, addProject, deleteProject,
  fetchEmployees, createEmployee, deleteEmployee, updateEmployee,
  fetchMaterials, addMaterial, deleteMaterial,
  fetchAllTimesheets,
  fetchAllLeaves, updateLeaveStatus,
  fetchBudgets, createBudget, deleteBudget,
  fetchAllTasks, createTask, deleteTask, updateTask,
  fetchEquipment, addEquipment, updateEquipment, deleteEquipment,
  fetchAllMaterialRequests, updateMaterialRequestStatus,
  fetchDudbcNotices, fetchBudgetAlerts, fetchPhotosForTask,
  getEmail, getName, clearSession
} from '../api';
import { downloadCsv } from '../utils/csv';
import { useToast } from '../context/ToastContext';
import './AdminDashboard.css';

/* ─── Tiny shared UI pieces ──────────────────────────────── */
const Badge = ({ status }) => {
  const map = {
    'In Progress': ['rgba(245,158,11,.15)', 'var(--brand-yellow-dark)', 'rgba(245,158,11,.3)'],
    Completed:     ['rgba(16,185,129,.15)',  'var(--brand-green-dark)', 'rgba(16,185,129,.3)'],
    Planning:      ['rgba(59,130,246,.15)',  'var(--brand-cyan-dark)', 'rgba(59,130,246,.3)'],
    PENDING:       ['rgba(245,158,11,.15)', 'var(--brand-yellow-dark)', 'rgba(245,158,11,.3)'],
    APPROVED:      ['rgba(16,185,129,.15)',  'var(--brand-green-dark)', 'rgba(16,185,129,.3)'],
    REJECTED:      ['rgba(239,68,68,.15)',   '#dc2626',                  'rgba(239,68,68,.3)'],
    ADMIN:         ['rgba(168,85,247,.15)',  '#7e22ce',                  'rgba(168,85,247,.3)'],
    STANDARD:      ['rgba(59,130,246,.15)',  'var(--brand-cyan-dark)', 'rgba(59,130,246,.3)'],
  };
  const [bg, color, border] = map[status] || ['rgba(0,0,0,.04)', 'var(--text-muted)', 'var(--border-glass)'];
  return (
    <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem',
      fontWeight: 700, background: bg, color, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
};

const ErrBox = ({ msg }) => msg ? (
  <div style={{ color: '#dc2626', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
    padding: '12px 16px', borderRadius: 8, marginBottom: 18, fontSize: '0.88rem', fontWeight: 500 }}>⚠ {msg}</div>
) : null;

/** Replaces window.confirm for destructive actions. Shows inline "Are you sure?" controls. */
function InlineConfirm({ onConfirm, label = 'Remove', btnClass = 'delete-btn' }) {
  const [pending, setPending] = useState(false);
  if (pending) {
    return (
      <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sure?</span>
        <button onClick={() => { onConfirm(); setPending(false); }} className={btnClass}
          style={{ padding: '4px 12px', fontSize: '0.78rem' }}>Yes</button>
        <button onClick={() => setPending(false)}
          style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border-glass-hover)',
            background: 'var(--surface-2)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>No</button>
      </span>
    );
  }
  return <button className={btnClass} onClick={() => setPending(true)}>{label}</button>;
}

const inputStyle = {
  flex: '1 1 160px', padding: '12px 16px',
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
  fontSize: '0.9rem', fontFamily: 'var(--sans)', outline: 'none',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
};

/* ─── Tab: Overview ──────────────────────────────────────── */
function Overview({ projects, employees, materials, leaves }) {
  const totalMaterialCost = materials.reduce((s, m) => s + (m.quantity || 0) * (m.unitCost || 0), 0);
  const pending = leaves.filter(l => l.status === 'PENDING').length;
  const stats = [
    { label: 'Total Projects', value: projects.length, color: 'var(--brand-yellow)' },
    { label: 'Active Sites', value: projects.filter(p => p.status === 'In Progress').length, color: 'var(--brand-green-dark)' },
    { label: 'Employees', value: employees.length, color: 'var(--brand-cyan-dark)' },
    { label: 'Material Lines', value: materials.length, color: '#ec4899' },
    { label: 'Pending Leaves', value: pending, color: '#f59e0b' },
    { label: 'Material Cost (₹)', value: `₹${totalMaterialCost.toLocaleString()}`, color: 'var(--brand-green-dark)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 18 }}>
      {stats.map(s => (
        <div key={s.label} style={{ padding: '28px 24px', background: 'var(--surface-1)',
          border: '1px solid var(--border-glass-hover)', borderRadius: 'var(--radius-md)',
          textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: s.color, fontFamily: 'var(--heading)' }}>{s.value}</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Tab: Projects ──────────────────────────────────────── */
function Projects({ projects, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Planning');
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((p) =>
      `${p.name || ''} ${p.location || ''} ${p.status || ''}`.toLowerCase().includes(needle)
    );
  }, [projects, q]);

  const handleAdd = async (e) => {
    e.preventDefault(); setErr('');
    try { await addProject({ name, location, status }); setName(''); setLocation(''); setStatus('Planning'); onRefresh(); success('Project added.'); }
    catch { setErr('Failed to add project.'); showErr('Could not add project.'); }
  };
  const handleDel = async (id) => {
    try { await deleteProject(id); onRefresh(); success('Project deleted.'); }
    catch { setErr('Failed to delete.'); showErr('Could not delete project.'); }
  };

  return (
    <div>
      <div className="add-project-card light-card">
        <h3>Add New Site</h3>
        <ErrBox msg={err} />
        <form onSubmit={handleAdd} className="add-project-form">
          <input style={inputStyle} placeholder="Project Name" value={name} required onChange={e => setName(e.target.value)} />
          <input style={inputStyle} placeholder="Location" value={location} required onChange={e => setLocation(e.target.value)} />
          <select style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}>
            {['Planning','In Progress','Completed'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button type="submit" className="add-btn">+ Add</button>
        </form>
      </div>
      <div style={{ marginBottom: 14 }}>
        <input
          style={{ ...inputStyle, width: '100%', maxWidth: 400 }}
          placeholder="Search projects by name, location, or status…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search projects"
        />
      </div>
      <div className="table-wrapper">
        <table className="project-table light-table">
          <thead><tr><th>#</th><th>Name</th><th>Location</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding: 32 }}>{projects.length === 0 ? 'No projects yet.' : 'No matches.'}</td></tr>
              : filtered.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color:'var(--text-muted)' }}>{i+1}</td>
                  <td style={{ fontWeight:600 }}>{p.name}</td>
                  <td>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location)}`} target="_blank" rel="noopener noreferrer" style={{ color:'var(--brand-cyan-dark)', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                      📍 {p.location}
                    </a>
                  </td>
                  <td><Badge status={p.status} /></td>
                  <td><InlineConfirm label="Delete" onConfirm={() => handleDel(p.id)} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Employees ─────────────────────────────────────── */
function Employees({ employees, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', department:'Civil', salary:'', pendingDues:'0', role:'STANDARD' });
  const [err, setErr] = useState('');
  const [editDuesId, setEditDuesId] = useState(null);
  const [duesVal, setDuesVal] = useState('');
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleAdd = async (ev) => {
    ev.preventDefault(); setErr('');
    try {
      await createEmployee({ ...form, salary: parseFloat(form.salary)||0, pendingDues: parseFloat(form.pendingDues)||0 });
      setForm({ name:'', email:'', password:'', phone:'', department:'Civil', salary:'', pendingDues:'0', role:'STANDARD' });
      onRefresh(); success('Employee added.');
    } catch { setErr('Failed to add employee. Email might already exist.'); showErr('Could not add employee.'); }
  };
  const handleDel = async (id) => {
    try { await deleteEmployee(id); onRefresh(); success('Employee removed.'); }
    catch { setErr('Failed to delete.'); showErr('Could not remove employee.'); }
  };
  const startDuesEdit = (emp) => { setEditDuesId(emp.id); setDuesVal(String(emp.pendingDues || 0)); };
  const cancelDuesEdit = () => { setEditDuesId(null); setDuesVal(''); };
  const saveDues = async (id) => {
    try { await updateEmployee(id, { pendingDues: parseFloat(duesVal)||0 }); onRefresh(); cancelDuesEdit(); success('Dues updated.'); }
    catch { setErr('Failed to update dues.'); showErr('Could not update dues.'); }
  };

  return (
    <div>
      <div className="add-project-card light-card">
        <h3>Add New Employee</h3>
        <ErrBox msg={err} />
        <form onSubmit={handleAdd} style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:12 }}>
          {[['name','Full Name'],['email','Email'],['password','Password'],['phone','Phone']].map(([k,ph]) => (
            <input key={k} style={inputStyle} placeholder={ph} value={form[k]} required onChange={f(k)} type={k==='email'?'email':k==='password'?'password':'text'} />
          ))}
          <select style={inputStyle} value={form.department} onChange={f('department')}>
            {['Civil','Electrical','Plumbing','Management','Other'].map(d => <option key={d}>{d}</option>)}
          </select>
          <input style={inputStyle} placeholder="Monthly Salary (₹)" type="number" value={form.salary} onChange={f('salary')} />
          <select style={inputStyle} value={form.role} onChange={f('role')}>
            <option value="STANDARD">Standard Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" className="add-btn">+ Add Employee</button>
        </form>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:20, marginTop:24 }}>
        {employees.length === 0 ? (
          <div style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--text-muted)', padding:32, background:'var(--surface-1)', borderRadius:'var(--radius-md)' }}>No employees yet.</div>
        ) : employees.map(emp => (
          <div key={emp.id} style={{ background:'var(--surface-1)', borderRadius:'var(--radius-md)', border:'1px solid var(--border-glass-hover)', padding:24, display:'flex', flexDirection:'column', gap:16, boxShadow:'var(--shadow-sm)', position:'relative' }}>
            {/* Header: Avatar, Name, Role */}
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--surface-2)', border:'2px solid var(--brand-cyan)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', color:'var(--text-muted)' }}>
                👤
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:'1.1rem', color:'var(--brand-dark)' }}>{emp.name || 'Unknown'}</div>
                <div style={{ color:'var(--text-secondary)', fontSize:'0.85rem', marginBottom:6 }}>{emp.email}</div>
                <Badge status={emp.role} />
              </div>
            </div>
            
            {/* Details Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, background:'rgba(0,0,0,0.02)', padding:16, borderRadius:8 }}>
              <div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:700 }}>Dept</div>
                <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{emp.department || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:700 }}>Phone</div>
                <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{emp.phone || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:700 }}>Salary/mo</div>
                <div style={{ fontWeight:600, fontSize:'0.9rem', color:'var(--brand-green-dark)' }}>₹{(emp.salary||0).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:700 }}>Pending Dues</div>
                <div style={{ fontWeight:600, fontSize:'0.9rem', color: emp.pendingDues > 0 ? '#dc2626' : 'inherit' }}>₹{(emp.pendingDues||0).toLocaleString()}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ paddingTop:12, borderTop:'1px solid var(--border-glass)' }}>
              {editDuesId === emp.id ? (
                <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:8 }}>
                  <input
                    type="number" min="0" step="0.01"
                    value={duesVal}
                    onChange={e => setDuesVal(e.target.value)}
                    style={{ ...inputStyle, flex:'1 1 100px', padding:'6px 10px', fontSize:'0.85rem' }}
                    aria-label="Pending dues amount"
                    autoFocus
                  />
                  <button onClick={() => saveDues(emp.id)} style={{ padding:'6px 14px', background:'linear-gradient(135deg,var(--brand-cyan),var(--brand-green))', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:'0.82rem' }}>Save</button>
                  <button onClick={cancelDuesEdit} style={{ padding:'6px 12px', background:'var(--surface-2)', border:'1px solid var(--border-glass-hover)', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:'0.82rem' }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:8 }}>
                  <button style={{ flex:1, padding:'8px', background:'var(--surface-2)', border:'1px solid var(--border-glass-hover)', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:'0.85rem' }} onClick={() => startDuesEdit(emp)}>Update Dues</button>
                  <InlineConfirm label="Remove" onConfirm={() => handleDel(emp.id)}
                    btnClass="" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Tab: Materials ─────────────────────────────────────── */
function Materials({ materials, projects, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [form, setForm] = useState({ name:'', quantity:'', unit:'bags', projectId:'', projectName:'', unitCost:'' });
  const [err, setErr] = useState('');
  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleAdd = async (ev) => {
    ev.preventDefault(); setErr('');
    const proj = projects.find(p => String(p.id) === String(form.projectId));
    try {
      await addMaterial({ ...form, projectName: proj?.name || '', quantity: parseFloat(form.quantity)||0, unitCost: parseFloat(form.unitCost)||0, projectId: parseInt(form.projectId)||null });
      setForm({ name:'', quantity:'', unit:'bags', projectId:'', projectName:'', unitCost:'' });
      onRefresh(); success('Material added.');
    } catch { setErr('Failed to add material.'); showErr('Could not add material.'); }
  };
  const handleDel = async (id) => {
    try { await deleteMaterial(id); onRefresh(); success('Material removed.'); }
    catch { setErr('Failed to delete.'); showErr('Could not remove material.'); }
  };

  const totalCost = materials.reduce((s, m) => s + (m.quantity||0)*(m.unitCost||0), 0);

  return (
    <div>
      <div className="add-project-card light-card">
        <h3>Add Material Entry</h3>
        <ErrBox msg={err} />
        <form onSubmit={handleAdd} style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:12 }}>
          <input style={inputStyle} placeholder="Material Name (e.g. Cement)" value={form.name} required onChange={f('name')} />
          <input style={inputStyle} placeholder="Qty" type="number" value={form.quantity} required onChange={f('quantity')} />
          <select style={inputStyle} value={form.unit} onChange={f('unit')}>
            {['bags','kg','tonnes','metres','litres','pieces','cubic m'].map(u => <option key={u}>{u}</option>)}
          </select>
          <input style={inputStyle} placeholder="Unit Cost (₹)" type="number" value={form.unitCost} onChange={f('unitCost')} />
          <select style={inputStyle} value={form.projectId} onChange={f('projectId')} required>
            <option value="">Select Project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button type="submit" className="add-btn">+ Add</button>
        </form>
      </div>
      <div style={{ marginBottom:14, fontWeight:700, fontSize: '1.1rem', color:'var(--brand-green-dark)' }}>
        Total Material Cost: ₹{totalCost.toLocaleString()}
      </div>
      <div className="table-wrapper">
        <table className="project-table light-table">
          <thead><tr><th>Material</th><th>Qty</th><th>Unit</th><th>Cost</th><th>Total</th><th>Project</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            {materials.length === 0
              ? <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No materials logged.</td></tr>
              : materials.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight:600 }}>{m.name}</td>
                  <td>{m.quantity}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{m.unit}</td>
                  <td>₹{(m.unitCost||0).toLocaleString()}</td>
                  <td style={{ color:'var(--brand-green-dark)', fontWeight:800 }}>₹{((m.quantity||0)*(m.unitCost||0)).toLocaleString()}</td>
                  <td style={{ color:'var(--text-secondary)', fontSize:'0.82rem' }}>{m.projectName || '—'}</td>
                  <td style={{ color:'var(--text-secondary)', fontSize:'0.82rem' }}>{m.dateAdded || '—'}</td>
                  <td><InlineConfirm label="Remove" onConfirm={() => handleDel(m.id)} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Timesheets (Admin read-only view) ─────────────── */
function Timesheets({ timesheets }) {
  const totalHours = timesheets.reduce((s, t) => s + (t.hoursWorked||0), 0);
  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14 }}>
        <div style={{ fontWeight:700, fontSize: '1.1rem', color:'var(--brand-cyan-dark)' }}>
          Total Hours Logged: {totalHours.toFixed(1)} hrs
        </div>
        <button
          type="button"
          className="add-btn"
          style={{ margin: 0 }}
          disabled={!timesheets.length}
          onClick={() =>
            downloadCsv(
              timesheets,
              `timesheets-${new Date().toISOString().slice(0, 10)}.csv`,
              ['employeeName', 'projectName', 'workDate', 'hoursWorked', 'notes']
            )
          }
        >
          Export CSV
        </button>
      </div>
      <div className="table-wrapper">
        <table className="project-table light-table">
          <thead><tr><th>Employee</th><th>Project</th><th>Date</th><th>Hours</th><th>Notes</th></tr></thead>
          <tbody>
            {timesheets.length === 0
              ? <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No timesheets submitted yet.</td></tr>
              : timesheets.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight:600 }}>{t.employeeName || '—'}</td>
                  <td style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>{t.projectName || '—'}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{t.workDate || '—'}</td>
                  <td style={{ fontWeight:800, color:'var(--brand-cyan-dark)' }}>{t.hoursWorked}</td>
                  <td style={{ color:'var(--text-secondary)', fontSize:'0.82rem' }}>{t.notes || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Leave Requests ────────────────────────────────── */
function Leaves({ leaves, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return leaves;
    return leaves.filter((l) =>
      `${l.employeeName || ''} ${l.startDate || ''} ${l.endDate || ''} ${l.reason || ''} ${l.status || ''}`
        .toLowerCase()
        .includes(needle)
    );
  }, [leaves, q]);

  const handle = async (id, status) => {
    try { await updateLeaveStatus(id, status); onRefresh(); }
    catch { setErr('Failed to update.'); }
  };
  return (
    <div>
      <ErrBox msg={err} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          style={{ ...inputStyle, flex: '1 1 220px', maxWidth: 420 }}
          placeholder="Search by employee, dates, reason, or status…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search leave requests"
        />
        <button
          type="button"
          className="add-btn"
          style={{ margin: 0 }}
          disabled={!leaves.length}
          onClick={() =>
            downloadCsv(
              leaves,
              `leave-requests-${new Date().toISOString().slice(0, 10)}.csv`,
              ['employeeName', 'startDate', 'endDate', 'reason', 'status']
            )
          }
        >
          Export all CSV
        </button>
      </div>
      <div className="table-wrapper">
        <table className="project-table light-table">
          <thead><tr><th>Employee</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>{leaves.length === 0 ? 'No leave requests.' : 'No matches.'}</td></tr>
              : filtered.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight:600 }}>{l.employeeName || '—'}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{l.startDate}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{l.endDate}</td>
                  <td style={{ maxWidth:180, fontSize:'0.85rem' }}>{l.reason}</td>
                  <td><Badge status={l.status} /></td>
                  <td style={{ display:'flex', gap:6 }}>
                    {l.status === 'PENDING' && <>
                      <button className="add-btn" style={{ padding:'5px 10px', fontSize:'0.78rem' }} onClick={() => handle(l.id,'APPROVED')}>✓ Approve</button>
                      <button className="delete-btn" onClick={() => handle(l.id,'REJECTED')}>✗ Reject</button>
                    </>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Budgets ───────────────────────────────────────── */
function Budgets({ budgets, projects, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [form, setForm] = useState({ projectId:'', category:'Labor', allocatedAmount:'' });
  const [err, setErr] = useState('');
  const handleAdd = async (e) => {
    e.preventDefault(); setErr('');
    const p = projects.find(x => String(x.id) === String(form.projectId));
    try { await createBudget({...form, projectName: p?.name||'', allocatedAmount: parseFloat(form.allocatedAmount)||0}); onRefresh(); setForm({projectId:'',category:'Labor',allocatedAmount:''}); success('Budget allocated.'); }
    catch { setErr('Failed to add budget.'); showErr('Could not allocate budget.'); }
  };
  const handleDel = async (id) => {
    try { await deleteBudget(id); onRefresh(); success('Budget removed.'); }
    catch { showErr('Could not remove budget.'); }
  };
  return (
    <div>
      <div className="add-project-card light-card">
        <h3>Allocate Budget</h3><ErrBox msg={err}/>
        <form onSubmit={handleAdd} style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <select style={inputStyle} value={form.projectId} onChange={e=>setForm({...form,projectId:e.target.value})} required><option value="">Select Project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select style={inputStyle} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Labor</option><option>Materials</option><option>Machinery</option><option>Misc</option></select>
          <input style={inputStyle} type="number" min="0" step="0.01" placeholder="Allocated Amount (₹)" value={form.allocatedAmount} onChange={e=>setForm({...form,allocatedAmount:e.target.value})} required />
          <button className="add-btn" type="submit">+ Allocate</button>
        </form>
      </div>
      <div className="table-wrapper">
        <table className="project-table light-table">
          <thead><tr><th>Project</th><th>Category</th><th>Allocated</th><th>Spent</th><th>Remaining</th><th>Action</th></tr></thead>
          <tbody>{budgets.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:30}}>No budgets set.</td></tr> : budgets.map(b=><tr key={b.id}>
            <td style={{fontWeight:600}}>{b.projectName}</td><td>{b.category}</td><td>₹{b.allocatedAmount.toLocaleString()}</td><td style={{color:'var(--brand-yellow-dark)'}}>₹{b.spentAmount.toLocaleString()}</td><td style={{color: (b.allocatedAmount - b.spentAmount)<0?'#dc2626':'var(--brand-green-dark)'}}>₹{(b.allocatedAmount - b.spentAmount).toLocaleString()}</td>
            <td><InlineConfirm label="Remove" onConfirm={() => handleDel(b.id)} /></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Photo Gallery Modal ────────────────────────────────── */
function PhotoGalleryModal({ task, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchPhotosForTask(task.id).then(res => { setPhotos(res||[]); setLoading(false); }).catch(()=>setLoading(false));
  }, [task.id]);
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, backdropFilter:'blur(4px)', padding: 20 }}>
      <div className="animate-fade-up" style={{ background:'var(--surface-0)', borderRadius:'var(--radius-lg)', width:'100%', maxWidth:800, maxHeight:'90vh', overflowY:'auto', border:'1px solid var(--border-glass)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:'1px solid var(--border-glass-hover)' }}>
          <div style={{ fontWeight:800, fontSize:'1.2rem', color:'var(--brand-dark)' }}>Photos: {task.taskDescription}</div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'var(--text-secondary)' }}>&times;</button>
        </div>
        <div style={{ padding: 24 }}>
          {loading ? <p style={{ textAlign:'center', color:'var(--text-muted)' }}>Loading photos...</p> : photos.length === 0 ? <p style={{ textAlign:'center', color:'var(--text-muted)' }}>No photos uploaded for this task.</p> : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:16 }}>
              {photos.map(p => (
                <div key={p.id} style={{ border:'1px solid var(--border-glass-hover)', borderRadius:'var(--radius-sm)', overflow:'hidden', background:'var(--surface-1)' }}>
                  <img src={`http://localhost:8080/api/photos/${p.id}`} alt={p.fileName} style={{ width:'100%', height:160, objectFit:'cover', display:'block' }} />
                  <div style={{ padding:10, fontSize:'0.75rem', color:'var(--text-secondary)' }}>
                    <div><strong>By:</strong> {p.uploaderName}</div>
                    <div><strong>Date:</strong> {new Date(p.uploadDate).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab: Task Board ────────────────────────────────────── */
function TaskBoard({ tasks, projects, employees, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [form, setForm] = useState({ projectId:'', assignedEmployeeId:'', taskDescription:'', dueDate:'' });
  const [err, setErr] = useState('');
  const [photoTask, setPhotoTask] = useState(null);
  const handleAdd = async (e) => {
    e.preventDefault(); setErr('');
    const p = projects.find(x => String(x.id) === String(form.projectId));
    const emp = employees.find(x => String(x.id) === String(form.assignedEmployeeId));
    try { await createTask({...form, projectName: p?.name||'', employeeName: emp?.name||emp?.email||''}); onRefresh(); setForm({projectId:'',assignedEmployeeId:'',taskDescription:'',dueDate:''}); success('Task assigned.'); }
    catch { setErr('Failed to assign task.'); showErr('Could not assign task.'); }
  };
  const handleDel = async (id) => {
    try { await deleteTask(id); onRefresh(); success('Task deleted.'); }
    catch { showErr('Could not delete task.'); }
  };
  return (
    <div>
      {photoTask && <PhotoGalleryModal task={photoTask} onClose={() => setPhotoTask(null)} />}
      <div className="add-project-card light-card">
        <h3>Assign Task</h3><ErrBox msg={err}/>
        <form onSubmit={handleAdd} style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <select style={inputStyle} value={form.projectId} onChange={e=>setForm({...form,projectId:e.target.value})} required><option value="">Project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select style={inputStyle} value={form.assignedEmployeeId} onChange={e=>setForm({...form,assignedEmployeeId:e.target.value})} required><option value="">Assign To</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name||e.email}</option>)}</select>
          <input style={{...inputStyle, flex:'2 1 250px'}} placeholder="Task Description" required value={form.taskDescription} onChange={e=>setForm({...form,taskDescription:e.target.value})}/>
          <input style={inputStyle} type="date" required value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/>
          <button className="add-btn" type="submit">+ Assign</button>
        </form>
      </div>
      <div className="table-wrapper">
        <table className="project-table light-table">
          <thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{tasks.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:30}}>No tasks assigned.</td></tr> : tasks.map(t=><tr key={t.id}>
            <td style={{fontWeight:600}}>{t.taskDescription}</td><td>{t.projectName}</td><td>{t.employeeName}</td><td>{t.dueDate}</td><td><Badge status={t.status.replace('_',' ')}/></td>
            <td style={{ display:'flex', gap:6 }}>
              <button className="add-btn" style={{ padding:'5px 10px', fontSize:'0.75rem', margin:0, background:'var(--surface-3)', color:'var(--text-primary)', border:'1px solid var(--border-glass-hover)' }} onClick={() => setPhotoTask(t)}>🖼️ Photos</button>
              <InlineConfirm label="Remove" onConfirm={() => handleDel(t.id)} />
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Tab: Equipment Fleet ───────────────────────────────── */
function EquipmentFleet({ equipment, projects, employees, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [form, setForm] = useState({ name:'', type:'Excavator', currentProjectId:'' });
  const [err, setErr] = useState('');
  const handleAdd = async (e) => {
    e.preventDefault(); setErr('');
    const p = projects.find(x => String(x.id) === String(form.currentProjectId));
    try { await addEquipment({...form, projectName: p?.name||null, currentProjectId: form.currentProjectId ? parseInt(form.currentProjectId) : null}); onRefresh(); setForm({name:'',type:'Excavator',currentProjectId:''}); success('Equipment logged.'); }
    catch { setErr('Failed to add equipment.'); showErr('Could not log equipment.'); }
  };
  const handleAssign = async (id, empId) => {
    const emp = employees.find(e => String(e.id) === String(empId));
    try { await updateEquipment(id, { assignedEmployeeId: empId ? parseInt(empId) : null, assignedEmployeeName: emp?.name || emp?.email || null }); onRefresh(); success('Assignment updated.'); }
    catch { showErr('Could not assign equipment.'); }
  };
  const handleDate = async (id, date) => {
    try { await updateEquipment(id, { lastMaintenanceDate: date || null }); onRefresh(); success('Maintenance date updated.'); }
    catch { showErr('Could not update date.'); }
  };
  const handleStatusChange = async (id, status) => {
    try { await updateEquipment(id, { status }); onRefresh(); success('Status updated.'); }
    catch { showErr('Could not update equipment status.'); }
  };
  const handleDel = async (id) => {
    try { await deleteEquipment(id); onRefresh(); success('Equipment removed.'); }
    catch { showErr('Could not remove equipment.'); }
  };
  return (
    <div>
      <div className="add-project-card light-card">
        <h3>Log Machinery</h3><ErrBox msg={err}/>
        <form onSubmit={handleAdd} style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <input style={inputStyle} placeholder="Equipment Name (e.g. JCB XYZ)" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <select style={inputStyle} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Excavator</option><option>Crane</option><option>Mixer</option><option>Truck</option><option>Other</option></select>
          <select style={inputStyle} value={form.currentProjectId} onChange={e=>setForm({...form,currentProjectId:e.target.value})}><option value="">Available (Unassigned)</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button className="add-btn" type="submit">+ Log Asset</button>
        </form>
      </div>
      <div className="table-wrapper">
        <table className="project-table light-table">
          <thead><tr><th>Name</th><th>Type</th><th>Location</th><th>Assignee</th><th>Maintenance</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{equipment.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:30}}>No equipment logged.</td></tr> : equipment.map(eq=><tr key={eq.id}>
            <td style={{fontWeight:600}}>{eq.name}</td><td>{eq.type}</td><td style={{color:'var(--text-secondary)'}}>{eq.projectName || 'Warehouse'}</td>
            <td>
              <select style={{padding:'4px 8px', fontSize:'0.75rem', borderRadius:4, border:'1px solid var(--border-glass)'}} value={eq.assignedEmployeeId || ''} onChange={e => handleAssign(eq.id, e.target.value)}>
                <option value="">Unassigned</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>)}
              </select>
            </td>
            <td>
              <input type="date" style={{padding:'4px 8px', fontSize:'0.75rem', borderRadius:4, border:'1px solid var(--border-glass)', width: 110}} value={eq.lastMaintenanceDate || ''} onChange={e => handleDate(eq.id, e.target.value)} />
            </td>
            <td><Badge status={eq.status.replace('_',' ')}/></td>
            <td style={{ display:'flex', gap:6, alignItems:'center' }}>
              <select style={{padding:'4px 8px', fontSize:'0.75rem', borderRadius:4, border:'1px solid var(--border-glass)'}} value={eq.status} onChange={e => handleStatusChange(eq.id, e.target.value)}>
                <option value="AVAILABLE">Available</option><option value="IN_USE">In Use</option><option value="MAINTENANCE">Maintenance</option>
              </select>
              <InlineConfirm label="Remove" onConfirm={() => handleDel(eq.id)} />
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}



/* ─── Tab: DUDBC Updates (Province / District) ─────────────.*/
const LS_DUDBC_FILTERS = 'rns-dudbc-filters';
const LS_DUDBC_READ = 'rns-dudbc-read-ids';

function loadDudbcFilters() {
  try {
    const raw = localStorage.getItem(LS_DUDBC_FILTERS);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

function loadReadIdsSet() {
  try {
    const raw = localStorage.getItem(LS_DUDBC_READ);
    if (raw) return new Set(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return new Set();
}

const NEPAL_PROVINCES = {
  'Koshi': ['Taplejung','Panchthar','Ilam','Jhapa','Morang','Sunsari','Dhankuta','Terhathum','Sankhuwasabha','Bhojpur','Solukhumbu','Okhaldhunga','Khotang','Udayapur'],
  'Madhesh': ['Saptari','Siraha','Dhanusha','Mahottari','Sarlahi','Rautahat','Bara','Parsa'],
  'Bagmati': ['Sindhuli','Ramechhap','Dolakha','Sindhupalchok','Kavrepalanchok','Lalitpur','Bhaktapur','Kathmandu','Nuwakot','Rasuwa','Dhading','Makwanpur','Chitwan'],
  'Gandaki': ['Gorkha','Manang','Mustang','Myagdi','Kaski','Lamjung','Tanahu','Nawalpur','Syangja','Parbat','Baglung'],
  'Lumbini': ['Rukum East','Rolpa','Pyuthan','Gulmi','Arghakhanchi','Palpa','Nawalparasi','Rupandehi','Kapilvastu','Dang','Banke','Bardiya'],
  'Karnali': ['Dolpa','Mugu','Humla','Jumla','Kalikot','Dailekh','Jajarkot','Rukum West','Salyan','Surkhet'],
  'Sudurpaschim': ['Bajura','Bajhang','Achham','Doti','Kailali','Dadeldhura','Baitadi','Darchula','Kanchanpur'],
};

function DudbcUpdates() {
  const init = loadDudbcFilters();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [lastFetched, setLastFetched] = useState(null);
  const [province, setProvince] = useState(init.province || '');
  const [district, setDistrict] = useState(init.district || '');
  const [typeFilter, setTypeFilter] = useState(init.typeFilter || 'All');
  const [sourceFilter, setSourceFilter] = useState(init.sourceFilter || 'All');
  const [readIds, setReadIds] = useState(loadReadIdsSet);
  const [hideRead, setHideRead] = useState(false);

  const noticeKey = (n, i) => String(n.id ?? n.url ?? n.title ?? i);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_DUDBC_FILTERS,
        JSON.stringify({ province, district, typeFilter, sourceFilter })
      );
    } catch {
      /* ignore */
    }
  }, [province, district, typeFilter, sourceFilter]);

  const markRead = (key) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem(LS_DUDBC_READ, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const SOURCE_TABS = [
    { code:'All',   label:'All Sources', icon:'🌐' },
    { code:'DUDBC', label:'DUDBC',       icon:'🏛' },
    { code:'PPMO',  label:'PPMO',        icon:'📋' },
    { code:'DoR',   label:'Dept. of Roads', icon:'🛣' },
    { code:'MoUD',  label:'Ministry of Urban Dev.', icon:'🏙' },
  ];

  const SOURCE_COLORS = {
    DUDBC: { bg:'rgba(16,185,129,.1)',  color:'#065f46', border:'rgba(16,185,129,.3)' },
    PPMO:  { bg:'rgba(139,92,246,.1)',  color:'#5b21b6', border:'rgba(139,92,246,.3)' },
    DoR:   { bg:'rgba(239,68,68,.1)',   color:'#991b1b', border:'rgba(239,68,68,.3)'  },
    MoUD:  { bg:'rgba(59,130,246,.1)',  color:'#1e40af', border:'rgba(59,130,246,.3)' },
  };

  const loadNotices = async (prov = province, dist = district, src = sourceFilter) => {
    setLoading(true); setErr(''); setMsg('');
    try {
      const data = await fetchDudbcNotices(prov, dist, src === 'All' ? '' : src);
      setNotices(Array.isArray(data) ? data : (data.items || data.all || []));
      if (data.message) setMsg(data.message);
      setLastFetched(new Date().toLocaleTimeString());
    } catch {
      setErr('Could not fetch news. Check internet and retry.');
    } finally { setLoading(false); }
  };

  // Intentionally run once on mount; filters call loadNotices explicitly.
  useEffect(() => { loadNotices(); }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount-only fetch

  const districts = province ? (NEPAL_PROVINCES[province] || []) : [];
  const handleProvince = (v) => { setProvince(v); setDistrict(''); };
  const handleSearch   = () => loadNotices(province, district, sourceFilter);

  const switchSource = (code) => {
    setSourceFilter(code);
    loadNotices(province, district, code);
  };

  const typeColor = (type) => type === 'Tender'
    ? { bg:'rgba(245,158,11,.12)', color:'#b45309', border:'rgba(245,158,11,.3)' }
    : { bg:'rgba(59,130,246,.12)', color:'#1d4ed8', border:'rgba(59,130,246,.3)' };

  const visible = useMemo(() => {
    let v = typeFilter === 'All' ? notices : notices.filter((n) => n.type === typeFilter);
    if (hideRead) v = v.filter((n, i) => !readIds.has(noticeKey(n, i)));
    return v;
  }, [notices, typeFilter, hideRead, readIds]);

  return (
    <div>
      {/* Header */}
      <div style={{ background:'var(--surface-1)', padding:'20px 24px', borderRadius:'var(--radius-md)', border:'1px solid var(--border-glass-hover)', boxShadow:'var(--shadow-sm)', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:'1.15rem', color:'var(--brand-dark)' }}>📰 Nepal Construction &amp; Tender News</div>
            <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:3 }}>
              {lastFetched && `Refreshed: ${lastFetched} · `}
              {visible.length > 0 && `${visible.length} result${visible.length!==1?'s':''} from `}
              DUDBC · PPMO · Dept. of Roads · Ministry of Urban Dev.
            </div>
          </div>
          <button onClick={handleSearch} disabled={loading} style={{ padding:'10px 22px', background:'linear-gradient(135deg,var(--brand-cyan),var(--brand-green))', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', fontWeight:700, cursor:'pointer' }}>
            {loading ? '⟳ Loading…' : '⟳ Refresh All'}
          </button>
        </div>

        {/* Source tabs */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {SOURCE_TABS.map(st => (
            <button key={st.code} onClick={() => switchSource(st.code)} style={{
              padding:'7px 16px', borderRadius:999, cursor:'pointer',
              fontWeight:700, fontSize:'0.82rem',
              background: sourceFilter === st.code ? 'linear-gradient(135deg,var(--brand-cyan),var(--brand-green))' : 'var(--surface-0)',
              color: sourceFilter === st.code ? '#fff' : 'var(--text-secondary)',
              boxShadow: sourceFilter === st.code ? 'var(--shadow-sm)' : 'none',
              border: sourceFilter === st.code ? '1px solid transparent' : '1px solid var(--border-glass-hover)',
              transition:'all .2s',
            }}>{st.icon} {st.label}</button>
          ))}
        </div>

        {/* Location + type filters */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div style={{ flex:'1 1 160px' }}>
            <div style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase' }}>Province</div>
            <select style={{ width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-glass-hover)', fontSize:'0.9rem', background:'var(--input-bg)', color:'var(--text-primary)' }}
              value={province} onChange={e => handleProvince(e.target.value)}>
              <option value="">All Provinces</option>
              {Object.keys(NEPAL_PROVINCES).map(p => <option key={p} value={p}>{p} Province</option>)}
            </select>
          </div>
          <div style={{ flex:'1 1 160px' }}>
            <div style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase' }}>District</div>
            <select style={{ width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-glass-hover)', fontSize:'0.9rem', background:'var(--input-bg)', color:'var(--text-primary)' }}
              value={district} onChange={e => setDistrict(e.target.value)} disabled={!province}>
              <option value="">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ flex:'1 1 140px' }}>
            <div style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase' }}>Type</div>
            <select style={{ width:'100%', padding:'10px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-glass-hover)', fontSize:'0.9rem', background:'var(--input-bg)', color:'var(--text-primary)' }}
              value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="All">All Types</option>
              <option value="Tender">Tenders Only</option>
              <option value="Notice">Notices Only</option>
            </select>
          </div>
          <button onClick={handleSearch} disabled={loading} style={{ padding:'10px 22px', background:'var(--brand-dark)', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            Search DUDBC
          </button>
        </div>
        <label style={{ marginTop:14, display:'flex', alignItems:'center', gap:10, fontSize:'0.86rem', fontWeight:600, color:'var(--text-secondary)', cursor:'pointer' }}>
          <input type="checkbox" checked={hideRead} onChange={(e) => setHideRead(e.target.checked)} />
          Hide notices marked as read ({readIds.size} stored on this device)
        </label>
      </div>

      {msg && <div style={{ padding:'12px 16px', background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', borderRadius:8, marginBottom:16, fontSize:'0.88rem', color:'#b45309' }}>ℹ {msg}</div>}
      <ErrBox msg={err} />

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
          <div style={{ fontSize:'1.8rem', marginBottom:12 }}>📰</div>
          <div style={{ fontWeight:700, marginBottom:6 }}>Reading DUDBC notifications…</div>
          <div style={{ fontSize:'0.85rem' }}>Fetching headlines &amp; summaries from dudbc.gov.np{province && ` for ${province} Province`}{district && ` / ${district}`}</div>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
          No {typeFilter !== 'All' ? typeFilter.toLowerCase()+'s' : 'results'} found{province && ` for ${province}${district ? ' / '+district : ''}`}.<br/>
          <span style={{ fontSize:'0.85rem' }}>Try a different province or check back later for new postings.</span>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {visible.map((n, i) => {
            const tc = typeColor(n.type);
            const k = noticeKey(n, i);
            const isRead = readIds.has(k);
            const isNew = i < 3;
            return (
              <div key={k} style={{
                background:'var(--surface-1)',
                borderRadius:'var(--radius-md)',
                border: isNew ? `2px solid ${tc.color}30` : '1px solid var(--border-glass-hover)',
                boxShadow: isNew ? `0 4px 16px ${tc.color}18` : 'var(--shadow-sm)',
                overflow:'hidden',
                opacity: isRead ? 0.72 : 1,
                transition: 'opacity 0.2s ease',
              }}>
                {/* Top accent strip for latest */}
                {isNew && <div style={{ height:3, background:`linear-gradient(90deg,${tc.color},${tc.color}40)` }} />}

                <div style={{ padding:'20px 24px' }}>
                  {/* Header row: badge + source badge + date */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <span style={{ padding:'3px 12px', borderRadius:999, fontSize:'0.72rem', fontWeight:800, background:tc.bg, color:tc.color, border:`1px solid ${tc.border}`, letterSpacing:'0.5px', textTransform:'uppercase' }}>{n.type}</span>
                    {/* Source badge */}
                    {n.source && (() => { const sc = SOURCE_COLORS[n.source] || typeColor('Notice'); return (
                      <span style={{ padding:'3px 10px', borderRadius:999, fontSize:'0.68rem', fontWeight:700, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
                        {SOURCE_TABS.find(s=>s.code===n.source)?.icon || ''} {n.source}
                      </span>
                    ); })()}
                    {isNew && <span style={{ padding:'2px 10px', borderRadius:999, fontSize:'0.68rem', fontWeight:700, background:'rgba(239,68,68,.1)', color:'#dc2626', border:'1px solid rgba(239,68,68,.25)' }}>🔴 Latest</span>}
                    {n.date && <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginLeft:'auto' }}>📅 {n.date}</span>}
                  </div>

                  {/* HEADLINE */}
                  <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ display:'block', textDecoration:'none', marginBottom: n.summary ? 12 : 0 }}>
                    <div style={{
                      fontFamily:'var(--heading)', fontWeight:800,
                      fontSize: isNew ? '1.15rem' : '1rem',
                      color:'var(--brand-dark)', lineHeight:1.4,
                      letterSpacing:'-0.2px',
                    }}>
                      {n.title}
                    </div>
                  </a>

                  {/* SUMMARY */}
                  {n.summary && (
                    <div style={{
                      fontSize:'0.88rem', color:'var(--text-secondary)',
                      lineHeight:1.65, borderTop:'1px solid var(--border-glass)',
                      paddingTop:12, marginTop:4,
                    }}>
                      {n.summary}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, padding:'12px 24px', background:'rgba(0,0,0,0.02)', borderTop:'1px solid var(--border-glass)' }}>
                  <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>🌐 dudbc.gov.np</span>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginLeft:'auto' }}>
                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => markRead(k)}
                        style={{
                          fontSize:'0.8rem', fontWeight:700, padding:'6px 14px', borderRadius:6,
                          border:'1px solid var(--border-glass-hover)', background:'var(--surface-2)', color:'var(--text-primary)', cursor:'pointer',
                        }}
                      >
                        Mark read
                      </button>
                    )}
                    <a href={n.url} target="_blank" rel="noopener noreferrer" style={{
                      fontSize:'0.82rem', color: tc.color, fontWeight:700, textDecoration:'none',
                      padding:'6px 16px', borderRadius:6, background:tc.bg, border:`1px solid ${tc.border}`,
                      display:'flex', alignItems:'center', gap:4,
                    }}>
                      Read Full Notice →
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Tab: Material Requests (Admin Approval) ─────────────── */
function MaterialRequests({ requests, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return requests;
    return requests.filter((r) =>
      `${r.requesterName || ''} ${r.projectName || ''} ${r.materialName || ''} ${r.status || ''}`.toLowerCase().includes(needle)
    );
  }, [requests, q]);

  const handle = async (id, status) => {
    try { await updateMaterialRequestStatus(id, status); onRefresh(); success(`Request ${status.toLowerCase()}`); }
    catch { setErr('Failed to update.'); showErr('Could not update request.'); }
  };

  return (
    <div>
      <ErrBox msg={err} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          style={{ ...inputStyle, flex: '1 1 220px', maxWidth: 420 }}
          placeholder="Search by employee, project, material, or status…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search material requests"
        />
        <button
          type="button"
          className="add-btn"
          style={{ margin: 0 }}
          disabled={!requests.length}
          onClick={() =>
            downloadCsv(
              requests,
              `material-requests-${new Date().toISOString().slice(0, 10)}.csv`,
              ['requestDate', 'requesterName', 'projectName', 'materialName', 'quantityRequested', 'unit', 'status']
            )
          }
        >
          Export CSV
        </button>
      </div>
      <div className="table-wrapper">
        <table className="project-table light-table">
          <thead><tr><th>Date</th><th>Requester</th><th>Project</th><th>Material</th><th>Qty</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>{requests.length === 0 ? 'No requests.' : 'No matches.'}</td></tr>
              : filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>{r.requestDate ? new Date(r.requestDate).toLocaleDateString() : '—'}</td>
                  <td style={{ fontWeight:600 }}>{r.requesterName || '—'}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{r.projectName || '—'}</td>
                  <td style={{ color:'var(--brand-cyan-dark)', fontWeight:700 }}>{r.materialName}</td>
                  <td>{r.quantityRequested} {r.unit}</td>
                  <td><Badge status={r.status} /></td>
                  <td style={{ display:'flex', gap:6 }}>
                    {r.status === 'PENDING' && <>
                      <button className="add-btn" style={{ padding:'5px 10px', fontSize:'0.78rem' }} onClick={() => handle(r.id,'APPROVED')}>✓ Approve</button>
                      <button className="delete-btn" onClick={() => handle(r.id,'REJECTED')}>✗ Reject</button>
                    </>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main AdminDashboard ────────────────────────────────── */
const TABS = ['Overview','Projects','Employees','Material Requests','Materials','Timesheets','Leave Requests','Budgets','Task Board','Equipment Fleet','DUDBC Updates'];

export default function AdminDashboard() {
  const navigate   = useNavigate();
  const [tab, setTab]           = useState('Overview');
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [leaves, setLeaves]     = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const [p, e, m, t, l, b, tk, eq, mr, al] = await Promise.all([
        fetchProjects(), fetchEmployees(), fetchMaterials(), fetchAllTimesheets(), fetchAllLeaves(),
        fetchBudgets(), fetchAllTasks(), fetchEquipment(), fetchAllMaterialRequests(), fetchBudgetAlerts()
      ]);
      setProjects(p||[]); setEmployees(e||[]); setMaterials(m||[]);
      setTimesheets(t||[]); setLeaves(l||[]);
      setBudgets(b||[]); setTasks(tk||[]); setEquipment(eq||[]); setMaterialRequests(mr||[]); setAlerts(al||[]);
    } catch { setErr('Could not reach backend. Please start Spring Boot.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;

  return (
    <div className="admin-container fade-in">
      <header className="admin-header light-header">
        <div>
          <h1 style={{ color: 'var(--brand-dark)' }}>Admin Dashboard</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.88rem', marginTop:6 }}>
            Logged in as <strong style={{ color:'var(--brand-cyan-dark)' }}>{getName() || getEmail()}</strong>
          </p>
        </div>
        <button className="logout-btn" onClick={() => { clearSession(); navigate('/login'); }}>Logout</button>
      </header>

      {err && <ErrBox msg={err} />}
      {alerts.length > 0 && (
        <div className="animate-fade-up" style={{ padding:'16px 24px', background:'rgba(239,68,68,.1)', borderLeft:'4px solid #dc2626', borderRadius:8, marginBottom:24, boxShadow:'var(--shadow-sm)' }}>
          <div style={{ fontWeight:800, color:'#dc2626', marginBottom:6, fontSize:'1.05rem' }}>⚠️ Budget Utilization Alert</div>
          <ul style={{ margin:0, paddingLeft:20, color:'#991b1b', fontSize:'0.9rem', lineHeight:1.6 }}>
            {alerts.map(a => (
              <li key={a.id}>
                <strong>{a.projectName} ({a.category})</strong> has used ₹{(a.spentAmount||0).toLocaleString()} out of ₹{(a.allocatedAmount||0).toLocaleString()} 
                {' '}(<strong style={{ color:'#dc2626' }}>{((a.spentAmount / a.allocatedAmount) * 100).toFixed(1)}%</strong> consumed)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', gap:6, marginBottom:32, overflowX:'auto', paddingBottom:4,
        borderBottom:'2px solid var(--border-glass)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'10px 20px', border:'none', borderRadius:'var(--radius-sm)',
            cursor:'pointer', fontWeight:700, fontSize:'0.9rem', whiteSpace:'nowrap',
            fontFamily:'var(--sans)',
            background: tab===t ? 'linear-gradient(135deg,var(--brand-cyan),var(--brand-green))' : 'var(--surface-0)',
            color: tab===t ? '#ffffff' : 'var(--text-secondary)',
            boxShadow: tab===t ? 'var(--shadow-sm)' : 'none',
            transition:'all .2s',
            position:'relative',
          }}>
            {t}
            {t==='Leave Requests' && pendingLeaves > 0 &&
              <span style={{ position:'absolute', top:-6, right:-6, background:'#ef4444', color:'#fff',
                borderRadius:999, width:18, height:18, fontSize:'0.7rem', display:'flex',
                alignItems:'center', justifyContent:'center', fontWeight:800, border:'2px solid #fff' }}>{pendingLeaves}</span>}
            {t==='Material Requests' && materialRequests.filter(r => r.status === 'PENDING').length > 0 &&
              <span style={{ position:'absolute', top:-6, right:-6, background:'#eab308', color:'#fff',
                borderRadius:999, width:18, height:18, fontSize:'0.7rem', display:'flex',
                alignItems:'center', justifyContent:'center', fontWeight:800, border:'2px solid #fff' }}>{materialRequests.filter(r => r.status === 'PENDING').length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign:'center', color:'var(--text-muted)', padding:40 }}>Loading data from database…</p>
      ) : (
        <>
          {tab === 'Overview'       && <Overview projects={projects} employees={employees} materials={materials} leaves={leaves} />}
          {tab === 'Projects'       && <Projects projects={projects} onRefresh={load} />}
          {tab === 'Employees'      && <Employees employees={employees} onRefresh={load} />}
          {tab === 'Material Requests' && <MaterialRequests requests={materialRequests} onRefresh={load} />}
          {tab === 'Materials'      && <Materials materials={materials} projects={projects} onRefresh={load} />}
          {tab === 'Timesheets'     && <Timesheets timesheets={timesheets} />}
          {tab === 'Leave Requests' && <Leaves leaves={leaves} onRefresh={load} />}
          {tab === 'Budgets'        && <Budgets budgets={budgets} projects={projects} onRefresh={load} />}
          {tab === 'Task Board'     && <TaskBoard tasks={tasks} projects={projects} employees={employees} onRefresh={load} />}
          {tab === 'Equipment Fleet'&& <EquipmentFleet equipment={equipment} projects={projects} employees={employees} onRefresh={load} />}
          {tab === 'DUDBC Updates'  && <DudbcUpdates />}
        </>
      )}
    </div>
  );
}