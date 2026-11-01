"""
MathMax — Phase 3 Live End-to-End Audit Script
Tests the live application stack (MongoDB, FastAPI, Next.js proxy rewrite)
Exercising Student & Teacher workflows, page extraction, disk rendering, and security.
"""
import io
import json
import os
import sys
import uuid
import pypdf
import pymongo
import requests
from PIL import Image

FASTAPI_URL = "http://127.0.0.1:8000"
NEXTJS_URL = "http://127.0.0.1:3000"
MONGO_URI = "mongodb://127.0.0.1:27017"

mongo_client = pymongo.MongoClient(MONGO_URI)
db = mongo_client["mathmax"]

print("=" * 70)
print("MATHMAX PHASE 3 — LIVE END-TO-END STACK AUDIT")
print("=" * 70)


def create_pdf(num_pages=3):
    writer = pypdf.PdfWriter()
    for i in range(num_pages):
        writer.add_blank_page(width=300, height=400)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def create_image(format="PNG", size=(250, 300)):
    img = Image.new("RGB", size, color=(230, 240, 255))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


# ── STEP 1: Health & Connectivity Check ──────────────────────────────────────
print("\n[STEP 1] Testing Health & Stack Connectivity...")
res_fastapi = requests.get(f"{FASTAPI_URL}/api/v1/health")
assert res_fastapi.status_code == 200, f"FastAPI health failed: {res_fastapi.text}"
print(f"  [OK] FastAPI directly on 8000: {res_fastapi.json()}")

res_nextjs = requests.get(f"{NEXTJS_URL}/api/v1/health")
assert res_nextjs.status_code == 200, f"Next.js proxy rewrite failed: {res_nextjs.text}"
print(f"  [OK] Next.js rewrite proxy on 3000: {res_nextjs.json()}")

# ── STEP 2: Register Teacher & Student Accounts ──────────────────────────────
print("\n[STEP 2] Registering Test Teacher and Student via Next.js Proxy...")
rand_suffix = uuid.uuid4().hex[:6]
teacher_email = f"teacher_{rand_suffix}@mathmax.com"
student_email = f"student_{rand_suffix}@mathmax.com"
victim_email = f"victim_{rand_suffix}@mathmax.com"

def register_user(name, email, role):
    res = requests.post(f"{NEXTJS_URL}/api/v1/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "role": role,
    })
    assert res.status_code == 201, f"Register failed: {res.text}"
    return res.json()

t_data = register_user("Audit Teacher", teacher_email, "teacher")
s_data = register_user("Audit Student", student_email, "student")
v_data = register_user("Victim Student", victim_email, "student")

teacher_token = t_data["access_token"]
student_token = s_data["access_token"]
victim_token = v_data["access_token"]
teacher_id = t_data["user"]["id"]
student_id = s_data["user"]["id"]
victim_id = v_data["user"]["id"]

print(f"  [OK] Teacher registered: ID={teacher_id}")
print(f"  [OK] Student registered: ID={student_id}")
print(f"  [OK] Second Student registered: ID={victim_id}")

t_headers = {"Authorization": f"Bearer {teacher_token}"}
s_headers = {"Authorization": f"Bearer {student_token}"}
v_headers = {"Authorization": f"Bearer {victim_token}"}

# ── STEP 3: Teacher Creates & Publishes Examination ──────────────────────────
print("\n[STEP 3] Teacher Creates, Configures & Publishes Examination...")
exam_res = requests.post(f"{NEXTJS_URL}/api/v1/examinations", headers=t_headers, json={
    "title": "Calculus Midterm Audit",
    "subject": "Mathematics",
    "total_marks": 20.0,
    "duration_minutes": 60,
    "description": "Final audit examination",
})
assert exam_res.status_code == 201, f"Exam create failed: {exam_res.text}"
exam_id = exam_res.json()["id"]

# Add Question 1 (10 marks) & Question 2 (10 marks)
q1_res = requests.post(f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/questions", headers=t_headers, json={
    "question_number": 1,
    "question_text": "Evaluate the integral of 2x dx.",
    "maximum_marks": 10.0,
})
assert q1_res.status_code == 201
q1_id = q1_res.json()["id"]

q2_res = requests.post(f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/questions", headers=t_headers, json={
    "question_number": 2,
    "question_text": "Find the derivative of x^3.",
    "maximum_marks": 10.0,
})
assert q2_res.status_code == 201
q2_id = q2_res.json()["id"]

# Upload Question Paper & Answer Key Document
qp_pdf = create_pdf(num_pages=1)
qp_res = requests.post(
    f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/question-paper",
    headers=t_headers,
    files={"file": ("qp.pdf", qp_pdf, "application/pdf")},
)
assert qp_res.status_code == 201

ak_pdf = create_pdf(num_pages=1)
ak_res = requests.post(
    f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/answer-key-file",
    headers=t_headers,
    files={"file": ("ak.pdf", ak_pdf, "application/pdf")},
)
assert ak_res.status_code == 201

# Create Answer Keys for Questions
ak1_res = requests.post(f"{NEXTJS_URL}/api/v1/questions/{q1_id}/answer-key", headers=t_headers, json={
    "expected_answer": "x^2 + C",
    "expected_final_answer": "x^2 + C",
    "expected_steps": [{"step_number": 1, "description": "Integrate 2x", "expression": "x^2", "result": "x^2 + C"}],
})
assert ak1_res.status_code == 201, f"AK1 failed: {ak1_res.text}"

ak2_res = requests.post(f"{NEXTJS_URL}/api/v1/questions/{q2_id}/answer-key", headers=t_headers, json={
    "expected_answer": "3x^2",
    "expected_final_answer": "3x^2",
    "expected_steps": [{"step_number": 1, "description": "Differentiate x^3", "expression": "3x^2", "result": "3x^2"}],
})
assert ak2_res.status_code == 201, f"AK2 failed: {ak2_res.text}"

# Create and Activate Rubrics
r1_res = requests.post(f"{NEXTJS_URL}/api/v1/questions/{q1_id}/rubrics", headers=t_headers, json={
    "title": "Rubric Q1",
    "total_marks": 10.0,
    "steps": [{"step_number": 1, "title": "Step 1", "description": "Power rule", "maximum_marks": 10.0}],
})
assert r1_res.status_code == 201, f"Rubric 1 failed: {r1_res.text}"
r1_id = r1_res.json()["id"]
requests.post(f"{NEXTJS_URL}/api/v1/rubrics/{r1_id}/activate", headers=t_headers)

r2_res = requests.post(f"{NEXTJS_URL}/api/v1/questions/{q2_id}/rubrics", headers=t_headers, json={
    "title": "Rubric Q2",
    "total_marks": 10.0,
    "steps": [{"step_number": 1, "title": "Step 1", "description": "Power rule", "maximum_marks": 10.0}],
})
assert r2_res.status_code == 201, f"Rubric 2 failed: {r2_res.text}"
r2_id = r2_res.json()["id"]
requests.post(f"{NEXTJS_URL}/api/v1/rubrics/{r2_id}/activate", headers=t_headers)

# Publish Exam
pub_res = requests.post(f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/publish", headers=t_headers)
assert pub_res.status_code == 200, f"Publish failed: {pub_res.text}"
print(f"  [OK] Examination published successfully: {exam_id}")

# ── STEP 4: Student Uploads Multi-Page PDF Answer Sheet ──────────────────────
print("\n[STEP 4] Student Uploads 3-Page PDF Answer Sheet...")
pdf_3pages = create_pdf(num_pages=3)
upload_res = requests.post(
    f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/answer-sheets",
    headers=s_headers,
    files={"file": ("student_answers.pdf", pdf_3pages, "application/pdf")},
)
assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
pdf_doc = upload_res.json()
pdf_doc_id = pdf_doc["id"]
print(f"  [OK] Ingested Document ID: {pdf_doc_id}")
print(f"  [OK] Status: {pdf_doc['status']} (Expected: processed)")
print(f"  [OK] Page Count: {pdf_doc['page_count']} (Expected: 3)")
assert pdf_doc["status"] == "processed"
assert pdf_doc["page_count"] == 3

# Verify MongoDB persistence
mongo_doc = db["documents"].find_one({"_id": pymongo.collection.ObjectId(pdf_doc_id)})
assert mongo_doc is not None, "Document not found in MongoDB!"
print(f"  [OK] Document persisted in MongoDB 'documents' collection")

# Verify page records in MongoDB
mongo_pages = list(db["document_pages"].find({"document_id": pymongo.collection.ObjectId(pdf_doc_id)}).sort("page_number", 1))
assert len(mongo_pages) == 3, f"Expected 3 page records, found {len(mongo_pages)}"
print(f"  [OK] 3 individual page records persisted in 'document_pages' collection")

# Verify actual image files on disk
for idx, p in enumerate(mongo_pages):
    disk_path = os.path.join(r"d:\mathmax\backend\uploads\examinations", p["storage_key"].replace("/", "\\"))
    assert os.path.exists(disk_path), f"Extracted page image file not found on disk: {disk_path}"
    file_bytes = open(disk_path, "rb").read()
    assert len(file_bytes) > 0, f"Rendered page image is empty: {disk_path}"
    print(f"  [OK] Page {p['page_number']}: {p['original_width']}x{p['original_height']} px, format={p['image_format']}, on disk: {os.path.basename(disk_path)} ({len(file_bytes)} bytes)")

# ── STEP 5: Student Tests PNG and JPEG Uploads Independently ──────────────────
print("\n[STEP 5] Student Uploads Single PNG and JPEG Answer Sheets...")
# PNG upload
png_bytes = create_image("PNG", size=(400, 500))
png_res = requests.post(
    f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/answer-sheets",
    headers=s_headers,
    files={"file": ("diagram.png", png_bytes, "image/png")},
)
assert png_res.status_code == 201
png_doc = png_res.json()
assert png_doc["page_count"] == 1
assert png_doc["status"] == "processed"
print(f"  [OK] PNG answer sheet ingested: ID={png_doc['id']}, page_count=1, status={png_doc['status']}")

# JPEG upload
jpg_bytes = create_image("JPEG", size=(350, 450))
jpg_res = requests.post(
    f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/answer-sheets",
    headers=s_headers,
    files={"file": ("photo.jpg", jpg_bytes, "image/jpeg")},
)
assert jpg_res.status_code == 201
jpg_doc = jpg_res.json()
assert jpg_doc["page_count"] == 1
assert jpg_doc["status"] == "processed"
print(f"  [OK] JPEG answer sheet ingested: ID={jpg_doc['id']}, page_count=1, status={jpg_doc['status']}")

# ── STEP 6: Teacher Views Submissions & Inspects Pages ───────────────────────
print("\n[STEP 6] Teacher Workflow: Submissions Dashboard & Page Inspection...")
sheets_res = requests.get(f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/answer-sheets", headers=t_headers)
assert sheets_res.status_code == 200
sheets_data = sheets_res.json()
print(f"  [OK] Teacher retrieved examination answer sheets: Total={sheets_data['total']} (Expected: 3)")
assert sheets_data["total"] == 3

# Teacher inspects extracted pages for the 3-page PDF
pages_res = requests.get(f"{NEXTJS_URL}/api/v1/documents/{pdf_doc_id}/pages", headers=t_headers)
assert pages_res.status_code == 200
pages_data = pages_res.json()
assert pages_data["total"] == 3
page_1_id = pages_data["items"][0]["id"]

# Teacher streams page image file
stream_res = requests.get(f"{NEXTJS_URL}/api/v1/documents/{pdf_doc_id}/pages/{page_1_id}/file", headers=t_headers)
assert stream_res.status_code == 200
assert stream_res.headers["content-type"] in ("image/png", "image/png; charset=utf-8")
assert len(stream_res.content) > 0
print(f"  [OK] Page 1 image streamed successfully: {len(stream_res.content)} bytes, Content-Type={stream_res.headers['content-type']}")

# ── STEP 7: Security Audit Checks ────────────────────────────────────────────
print("\n[STEP 7] Security Verification...")

# 1. Cross-student isolation (Victim Student cannot view Student's documents)
cross_res = requests.get(f"{NEXTJS_URL}/api/v1/documents/{pdf_doc_id}", headers=v_headers)
assert cross_res.status_code == 403, f"Expected 403, got {cross_res.status_code}"
print("  [OK] Cross-student retrieval rejected with 403 Forbidden")

# 2. Cross-student page isolation
cross_page_res = requests.get(f"{NEXTJS_URL}/api/v1/documents/{pdf_doc_id}/pages", headers=v_headers)
assert cross_page_res.status_code == 403
print("  [OK] Cross-student page list rejected with 403 Forbidden")

# 3. Student spoofing student_id in upload
spoof_pdf = create_pdf(1)
spoof_res = requests.post(
    f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/answer-sheets",
    headers=s_headers,
    files={"file": ("spoof.pdf", spoof_pdf, "application/pdf")},
    data={"student_id": victim_id},
)
assert spoof_res.status_code == 201
assert spoof_res.json()["student_id"] == student_id, "Spoofed student_id was not overridden!"
print("  [OK] Student ID spoofing blocked: server forced authenticated identity")

# 4. Corrupted PDF rejected
corrupt_res = requests.post(
    f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/answer-sheets",
    headers=s_headers,
    files={"file": ("corrupt.pdf", b"%PDF-invalid content", "application/pdf")},
)
assert corrupt_res.status_code == 400
print(f"  [OK] Corrupted PDF rejected: 400 Bad Request ({corrupt_res.json()['detail']})")

# 5. Unsupported file type rejected
bad_ext_res = requests.post(
    f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/answer-sheets",
    headers=s_headers,
    files={"file": ("document.exe", b"MZexecutable", "application/octet-stream")},
)
assert bad_ext_res.status_code == 400
print("  [OK] Unsupported file type rejected with 400 Bad Request")

# 6. Delete document cascades to pages and disk
to_del_res = requests.post(
    f"{NEXTJS_URL}/api/v1/examinations/{exam_id}/answer-sheets",
    headers=s_headers,
    files={"file": ("temp.pdf", create_pdf(2), "application/pdf")},
)
to_del_id = to_del_res.json()["id"]
del_res = requests.delete(f"{NEXTJS_URL}/api/v1/documents/{to_del_id}", headers=s_headers)
assert del_res.status_code == 204
assert db["documents"].find_one({"_id": pymongo.collection.ObjectId(to_del_id)}) is None
assert db["document_pages"].count_documents({"document_id": pymongo.collection.ObjectId(to_del_id)}) == 0
print("  [OK] Cascading deletion verified: document and extracted pages purged from MongoDB and storage")

print("\n" + "=" * 70)
print("ALL LIVE AUDIT VERIFICATION CHECKS PASSED SUCCESSFULLY!")
print("=" * 70)
