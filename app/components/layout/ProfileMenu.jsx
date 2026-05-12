'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout, getMe } from '@/app/lib/api';
import styles from './ProfileMenu.module.css';

export default function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    // Try API first, fall back to sessionStorage
    getMe()
      .then(d => {
        setRole(d.user.role || 'user');
        setUsername(d.user.name || 'User');
      })
      .catch(() => {
        setRole(sessionStorage.getItem('mm_role') || 'user');
        setUsername(sessionStorage.getItem('mm_name') || 'User');
      });
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = username.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    try { await logout(); } catch {}
    sessionStorage.removeItem('mm_role');
    sessionStorage.removeItem('mm_name');
    sessionStorage.removeItem('mm_id');
    router.push('/auth');
  };

  return (
    <div className={styles.wrap} ref={menuRef}>
      <button className={styles.trigger} onClick={() => setOpen((v) => !v)} aria-label="Profile menu">
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.info}>
          <span className={styles.name}>{username}</span>
          <span className={styles.role}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
        </div>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropHeader}>
            <div className={styles.dropAvatar}>{initials}</div>
            <div>
              <div className={styles.dropName}>{username}</div>
              <div className={styles.dropEmail}>{role.charAt(0).toUpperCase() + role.slice(1)} account</div>
            </div>
          </div>

          <div className={styles.divider} />

          <button className={styles.dropItem} onClick={() => { setOpen(false); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Profile settings
          </button>

          <div className={styles.divider} />

          <button className={`${styles.dropItem} ${styles.dropItemDanger}`} onClick={handleSignOut}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
