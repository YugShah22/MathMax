import { SEEDED_SCORES } from './mockData';

/** Triggers a CSV download of all student scores for a given paper. */
export function exportCSV(paper, subject) {
  const rows = [['Student', 'Score', 'Grade', 'Paper', 'Subject']];
  for (let i = 0; i < paper.submissions; i++) {
    const sc = SEEDED_SCORES[i % SEEDED_SCORES.length];
    const grade = sc >= 85 ? 'A' : sc >= 65 ? 'B' : sc >= 40 ? 'C' : 'F';
    rows.push([`Student ${String(i + 1).padStart(2, '0')}`, sc, grade, paper.title, subject.name]);
  }
  const csv  = rows.map(r => r.join(',')).join('\n');
  const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${paper.code}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
