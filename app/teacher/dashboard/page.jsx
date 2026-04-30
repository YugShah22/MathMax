'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNavHistory, pushHistory } from '@/app/hooks/useNavHistory';
import { SUBJECTS, PAPERS } from '@/app/lib/mockData';

import DashboardSidebar   from '@/app/components/layout/DashboardSidebar';
import DashboardTopBar    from '@/app/components/layout/DashboardTopBar';
import SubjectGrid        from '@/app/components/teacher/SubjectGrid';
import PaperList          from '@/app/components/teacher/PaperList';
import UploadQPForm       from '@/app/components/teacher/UploadQPForm';
import UploadAnsForm      from '@/app/components/teacher/UploadAnsForm';
import SheetsList         from '@/app/components/teacher/SheetsList';
import SheetDetail        from '@/app/components/teacher/SheetDetail';
import AnalyticsView      from '@/app/components/AnalyticsView';
import ReevalQueue        from '@/app/components/ReevalQueue';
import styles             from '@/app/components/dashboard.module.css';

const ICONS = {
  subjects: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  reeval:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

const NAV_ITEMS = [
  { key: 'subjects', label: 'Subjects',      icon: ICONS.subjects },
  { key: 'reeval',   label: 'Re-evaluation', icon: ICONS.reeval   },
];

export default function TeacherDashboard() {
  const router = useRouter();
  const [subjects, setSubjects] = useState(SUBJECTS);
  const [view, setView]         = useState('subjects');
  const [selSubject, setSubject] = useState(null);
  const [selPaper, setPaper]     = useState(null);
  const [selSheet, setSheet]     = useState(null);
  const [toast, setToast]        = useState('');

  // Browser history
  useNavHistory({ view: 'subjects' }, (state) => {
    setView(state.view || 'subjects');
    setSubject(state.sid ? subjects.find(s => s.id === state.sid) || null : null);
    setPaper(state.sid && state.pid ? (PAPERS[state.sid] || []).find(p => p.id === state.pid) || null : null);
    setSheet(state.sheet || null);
  });

  const nav = (v, subject = null, paper = null, sheet = null) => {
    pushHistory({ view: v, sid: subject?.id ?? null, pid: paper?.id ?? null, sheet });
    setView(v);
    if (subject !== undefined) setSubject(subject);
    if (paper   !== undefined) setPaper(paper);
    if (sheet   !== undefined) setSheet(sheet);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const papers = selSubject ? (PAPERS[selSubject.id] || []) : [];

  const sidebarActiveKey = ['subjects','papers','upload-qp','sheets','sheet-detail','upload-ans','analytics'].includes(view) ? 'subjects' : view;

  const breadcrumb = (
    <div className={styles.breadcrumb}>
      <span className={styles.breadcrumbLink} onClick={() => nav('subjects', null, null)}>Subjects</span>
      {selSubject && <><span className={styles.breadcrumbSep}>›</span><span className={view === 'papers' ? styles.breadcrumbActive : styles.breadcrumbLink} onClick={() => nav('papers', selSubject, null)}>{selSubject.name}</span></>}
      {selPaper   && <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>{selPaper.title}</span></>}
    </div>
  );

  return (
    <div className={styles.root}>
      <DashboardSidebar
        items={NAV_ITEMS}
        activeKey={sidebarActiveKey}
        onNav={key => nav(key, null, null)}
        onBrandClick={() => router.push('/')}
      />

      <main className={styles.main}>
        <DashboardTopBar showBack={view !== 'subjects' && view !== 'reeval'} breadcrumb={breadcrumb} />

        <div className={styles.content}>
          {view === 'subjects'    && <SubjectGrid subjects={subjects} onSetSubjects={setSubjects} onSelect={s => nav('papers', s, null)} />}
          {view === 'papers'      && selSubject && <PaperList papers={papers} subject={selSubject}
            onUploadQP={() => nav('upload-qp', selSubject, null)}
            onSheets={p   => nav('sheets',    selSubject, p)}
            onAnalytics={p => nav('analytics', selSubject, p)}
            onUploadAns={p => nav('upload-ans', selSubject, p)}
            onCopyCode={code => { navigator.clipboard.writeText(code); showToast('Code copied'); }}
          />}
          {view === 'upload-qp'   && <UploadQPForm  subject={selSubject} onCancel={() => window.history.back()} />}
          {view === 'upload-ans'  && selPaper && <UploadAnsForm paper={selPaper} subject={selSubject} onCancel={() => window.history.back()} />}
          {view === 'sheets'      && selPaper && <SheetsList paper={selPaper} subject={selSubject} onViewSheet={sh => nav('sheet-detail', selSubject, selPaper, sh)} />}
          {view === 'sheet-detail'&& selPaper && selSheet && <SheetDetail paper={selPaper} subject={selSubject} sheet={selSheet} onBack={() => window.history.back()} />}
          {view === 'analytics'   && selPaper && selSubject && <AnalyticsView paper={selPaper} subject={selSubject} />}
          {view === 'reeval'      && <ReevalQueue />}
        </div>
      </main>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
