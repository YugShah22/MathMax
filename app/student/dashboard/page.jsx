'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavHistory, pushHistory } from '@/app/hooks/useNavHistory';

import DashboardSidebar   from '@/app/components/layout/DashboardSidebar';
import DashboardTopBar    from '@/app/components/layout/DashboardTopBar';
import StudentHome        from '@/app/components/student/StudentHome';
import StudentSubjects    from '@/app/components/student/StudentSubjects';
import PapersView         from '@/app/components/student/PapersView';
import DirectUploadForm   from '@/app/components/student/DirectUploadForm';
import ResultsList        from '@/app/components/student/ResultsList';
import ResultDetail       from '@/app/components/student/ResultDetail';
import styles             from '@/app/components/shared/dashboard.module.css';

const NAV_ITEMS = [
  {
    key: 'home',
    label: 'Home',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    key: 'subjects',
    label: 'Subjects',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    key: 'papers',
    label: 'Papers',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    key: 'results',
    label: 'Results',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];

// views: 'home' | 'subjects' | 'papers' | 'direct-upload' | 'results' | 'result-detail'
export default function StudentDashboard() {
  const router = useRouter();

  const [view,        setView]        = useState('home');
  const [selPaper,    setSelPaper]    = useState(null);
  const [selResult,   setSelResult]   = useState(null);
  const [username,    setUsername]    = useState('Student');
  const [filterSubject, setFilterSubject] = useState(null); // { subjectId, name, color }

  useEffect(() => {
    setUsername(sessionStorage.getItem('mm_name') || 'Student');
  }, []);

  useNavHistory({ view: 'home' }, (state) => {
    setView(state.view || 'home');
    setSelPaper(state.paper          ?? null);
    setSelResult(state.result        ?? null);
    setFilterSubject(state.filterSubject ?? null);
  });

  const nav = (v, opts = {}) => {
    pushHistory({ view: v, ...opts });
    setView(v);
    if ('paper'         in opts) setSelPaper(opts.paper);
    if ('result'        in opts) setSelResult(opts.result);
    if ('filterSubject' in opts) setFilterSubject(opts.filterSubject);
  };

  const goUpload = (paper)  => nav('direct-upload', { paper });
  const goResult = (result) => nav('result-detail', { result });
  // From subject card — navigate to Papers with a subject filter
  const goSubjectPapers = (subj) => nav('papers', { filterSubject: subj ?? null });

  // ── breadcrumb ──
  const breadcrumb = (
    <div className={styles.breadcrumb}>
      <span
        className={view === 'home' ? styles.breadcrumbActive : styles.breadcrumbLink}
        onClick={() => nav('home')}
      >Home</span>

      {view === 'subjects' && (
        <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>Subjects</span></>
      )}
      {view === 'papers' && (
        <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>Papers</span></>
      )}
      {view === 'direct-upload' && selPaper && (
        <>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbLink} onClick={() => nav('papers')}>Papers</span>
          <span className={styles.breadcrumbSep}>›</span>
          <span className={styles.breadcrumbActive}>{selPaper.paper || selPaper.title}</span>
        </>
      )}
      {(view === 'results' || view === 'result-detail') && (
        <>
          <span className={styles.breadcrumbSep}>›</span>
          <span
            className={view === 'results' ? styles.breadcrumbActive : styles.breadcrumbLink}
            onClick={() => nav('results')}
          >Results</span>
        </>
      )}
      {view === 'result-detail' && selResult && (
        <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>{selResult.paper}</span></>
      )}
    </div>
  );

  const sidebarKey = {
    'home': 'home', 'subjects': 'subjects',
    'papers': 'papers', 'direct-upload': 'papers',
    'results': 'results', 'result-detail': 'results',
  }[view] ?? 'home';

  return (
    <div className={styles.root}>
      <DashboardSidebar
        items={NAV_ITEMS}
        activeKey={sidebarKey}
        onNav={key => {
          // Clicking Papers in sidebar always shows ALL papers (no filter)
          if (key === 'papers') setFilterSubject(null);
          nav(key);
        }}
        onBrandClick={() => router.push('/')}
      />

      <main className={styles.main}>
        <DashboardTopBar showBack={view !== 'home' && view !== 'subjects' && view !== 'papers' && view !== 'results'} breadcrumb={breadcrumb} />

        <div className={styles.content}>

          {view === 'home' && <StudentHome username={username} />}

          {view === 'subjects' && <StudentSubjects onGoToPapers={goSubjectPapers} />}

          {view === 'papers' && (
            <PapersView onUpload={goUpload} onResult={goResult} filterSubject={filterSubject} />
          )}

          {view === 'direct-upload' && selPaper && (
            <DirectUploadForm paper={selPaper} onCancel={() => window.history.back()} />
          )}

          {view === 'results' && (
            <ResultsList onView={goResult} />
          )}

          {view === 'result-detail' && selResult && (
            <ResultDetail result={selResult} onBack={() => window.history.back()} />
          )}

        </div>
      </main>
    </div>
  );
}
