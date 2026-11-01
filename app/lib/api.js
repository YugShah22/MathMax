/**
 * Frontend API client — single module for all backend calls.
 * Every component imports from here instead of mockData.js.
 */

async function request(url, options = {}) {
  // Read tab-isolated token from sessionStorage (works in browser only)
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('mm_token') : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...authHeader, ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    let msg = data.detail || data.error || `Request failed (${res.status})`;
    if (Array.isArray(msg)) {
      msg = msg.map(m => m.msg || m.message || JSON.stringify(m)).join(', ');
    } else if (typeof msg === 'object') {
      msg = JSON.stringify(msg);
    }
    throw new Error(msg);
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

// ── Auth — all calls routed to FastAPI via /api/v1/auth ──────────────────
// Phase 3.1: FastAPI is the single authentication authority.
// The Next.js rewrite proxy forwards /api/v1/* to http://127.0.0.1:8000/api/v1/*.

export async function register({ name, email, password, role }) {
  // FastAPI: POST /api/v1/auth/register → { access_token, token_type, user }
  const data = await request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
  // Normalise to the shape the rest of the app expects: { token, user }
  return { token: data.access_token, user: data.user };
}

export async function login({ email, password, role }) {
  // FastAPI: POST /api/v1/auth/login → { access_token, token_type, user }
  const data = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  // Validate role on the client side (role comes from the DB via FastAPI, not the request)
  if (role && data.user.role !== role) {
    throw new Error(
      `This account is registered as a ${data.user.role}. Please sign in under the correct role.`
    );
  }
  // Normalise to the shape the rest of the app expects: { token, user }
  return { token: data.access_token, user: data.user };
}

export async function logout() {
  // Clear sessionStorage locally; no server-side session to invalidate for stateless JWT.
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('mm_token');
    sessionStorage.removeItem('mm_role');
    sessionStorage.removeItem('mm_name');
    sessionStorage.removeItem('mm_id');
  }
  return { ok: true };
}

export async function getMe() {
  // FastAPI: GET /api/v1/auth/me → { user: { id, name, email, role, ... } }
  return request('/api/v1/auth/me');
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

export async function updateSubject(id, { name, color }) {
  return request(`/api/subjects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, color }),
  });
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

export async function updatePaper(id, { title, deadline }) {
  return request(`/api/papers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title, deadline }),
  });
}

export async function deletePaper(id) {
  return request(`/api/papers/${id}`, { method: 'DELETE' });
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

// ── Phase 2: Examinations ──────────────────────────────────────────────────
export async function getExaminationStats() {
  return request('/api/v1/examinations/dashboard-stats');
}

export async function getExaminations({ status, search, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  if (page) params.append('page', page);
  if (pageSize) params.append('page_size', pageSize);
  const q = params.toString() ? `?${params.toString()}` : '';
  return request(`/api/v1/examinations${q}`);
}

export async function getExamination(id) {
  return request(`/api/v1/examinations/${id}`);
}

export async function createExamination(data) {
  return request('/api/v1/examinations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateExamination(id, data) {
  return request(`/api/v1/examinations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteExamination(id) {
  return request(`/api/v1/examinations/${id}`, { method: 'DELETE' });
}

export async function duplicateExamination(id) {
  return request(`/api/v1/examinations/${id}/duplicate`, { method: 'POST' });
}

export async function publishExamination(id) {
  return request(`/api/v1/examinations/${id}/publish`, { method: 'POST' });
}

export async function archiveExamination(id) {
  return request(`/api/v1/examinations/${id}/archive`, { method: 'POST' });
}

export async function checkPublishReadiness(id) {
  return request(`/api/v1/examinations/${id}/publish-check`);
}

// ── Phase 2: Questions ───────────────────────────────────────────────────────
export async function getQuestions(examinationId) {
  return request(`/api/v1/examinations/${examinationId}/questions`);
}

export async function getQuestion(id) {
  return request(`/api/v1/questions/${id}`);
}

export async function addQuestion(examinationId, data) {
  return request(`/api/v1/examinations/${examinationId}/questions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateQuestion(id, data) {
  return request(`/api/v1/questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteQuestion(id) {
  return request(`/api/v1/questions/${id}`, { method: 'DELETE' });
}

export async function reorderQuestions(examinationId, questions) {
  return request(`/api/v1/examinations/${examinationId}/questions/reorder`, {
    method: 'POST',
    body: JSON.stringify({ questions }),
  });
}

export async function duplicateQuestion(id, newQuestionNumber) {
  return request(`/api/v1/questions/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ new_question_number: newQuestionNumber }),
  });
}

// ── Phase 2: Answer Keys ────────────────────────────────────────────────────
export async function getAnswerKeyForQuestion(questionId) {
  return request(`/api/v1/questions/${questionId}/answer-key`);
}

export async function createOrUpdateAnswerKey(questionId, data) {
  return request(`/api/v1/questions/${questionId}/answer-key`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAnswerKeysForExam(examinationId) {
  return request(`/api/v1/examinations/${examinationId}/answer-keys`);
}

export async function updateAnswerKey(answerKeyId, data) {
  return request(`/api/v1/answer-keys/${answerKeyId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── Phase 2: Rubrics ─────────────────────────────────────────────────────────
export async function getRubricsForQuestion(questionId) {
  return request(`/api/v1/questions/${questionId}/rubrics`);
}

export async function getRubric(id) {
  return request(`/api/v1/rubrics/${id}`);
}

export async function createRubric(questionId, data) {
  return request(`/api/v1/questions/${questionId}/rubrics`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRubric(id, data) {
  return request(`/api/v1/rubrics/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function activateRubric(id) {
  return request(`/api/v1/rubrics/${id}/activate`, { method: 'POST' });
}

export async function archiveRubric(id) {
  return request(`/api/v1/rubrics/${id}/archive`, { method: 'POST' });
}

export async function duplicateRubric(id, targetQuestionId) {
  return request(`/api/v1/rubrics/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ target_question_id: targetQuestionId }),
  });
}

// ── Phase 2: Documents ──────────────────────────────────────────────────────
export async function uploadQuestionPaperDocument(examinationId, file) {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('mm_token') : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/v1/examinations/${examinationId}/question-paper`, {
    method: 'POST',
    headers: { ...authHeader },
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.error || 'Upload failed');
  }
  return res.json();
}

export async function uploadAnswerKeyDocument(examinationId, file) {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('mm_token') : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/v1/examinations/${examinationId}/answer-key-file`, {
    method: 'POST',
    headers: { ...authHeader },
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.error || 'Upload failed');
  }
  return res.json();
}

export async function getDocument(fileId) {
  return request(`/api/v1/documents/${fileId}`);
}

export async function deleteDocument(fileId) {
  return request(`/api/v1/documents/${fileId}`, { method: 'DELETE' });
}

// ── Phase 3: Document Ingestion & Answer Sheets ─────────────────────────────

export async function uploadAnswerSheet(examinationId, file, options = {}) {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('mm_token') : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const form = new FormData();
  form.append('file', file);
  if (options.studentId) form.append('student_id', options.studentId);
  if (options.submissionId) form.append('submission_id', options.submissionId);

  const res = await fetch(`/api/v1/examinations/${examinationId}/answer-sheets`, {
    method: 'POST',
    headers: { ...authHeader },
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    let msg = data.detail || data.error || 'Upload failed';
    if (Array.isArray(msg)) {
      msg = msg.map(m => m.msg || m.message || JSON.stringify(m)).join(', ');
    } else if (typeof msg === 'object') {
      msg = JSON.stringify(msg);
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function getExaminationAnswerSheets(examinationId, page = 1, pageSize = 50) {
  return request(`/api/v1/examinations/${examinationId}/answer-sheets?page=${page}&page_size=${pageSize}`);
}

export async function getMyUploadedDocuments(examinationId = null, page = 1, pageSize = 50) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (examinationId) query.set('examination_id', examinationId);
  return request(`/api/v1/students/me/documents?${query.toString()}`);
}

export async function getDocumentPages(fileId) {
  return request(`/api/v1/documents/${fileId}/pages`);
}

export async function getDocumentPage(fileId, pageId) {
  return request(`/api/v1/documents/${fileId}/pages/${pageId}`);
}

export async function getDocumentProcessingStatus(fileId) {
  return request(`/api/v1/documents/${fileId}/processing-status`);
}

export async function retryDocumentProcessing(fileId) {
  return request(`/api/v1/documents/${fileId}/retry`, { method: 'POST' });
}

export function getDocumentPageFileUrl(fileId, pageId) {
  return `/api/v1/documents/${fileId}/pages/${pageId}/file`;
}

export function getDocumentFileUrl(fileId) {
  return `/api/v1/documents/${fileId}/file`;
}

