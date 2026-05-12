/**
 * Frontend API client — single module for all backend calls.
 * Every component imports from here instead of mockData.js.
 */

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  // CSV returns text
  if (res.headers.get('content-type')?.includes('text/csv')) {
    return res;
  }
  return res.json();
}

/**
 * Upload a file — uses FormData, no Content-Type header (browser sets boundary).
 * @param {File} file
 * @param {'qp'|'answer'|'solution'} type
 * @returns {{ filePath: string }}
 */
export async function uploadFile(file, type = 'general') {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);
  const res = await fetch('/api/upload', { method: 'POST', body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Upload failed');
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────
export async function register({ name, email, password, role }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
}

export async function login({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export async function getMe() {
  return request('/api/auth/me');
}

// ── Subjects (teacher) ───────────────────────────────────────────────────
export async function getSubjects() {
  return request('/api/subjects');
}

export async function createSubject({ name, color }) {
  return request('/api/subjects', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

export async function deleteSubject(id) {
  return request(`/api/subjects/${id}`, { method: 'DELETE' });
}

// ── Papers ────────────────────────────────────────────────────────────────
export async function getPapers(subjectId) {
  return request(`/api/papers?subjectId=${subjectId}`);
}

export async function createPaper({ subjectId, title, deadline }) {
  return request('/api/papers', {
    method: 'POST',
    body: JSON.stringify({ subjectId, title, deadline }),
  });
}

export async function lookupPaper(code) {
  return request(`/api/papers/lookup?code=${encodeURIComponent(code)}`);
}

export async function getDeadlines() {
  return request('/api/papers/deadlines');
}

// ── Submissions ───────────────────────────────────────────────────────────
export async function getSubmissions(paperId) {
  return request(`/api/submissions?paperId=${paperId}`);
}

export async function createSubmission({ paperId, filePath }) {
  return request('/api/submissions', {
    method: 'POST',
    body: JSON.stringify({ paperId, filePath }),
  });
}

export async function getSubmission(id) {
  return request(`/api/submissions/${id}`);
}

export async function updateMarks(submissionId, qBreakdown) {
  return request(`/api/submissions/${submissionId}/marks`, {
    method: 'PATCH',
    body: JSON.stringify({ qBreakdown }),
  });
}

// ── Results (student) ────────────────────────────────────────────────────
export async function getResults() {
  return request('/api/results');
}

export async function getResultStats() {
  return request('/api/results/stats');
}

// ── Analytics (teacher) ──────────────────────────────────────────────────
export async function getAnalytics(paperId) {
  return request(`/api/analytics?paperId=${paperId}`);
}

// ── Re-evaluations ──────────────────────────────────────────────────────
export async function getReevaluations() {
  return request('/api/reevaluations');
}

export async function createReevaluation({ submissionId, question, reason }) {
  return request('/api/reevaluations', {
    method: 'POST',
    body: JSON.stringify({ submissionId, question, reason }),
  });
}

export async function resolveReevaluation(id, { status, teacherNote }) {
  return request(`/api/reevaluations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, teacherNote }),
  });
}

// ── Export ───────────────────────────────────────────────────────────────
export async function exportCSV(paperId) {
  const res = await fetch(`/api/export/csv?paperId=${paperId}`);
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `results_${paperId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Enrollments ─────────────────────────────────────────────────────────
export async function getEnrollments() {
  return request('/api/enrollments');
}

export async function joinSubject(joinCode) {
  return request('/api/enrollments', {
    method: 'POST',
    body: JSON.stringify({ joinCode }),
  });
}

export async function resolveEnrollment(id, status) {
  return request(`/api/enrollments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
