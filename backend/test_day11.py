"""
Automated verification suite for Day 11: In-App Notifications Engine and Event Triggers.
Tests:
1. Challan upload event trigger: Student uploads slip -> Accounts Officer receives 'New Receipt Submitted' alert.
2. Challan rejection event trigger: Officer rejects slip -> Student receives 'Wrong Fee Slip' alert with reason.
3. Challan approval event trigger: Officer approves slip -> Student receives 'Fee Verified' confirmation alert.
4. Single-read workflow: POST /notifications/{id}/read marks an alert as read and updates unread_count.
5. Batch-read workflow: POST /notifications/read-all clears all unread alert badges for the user.
6. Privacy & ownership isolation: Users cannot access or mark other users' notifications as read.
"""

import io
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, Fee, FeeReceipt, Registration, Notification

client = TestClient(app)

print("==================================================")
print("🧪 Running Day 11 In-App Notifications Tests...")
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

# Reset Student's fee voucher for clean testing
db = SessionLocal()
student_user = db.query(User).filter(User.reg_no == "23F-0509").first()
target_fee = db.query(Fee).join(Registration).filter(Registration.user_id == student_user.id).first()
target_fee_id = target_fee.id
target_fee.status = "unpaid"
db.commit()
db.close()

# ------------------------------------------------------------------------------
# 1. Challan Upload Event -> Alerts Accounts Officer
# ------------------------------------------------------------------------------
print("\n[1/6] Testing Upload Event Trigger (Student -> Accounts Officer alert):")
# Record baseline officer unread count
initial_officer_feed = client.get("/notifications", headers=officer_headers).json()
initial_officer_unread = initial_officer_feed["unread_count"]

# Student uploads valid PDF challan
pdf_file = io.BytesIO(b"%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF")
upload_res = client.post(
    f"/fees/{target_fee_id}/receipt",
    headers=student_headers,
    files={"file": ("slip_test_day11.pdf", pdf_file, "application/pdf")}
)
assert upload_res.status_code in [200, 201], f"Challan upload failed: {upload_res.text}"
receipt_id = upload_res.json()["id"]

# Inspect officer's notifications
officer_feed = client.get("/notifications", headers=officer_headers).json()
print(f"  • Officer Unread Count: {officer_feed['unread_count']} (Was {initial_officer_unread})")
assert officer_feed["unread_count"] >= initial_officer_unread + 1

newest_officer_notif = officer_feed["notifications"][0]
print(f"  • Title:   {newest_officer_notif['title']}")
print(f"  • Message: {newest_officer_notif['message']}")
assert newest_officer_notif["title"] == "New Receipt Submitted"
assert "23F-0509" in newest_officer_notif["message"]
assert newest_officer_notif["is_read"] is False
print("  ✓ Test 1 Passed: Uploading challan automatically notified Accounts Officers!")

# ------------------------------------------------------------------------------
# 2. Challan Rejection Event -> Alerts Student with Reason
# ------------------------------------------------------------------------------
print("\n[2/6] Testing Rejection Event Trigger (Accounts Officer -> Student alert):")
reject_reason = "Bank branch stamp is missing; please upload stamped copy."
res_reject = client.post(
    f"/accounts/receipts/{receipt_id}/reject",
    headers=officer_headers,
    json={"reason": reject_reason}
)
assert res_reject.status_code == 200, "Receipt rejection failed"

# Inspect student's notifications
student_feed = client.get("/notifications", headers=student_headers).json()
newest_student_notif = student_feed["notifications"][0]
print(f"  • Student Alert Title:   {newest_student_notif['title']}")
print(f"  • Student Alert Message: {newest_student_notif['message']}")
assert newest_student_notif["title"] == "Wrong Fee Slip"
assert reject_reason in newest_student_notif["message"]
assert newest_student_notif["is_read"] is False
print("  ✓ Test 2 Passed: Rejecting slip automatically sent rejection reason to Student!")

# ------------------------------------------------------------------------------
# 3. Challan Approval Event -> Alerts Student of Confirmation
# ------------------------------------------------------------------------------
print("\n[3/6] Testing Approval Event Trigger (Accounts Officer -> Student confirmation):")
# Student re-uploads corrected PDF
reupload_pdf = io.BytesIO(b"%PDF-1.4\n% Corrected Stamped Challan\n%%EOF")
res_reupload = client.post(
    f"/fees/{target_fee_id}/receipt",
    headers=student_headers,
    files={"file": ("slip_stamped.pdf", reupload_pdf, "application/pdf")}
)
assert res_reupload.status_code in [200, 201]
new_receipt_id = res_reupload.json()["id"]

# Officer approves receipt
res_approve = client.post(f"/accounts/receipts/{new_receipt_id}/approve", headers=officer_headers)
assert res_approve.status_code == 200, "Receipt approval failed"

# Inspect student's notifications
student_feed_approved = client.get("/notifications", headers=student_headers).json()
latest_approval_notif = student_feed_approved["notifications"][0]
print(f"  • Approval Alert Title:   {latest_approval_notif['title']}")
print(f"  • Approval Alert Message: {latest_approval_notif['message']}")
assert latest_approval_notif["title"] == "Fee Verified"
assert latest_approval_notif["is_read"] is False
print("  ✓ Test 3 Passed: Approving slip automatically confirmed payment to Student!")

# ------------------------------------------------------------------------------
# 4. Mark Single Notification as Read
# ------------------------------------------------------------------------------
print("\n[4/6] Testing Single Notification Read Workflow (POST /notifications/{id}/read):")
notif_to_read = latest_approval_notif["id"]
unread_before = student_feed_approved["unread_count"]

res_read = client.post(f"/notifications/{notif_to_read}/read", headers=student_headers)
print(f"  • Read Status Code: {res_read.status_code} (Expected 200)")
assert res_read.status_code == 200
assert res_read.json()["is_read"] is True

# Verify unread counter decremented
updated_feed = client.get("/notifications", headers=student_headers).json()
print(f"  • Unread Count: {updated_feed['unread_count']} (Decremented from {unread_before})")
assert updated_feed["unread_count"] == unread_before - 1
print("  ✓ Test 4 Passed: Individual alert marked as read and counter updated!")

# ------------------------------------------------------------------------------
# 5. Mark All Notifications as Read (Batch Clear)
# ------------------------------------------------------------------------------
print("\n[5/6] Testing Batch Read Workflow (POST /notifications/read-all):")
res_read_all = client.post("/notifications/read-all", headers=student_headers)
print(f"  • Read All Status Code: {res_read_all.status_code} (Expected 200)")
assert res_read_all.status_code == 200

# Confirm unread count is now 0
cleared_feed = client.get("/notifications", headers=student_headers).json()
print(f"  • Remaining Unread Alerts: {cleared_feed['unread_count']} (Expected 0)")
assert cleared_feed["unread_count"] == 0
print("  ✓ Test 5 Passed: All notification badges cleared successfully!")

# ------------------------------------------------------------------------------
# 6. Privacy & Ownership Isolation
# ------------------------------------------------------------------------------
print("\n[6/6] Testing User Ownership Isolation (Student cannot read Officer's alert):")
officer_notif_id = newest_officer_notif["id"]
res_cross_user = client.post(f"/notifications/{officer_notif_id}/read", headers=student_headers)
print(f"  • Cross-user Access Status Code: {res_cross_user.status_code} (Expected 404)")
assert res_cross_user.status_code == 404
print("  ✓ Test 6 Passed: Users strictly forbidden from accessing other users' alerts!")

print("\n==================================================")
print("🎉 ALL DAY 11 NOTIFICATIONS TESTS PASSED!")
print("==================================================")

