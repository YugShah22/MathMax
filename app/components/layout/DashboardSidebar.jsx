'use client';
import styles from '@/app/components/shared/dashboard.module.css';

const LOGO = (
  <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
    <rect width="44" height="44" rx="11" fill="url(#gSide)"/>
    <defs><linearGradient id="gSide" x1="0" y1="0" x2="44" y2="44"><stop stopColor="#6d28d9"/><stop offset="1" stopColor="#0ea5e9"/></linearGradient></defs>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fill="white" fontFamily="Georgia,serif" fontWeight="700">∑</text>
  </svg>
);

/**
 * DashboardSidebar — renders brand + nav items.
 * Props:
 *   items: [{ key, label, icon }]
 *   activeKey: string
 *   onNav(key): void
 *   onBrandClick(): void
 */
export default function DashboardSidebar({ items, activeKey, onNav, onBrandClick }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarBrand} onClick={onBrandClick}>
        {LOGO}
        <span className={styles.sidebarBrandName}>MathMax</span>
      </div>
      <nav className={styles.sidebarNav}>
        {items.map(({ key, label, icon }) => (
          <div
            key={key}
            className={`${styles.navItem} ${activeKey === key ? styles.navItemActive : ''}`}
            onClick={() => onNav(key)}
          >
            {icon}
            {label}
          </div>
        ))}
      </nav>
    </aside>
  );
}
