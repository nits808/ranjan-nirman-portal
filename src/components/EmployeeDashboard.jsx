import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchProjects,
  fetchMyTimesheets, submitTimesheet, deleteTimesheet,
  fetchMyLeaves, submitLeave, deleteLeave,
  fetchEmployeeByEmail,
  fetchMyTasks, updateTaskStatus,
  fetchBudgetsByProject,
  getEmail, getName, getEmployeeId, clearSession,
} from '../api';
import { useToast } from '../context/ToastContext';
import { parseLocalDate, isTaskOverdue, isTaskDueToday } from '../utils/dateUtils';
import DashboardSkeleton from './DashboardSkeleton';

// ─── Shared Styles (Light Context) ─────────────────────────
const page = {
  minHeight: 'calc(100vh - 78px)',
  padding: '40px 32px 60px',
  background: 'var(--bg-main)',
};
const inputStyle = {
  flex: '1 1 160px', padding: '12px 16px',
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
  fontSize: '0.9rem', fontFamily: 'var(--sans)', outline: 'none',
  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
};
const cardStyle = (accent) => ({
  padding: '28px', background: 'var(--surface-1)',
  border: '1px solid var(--border-glass-hover)', borderTop: `4px solid ${accent}`,
  borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', textAlign: 'center',
});

const Badge = ({ status }) => {
  const map = {
    'In Progress': ['rgba(245,158,11,.15)', 'var(--brand-yellow-dark)'],
    Completed:     ['rgba(16,185,129,.15)',  'var(--brand-green-dark)'],
    Planning:      ['rgba(59,130,246,.15)',  'var(--brand-cyan-dark)'],
    PENDING:       ['rgba(245,158,11,.15)', 'var(--brand-yellow-dark)'],
    APPROVED:      ['rgba(16,185,129,.15)',  'var(--brand-green-dark)'],
    REJECTED:      ['rgba(239,68,68,.15)',   '#dc2626'],
  };
  const [bg, color] = map[status] || ['rgba(0,0,0,.04)', 'var(--text-muted)'];
  return (
    <span style={{ padding:'4px 12px', borderRadius:999, fontSize:'0.75rem',
      fontWeight:700, background:bg, color, border:`1px solid ${color}40` }}>
      {status}
    </span>
  );
};
const ErrBox  = ({ m }) => m ? <div style={{ color:'#dc2626', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', padding:'12px 16px', borderRadius:8, marginBottom:16, fontSize:'0.88rem', fontWeight:500 }}>⚠ {m}</div> : null;
// ─── Tab: Overview ─────────────────────────────────────────
function Overview({ profile, projects, timesheets, leaves, tasks }) {
  const now = new Date();
  const thisMonthSheets = timesheets.filter((t) => {
    if (!t.workDate) return false;
    const d = parseLocalDate(t.workDate);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totHours = thisMonthSheets.reduce((s, t) => s + (t.hoursWorked || 0), 0);
  const active = projects.filter((p) => p.status === 'In Progress').length;
  const pendLeave = leaves.filter((l) => l.status === 'PENDING').length;
  const overdue = tasks.filter((t) => isTaskOverdue(t.dueDate, t.status));
  const dueToday = tasks.filter((t) => isTaskDueToday(t.dueDate, t.status));

  const stats = [
    { label: 'Active Sites', value: active, color: 'var(--brand-cyan-dark)', sub: 'In Progress' },
    { label: 'Hours This Month', value: `${totHours.toFixed(1)} hrs`, color: 'var(--brand-green-dark)', sub: 'Logged this calendar month' },
    { label: 'Pending Leaves', value: pendLeave, color: 'var(--brand-yellow-dark)', sub: 'Awaiting approval' },
    { label: 'Pending Dues', value: `₹${(profile?.pendingDues || 0).toLocaleString()}`, color: profile?.pendingDues > 0 ? '#dc2626' : 'var(--brand-green-dark)', sub: 'Outstanding amount' },
  ];

  return (
    <div>
      {(overdue.length > 0 || dueToday.length > 0 || pendLeave > 0) && (
        <div
          style={{
            marginBottom: 28,
            padding: '22px 24px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-glass-hover)',
            background: 'linear-gradient(135deg, rgba(77,184,204,.08), rgba(164,210,51,.06))',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--brand-dark)', marginBottom: 14, fontFamily: 'var(--heading)' }}>
            Today at a glance
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
            {overdue.length > 0 && (
              <li>
                <strong style={{ color: '#dc2626' }}>{overdue.length} overdue task(s)</strong> — open <strong>My Tasks</strong> to update status.
              </li>
            )}
            {dueToday.length > 0 && (
              <li>
                <strong style={{ color: 'var(--brand-cyan-dark)' }}>{dueToday.length} due today</strong> — stay on top of site commitments.
              </li>
            )}
            {pendLeave > 0 && (
              <li>
                <strong style={{ color: 'var(--brand-yellow-dark)' }}>{pendLeave} leave request(s)</strong> still pending approval.
              </li>
            )}
          </ul>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:20, marginBottom:32 }}>
        {stats.map(s => (
          <div key={s.label} style={cardStyle(s.color)}>
            <div style={{ fontSize:'0.78rem', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'var(--text-secondary)', marginBottom:10 }}>{s.label}</div>
            <div style={{ fontSize:'2.4rem', fontWeight:800, color:s.color, fontFamily:'var(--heading)', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginTop:8 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {profile && (
        <div style={{ padding:'32px', background:'var(--surface-1)', border:'1px solid var(--border-glass-hover)', borderRadius:'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontWeight:800, fontSize: '1.25rem', marginBottom:20, fontFamily:'var(--heading)', color:'var(--brand-dark)' }}>My Profile</div>
          {[
            ['Name', profile.name],
            ['Email', profile.email],
            ['Phone', profile.phone || '—'],
            ['Department', profile.department || '—'],
            ['Monthly Salary', `₹${(profile.salary||0).toLocaleString()}`],
          ].map(([k,v]) => (
            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid rgba(0,0,0,.05)' }}>
              <span style={{ color:'var(--text-secondary)', fontSize:'0.9rem', fontWeight:500 }}>{k}</span>
              <span style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'0.9rem' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: My Projects ──────────────────────────────────────
function MyProjects({ projects }) {
  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass-hover)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', textAlign: 'left' }}>
        <thead>
          <tr>{['Project','Location','Status'].map(h => (
            <th key={h} style={{ padding:'16px 20px', fontSize:'0.8rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-secondary)', borderBottom:'1px solid var(--border-glass-hover)', background:'rgba(0,0,0,0.02)' }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {projects.length === 0
            ? <tr><td colSpan={3} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No projects in the system.</td></tr>
            : projects.map(p => (
              <tr key={p.id}>
                <td style={{ padding:'16px 20px', fontWeight:700, color:'var(--text-primary)' }}>{p.name}</td>
                <td style={{ padding:'16px 20px', color:'var(--text-secondary)', fontSize:'0.9rem' }}>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.location)}`} target="_blank" rel="noopener noreferrer" style={{ color:'var(--brand-cyan-dark)', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                    📍 {p.location}
                  </a>
                </td>
                <td style={{ padding:'16px 20px' }}><Badge status={p.status} /></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Timesheets ───────────────────────────────────────
function Timesheets({ timesheets, projects, empId, empName, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [form, setForm] = useState({ projectId:'', projectName:'', workDate:'', hoursWorked:'', notes:'' });
  const [err, setErr] = useState('');
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault(); setErr('');
    const proj = projects.find(p => String(p.id) === String(form.projectId));
    try {
      await submitTimesheet({
        employeeId: parseInt(empId), employeeName: empName,
        projectId:  parseInt(form.projectId), projectName: proj?.name || '',
        workDate: form.workDate, hoursWorked: parseFloat(form.hoursWorked)||0, notes: form.notes,
      });
      setForm({ projectId:'', projectName:'', workDate:'', hoursWorked:'', notes:'' });
      success('Timesheet submitted');
      onRefresh();
    } catch { setErr('Failed to submit. Try again.'); showErr('Could not save timesheet'); }
  };

  const handleDel = async (id) => {
    try { await deleteTimesheet(id); onRefresh(); } catch { setErr('Failed to delete.'); }
  };

  const total = timesheets.reduce((s, t) => s + (t.hoursWorked||0), 0);

  return (
    <div>
      <div style={{ padding:'28px', background:'var(--surface-1)', border:'1px solid var(--border-glass-hover)', borderLeft:'4px solid var(--brand-cyan)', borderRadius:'var(--radius-md)', marginBottom:28, boxShadow:'var(--shadow-sm)' }}>
        <div style={{ fontWeight:800, fontSize:'1.15rem', marginBottom:16, color:'var(--brand-dark)' }}>Log Work Hours</div>
        <ErrBox m={err} />
        <form onSubmit={handleSubmit} style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
          <select style={inputStyle} value={form.projectId} onChange={f('projectId')} required>
            <option value="">Select Project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input style={inputStyle} type="date" value={form.workDate} onChange={f('workDate')} required />
          <input style={inputStyle} type="number" placeholder="Hours worked" step="0.5" min="0.5" max="24" value={form.hoursWorked} onChange={f('hoursWorked')} required />
          <input style={inputStyle} placeholder="Notes (optional)" value={form.notes} onChange={f('notes')} />
          <button type="submit" style={{ padding:'12px 28px', background:'linear-gradient(135deg,var(--brand-cyan),var(--brand-green))', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', fontWeight:800, cursor:'pointer', boxShadow:'0 4px 12px rgba(77,184,204,0.2)' }}>Submit</button>
        </form>
      </div>

      <div style={{ marginBottom:16, fontWeight:700, fontSize: '1.1rem', color:'var(--brand-cyan-dark)' }}>Total: {total.toFixed(1)} hours</div>
      <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass-hover)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', textAlign: 'left' }}>
          <thead>
            <tr>{['Project','Date','Hours','Notes',''].map(h => (
              <th key={h} style={{ padding:'14px 20px', fontSize:'0.8rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-secondary)', borderBottom:'1px solid var(--border-glass-hover)', background:'rgba(0,0,0,0.02)' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {timesheets.length === 0
              ? <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No timesheets yet.</td></tr>
              : timesheets.map(t => (
                <tr key={t.id}>
                  <td style={{ padding:'14px 20px', fontWeight:600, color:'var(--text-primary)' }}>{t.projectName || '—'}</td>
                  <td style={{ padding:'14px 20px', color:'var(--text-secondary)' }}>{t.workDate}</td>
                  <td style={{ padding:'14px 20px', fontWeight:800, color:'var(--brand-cyan-dark)' }}>{t.hoursWorked}</td>
                  <td style={{ padding:'14px 20px', color:'var(--text-secondary)', fontSize:'0.85rem' }}>{t.notes || '—'}</td>
                  <td style={{ padding:'14px 20px' }}><button onClick={() => handleDel(t.id)} style={{ background:'rgba(239,68,68,.1)', color:'#dc2626', border:'1px solid rgba(239,68,68,.2)', padding:'6px 14px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:'0.8rem' }}>Delete</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Leave Requests ───────────────────────────────────
function Leaves({ leaves, empId, empName, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [form, setForm] = useState({ startDate:'', endDate:'', reason:'' });
  const [err, setErr] = useState('');
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (ev) => {
    ev.preventDefault(); setErr('');
    try {
      await submitLeave({ employeeId: parseInt(empId), employeeName: empName, ...form });
      setForm({ startDate:'', endDate:'', reason:'' });
      success('Leave request submitted');
      onRefresh();
    } catch { setErr('Failed to submit. Try again.'); showErr('Could not submit leave'); }
  };

  const handleDel = async (id, status) => {
    if (status !== 'PENDING') { showErr('Only pending requests can be cancelled.'); return; }
    try { await deleteLeave(id); onRefresh(); } catch { setErr('Failed to cancel.'); }
  };

  return (
    <div>
      <div style={{ padding:'28px', background:'var(--surface-1)', border:'1px solid var(--border-glass-hover)', borderLeft:'4px solid var(--brand-green)', borderRadius:'var(--radius-md)', marginBottom:28, boxShadow:'var(--shadow-sm)' }}>
        <div style={{ fontWeight:800, fontSize:'1.15rem', marginBottom:16, color:'var(--brand-dark)' }}>Apply for Leave</div>
        <ErrBox m={err} />
        <form onSubmit={handleSubmit} style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ color:'var(--text-secondary)', fontSize:'0.85rem', fontWeight:600 }}>From:</label>
            <input style={inputStyle} type="date" value={form.startDate} onChange={f('startDate')} required />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ color:'var(--text-secondary)', fontSize:'0.85rem', fontWeight:600 }}>To:</label>
            <input style={inputStyle} type="date" value={form.endDate} onChange={f('endDate')} required />
          </div>
          <input style={{ ...inputStyle, flex:'1 1 300px' }} placeholder="Reason for leave" value={form.reason} onChange={f('reason')} required />
          <button type="submit" style={{ padding:'12px 28px', background:'linear-gradient(135deg,var(--brand-green),var(--brand-green-dark))', color:'#fff', border:'none', borderRadius:'var(--radius-sm)', fontWeight:800, cursor:'pointer', boxShadow:'0 4px 12px rgba(164,210,51,0.2)' }}>Apply</button>
        </form>
      </div>

      <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass-hover)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', textAlign: 'left' }}>
          <thead>
            <tr>{['From','To','Reason','Status',''].map(h => (
              <th key={h} style={{ padding:'14px 20px', fontSize:'0.8rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-secondary)', borderBottom:'1px solid var(--border-glass-hover)', background:'rgba(0,0,0,0.02)' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {leaves.length === 0
              ? <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No leave requests submitted.</td></tr>
              : leaves.map(l => (
                <tr key={l.id}>
                  <td style={{ padding:'14px 20px', color:'var(--text-primary)', fontWeight:600 }}>{l.startDate}</td>
                  <td style={{ padding:'14px 20px', color:'var(--text-primary)' }}>{l.endDate}</td>
                  <td style={{ padding:'14px 20px', fontSize:'0.9rem', color:'var(--text-secondary)' }}>{l.reason}</td>
                  <td style={{ padding:'14px 20px' }}><Badge status={l.status} /></td>
                  <td style={{ padding:'14px 20px' }}>
                    {l.status === 'PENDING' &&
                      <button onClick={() => handleDel(l.id, l.status)} style={{ background:'rgba(239,68,68,.1)', color:'#dc2626', border:'1px solid rgba(239,68,68,.2)', padding:'6px 14px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:'0.8rem' }}>Cancel</button>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: My Tasks ─────────────────────────────────────────
function MyTasks({ tasks, onRefresh }) {
  const { success, error: showErr } = useToast();
  const [err, setErr] = useState('');
  const handleUpdate = async (id, status) => {
    try {
      await updateTaskStatus(id, status);
      success('Task status updated');
      onRefresh();
    } catch {
      setErr('Failed to update status.');
      showErr('Could not update task');
    }
  };
  return (
    <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass-hover)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ padding: '20px', fontWeight: 800, borderBottom: '1px solid var(--border-glass-hover)', color: 'var(--brand-dark)' }}>Assigned Tasks</div>
      <ErrBox m={err} />
      <table style={{ width:'100%', borderCollapse:'collapse', textAlign: 'left' }}>
        <thead><tr>{['Task','Project','Due Date','Status','Action'].map(h => <th key={h} style={{ padding:'16px 20px', fontSize:'0.8rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-secondary)', borderBottom:'1px solid var(--border-glass-hover)', background:'rgba(0,0,0,0.02)' }}>{h}</th>)}</tr></thead>
        <tbody>
          {tasks.length === 0 ? <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No tasks assigned to you.</td></tr> : tasks.map(t => (
            <tr key={t.id}>
              <td style={{ padding:'16px 20px', fontWeight:700, color:'var(--text-primary)' }}>{t.taskDescription}</td>
              <td style={{ padding:'16px 20px', color:'var(--text-secondary)' }}>{t.projectName}</td>
              <td style={{ padding:'16px 20px', color: isTaskOverdue(t.dueDate, t.status) ? '#dc2626':'var(--text-secondary)' }}>{t.dueDate}</td>
              <td style={{ padding:'16px 20px' }}><Badge status={t.status.replace('_',' ')} /></td>
              <td style={{ padding:'16px 20px' }}>
                <select style={{ padding:'6px 12px', borderRadius:6, border:'1px solid var(--border-glass)', fontSize:'0.85rem' }} value={t.status} onChange={e => handleUpdate(t.id, e.target.value)}>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Project Budgets ──────────────────────────────────
function ProjectBudgets({ projects }) {
  const [selectedProject, setSelectedProject] = useState('');
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const loadBudgets = async (projId) => {
    setSelectedProject(projId);
    if (!projId) { setBudgets([]); return; }
    setLoading(true); setErr('');
    try { const b = await fetchBudgetsByProject(projId); setBudgets(b || []); }
    catch { setErr('Failed to load budgets for this project.'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ padding:'28px', background:'var(--surface-1)', border:'1px solid var(--border-glass-hover)', borderLeft:'4px solid var(--brand-yellow)', borderRadius:'var(--radius-md)', marginBottom:28, boxShadow:'var(--shadow-sm)' }}>
        <div style={{ fontWeight:800, fontSize:'1.15rem', marginBottom:16, color:'var(--brand-dark)' }}>Check Project Budget</div>
        <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem', marginBottom:16 }}>Review available funds before initiating material or equipment requests.</p>
        <ErrBox m={err} />
        <select style={{...inputStyle, width:'100%', maxWidth:400}} value={selectedProject} onChange={e => loadBudgets(e.target.value)}>
          <option value="">-- Choose a Project --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {selectedProject && (
        <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass-hover)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign: 'left' }}>
            <thead><tr>{['Category','Allocated','Spent','Remaining'].map(h => <th key={h} style={{ padding:'16px 20px', fontSize:'0.8rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'var(--text-secondary)', borderBottom:'1px solid var(--border-glass-hover)', background:'rgba(0,0,0,0.02)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} style={{ textAlign:'center', padding:32 }}>Loading...</td></tr> : budgets.length === 0 ? <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No budgets allocated for this project yet.</td></tr> : budgets.map(b => (
                <tr key={b.id}>
                  <td style={{ padding:'16px 20px', fontWeight:700 }}>{b.category}</td>
                  <td style={{ padding:'16px 20px', color:'var(--text-secondary)' }}>₹{b.allocatedAmount.toLocaleString()}</td>
                  <td style={{ padding:'16px 20px', color:'var(--brand-yellow-dark)' }}>₹{b.spentAmount.toLocaleString()}</td>
                  <td style={{ padding:'16px 20px', color: (b.allocatedAmount - b.spentAmount) < 0 ? '#dc2626' : 'var(--brand-green-dark)', fontWeight:800 }}>₹{(b.allocatedAmount - b.spentAmount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main EmployeeDashboard ────────────────────────────────
const EMP_TAB_KEY = 'rns-emp-tab';
const TABS = ['Overview', 'My Tasks', 'My Projects', 'Project Budgets', 'Timesheets', 'Leave Requests'];

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [tab, setTabState] = useState(() => {
    try {
      const s = localStorage.getItem(EMP_TAB_KEY);
      if (s && TABS.includes(s)) return s;
    } catch {
      /* ignore */
    }
    return 'My Tasks';
  });
  const setTab = (t) => {
    setTabState(t);
    try {
      localStorage.setItem(EMP_TAB_KEY, t);
    } catch {
      /* ignore */
    }
  };
  const [profile, setProfile]     = useState(null);
  const [projects, setProjects]   = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [leaves, setLeaves]       = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState('');

  const empId   = getEmployeeId();
  const empName = getName() || getEmail();

  const load = useCallback(async () => {
    setErr('');
    try {
      const [proj, ts, lv, prof, tks] = await Promise.all([
        fetchProjects(),
        empId ? fetchMyTimesheets(empId) : Promise.resolve([]),
        empId ? fetchMyLeaves(empId)     : Promise.resolve([]),
        fetchEmployeeByEmail(getEmail()),
        empId ? fetchMyTasks(empId)      : Promise.resolve([]),
      ]);
      setProjects(proj||[]); setTimesheets(ts||[]); setLeaves(lv||[]); setProfile(prof); setTasks(tks||[]);
    } catch { setErr('Could not reach backend. Please start Spring Boot.'); }
    finally { setLoading(false); }
  }, [empId]);

  useEffect(() => { load(); }, [load]);

  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;
  const overdueCount = useMemo(
    () => tasks.filter((t) => isTaskOverdue(t.dueDate, t.status)).length,
    [tasks]
  );

  return (
    <div style={page}>
      <div style={{ maxWidth:1000, margin:'0 auto' }} className="animate-fade-up">
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:36, paddingBottom:24, borderBottom:'1px solid var(--border-glass-hover)' }}>
          <div>
            <div style={{ fontFamily:'var(--heading)', fontSize:'clamp(1.6rem,3vw,2.2rem)', fontWeight:900, letterSpacing:'-0.5px', background:'linear-gradient(135deg,var(--brand-dark),var(--brand-cyan-dark))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Welcome back, {empName} 👋
            </div>
            <div style={{ color:'var(--text-secondary)', fontSize:'0.9rem', marginTop:6, fontWeight:500 }}>
              Ranjan Nirman Sewa — Employee Portal
            </div>
          </div>
          <button onClick={() => { clearSession(); navigate('/login'); }} style={{ padding:'10px 24px', background:'rgba(239,68,68,.1)', color:'#dc2626', border:'1px solid rgba(239,68,68,.2)', borderRadius:'var(--radius-sm)', cursor:'pointer', fontWeight:700, fontSize:'0.9rem' }}>Logout</button>
        </div>

        {err && <ErrBox m={err} />}

        {/* Tab bar */}
        <div style={{ display:'flex', gap:8, marginBottom:32, overflowX:'auto', paddingBottom:6, borderBottom:'2px solid var(--border-glass-hover)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'10px 22px', border:'none', borderRadius:'var(--radius-sm)',
              cursor:'pointer', fontWeight:700, fontSize:'0.9rem', whiteSpace:'nowrap',
              fontFamily:'var(--sans)',
              background: tab===t ? 'linear-gradient(135deg,var(--brand-cyan),var(--brand-green))' : 'var(--surface-1)',
              color: tab===t ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: tab===t ? 'var(--shadow-sm)' : 'none',
              transition:'all .2s', position:'relative',
            }}>
              {t}
              {t === 'My Tasks' && overdueCount > 0 && (
                <span style={{ position:'absolute', top:-6, right:-6, background:'#dc2626', color:'#fff',
                  borderRadius:999, minWidth:18, height:18, padding:'0 5px', fontSize:'0.7rem', display:'flex',
                  alignItems:'center', justifyContent:'center', fontWeight:800, border:'2px solid #fff' }}>{overdueCount}</span>
              )}
              {t==='Leave Requests' && pendingLeaves > 0 &&
                <span style={{ position:'absolute', top:-6, right:-6, background:'#f59e0b', color:'#fff',
                  borderRadius:999, width:18, height:18, fontSize:'0.7rem', display:'flex',
                  alignItems:'center', justifyContent:'center', fontWeight:800, border:'2px solid #fff' }}>{pendingLeaves}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <DashboardSkeleton rows={5} />
        ) : (
          <>
            {tab === 'Overview'       && <Overview profile={profile} projects={projects} timesheets={timesheets} leaves={leaves} tasks={tasks} />}
            {tab === 'My Tasks'       && <MyTasks tasks={tasks} onRefresh={load} />}
            {tab === 'My Projects'    && <MyProjects projects={projects} />}
            {tab === 'Project Budgets'&& <ProjectBudgets projects={projects} />}
            {tab === 'Timesheets'     && <Timesheets timesheets={timesheets} projects={projects} empId={empId} empName={empName} onRefresh={load} />}
            {tab === 'Leave Requests' && <Leaves leaves={leaves} empId={empId} empName={empName} onRefresh={load} />}
          </>
        )}
      </div>
    </div>
  );
}