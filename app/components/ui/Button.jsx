'use client';

const BASE = {
  display: 'flex', alignItems: 'center', gap: 7,
  borderRadius: 9, fontFamily: "'Inter',sans-serif",
  fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'background 0.15s, transform 0.12s, box-shadow 0.15s, color 0.15s',
};

export function PrimaryButton({ children, onClick, disabled, style = {} }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      ...BASE, padding: '10px 18px', fontSize: '0.85rem',
      background: disabled ? 'rgba(109,40,217,0.3)' : '#6d28d9',
      border: 'none', color: '#fff',
      boxShadow: disabled ? 'none' : '0 3px 12px rgba(109,40,217,0.35)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style,
    }}>{children}</button>
  );
}

export function GhostButton({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
      ...BASE, padding: '10px 16px', fontSize: '0.85rem',
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.1)',
      color: 'rgba(245,245,255,0.5)',
      ...style,
    }}>{children}</button>
  );
}

export function SmOutlineButton({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
      ...BASE, padding: '7px 13px', fontSize: '0.78rem',
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.09)',
      color: 'rgba(245,245,255,0.45)',
      ...style,
    }}>{children}</button>
  );
}

export function SmPurpleButton({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
      ...BASE, padding: '7px 13px', fontSize: '0.78rem',
      background: 'rgba(109,40,217,0.12)',
      border: '1px solid rgba(109,40,217,0.25)',
      color: '#c4b5fd',
      ...style,
    }}>{children}</button>
  );
}
