'use client';
import { useState, useEffect } from 'react';
import { dlStatus } from '@/app/lib/deadlineUtils';

/** Generic coloured pill badge. */
export function Badge({ label, color, bg, border }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999,
      fontSize: '0.7rem', fontWeight: 700,
      color, background: bg, border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

/**
 * Deadline-aware badge.
 * Renders null on the server (SSR) and computes the real status
 * only on the client after hydration — prevents new Date() mismatch.
 */
export function DeadlineBadge({ deadline }) {
  const [s, setS] = useState(null);

  useEffect(() => {
    setS(dlStatus(deadline));
  }, [deadline]);

  if (!s) return null;
  return <Badge label={s.label} color={s.color} bg={s.bg} border={s.border} />;
}

/** Subject-coloured badge used in breadcrumbs / page headers. */
export function SubjectBadge({ name, color }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 12px', borderRadius: 999,
      fontSize: '0.74rem', fontWeight: 700,
      color, background: color + '1a', border: `1px solid ${color}44`,
      marginBottom: 8,
    }}>{name}</span>
  );
}
