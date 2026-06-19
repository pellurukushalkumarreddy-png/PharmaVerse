import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TOOLS } from './helpers';

export default function Sidebar({ chatHistory }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname.slice(1) || 'home';

  return (
    <div style={{ width: 250, background: '#fff', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 10 }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #E5E7EB' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 16 }}>&#9877;</span>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>PharmaVerse</span>
        </div>
      </div>

      {/* Tools */}
      <div style={{ padding: '12px 10px 4px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1.2, padding: '0 8px', marginBottom: 6 }}>Use Cases</div>
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => navigate('/' + t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 10px', borderRadius: 8, border: 'none',
              background: current === t.id ? t.color + '12' : 'transparent',
              color: current === t.id ? t.color : '#4B5563',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 1, textAlign: 'left',
            }}>
            <span style={{ fontSize: 15, width: 22, textAlign: 'center' }}>{t.icon}</span>
            {t.name}
          </button>
        ))}
      </div>

      {/* Chat History */}
      <div style={{ padding: '8px 10px', flex: 1, overflow: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1.2, padding: '0 8px', marginBottom: 6 }}>Chat History</div>
        {chatHistory.length === 0 && <div style={{ fontSize: 12, color: '#D1D5DB', padding: '4px 8px', fontStyle: 'italic' }}>No history yet</div>}
        {chatHistory.map((ch, i) => (
          <div key={i} onClick={() => navigate('/')} style={{ padding: '7px 10px', borderRadius: 6, fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{ch}</div>
        ))}
      </div>

      {/* User */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>U</div>
        <span style={{ fontSize: 12, color: '#4B5563' }}>User</span>
      </div>
    </div>
  );
}
