'use client';
import EmptyState from '@/app/components/ui/EmptyState';
import { DeadlineBadge } from '@/app/components/ui/Badge';
import { PrimaryButton, SmOutlineButton, SmPurpleButton } from '@/app/components/ui/Button';
import { dlStatus, formatDeadline } from '@/app/lib/deadlineUtils';
import styles from '@/app/components/shared/dashboard.module.css';

const PAPER_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const CLOCK_ICON = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const COPY_ICON  = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

export default function PaperList({ papers, subject, onUploadQP, onSheets, onAnalytics, onUploadAns, onCopyCode }) {
  return (
    <div className={styles.fadeIn}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.subjectBadge} style={{ background: subject.color + '1a', color: subject.color, borderColor: subject.color + '44' }}>{subject.name}</div>
          <h1 className={styles.pageTitle}>Question Papers</h1>
          <p className={styles.pageSubtitle}>{papers.length} paper{papers.length !== 1 ? 's' : ''}</p>
        </div>
        <PrimaryButton onClick={onUploadQP}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload paper
        </PrimaryButton>
      </div>

      <div className={styles.paperList}>
        {papers.map(p => {
          const ds = dlStatus(p.deadline);
          return (
            <div key={p.id} className={`${styles.paperRow} ${ds?.closed ? styles.paperRowClosed : ''}`}>
              <div className={styles.paperRowLeft}>
                <div className={styles.paperDot} style={{ background: subject.color }} />
                <div>
                  <div className={styles.paperTitle}>{p.title}</div>
                  <div className={styles.paperMeta}>{p.date} · {p.submissions} submissions</div>
                  <div className={styles.paperCode}>
                    Code: <span className={styles.codeChip}>{p.code}</span>
                    <button className={styles.copyBtn} onClick={() => onCopyCode(p.code)} title="Copy">{COPY_ICON}</button>
                  </div>
                  {p.deadline && (
                    <div className={styles.paperDeadline}>
                      {CLOCK_ICON}
                      {formatDeadline(p.deadline)}
                      <DeadlineBadge deadline={p.deadline} />
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.paperRowActions}>
                <SmOutlineButton onClick={() => onAnalytics(p)}>Analytics</SmOutlineButton>
                <SmOutlineButton onClick={() => onSheets(p)}>Sheets</SmOutlineButton>
                {!ds?.closed && <SmPurpleButton onClick={() => onUploadAns(p)}>Upload sheet</SmPurpleButton>}
              </div>
            </div>
          );
        })}
        {papers.length === 0 && <EmptyState icon={PAPER_ICON} text="No papers uploaded yet" />}
      </div>
    </div>
  );
}
