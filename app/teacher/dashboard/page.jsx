'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavHistory, pushHistory } from '@/app/hooks/useNavHistory';
import { getSubjects, getPapers } from '@/app/lib/api';

import ExaminationDashboard from '@/app/components/teacher/examinations/ExaminationDashboard';
import ExaminationForm      from '@/app/components/teacher/examinations/ExaminationForm';
import QuestionManager      from '@/app/components/teacher/examinations/QuestionManager';
import ExaminationPreview   from '@/app/components/teacher/examinations/ExaminationPreview';
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
  examinations: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  subjects: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  students: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  reeval:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

const NAV_ITEMS = [
  { key: 'examinations', label: 'Examinations', icon: ICONS.examinations },
  { key: 'subjects',     label: 'Subjects',     icon: ICONS.subjects },
  { key: 'students',     label: 'Students',     icon: ICONS.students },
  { key: 'reeval',       label: 'Re-evaluation', icon: ICONS.reeval   },
];

export default function TeacherDashboard() {
  const router = useRouter();
  const [subjects, setSubjects] = useState([]);
  const [papers, setPapers]     = useState([]);
  const [view, setView]         = useState('examinations');
  const [selSubject, setSubject] = useState(null);
  const [selPaper, setPaper]     = useState(null);
  const [selSheet, setSheet]     = useState(null);
  const [selExam, setExam]       = useState(null);
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
  useNavHistory({ view: 'examinations' }, (state) => {
    setView(state.view || 'examinations');
    if (state.subject) {
      setSubject(state.subject);
      loadPapers(state.subject);
    } else {
      setSubject(null);
    }
    setPaper(state.paper || null);
    setSheet(state.sheet || null);
    setExam(state.exam || null);
  });

  const nav = (v, subject = null, paper = null, sheet = null, exam = null) => {
    pushHistory({ view: v, subject, paper, sheet, exam });
    setView(v);
    if (subject !== undefined) setSubject(subject);
    if (paper   !== undefined) setPaper(paper);
    if (sheet   !== undefined) setSheet(sheet);
    if (exam    !== undefined) setExam(exam);
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

  const isExamView = ['examinations','create-exam','edit-exam','manage-questions','preview-exam'].includes(view);
  const isSubjectView = ['subjects','papers','upload-qp','sheets','sheet-detail','upload-ans','analytics'].includes(view);
  const sidebarActiveKey = isExamView ? 'examinations' : (isSubjectView ? 'subjects' : view);

  const breadcrumb = isExamView ? (
    <div className={styles.breadcrumb}>
      <span className={styles.breadcrumbLink} onClick={() => nav('examinations')}>Examinations</span>
      {selExam && (
        <>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={view === 'preview-exam' ? styles.breadcrumbActive : styles.breadcrumbLink} onClick={() => nav('manage-questions', null, null, null, selExam)}>
            {selExam.title}
          </span>
        </>
      )}
      {view === 'create-exam' && <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>New Examination</span></>}
      {view === 'edit-exam' && <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>Edit Details</span></>}
      {view === 'manage-questions' && <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>Questions & Rubrics</span></>}
      {view === 'preview-exam' && <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>Review & Publish</span></>}
    </div>
  ) : (
    <div className={styles.breadcrumb}>
      <span className={styles.breadcrumbLink} onClick={() => nav('subjects', null, null)}>Subjects</span>
      {selSubject && <><span className={styles.breadcrumbSep}>›</span><span className={view === 'papers' ? styles.breadcrumbActive : styles.breadcrumbLink} onClick={() => selectSubject(selSubject)}>{selSubject.name}</span></>}
      {selPaper   && <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>{selPaper.title}</span></>}
    </div>
  );

  if (loading) {
    return (
      <div className={styles.root}>
        <DashboardSidebar items={NAV_ITEMS} activeKey={sidebarActiveKey} onNav={() => {}} onBrandClick={() => router.push('/')} />
        <main className={styles.main}>
          <DashboardTopBar breadcrumb={<span>Loading…</span>} />
          <div className={styles.content} style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ color: 'rgba(245,245,255,0.3)', fontSize: '0.85rem' }}>Loading dashboard…</div>
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
        <DashboardTopBar showBack={view !== 'examinations' && view !== 'subjects' && view !== 'reeval' && view !== 'students'} breadcrumb={breadcrumb} />

        <div className={styles.content}>
          {/* ── Phase 2 Examinations & Rubrics Views ── */}
          {view === 'examinations' && (
            <ExaminationDashboard
              onCreateExam={() => nav('create-exam')}
              onEditExam={(e) => { setExam(e); nav('edit-exam', null, null, null, e); }}
              onManageQuestions={(e) => { setExam(e); nav('manage-questions', null, null, null, e); }}
              onPreviewExam={(e) => { setExam(e); nav('preview-exam', null, null, null, e); }}
              showToast={showToast}
            />
          )}
          {view === 'create-exam' && (
            <ExaminationForm
              onSaved={(e) => { setExam(e); nav('manage-questions', null, null, null, e); }}
              onCancel={() => nav('examinations')}
              showToast={showToast}
            />
          )}
          {view === 'edit-exam' && selExam && (
            <ExaminationForm
              exam={selExam}
              onSaved={(e) => { setExam(e); nav('examinations'); }}
              onCancel={() => nav('examinations')}
              showToast={showToast}
            />
          )}
          {view === 'manage-questions' && selExam && (
            <QuestionManager
              exam={selExam}
              onBack={() => nav('examinations')}
              onPreview={() => nav('preview-exam', null, null, null, selExam)}
              showToast={showToast}
            />
          )}
          {view === 'preview-exam' && selExam && (
            <ExaminationPreview
              exam={selExam}
              onBack={() => nav('examinations')}
              onManageQuestions={(e) => nav('manage-questions', null, null, null, e || selExam)}
              onPublished={() => nav('examinations')}
              showToast={showToast}
            />
          )}

          {/* ── Existing Legacy Views ── */}
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
