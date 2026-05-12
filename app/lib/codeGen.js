/**
 * Generates a unique QP code from subject name + paper title.
 * Format: SUB-TT-NN  e.g. ALG-MT-01
 *
 * @param {string} subjectName
 * @param {string} paperTitle
 * @param {number} seq  — sequence number (count of existing papers + 1)
 */
export function generateCode(subjectName, paperTitle, seq) {
  const sub = subjectName.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'SUB';
  const words = paperTitle.trim().split(/\s+/);
  const tit = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : paperTitle.replace(/[^A-Z]/gi, '').slice(0, 2).toUpperCase() || 'PP';
  const num = String(seq).padStart(2, '0');
  return `${sub}-${tit}-${num}`;
}

/**
 * Generates a short join code for a subject.
 * Format: ALG-7X3K  (3-letter prefix + 4 random alphanumeric)
 */
export function generateJoinCode(subjectName) {
  const prefix = subjectName.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'SUB';
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${rand}`;
}
