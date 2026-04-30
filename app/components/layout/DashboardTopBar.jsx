'use client';
import ProfileMenu from '@/app/components/ProfileMenu';
import styles from '@/app/components/dashboard.module.css';

/**
 * DashboardTopBar — back button + breadcrumb + profile menu.
 * Props:
 *   showBack: boolean
 *   breadcrumb: ReactNode
 */
export default function DashboardTopBar({ showBack, breadcrumb }) {
  return (
    <header className={styles.topBar}>
      {showBack && (
        <button className={styles.backBtn} onClick={() => window.history.back()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
      )}
      {breadcrumb}
      <div className={styles.topBarRight}><ProfileMenu /></div>
    </header>
  );
}
