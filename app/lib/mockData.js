// ── Subjects ──────────────────────────────────────────────────────────────
export const SUBJECTS = [
  { id: 1, name: 'Algebra',  papers: 3, color: '#7c3aed' },
  { id: 2, name: 'Calculus', papers: 1, color: '#0ea5e9' },
  { id: 3, name: 'Geometry', papers: 5, color: '#ec4899' },
];

// ── Papers (by subjectId) ──────────────────────────────────────────────────
export const PAPERS = {
  1: [
    { id: 'p1', title: 'Midterm Exam',       date: '2026-04-10', submissions: 24, code: 'ALG-MT-01', deadline: '2026-05-10T23:59' },
    { id: 'p2', title: 'Unit 3 Quiz',         date: '2026-04-04', submissions: 22, code: 'ALG-Q3-02', deadline: '2026-04-25T23:59' },
    { id: 'p3', title: 'Homework Assignment', date: '2026-03-28', submissions: 25, code: 'ALG-HW-03', deadline: '2026-05-01T23:59' },
  ],
  2: [
    { id: 'p4', title: 'Integration Test', date: '2026-04-12', submissions: 18, code: 'CAL-IT-04', deadline: '2026-05-08T23:59' },
  ],
  3: [
    { id: 'p5', title: 'Chapter 5 Test',    date: '2026-04-08', submissions: 20, code: 'GEO-C5-05', deadline: '2026-04-28T23:59' },
    { id: 'p6', title: 'Proofs Assignment', date: '2026-04-01', submissions: 19, code: 'GEO-PR-06', deadline: '2026-05-02T23:59' },
    { id: 'p7', title: 'Midterm',           date: '2026-03-25', submissions: 21, code: 'GEO-MT-07', deadline: '2026-04-22T23:59' },
  ],
};

// ── QP code lookup (student use) ──────────────────────────────────────────
export const QP_MAP = {
  'ALG-MT-01': { paper: 'Midterm Exam',       subject: 'Algebra',  deadline: '2026-05-10T23:59' },
  'ALG-Q3-02': { paper: 'Unit 3 Quiz',         subject: 'Algebra',  deadline: '2026-04-25T23:59' },
  'ALG-HW-03': { paper: 'Homework Assignment', subject: 'Algebra',  deadline: '2026-05-01T23:59' },
  'CAL-IT-04': { paper: 'Integration Test',    subject: 'Calculus', deadline: '2026-05-08T23:59' },
  'GEO-C5-05': { paper: 'Chapter 5 Test',      subject: 'Geometry', deadline: '2026-04-28T23:59' },
  'GEO-PR-06': { paper: 'Proofs Assignment',   subject: 'Geometry', deadline: '2026-05-02T23:59' },
  'GEO-MT-07': { paper: 'Midterm',             subject: 'Geometry', deadline: '2026-04-22T23:59' },
};

// ── Student results ────────────────────────────────────────────────────────
export const RESULTS = [
  { id: 1, subject: 'Algebra',  paper: 'Midterm Exam',     date: '2026-04-10', score: 87, code: 'ALG-MT-01' },
  { id: 2, subject: 'Geometry', paper: 'Chapter 5 Test',   date: '2026-04-08', score: 92, code: 'GEO-C5-05' },
  { id: 3, subject: 'Calculus', paper: 'Integration Test', date: '2026-04-12', score: 74, code: 'CAL-IT-04' },
  { id: 4, subject: 'Algebra',  paper: 'Unit 3 Quiz',      date: '2026-04-04', score: 81, code: 'ALG-Q3-02' },
  { id: 5, subject: 'Geometry', paper: 'Proofs Assignment',date: '2026-04-01', score: 68, code: 'GEO-PR-06' },
];

// ── Score trend (for chart) ────────────────────────────────────────────────
export const SCORE_TREND = [
  { label: 'Mar 15', score: 72 },
  { label: 'Mar 28', score: 81 },
  { label: 'Apr 01', score: 68 },
  { label: 'Apr 04', score: 81 },
  { label: 'Apr 08', score: 92 },
  { label: 'Apr 10', score: 87 },
  { label: 'Apr 12', score: 74 },
];

// ── Student upcoming deadlines ─────────────────────────────────────────────
export const UPCOMING_DEADLINES = [
  { paper: 'Homework Assignment', subject: 'Algebra',  code: 'ALG-HW-03', deadline: '2026-05-01T23:59' },
  { paper: 'Proofs Assignment',   subject: 'Geometry', code: 'GEO-PR-06', deadline: '2026-05-02T23:59' },
  { paper: 'Integration Test',    subject: 'Calculus', code: 'CAL-IT-04', deadline: '2026-05-08T23:59' },
];

// ── Re-evaluation requests ────────────────────────────────────────────────
export const REEVAL_REQUESTS = [
  { id:1, student:'Student 03', paper:'Midterm Exam',      subject:'Algebra',  question:'Q4', reason:'Answer partially correct, marks not given fairly.', status:'pending',  date:'2026-04-29' },
  { id:2, student:'Student 11', paper:'Unit 3 Quiz',       subject:'Algebra',  question:'Q7', reason:'Method is correct, marks deducted incorrectly.',    status:'pending',  date:'2026-04-28' },
  { id:3, student:'Student 07', paper:'Chapter 5 Test',    subject:'Geometry', question:'Q2', reason:'Used an alternative valid approach.',                status:'approved', date:'2026-04-27' },
  { id:4, student:'Student 19', paper:'Proofs Assignment', subject:'Geometry', question:'Q5', reason:'Partial credit should have been awarded.',           status:'rejected', date:'2026-04-26' },
];

// ── Seeded scores (for demo evaluation) ────────────────────────────────────
export const SEEDED_SCORES = [88,72,95,81,67,90,74,85,79,92,68,100,83,77,88,91,64,87,73,96,82,70,93,78];

// ── Question-wise breakdown (for result detail) ────────────────────────────
export const Q_BREAKDOWN = [[10,10],[8,10],[6,10],[9,10],[7,10],[10,10],[8,10],[9,10],[10,10],[10,10]];

// ── Subject colour palette ─────────────────────────────────────────────────
export const PALETTE = ['#7c3aed','#0ea5e9','#ec4899','#f59e0b','#10b981'];
