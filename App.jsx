import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Clock, Plus, ChevronDown, ChevronUp, User, Calendar, FileText, AlertTriangle, Package, Truck, Image, Layers } from "lucide-react";

// ─── Stage definitions per level ─────────────────────────────────────────────
const LEVELS = {
  A: { label: 'A — מוצר חוזר', color: '#2E7D32', bg: '#E8F5E9', stages: ['go'] },
  B: { label: 'B — שינוי גרפיקה/מפרט', color: '#1565C0', bg: '#E3F2FD', stages: ['graphics', 'go'] },
  C: { label: 'C — מוצר חדש/מורכב', color: '#6A1B9A', bg: '#F3E5F5', stages: ['graphics', 'sample', 'go', 'midprod', 'release'] },
};

const STAGE_META = {
  graphics: { label: 'אישור גרפיקה', icon: Image, color: '#E65100', desc: 'Artwork / Mock-up — טקסט, לוגו, מידות, צבעים' },
  sample:   { label: 'אישור דוגמה',   icon: Package,  color: '#6A1B9A', desc: 'דוגמה פיזית או תמונות/וידאו' },
  go:       { label: 'GO לייצור מלא', icon: CheckCircle, color: '#1B5E20', desc: 'אישור סופי לפני Mass Production' },
  midprod:  { label: 'אישורי ביניים', icon: Layers, color: '#1565C0', desc: 'Print Proof, צבע/חומר, יחידה ראשונה, אריזה' },
  release:  { label: 'שחרור סחורה',   icon: Truck,   color: '#37474F', desc: 'תמונות מוגמר, Packing List, Invoice' },
};

const APPROVERS = ['צביה', 'יענקי אייגרמן', 'אליעזר', 'מני בן שחר', 'שאול', 'לוי'];

const STATUS_STYLE = {
  approved: { bg: '#E8F5E9', text: '#1B5E20', border: '#A5D6A7', label: 'אושר' },
  rejected: { bg: '#FFEBEE', text: '#B71C1C', border: '#EF9A9A', label: 'נדחה' },
  pending:  { bg: '#FFF8E1', text: '#E65100', border: '#FFE082', label: 'ממתין' },
  waiting:  { bg: '#F5F5F5', text: '#757575', border: '#E0E0E0', label: 'טרם הגיע' },
};

function fmt(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('he-IL', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function Badge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.waiting;
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function StageIcon({ stage, status }) {
  const m = STAGE_META[stage];
  const Icon = m.icon;
  const c = status === 'approved' ? '#1B5E20' : status === 'rejected' ? '#B71C1C' : status === 'pending' ? '#E65100' : '#BDBDBD';
  return <Icon size={16} color={c} />;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ApprovalDashboard() {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState('list'); // 'list' | 'new' | 'detail'
  const [selected, setSelected]   = useState(null);
  const [approveModal, setApproveModal] = useState(null); // { orderId, stage }

  // ── Load from storage ──
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get('approvals_v1', true);
        if (res) setOrders(JSON.parse(res.value));
      } catch(e) { /* first load */ }
      setLoading(false);
    })();
  }, []);

  // ── Save to storage ──
  const save = useCallback(async (data) => {
    try { await window.storage.set('approvals_v1', JSON.stringify(data), true); } catch(e) {}
  }, []);

  const updateOrders = (fn) => {
    setOrders(prev => {
      const next = fn(prev);
      save(next);
      return next;
    });
  };

  // ── Create new order ──
  const createOrder = (form) => {
    const stages = LEVELS[form.level].stages;
    const stageData = {};
    stages.forEach((s, i) => {
      stageData[s] = { status: i === 0 ? 'pending' : 'waiting', approver: null, note: '', ts: null, checks: {} };
    });
    const order = { id: Date.now().toString(), ...form, createdAt: Date.now(), stages: stageData };
    updateOrders(prev => [order, ...prev]);
    setView('list');
  };

  // ── Approve/Reject stage ──
  const approveStage = (orderId, stage, status, approver, note, checks) => {
    updateOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const stages = { ...o.stages };
      stages[stage] = { ...stages[stage], status, approver, note, ts: Date.now(), checks: checks || {} };
      // unlock next stage
      const stageList = LEVELS[o.level].stages;
      const idx = stageList.indexOf(stage);
      if (status === 'approved' && idx < stageList.length - 1) {
        stages[stageList[idx + 1]] = { ...stages[stageList[idx + 1]], status: 'pending' };
      }
      return { ...o, stages };
    }));
    setApproveModal(null);
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontFamily:'Heebo,sans-serif' }}>טוען...</div>;

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo','Segoe UI',Tahoma,sans-serif", background: '#F7F5F0', minHeight: '100vh', color: '#1A1A1A' }}>
      {/* Header */}
      <div style={{ background: '#1A1A2E', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#E65100,#FF8F00)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <FileText size={17} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#FFF', letterSpacing: 0.3 }}>סבב אישורים — פיתוח וייצור</div>
            <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 1 }}>{orders.length} הזמנות פעילות</div>
          </div>
        </div>
        <button onClick={() => setView('new')}
          style={{ display:'flex', alignItems:'center', gap:6, background:'#E65100', color:'#FFF', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
          <Plus size={15} /> הזמנה חדשה
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            {orders.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#9E9E9E' }}>
                <FileText size={48} color="#E0E0E0" style={{ display: 'block', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>אין הזמנות עדיין</div>
                <div style={{ fontSize: 13 }}>לחץ "הזמנה חדשה" כדי להתחיל</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map(o => <OrderCard key={o.id} order={o} onClick={() => { setSelected(o.id); setView('detail'); }} />)}
            </div>
          </>
        )}

        {/* ── NEW ORDER VIEW ── */}
        {view === 'new' && (
          <NewOrderForm onSubmit={createOrder} onCancel={() => setView('list')} />
        )}

        {/* ── DETAIL VIEW ── */}
        {view === 'detail' && selected && (() => {
          const order = orders.find(o => o.id === selected);
          if (!order) return null;
          return (
            <OrderDetail
              order={order}
              onBack={() => setView('list')}
              onApprove={(stage) => setApproveModal({ orderId: order.id, stage })}
            />
          );
        })()}
      </div>

      {/* Approve Modal */}
      {approveModal && (() => {
        const order = orders.find(o => o.id === approveModal.orderId);
        return (
          <ApproveModal
            order={order}
            stage={approveModal.stage}
            onConfirm={(status, approver, note, checks) => approveStage(approveModal.orderId, approveModal.stage, status, approver, note, checks)}
            onClose={() => setApproveModal(null)}
          />
        );
      })()}
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onClick }) {
  const lvl = LEVELS[order.level];
  const stages = lvl.stages;
  const allApproved = stages.every(s => order.stages[s]?.status === 'approved');
  const anyRejected = stages.some(s => order.stages[s]?.status === 'rejected');
  const overallStatus = allApproved ? 'approved' : anyRejected ? 'rejected' : 'pending';

  return (
    <div onClick={onClick} style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E8E4DC',
      padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow .15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{order.product}</div>
          <div style={{ fontSize: 12, color: '#757575' }}>{order.supplier} · {order.target} · {fmt(order.createdAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ background: lvl.bg, color: lvl.color, border: `1px solid ${lvl.color}33`, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
            רמה {order.level}
          </span>
          <Badge status={overallStatus} />
        </div>
      </div>
      {/* Stage pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {stages.map(s => {
          const meta = STAGE_META[s];
          const st = order.stages[s]?.status || 'waiting';
          const style = STATUS_STYLE[st];
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4,
              background: style.bg, border: `1px solid ${style.border}`, borderRadius: 999, padding: '3px 10px' }}>
              <StageIcon stage={s} status={st} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: style.text }}>{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Order Detail ─────────────────────────────────────────────────────────────
function OrderDetail({ order, onBack, onApprove }) {
  const lvl = LEVELS[order.level];
  const stages = lvl.stages;

  return (
    <div>
      <button onClick={onBack} style={{ border: 'none', background: 'none', color: '#E65100', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
        ← חזרה לרשימה
      </button>

      {/* Header card */}
      <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E8E4DC', padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{order.product}</div>
            <div style={{ fontSize: 13, color: '#757575', marginBottom: 8 }}>{order.supplier} · יעד: {order.target}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ background: lvl.bg, color: lvl.color, border: `1px solid ${lvl.color}33`, borderRadius: 999, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                רמה {order.level} — {lvl.label}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#9E9E9E', textAlign: 'left' }}>
            <Calendar size={13} style={{ verticalAlign: 'middle', marginLeft: 3 }} />
            {fmt(order.createdAt)}
          </div>
        </div>
        {order.notes && (
          <div style={{ marginTop: 12, background: '#FFF8E1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#5D4037', borderRight: '3px solid #FFB300' }}>
            {order.notes}
          </div>
        )}
      </div>

      {/* Stages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stages.map((s, idx) => {
          const meta = STAGE_META[s];
          const Icon = meta.icon;
          const stageData = order.stages[s] || {};
          const status = stageData.status || 'waiting';
          const style = STATUS_STYLE[status];
          const canApprove = status === 'pending';

          return (
            <div key={s} style={{ background: '#FFF', borderRadius: 12, border: `1px solid ${style.border}`, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: canApprove || status === 'approved' || status === 'rejected' ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${style.border}` }}>
                    <Icon size={18} color={meta.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{idx + 1}. {meta.label}</div>
                    <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>{meta.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Badge status={status} />
                  {canApprove && (
                    <button onClick={() => onApprove(s)}
                      style={{ background: '#E65100', color: '#FFF', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      לאישור
                    </button>
                  )}
                </div>
              </div>

              {/* Approval record */}
              {(status === 'approved' || status === 'rejected') && (
                <div style={{ background: style.bg, borderRadius: 8, padding: '10px 14px', fontSize: 12.5 }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span><User size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} /><strong>מאשר:</strong> {stageData.approver}</span>
                    <span><Calendar size={12} style={{ verticalAlign: 'middle', marginLeft: 4 }} /><strong>תאריך:</strong> {fmt(stageData.ts)}</span>
                  </div>
                  {stageData.note && <div style={{ marginTop: 6, color: '#5D4037' }}>💬 {stageData.note}</div>}
                  {stageData.checks && Object.keys(stageData.checks).length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {Object.entries(stageData.checks).map(([k, v]) => (
                        <span key={k} style={{ background: v ? '#E8F5E9' : '#FFEBEE', color: v ? '#1B5E20' : '#B71C1C',
                          border: `1px solid ${v ? '#A5D6A7' : '#EF9A9A'}`, borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>
                          {v ? '✓' : '✗'} {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── New Order Form ───────────────────────────────────────────────────────────
function NewOrderForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({ product: '', supplier: '', target: '', level: 'C', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const targets = ['מלש', 'רשת', 'שלהבת', 'גרין', 'מועדוני נוער', 'מירי שניאורסון', 'פינסון', 'כללי'];

  return (
    <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E8E4DC', padding: '24px', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>הזמנה חדשה לסבב אישורים</div>

      {[
        { label: 'שם המוצר', key: 'product', placeholder: 'תיאור המוצר' },
        { label: 'ספק', key: 'supplier', placeholder: 'שם הספק' },
      ].map(f => (
        <div key={f.key} style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#424242' }}>{f.label}</label>
          <input value={form[f.key]} onChange={e => set(f.key, e.target.value)}
            placeholder={f.placeholder}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 9, border: '1px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
        </div>
      ))}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#424242' }}>יעד</label>
        <select value={form.target} onChange={e => set('target', e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', background: '#FFF', cursor: 'pointer', outline: 'none' }}>
          <option value="">בחר יעד</option>
          {targets.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#424242' }}>רמת אישור</label>
        {Object.entries(LEVELS).map(([k, v]) => (
          <label key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
            <input type="radio" name="level" value={k} checked={form.level === k} onChange={() => set('level', k)} style={{ marginTop: 3 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: v.color }}>{v.label}</div>
              <div style={{ fontSize: 12, color: '#757575' }}>שלבים: {LEVELS[k].stages.map(s => STAGE_META[s].label).join(' ← ')}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#424242' }}>הערות (אופציונלי)</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 9, border: '1px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => { if (form.product && form.supplier) onSubmit(form); }}
          disabled={!form.product || !form.supplier}
          style={{ flex: 1, background: form.product && form.supplier ? '#E65100' : '#E0E0E0', color: '#FFF', border: 'none', borderRadius: 9, padding: '12px', fontSize: 14, fontWeight: 700, cursor: form.product && form.supplier ? 'pointer' : 'default' }}>
          פתח הזמנה
        </button>
        <button onClick={onCancel}
          style={{ padding: '12px 20px', background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#424242' }}>
          ביטול
        </button>
      </div>
    </div>
  );
}

// ─── Approve Modal ────────────────────────────────────────────────────────────
const STAGE_CHECKS = {
  graphics: ['טקסטים ולוגו', 'מידות ומיקום', 'צבעים', 'התאמה למוצר'],
  sample:   ['אושר בתמונות/וידאו', 'נדרשת דוגמה פיזית', 'חומר ומרקם תקין', 'הדפסה תקינה'],
  go:       ['דוגמה', 'גרפיקה סופית', 'חומר וצבע', 'מידות', 'כמות', 'אריזה', 'דרישות מיוחדות'],
  midprod:  ['Print Proof', 'צבע / חומר', 'יחידה ראשונה', 'גרפיקה בפועל', 'אריזה וסימון'],
  release:  ['תמונות מוגמר', 'תמונות אריזה', 'כמות סופית', 'Packing List', 'Commercial Invoice'],
};

function ApproveModal({ order, stage, onConfirm, onClose }) {
  const meta = STAGE_META[stage];
  const Icon = meta.icon;
  const checkList = STAGE_CHECKS[stage] || [];
  const [approver, setApprover] = useState('');
  const [note, setNote] = useState('');
  const [checks, setChecks] = useState({});
  const toggleCheck = (k) => setChecks(c => ({ ...c, [k]: !c[k] }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#FFF', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color={meta.color} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>אישור: {meta.label}</div>
            <div style={{ fontSize: 12, color: '#757575' }}>{order.product}</div>
          </div>
        </div>

        {/* Checklist */}
        {checkList.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#424242' }}>רשימת בדיקה:</div>
            {checkList.map(c => (
              <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!checks[c]} onChange={() => toggleCheck(c)} />
                <span style={{ fontSize: 13, textDecoration: checks[c] ? 'none' : 'none', color: checks[c] ? '#1B5E20' : '#424242' }}>{c}</span>
              </label>
            ))}
          </div>
        )}

        {/* Approver */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>מאשר:</label>
          <select value={approver} onChange={e => setApprover(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', background: '#FFF', outline: 'none' }}>
            <option value="">בחר מאשר</option>
            {APPROVERS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>הערה (אופציונלי):</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 9, border: '1px solid #E0E0E0', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => approver && onConfirm('approved', approver, note, checks)}
            disabled={!approver}
            style={{ flex: 1, background: approver ? '#1B5E20' : '#E0E0E0', color: '#FFF', border: 'none', borderRadius: 9, padding: '12px', fontSize: 14, fontWeight: 700, cursor: approver ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <CheckCircle size={16} /> אשר
          </button>
          <button onClick={() => approver && onConfirm('rejected', approver, note, checks)}
            disabled={!approver}
            style={{ flex: 1, background: approver ? '#B71C1C' : '#E0E0E0', color: '#FFF', border: 'none', borderRadius: 9, padding: '12px', fontSize: 14, fontWeight: 700, cursor: approver ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <XCircle size={16} /> דחה
          </button>
          <button onClick={onClose}
            style={{ padding: '12px 16px', background: '#F5F5F5', border: '1px solid #E0E0E0', borderRadius: 9, fontSize: 14, cursor: 'pointer', color: '#424242' }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
