"""
Automated verification suite for Day 10: Accounts Officer Approve & Reject Decisions.
Tests:
1. Rejection workflow: Officer rejects receipt with formal reason -> Fee and Receipt marked 'rejected'.
2. Idempotency guard: Finalized receipt cannot be re-approved or re-rejected (400 Bad Request).
3. Student re-upload loop: Rejected status unlocks upload endpoint for student to upload corrected challan.
4. Approval workflow: Officer approves corrected receipt -> Receipt marked 'approved', Fee marked 'paid'.
5. Input validation guard: Whitespace-only or empty rejection reason rejected (422 Unprocessable Entity).
6. Security guard: Regular student is blocked from approve/reject endpoints (403 Forbidden).
"""

import io
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, Fee, FeeReceipt, Registration

client = TestClient(app)

print("==================================================")
print("🧪 Running Day 10 Accounts Approve & Reject Tests...")
print("==================================================")

# ------------------------------------------------------------------------------
# Setup: Authenticate Accounts Officer and Student
# ------------------------------------------------------------------------------
print("\n[Setup] Authenticating test accounts:")
# 1. Accounts Officer
officer_login = client.post("/auth/login", json={"identifier": "accounts@unigo.test", "password": "AccountsPassword123"})
assert officer_login.status_code == 200, "Accounts Officer login failed"
officer_token = officer_login.json()["access_token"]
officer_headers = {"Authorization": f"Bearer {officer_token}"}
print("  • Accounts Officer authenticated.")

# 2. Student 23F-0509
student_login = client.post("/auth/login", json={"identifier": "23F-0509", "password": "Password123"})
assert student_login.status_code == 200, "Student login failed"
student_token = student_login.json()["access_token"]
student_headers = {"Authorization": f"Bearer {student_token}"}
print("  • Student 23F-0509 authenticated.")

# ------------------------------------------------------------------------------
# Setup: Ensure Student has an active fee and a pending receipt
# ------------------------------------------------------------------------------
db = SessionLocal()
student_user = db.query(User).filter(User.reg_no == "23F-0509").first()
target_fee = db.query(Fee).join(Registration).filter(Registration.user_id == student_user.id).first()

# Reset fee to 'unpaid' for a clean test cycle
target_fee.status = "unpaid"
db.commit()

# Upload a valid test receipt as student so we have a 'pending' receipt
pdf_file = io.BytesIO(b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF")
upload_res = client.post(
    f"/fees/{target_fee.id}/receipt",
    headers=student_headers,
    files={"file": ("slip_test_initial.pdf", pdf_file, "application/pdf")}
)
assert upload_res.status_code in [200, 201], f"Initial receipt upload failed: {upload_res.status_code} {upload_res.text}"
initial_receipt_id = upload_res.json()["id"]
print(f"  • Test receipt #{initial_receipt_id} prepared in 'pending' status.")
db.close()

# ------------------------------------------------------------------------------
# 1. Rejection Workflow (POST /accounts/receipts/{id}/reject)
# ------------------------------------------------------------------------------
print("\n[1/6] Testing Rejection Workflow with Mandatory Feedback:")
reject_payload = {"reason": "Challan scan is blurry; bank stamp is not readable."}
res_reject = client.post(f"/accounts/receipts/{initial_receipt_id}/reject", headers=officer_headers, json=reject_payload)
print(f"  • Reject Status Code: {res_reject.status_code} (Expected 200)")
assert res_reject.status_code == 200
data_reject = res_reject.json()
print(f"  • Status:        {data_reject['status']}")
print(f"  • Reject Reason: {data_reject['reject_reason']}")
assert data_reject["status"] == "rejected"
assert data_reject["reject_reason"] == reject_payload["reason"]

# Verify Fee status in DB transitioned to 'rejected'
db = SessionLocal()
updated_fee = db.query(Fee).filter(Fee.id == target_fee.id).first()
assert updated_fee.status == "rejected", f"Expected fee status 'rejected', got '{updated_fee.status}'"
db.close()
print("  ✓ Test 1 Passed: Receipt and Fee successfully transitioned to 'rejected'!")

# ------------------------------------------------------------------------------
# 2. Idempotency Guard: Cannot process already finalized receipt
# ------------------------------------------------------------------------------
print("\n[2/6] Testing Idempotency Guards (Double-action prevention):")
# 2a. Attempting to reject again
res_dup_reject = client.post(f"/accounts/receipts/{initial_receipt_id}/reject", headers=officer_headers, json={"reason": "Second try"})
print(f"  • Re-reject Status Code: {res_dup_reject.status_code} (Expected 400)")
assert res_dup_reject.status_code == 400
assert "already been processed" in res_dup_reject.json()["detail"]

# 2b. Attempting to approve a rejected receipt
res_dup_approve = client.post(f"/accounts/receipts/{initial_receipt_id}/approve", headers=officer_headers)
print(f"  • Cross-action Status Code: {res_dup_approve.status_code} (Expected 400)")
assert res_dup_approve.status_code == 400
assert "already been processed" in res_dup_approve.json()["detail"]
print("  ✓ Test 2 Passed: Finalized receipts cannot be re-processed!")

# ------------------------------------------------------------------------------
# 3. Student Re-Upload Loop (Student fixes the rejected slip)
# ------------------------------------------------------------------------------
print("\n[3/6] Testing Re-Upload Pipeline (Student fixes the challan):")
corrected_pdf = io.BytesIO(b"%PDF-1.4\n% Corrected High Res Bank Slip\n%%EOF")
res_reupload = client.post(
    f"/fees/{target_fee.id}/receipt",
    headers=student_headers,
    files={"file": ("slip_corrected.pdf", corrected_pdf, "application/pdf")}
)
print(f"  • Re-upload Status Code: {res_reupload.status_code} (Expected 201 Created)")
assert res_reupload.status_code in [200, 201]
new_receipt_id = res_reupload.json()["id"]
print(f"  • New Receipt ID: #{new_receipt_id} (Status: {res_reupload.json()['status']})")
assert res_reupload.json()["status"] == "pending"
print("  ✓ Test 3 Passed: Re-upload loop operational!")

# ------------------------------------------------------------------------------
# 4. Approval Workflow (POST /accounts/receipts/{id}/approve)
# ------------------------------------------------------------------------------
print("\n[4/6] Testing Approval Workflow on Corrected Challan:")
res_approve = client.post(f"/accounts/receipts/{new_receipt_id}/approve", headers=officer_headers)
print(f"  • Approve Status Code: {res_approve.status_code} (Expected 200)")
assert res_approve.status_code == 200
data_approve = res_approve.json()
print(f"  • Receipt Status: {data_approve['status']}")
print(f"  • Feedback:       {data_approve['message']}")
assert data_approve["status"] == "approved"

# Verify Fee status in DB transitioned to 'paid'
db = SessionLocal()
paid_fee = db.query(Fee).filter(Fee.id == target_fee.id).first()
print(f"  • Parent Fee Status in DB: '{paid_fee.status}' (Expected 'paid')")
assert paid_fee.status == "paid"
db.close()
print("  ✓ Test 4 Passed: Receipt approved and Fee transitioned to 'paid'!")

# ------------------------------------------------------------------------------
# 5. Validation Guard: Reject Reason cannot be whitespace
# ------------------------------------------------------------------------------
print("\n[5/6] Testing Rejection Reason Whitespace Guard:")
res_blank_reason = client.post(f"/accounts/receipts/{new_receipt_id}/reject", headers=officer_headers, json={"reason": "   "})
print(f"  • Blank Reason Status Code: {res_blank_reason.status_code} (Expected 422)")
assert res_blank_reason.status_code == 422
print("  ✓ Test 5 Passed: Empty/whitespace reasons strictly blocked!")

# ------------------------------------------------------------------------------
# 6. Security Guard: Student Blocked from Staff Actions
# ------------------------------------------------------------------------------
print("\n[6/6] Testing RBAC Security: Student blocked from Approve/Reject:")
res_unauthorized_approve = client.post(f"/accounts/receipts/{new_receipt_id}/approve", headers=student_headers)
print(f"  • Student Calling Approve Status: {res_unauthorized_approve.status_code} (Expected 403)")
assert res_unauthorized_approve.status_code == 403

res_unauthorized_reject = client.post(f"/accounts/receipts/{new_receipt_id}/reject", headers=student_headers, json={"reason": "Hacking attempt"})
print(f"  • Student Calling Reject Status:  {res_unauthorized_reject.status_code} (Expected 403)")
assert res_unauthorized_reject.status_code == 403
print("  ✓ Test 6 Passed: Unauthorized student requests strictly blocked with 403 Forbidden!")

print("\n==================================================")
print("🎉 ALL DAY 10 APPROVE & REJECT TESTS PASSED!")
print("==================================================")

