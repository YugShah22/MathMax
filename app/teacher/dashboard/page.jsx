'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavHistory, pushHistory } from '@/app/hooks/useNavHistory';
import { getSubjects, getPapers } from '@/app/lib/api';

import DashboardSidebar   from '@/app/components/layout/DashboardSidebar';
import DashboardTopBar    from '@/app/components/layout/DashboardTopBar';
import SubjectGrid        from '@/app/components/teacher/SubjectGrid';
import PaperList          from '@/app/components/teacher/PaperList';
import UploadQPForm       from '@/app/components/teacher/UploadQPForm';
import UploadAnsForm      from '@/app/components/teacher/UploadAnsForm';
import SheetsList         from '@/app/components/teacher/SheetsList';
import SheetDetail        from '@/app/components/teacher/SheetDetail';
import AnalyticsView      from '@/app/components/teacher/AnalyticsView';
import ReevalQueue        from '@/app/components/teacher/ReevalQueue';
import EnrollmentManager  from '@/app/components/teacher/EnrollmentManager';
import styles             from '@/app/components/shared/dashboard.module.css';

const ICONS = {
  subjects: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  students: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  reeval:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

const NAV_ITEMS = [
  { key: 'subjects', label: 'Subjects',      icon: ICONS.subjects },
  { key: 'students', label: 'Students',      icon: ICONS.students },
  { key: 'reeval',   label: 'Re-evaluation', icon: ICONS.reeval   },
];

export default function TeacherDashboard() {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [papers, setPapers]     = useState([]);
  const [view, setView]         = useState('subjects');
  const [selSubject, setSubject] = useState(null);
  const [selPaper, setPaper]     = useState(null);
  const [selSheet, setSheet]     = useState(null);
  const [toast, setToast]        = useState('');
  const [loading, setLoading]    = useState(true);

  // ── Load subjects from DB on mount ──
  useEffect(() => {
    (async () => {
      try {
        const data = await getSubjects();
        setSubjects(data.subjects.map(s => ({ ...s, id: s._id || s.id })));
      } catch (err) {
        // If not authenticated or wrong role, redirect to auth
        if (err.message?.includes('403') || err.message?.includes('401') ||
            err.message?.includes('Forbidden') || err.message?.includes('Not authenticated')) {
          router.push('/auth');
          return;
        }
        console.error('Failed to load subjects:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load papers when subject is selected ──
  const loadPapers = async (subject) => {
    try {
      const data = await getPapers(subject.id || subject._id);
      setPapers(data.papers.map(p => ({ ...p, id: p._id || p.id })));
    } catch (err) {
      console.error('Failed to load papers:', err);
      setPapers([]);
    }
  };

  // Browser history
  useNavHistory({ view: 'subjects' }, (state) => {
    setView(state.view || 'subjects');
    if (state.subject) {
      setSubject(state.subject);
      loadPapers(state.subject);
    } else {
      setSubject(null);
    }
    setPaper(state.paper || null);
    setSheet(state.sheet || null);
  });

  const nav = (v, subject = null, paper = null, sheet = null) => {
    pushHistory({ view: v, subject, paper, sheet });
    setView(v);
    if (subject !== undefined) setSubject(subject);
    if (paper   !== undefined) setPaper(paper);
    if (sheet   !== undefined) setSheet(sheet);
  };

  const selectSubject = async (s) => {
    setSubject(s);
    await loadPapers(s);
    nav('papers', s, null);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const handlePaperCreated = (newPaper) => {
    setPapers(prev => [newPaper, ...prev]);
    // Also update the subject count in the grid
    setSubjects(prev => prev.map(s =>
      (s.id || s._id) === (selSubject?.id || selSubject?._id)
        ? { ...s, papers: (s.papers || 0) + 1 }
        : s
    ));
    nav('papers', selSubject, null);
    showToast(`Paper "${newPaper.title}" created — code: ${newPaper.code}`);
  };

  const sidebarActiveKey = ['subjects','papers','upload-qp','sheets','sheet-detail','upload-ans','analytics'].includes(view) ? 'subjects' : view;

  const breadcrumb = (
    <div className={styles.breadcrumb}>
      <span className={styles.breadcrumbLink} onClick={() => nav('subjects', null, null)}>Subjects</span>
      {selSubject && <><span className={styles.breadcrumbSep}>›</span><span className={view === 'papers' ? styles.breadcrumbActive : styles.breadcrumbLink} onClick={() => selectSubject(selSubject)}>{selSubject.name}</span></>}
      {selPaper   && <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>{selPaper.title}</span></>}
    </div>
  );

  if (loading) {
    return (
      <div className={styles.root}>
        <DashboardSidebar items={NAV_ITEMS} activeKey="subjects" onNav={() => {}} onBrandClick={() => router.push('/')} />
        <main className={styles.main}>
          <DashboardTopBar breadcrumb={<span>Loading…</span>} />
          <div className={styles.content} style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ color: 'rgba(245,245,255,0.3)', fontSize: '0.85rem' }}>Loading subjects…</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <DashboardSidebar
        items={NAV_ITEMS}
        activeKey={sidebarActiveKey}
        onNav={key => nav(key, null, null)}
        onBrandClick={() => router.push('/')}
      />

      <main className={styles.main}>
        <DashboardTopBar showBack={view !== 'subjects' && view !== 'reeval' && view !== 'students'} breadcrumb={breadcrumb} />

        <div className={styles.content}>
          {view === 'subjects'    && <SubjectGrid subjects={subjects} onSetSubjects={setSubjects} onSelect={selectSubject} />}
          {view === 'papers'      && selSubject && <PaperList papers={papers} setPapers={setPapers} subject={selSubject}
            onUploadQP={() => nav('upload-qp', selSubject, null)}
            onSheets={p   => nav('sheets',    selSubject, p)}
            onAnalytics={p => nav('analytics', selSubject, p)}
            onUploadAns={p => nav('upload-ans', selSubject, p)}
            onCopyCode={code => { navigator.clipboard.writeText(code); showToast('Code copied'); }}
          />}
          {view === 'upload-qp'   && <UploadQPForm subject={selSubject} onCancel={() => window.history.back()} onCreated={handlePaperCreated} />}
          {view === 'upload-ans'  && selPaper && <UploadAnsForm paper={selPaper} subject={selSubject} onCancel={() => window.history.back()} />}
          {view === 'sheets'      && selPaper && <SheetsList paper={selPaper} subject={selSubject} onViewSheet={sh => nav('sheet-detail', selSubject, selPaper, sh)} />}
          {view === 'sheet-detail'&& selPaper && selSheet && <SheetDetail paper={selPaper} subject={selSubject} sheet={selSheet} onBack={() => window.history.back()} />}
          {view === 'analytics'   && selPaper && selSubject && <AnalyticsView paper={selPaper} subject={selSubject} />}
          {view === 'reeval'      && <ReevalQueue />}
          {view === 'students'    && <EnrollmentManager />}
        </div>
      </main>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
