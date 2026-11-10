"""
Comprehensive end-to-end integration test suite for UniGo (Mid-Evaluation Full-Loop).
Simulates the complete university journey across all 5 domain modules:
1. Student registers account and authenticates.
2. Student browses campus bus routes and enrolls in full-semester commute (auto-generates fee).
3. Student uploads bank payment challan -> Accounts Officer receives real-time alert.
4. Accounts Officer reviews queue, inspects dossier, and rejects with formal feedback.
5. Student receives rejection alert, inspects reason, and re-uploads corrected PDF.
6. Accounts Officer approves corrected challan -> Fee voucher marked 'paid' -> Student receives confirmation alert.
7. Student verifies active transport pass and confirmed booking.
"""

import io
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, Route, Registration, Fee, FeeReceipt, Notification

client = TestClient(app)

print("==================================================")
print("🚀 RUNNING UNIGO FULL-LOOP END-TO-END INTEGRATION TEST")
print("==================================================")

# ------------------------------------------------------------------------------
# Pre-Flight: Clean up previous test run artifacts for student 24F-0888
# ------------------------------------------------------------------------------
db = SessionLocal()
existing_student = db.query(User).filter(User.reg_no == "24F-0888").first()
if existing_student:
    db.delete(existing_student)
    db.commit()
db.close()

# ------------------------------------------------------------------------------
# 1. Student Registration & Authentication
# ------------------------------------------------------------------------------
print("\n[Phase 1] Student Registration & Authentication:")
reg_payload = {
    "reg_no": "24F-0888",
    "full_name": "Hamza Tariq",
    "email": "24f0888@cfd.nu.edu.pk",
    "password": "Password123",
    "student_type": "day_scholar",
    "phone": "03009876543"
}
res_register = client.post("/auth/register", json=reg_payload)
print(f"  • Registration Status: {res_register.status_code} (Expected 201/200)")
assert res_register.status_code in [200, 201], f"Registration failed: {res_register.text}"
student_data = res_register.json()
assert student_data["reg_no"] == "24F-0888"
assert student_data["role"] == "student"

# Log in as newly registered student
res_login = client.post("/auth/login", json={"identifier": "24F-0888", "password": "Password123"})
assert res_login.status_code == 200, "Student login failed"
student_token = res_login.json()["access_token"]
student_headers = {"Authorization": f"Bearer {student_token}"}
print("  ✓ Phase 1 Passed: Student successfully registered and authenticated!")

# ------------------------------------------------------------------------------
# 2. Route Discovery & Enrollment (Billing Calculation)
# ------------------------------------------------------------------------------
print("\n[Phase 2] Route Discovery & Fee Generation:")
res_routes = client.get("/routes", headers=student_headers)
assert res_routes.status_code == 200
routes = res_routes.json()
assert len(routes) >= 1, "No active bus routes available"
selected_route = routes[0]
print(f"  • Selected Route: Route {selected_route['id']} - {selected_route['name']} (Base Fee: Rs. {selected_route['fee_amount']})")

# Enroll student in selected route
res_enroll = client.post(
    "/registrations",
    headers=student_headers,
    json={"route_id": selected_route["id"], "trip_type": "two_way", "semester": "Fall 2026"}
)
assert res_enroll.status_code in [200, 201], f"Enrollment failed: {res_enroll.text}"
fee_voucher = res_enroll.json()
print(f"  • Generated Voucher ID: #{fee_voucher['id']} | Amount: Rs. {fee_voucher['amount']} | Status: {fee_voucher['status']}")
assert fee_voucher["amount"] == 36000.0, "Day scholar fee must equal full semester Rs. 36,000"
assert fee_voucher["status"] == "unpaid"
target_fee_id = fee_voucher["id"]
print("  ✓ Phase 2 Passed: Bus route booked and Rs. 36,000 fee voucher generated!")

# ------------------------------------------------------------------------------
# 3. Initial Challan Upload -> Accounts Officer Notification
# ------------------------------------------------------------------------------
print("\n[Phase 3] Challan Submission & Staff Event Dispatch:")
# Log in as Accounts Officer to monitor inbox
officer_login = client.post("/auth/login", json={"identifier": "accounts@unigo.test", "password": "AccountsPassword123"})
assert officer_login.status_code == 200
officer_token = officer_login.json()["access_token"]
officer_headers = {"Authorization": f"Bearer {officer_token}"}

officer_feed_before = client.get("/notifications", headers=officer_headers).json()
officer_unread_before = officer_feed_before["unread_count"]

# Student uploads initial challan PDF
initial_pdf = io.BytesIO(b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF")
res_upload = client.post(
    f"/fees/{target_fee_id}/receipt",
    headers=student_headers,
    files={"file": ("hbl_challan_initial.pdf", initial_pdf, "application/pdf")}
)
assert res_upload.status_code in [200, 201], f"Challan upload failed: {res_upload.text}"
initial_receipt_id = res_upload.json()["id"]

# Verify Accounts Officer received alert
officer_feed_after = client.get("/notifications", headers=officer_headers).json()
assert officer_feed_after["unread_count"] >= officer_unread_before + 1
newest_alert = officer_feed_after["notifications"][0]
print(f"  • Officer Alert Title: {newest_alert['title']}")
print(f"  • Officer Alert Body:  {newest_alert['message']}")
assert newest_alert["title"] == "New Receipt Submitted"
assert "24F-0888" in newest_alert["message"]
print("  ✓ Phase 3 Passed: Challan uploaded and Accounts Officer alerted in real time!")

# ------------------------------------------------------------------------------
# 4. Officer Review & Rejection Workflow
# ------------------------------------------------------------------------------
print("\n[Phase 4] Officer Inspection & Rejection Feedback:")
# Officer inspects pending queue and opens detailed dossier
res_detail = client.get(f"/accounts/receipts/{initial_receipt_id}", headers=officer_headers)
assert res_detail.status_code == 200
dossier = res_detail.json()
print(f"  • Reviewing Submission for: {dossier['student_name']} ({dossier['student_reg_no']}) - Rs. {dossier['amount']}")

# Officer rejects challan due to missing bank stamp
reject_feedback = "Bank branch stamp and teller signature are missing. Please upload verified copy."
res_reject = client.post(
    f"/accounts/receipts/{initial_receipt_id}/reject",
    headers=officer_headers,
    json={"reason": reject_feedback}
)
assert res_reject.status_code == 200
assert res_reject.json()["status"] == "rejected"

# Student checks notifications to inspect rejection feedback
student_feed = client.get("/notifications", headers=student_headers).json()
student_rejection_alert = student_feed["notifications"][0]
print(f"  • Student Alert: '{student_rejection_alert['title']}' -> {student_rejection_alert['message']}")
assert student_rejection_alert["title"] == "Wrong Fee Slip"
assert reject_feedback in student_rejection_alert["message"]

# Verify fee voucher status transitioned to 'rejected'
res_my_fee = client.get("/fees/my", headers=student_headers)
assert res_my_fee.status_code == 200
assert res_my_fee.json()["status"] == "rejected"
print("  ✓ Phase 4 Passed: Slip rejected, fee flagged, and student notified with exact reason!")

# ------------------------------------------------------------------------------
# 5. Student Corrected Re-Upload & Final Approval
# ------------------------------------------------------------------------------
print("\n[Phase 5] Student Re-Upload & Officer Approval:")
# Student uploads stamped, corrected PDF
corrected_pdf = io.BytesIO(b"%PDF-1.4\n% Genuine Stamped Bank Voucher\n%%EOF")
res_reupload = client.post(
    f"/fees/{target_fee_id}/receipt",
    headers=student_headers,
    files={"file": ("hbl_challan_stamped.pdf", corrected_pdf, "application/pdf")}
)
assert res_reupload.status_code in [200, 201]
corrected_receipt_id = res_reupload.json()["id"]

# Officer approves the corrected slip
res_approve = client.post(f"/accounts/receipts/{corrected_receipt_id}/approve", headers=officer_headers)
assert res_approve.status_code == 200
assert res_approve.json()["status"] == "approved"

# Student verifies fee voucher is now marked 'paid'
res_final_fee = client.get("/fees/my", headers=student_headers)
assert res_final_fee.status_code == 200
final_fee_record = res_final_fee.json()
print(f"  • Final Fee Status:   {final_fee_record['status'].upper()}")
print(f"  • Confirmed Route:    {final_fee_record['route_name']}")
assert final_fee_record["status"] == "paid"

# Student confirms receipt of 'Fee Verified' notification
final_student_feed = client.get("/notifications", headers=student_headers).json()
final_alert = final_student_feed["notifications"][0]
print(f"  • Final Notification: '{final_alert['title']}' -> {final_alert['message']}")
assert final_alert["title"] == "Fee Verified"
print("  ✓ Phase 5 Passed: Slip approved, fee confirmed as PAID, and student notified!")

print("\n==================================================")
print("🎉 FULL-LOOP UNIGO INTEGRATION TEST PASSED 100%!")
print("==================================================")

