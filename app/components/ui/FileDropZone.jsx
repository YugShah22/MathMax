'use client';
import { useRef } from 'react';

/**
 * Accessible file drop zone — wraps a hidden <input type="file">.
 * Props: onFile(File), accept, multiple, file (currently selected File | null)
 */
export default function FileDropZone({ onFile, accept = '.pdf,.jpg,.jpeg,.png', multiple = false, file = null }) {
  const inputRef = useRef(null);
  const handleChange = (e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); };

  return (
    <>
      <input ref={inputRef} type="file" hidden accept={accept} multiple={multiple} onChange={handleChange} />
      <div
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          padding: '36px 20px',
          border: '1px dashed rgba(109,40,217,0.25)', borderRadius: 12,
          background: 'rgba(109,40,217,0.03)', cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(109,40,217,0.45)'; e.currentTarget.style.background = 'rgba(109,40,217,0.07)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(109,40,217,0.25)'; e.currentTarget.style.background = 'rgba(109,40,217,0.03)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
        </svg>
        {file ? (
          <>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'rgba(245,245,255,0.6)' }}>{file.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.28)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'rgba(245,245,255,0.6)' }}>Click to browse</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,255,0.28)' }}>PDF, JPG, PNG — max 50 MB</span>
          </>
        )}
      </div>
    </>
  );
}
