'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNavHistory, pushHistory } from '@/app/hooks/useNavHistory';
import { RESULTS, UPCOMING_DEADLINES, SCORE_TREND } from '@/app/lib/mockData';

import DashboardSidebar  from '@/app/components/layout/DashboardSidebar';
import DashboardTopBar   from '@/app/components/layout/DashboardTopBar';
import HomeCards         from '@/app/components/student/HomeCards';
import DeadlineList      from '@/app/components/student/DeadlineList';
import ScoreTrend        from '@/app/components/student/ScoreTrend';
import UploadSheetForm   from '@/app/components/student/UploadSheetForm';
import ResultsList       from '@/app/components/student/ResultsList';
import ResultDetail      from '@/app/components/student/ResultDetail';
import styles            from '@/app/components/dashboard.module.css';

const NAV_ITEMS = [
  { key: 'home',    label: 'Home',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { key: 'upload',  label: 'Submit',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> },
  { key: 'results', label: 'Results', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
];

export default function StudentDashboard() {
  const router = useRouter();
  const [view, setView]           = useState('home');
  const [selResult, setSelResult] = useState(null);
  const [preCode, setPreCode]     = useState('');

  useNavHistory({ view: 'home' }, (state) => {
    setView(state.view || 'home');
    setSelResult(state.result || null);
    setPreCode(state.preCode || '');
  });

  const nav = (v, opts = {}) => {
    pushHistory({ view: v, ...opts });
    setView(v);
    if (opts.result   !== undefined) setSelResult(opts.result);
    if (opts.preCode  !== undefined) setPreCode(opts.preCode);
  };

  const breadcrumb = (
    <div className={styles.breadcrumb}>
      <span className={view === 'home' ? styles.breadcrumbActive : styles.breadcrumbLink} onClick={() => nav('home')}>Home</span>
      {view === 'upload'        && <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>Submit sheet</span></>}
      {view === 'results'       && <><span className={styles.breadcrumbSep}>›</span><span className={selResult ? styles.breadcrumbLink : styles.breadcrumbActive} onClick={() => nav('results')}>Results</span></>}
      {view === 'result-detail' && <><span className={styles.breadcrumbSep}>›</span><span className={styles.breadcrumbActive}>{selResult?.paper}</span></>}
    </div>
  );

  return (
    <div className={styles.root}>
      <DashboardSidebar
        items={NAV_ITEMS}
        activeKey={view === 'result-detail' ? 'results' : view}
        onNav={key => nav(key)}
        onBrandClick={() => router.push('/')}
      />

      <main className={styles.main}>
        <DashboardTopBar showBack={view !== 'home'} breadcrumb={breadcrumb} />

        <div className={styles.content}>
          {view === 'home' && (
            <div className={styles.fadeIn}>
              <div className={styles.pageHeader}>
                <div>
                  <h1 className={styles.pageTitle}>Dashboard</h1>
                  <p className={styles.pageSubtitle}>Welcome back</p>
                </div>
              </div>
              <HomeCards onNavigate={key => nav(key)} />
              <DeadlineList deadlines={UPCOMING_DEADLINES} onSelect={code => nav('upload', { preCode: code })} />
              <ScoreTrend data={SCORE_TREND} />
            </div>
          )}

          {view === 'upload' && (
            <UploadSheetForm prefilledCode={preCode} onCancel={() => window.history.back()} />
          )}

          {view === 'results' && (
            <ResultsList results={RESULTS} onView={r => nav('result-detail', { result: r })} />
          )}

          {view === 'result-detail' && selResult && (
            <ResultDetail result={selResult} onBack={() => window.history.back()} />
          )}
        </div>
      </main>
    </div>
  );
}
