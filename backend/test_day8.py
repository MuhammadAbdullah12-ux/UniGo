"""
Verification script for Day 8: PDF Challan Upload, File Security, and Streaming Retrieval.
Tests:
1. Valid PDF upload with magic bytes (%PDF) -> fee status transitions to 'pending'.
2. Anti-spoofing check: fake PDF (renamed text/image) is rejected with 400 Bad Request.
3. Oversized file protection: files exceeding 5 MB rejected with 413 Payload Too Large.
4. State guard: duplicate upload blocked while fee is 'pending'.
5. Privacy & authorization: Student B blocked (403), Accounts Officer authorized (200).
"""

import io
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Fee

client = TestClient(app)

print("==================================================")
print("🧪 Running Day 8 PDF Upload & Security Tests...")
print("==================================================")

# ------------------------------------------------------------------------------
# Setup: Log in Student 23F-0509 and ensure fee voucher is in 'unpaid' state
# ------------------------------------------------------------------------------
login_res = client.post("/auth/login", json={"identifier": "23F-0509", "password": "Password123"})
student_token = login_res.json()["access_token"]
student_headers = {"Authorization": f"Bearer {student_token}"}

# Retrieve student voucher
my_fee_res = client.get("/fees/my", headers=student_headers)
fee_id = my_fee_res.json()["id"]

# Reset fee status to 'unpaid' in database for clean testing if needed
db = SessionLocal()
target_fee = db.query(Fee).filter(Fee.id == fee_id).first()
target_fee.status = "unpaid"
db.commit()
db.close()

# ------------------------------------------------------------------------------
# 1. Valid PDF Upload (%PDF Magic Bytes)
# ------------------------------------------------------------------------------
print("\n[1/5] Testing Valid PDF Upload (%PDF header):")
valid_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF"
files = {"file": ("challan_receipt_bank.pdf", io.BytesIO(valid_pdf_content), "application/pdf")}

res_valid = client.post(f"/fees/{fee_id}/receipt", files=files, headers=student_headers)
print(f"  • Status Code: {res_valid.status_code} (Expected 201)")
receipt_data = res_valid.json()
print(f"  • Receipt ID:   {receipt_data.get('id')}")
print(f"  • Status:       {receipt_data.get('status')}")
print(f"  • Filename:     {receipt_data.get('original_name')}")

assert res_valid.status_code == 201
assert receipt_data["status"] == "pending"

updated_fee = client.get("/fees/my", headers=student_headers).json()
print(f"  • Fee Status:   {updated_fee['status']} (Expected 'pending')")
assert updated_fee["status"] == "pending"
print("  ✓ Test 1 Passed: Valid PDF uploaded and fee transitioned to 'pending'!")

# ------------------------------------------------------------------------------
# 2. Anti-Spoofing: Fake PDF Rejection (Missing %PDF Magic Bytes)
# ------------------------------------------------------------------------------
print("\n[2/5] Testing Anti-Spoofing: Fake file renamed to .pdf:")
db = SessionLocal()
target_fee = db.query(Fee).filter(Fee.id == fee_id).first()
target_fee.status = "unpaid"
db.commit()
db.close()

fake_content = b"This is plain text or malware renamed to a pdf file."
fake_file = {"file": ("malicious_file.pdf", io.BytesIO(fake_content), "application/pdf")}

res_fake = client.post(f"/fees/{fee_id}/receipt", files=fake_file, headers=student_headers)
print(f"  • Status Code: {res_fake.status_code} (Expected 400)")
print(f"  • Detail:      {res_fake.json().get('detail')}")
assert res_fake.status_code == 400
assert "genuine PDF documents" in res_fake.json().get("detail", "")
print("  ✓ Test 2 Passed: Fake PDF was caught and rejected by magic bytes inspection!")

# ------------------------------------------------------------------------------
# 3. Oversized File Protection (> 5 MB)
# ------------------------------------------------------------------------------
print("\n[3/5] Testing Oversized File Protection (> 5 MB limit):")
oversized_content = b"%PDF" + b"X" * (5 * 1024 * 1024 + 256)
oversized_file = {"file": ("heavy_scan.pdf", io.BytesIO(oversized_content), "application/pdf")}

res_oversized = client.post(f"/fees/{fee_id}/receipt", files=oversized_file, headers=student_headers)
print(f"  • Status Code: {res_oversized.status_code} (Expected 413)")
print(f"  • Detail:      {res_oversized.json().get('detail')}")
assert res_oversized.status_code == 413
assert "maximum permitted size" in res_oversized.json().get("detail", "")
print("  ✓ Test 3 Passed: Oversized file was rejected with 413 Payload Too Large!")

# ------------------------------------------------------------------------------
# 4. State Guard: Duplicate Submission Block while 'pending'
# ------------------------------------------------------------------------------
print("\n[4/5] Testing Duplicate Upload Prevention (while status is 'pending'):")
client.post(f"/fees/{fee_id}/receipt", files={"file": ("receipt.pdf", io.BytesIO(valid_pdf_content), "application/pdf")}, headers=student_headers)

duplicate_file = {"file": ("receipt_attempt_2.pdf", io.BytesIO(valid_pdf_content), "application/pdf")}
res_dup = client.post(f"/fees/{fee_id}/receipt", files=duplicate_file, headers=student_headers)
print(f"  • Status Code: {res_dup.status_code} (Expected 400)")
print(f"  • Detail:      {res_dup.json().get('detail')}")
assert res_dup.status_code == 400
assert "pending" in res_dup.json().get("detail", "")
print("  ✓ Test 4 Passed: Duplicate upload blocked while fee is pending verification!")

# ------------------------------------------------------------------------------
# 5. PDF Retrieval & Role-Based Privacy Guard (GET /fees/{fee_id}/receipt/file)
# ------------------------------------------------------------------------------
print("\n[5/5] Testing PDF Streaming and Privacy Protection:")
res_owner = client.get(f"/fees/{fee_id}/receipt/file", headers=student_headers)
print(f"  • Owner Access Status: {res_owner.status_code} (Expected 200)")
assert res_owner.status_code == 200
assert res_owner.content.startswith(b"%PDF")
print("  ✓ Student successfully retrieved their own PDF stream.")

student2_login = client.post("/auth/login", json={"identifier": "23F-0888", "password": "Password123"})
student2_token = student2_login.json()["access_token"]
student2_headers = {"Authorization": f"Bearer {student2_token}"}

res_spy = client.get(f"/fees/{fee_id}/receipt/file", headers=student2_headers)
print(f"  • Unauthorized Student Access Status: {res_spy.status_code} (Expected 403)")
assert res_spy.status_code == 403
print("  ✓ Privacy verified: Unauthorized student blocked with 403 Forbidden!")

officer_login = client.post("/auth/login", json={"identifier": "accounts@unigo.test", "password": "AccountsPassword123"})
officer_token = officer_login.json()["access_token"]
officer_headers = {"Authorization": f"Bearer {officer_token}"}

res_officer = client.get(f"/fees/{fee_id}/receipt/file", headers=officer_headers)
print(f"  • Accounts Officer Access Status:     {res_officer.status_code} (Expected 200)")
assert res_officer.status_code == 200
assert res_officer.content.startswith(b"%PDF")
print("  ✓ Accounts Officer successfully streamed the student's PDF!")

print("\n==================================================")
print("🎉 ALL DAY 8 PDF UPLOAD & SECURITY TESTS PASSED!")
print("==================================================")

