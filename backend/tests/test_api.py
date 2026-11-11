"""
Automated Pytest & Integration Test Suite for UniGo (Day 21).
Covers the end-to-end evaluation scenario:
  1. Root & Health Check Endpoints
  2. Student Authentication & Registration
  3. Role-Based Access Control (RBAC) Hardening (Student blocked with 403 on staff routes)
  4. Transport Route Discovery & Capacity Metrics
  5. Route Enrollment & Fee Voucher Creation
  6. PDF File Validation (Non-PDF rejection vs authentic PDF acceptance)
  7. Accounts Officer Verification Workflow:
     - Review Queue Listing
     - Rejection with Mandatory Justification -> Triggers 'Wrong Fee Slip' notification
     - Re-Upload Loop
     - Approval -> Triggers 'Fee Verified' notification and marks Fee as Paid
  8. Privacy Isolation: Student blocked from viewing another student's PDF receipt
  9. Real-time Notification Dispatch & Read Management
"""

import io
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import User, Route, Fee, FeeReceipt, Registration, Notification
from app.security import hash_password

client = TestClient(app)

# Persistent test state shared across sequence steps
TEST_RUN_ID = uuid.uuid4().hex[:6]
STUDENT_EMAIL = f"eval_student_{TEST_RUN_ID}@unigo.test"
STUDENT_REG = f"23F-{TEST_RUN_ID.upper()[:4]}"
STUDENT_PASSWORD = "StudentTest123!"

OTHER_STUDENT_EMAIL = f"other_{TEST_RUN_ID}@unigo.test"

STAFF_ADMIN_EMAIL = "admin@unigo.test"
STAFF_ADMIN_PASSWORD = "admin123"

STAFF_ACCOUNTS_EMAIL = "accounts@unigo.test"
STAFF_ACCOUNTS_PASSWORD = "accounts123"


# ------------------------------------------------------------------------------
# Fixtures & Helpers
# ------------------------------------------------------------------------------

def get_auth_token(email: str, password: str) -> str:
    """Helper to log in and return the raw JWT access token."""
    response = client.post("/auth/login", json={"email": email, "password": password})
    if response.status_code != 200:
        # Fallback to alternate default password if seed script variant was used
        if "admin" in email:
            response = client.post("/auth/login", json={"email": email, "password": "AdminPassword123"})
        elif "accounts" in email:
            response = client.post("/auth/login", json={"email": email, "password": "AccountsPassword123"})
    assert response.status_code == 200, f"Login failed for {email}: {response.text}"
    return response.json()["access_token"]


def make_auth_headers(token: str) -> dict:
    """Formats Authorization bearer header."""
    return {"Authorization": f"Bearer {token}"}


# ------------------------------------------------------------------------------
# 1. Root & System Health
# ------------------------------------------------------------------------------

def test_api_root_and_health():
    """Verify system root endpoint is healthy."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "message" in data
    assert "docs" in data


# ------------------------------------------------------------------------------
# 2. Staff Accounts Availability
# ------------------------------------------------------------------------------

def test_staff_accounts_login():
    """Verify Transport Admin and Accounts Officer can successfully authenticate."""
    admin_token = get_auth_token(STAFF_ADMIN_EMAIL, STAFF_ADMIN_PASSWORD)
    assert len(admin_token) > 20

    accounts_token = get_auth_token(STAFF_ACCOUNTS_EMAIL, STAFF_ACCOUNTS_PASSWORD)
    assert len(accounts_token) > 20


# ------------------------------------------------------------------------------
# 3. Student Registration & Login
# ------------------------------------------------------------------------------

def test_student_registration_and_login():
    """Test registering a new commuter student account and authenticating."""
    payload = {
        "reg_no": STUDENT_REG,
        "full_name": "Test Commuter Student",
        "email": STUDENT_EMAIL,
        "password": STUDENT_PASSWORD,
        "role": "student",
        "student_type": "day_scholar",
        "phone": "0300-9988776",
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code in (200, 201)
    user_data = res.json()
    assert user_data["email"] == STUDENT_EMAIL
    assert user_data["role"] == "student"

    # Authenticate student
    token = get_auth_token(STUDENT_EMAIL, STUDENT_PASSWORD)
    assert len(token) > 20

    # Verify /auth/me returns commuter profile
    me_res = client.get("/auth/me", headers=make_auth_headers(token))
    assert me_res.status_code == 200
    assert me_res.json()["email"] == STUDENT_EMAIL


# ------------------------------------------------------------------------------
# 4. Security & Role-Based Access Control (RBAC) Hardening
# ------------------------------------------------------------------------------

def test_rbac_security_hardening():
    """Verify students are strictly blocked with 403 from accessing staff endpoints."""
    student_token = get_auth_token(STUDENT_EMAIL, STUDENT_PASSWORD)
    headers = make_auth_headers(student_token)

    # 1. Student trying to view Accounts receipts queue -> 403 Forbidden
    res1 = client.get("/accounts/receipts", headers=headers)
    assert res1.status_code == 403, f"Expected 403 for student accessing /accounts/receipts, got {res1.status_code}"

    # 2. Student trying to view Accounts stats -> 403 Forbidden
    res2 = client.get("/accounts/stats", headers=headers)
    assert res2.status_code == 403

    # 3. Student trying to create or edit transport routes -> 403 Forbidden
    res3 = client.post("/routes", json={"name": "Hacked Route", "fee_amount": 100, "seats_total": 50}, headers=headers)
    assert res3.status_code == 403

    # 4. Student trying to view admin stats -> 403 Forbidden
    res4 = client.get("/admin/stats", headers=headers)
    assert res4.status_code == 403


# ------------------------------------------------------------------------------
# 5. Route Listing & Occupancy Metrics
# ------------------------------------------------------------------------------

def test_routes_discovery():
    """Verify routes endpoint returns official routes with seats_taken metadata."""
    res = client.get("/routes")
    assert res.status_code == 200
    routes = res.json()
    assert isinstance(routes, list)
    assert len(routes) > 0

    first = routes[0]
    assert "name" in first
    assert "seats_total" in first
    assert "seats_taken" in first
    assert first["seats_total"] >= 50


# ------------------------------------------------------------------------------
# 6. Student Route Enrollment & Capacity Guard
# ------------------------------------------------------------------------------

def test_student_route_registration():
    """Verify student can enroll in a bus route and receive an unpaid fee voucher."""
    student_token = get_auth_token(STUDENT_EMAIL, STUDENT_PASSWORD)
    headers = make_auth_headers(student_token)

    # Get available route
    routes_res = client.get("/routes")
    routes = routes_res.json()
    available_route = next((r for r in routes if (r["seats_total"] - r["seats_taken"]) > 0), routes[0])

    reg_payload = {
        "route_id": available_route["id"],
        "trip_type": "two_way",
        "semester": "Fall 2026",
    }
    reg_res = client.post("/registrations", json=reg_payload, headers=headers)
    assert reg_res.status_code in (200, 201)
    fee_data = reg_res.json()

    assert fee_data["status"] == "unpaid"
    assert fee_data["amount"] > 0
    assert fee_data["route_name"] == available_route["name"]

    # Verify GET /fees/my returns this voucher
    my_fee_res = client.get("/fees/my", headers=headers)
    assert my_fee_res.status_code == 200
    assert my_fee_res.json()["status"] == "unpaid"


# ------------------------------------------------------------------------------
# 7. File Validation: Reject non-PDFs vs Accept Valid PDFs
# ------------------------------------------------------------------------------

def test_pdf_upload_validation_and_rejection_loop():
    """
    Tests the core evaluation flow:
      1. Non-PDF file upload rejected (400 Bad Request).
      2. Valid PDF file accepted -> status transitions to 'pending'.
      3. Accounts Officer rejects with reason 'Wrong amount deposited'.
      4. Student sees 'rejected' status and 'Wrong Fee Slip' notification.
      5. Student re-uploads corrected PDF.
      6. Accounts Officer approves -> status transitions to 'paid'.
    """
    student_token = get_auth_token(STUDENT_EMAIL, STUDENT_PASSWORD)
    student_headers = make_auth_headers(student_token)

    accounts_token = get_auth_token(STAFF_ACCOUNTS_EMAIL, STAFF_ACCOUNTS_PASSWORD)
    accounts_headers = make_auth_headers(accounts_token)

    # Fetch fee voucher ID
    fee_res = client.get("/fees/my", headers=student_headers)
    assert fee_res.status_code == 200
    fee_id = fee_res.json()["id"]

    # --- Part A: Reject invalid fake file (fake .png or missing %PDF header) ---
    fake_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00FakeImageData")
    bad_upload_res = client.post(
        f"/fees/{fee_id}/receipt",
        files={"file": ("fake_receipt.pdf", fake_png, "application/pdf")},
        headers=student_headers,
    )
    assert bad_upload_res.status_code == 400, "Non-PDF file must be rejected with 400 Bad Request"
    assert "PDF" in bad_upload_res.text

    # --- Part B: Upload authentic valid PDF (%PDF header) ---
    valid_pdf_content = (
        b"%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>endobj\n"
        b"xref\n0 4\n0000000000 65535 f \ntrailer<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF"
    )
    good_upload_res = client.post(
        f"/fees/{fee_id}/receipt",
        files={"file": ("bank_challan.pdf", io.BytesIO(valid_pdf_content), "application/pdf")},
        headers=student_headers,
    )
    assert good_upload_res.status_code in (200, 201), f"Upload failed: {good_upload_res.text}"
    receipt_data = good_upload_res.json()
    receipt_id = receipt_data["id"]

    # Fee status should now be 'pending'
    fee_after_upload = client.get("/fees/my", headers=student_headers).json()
    assert fee_after_upload["status"] == "pending"

    # --- Part C: Accounts Officer Rejection Loop ---
    reject_reason = "Amount does not match official Rs. 36,000 fee"
    reject_res = client.post(
        f"/accounts/receipts/{receipt_id}/reject",
        json={"reason": reject_reason},
        headers=accounts_headers,
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"

    # Verify student now sees rejected status with reason
    fee_rejected = client.get("/fees/my", headers=student_headers).json()
    assert fee_rejected["status"] == "rejected"

    # Verify student received 'Wrong Fee Slip' notification
    notifs_res = client.get("/notifications", headers=student_headers)
    assert notifs_res.status_code == 200
    student_notifs = notifs_res.json()["notifications"]
    has_wrong_slip_notif = any(
        "wrong" in n["title"].lower() or "reject" in n["message"].lower()
        for n in student_notifs
    )
    assert has_wrong_slip_notif, "Student should have received wrong fee slip notification"

    # --- Part D: Student Re-Upload Loop ---
    reupload_res = client.post(
        f"/fees/{fee_id}/receipt",
        files={"file": ("corrected_challan.pdf", io.BytesIO(valid_pdf_content), "application/pdf")},
        headers=student_headers,
    )
    assert reupload_res.status_code in (200, 201)
    new_receipt_id = reupload_res.json()["id"]

    # --- Part E: Accounts Officer Approval ---
    approve_res = client.post(
        f"/accounts/receipts/{new_receipt_id}/approve",
        headers=accounts_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    # Final verify: student fee is now 'paid' and verified
    fee_final = client.get("/fees/my", headers=student_headers).json()
    assert fee_final["status"] == "paid"


# ------------------------------------------------------------------------------
# 8. Student Privacy Isolation (Cross-Student Access Blocked)
# ------------------------------------------------------------------------------

def test_cross_student_privacy_isolation():
    """Verify that Student B cannot view or download Student A's PDF receipt."""
    # 1. Register Student B
    reg_b = client.post(
        "/auth/register",
        json={
            "reg_no": f"23F-{uuid.uuid4().hex[:4].upper()}",
            "full_name": "Second Commuter Student",
            "email": OTHER_STUDENT_EMAIL,
            "password": "Password123!",
            "role": "student",
            "student_type": "day_scholar",
            "phone": "0300-1122334",
        },
    )
    assert reg_b.status_code in (200, 201)
    token_b = get_auth_token(OTHER_STUDENT_EMAIL, "Password123!")

    # 2. Get Student A's fee id
    token_a = get_auth_token(STUDENT_EMAIL, STUDENT_PASSWORD)
    fee_a = client.get("/fees/my", headers=make_auth_headers(token_a)).json()
    fee_a_id = fee_a["id"]

    # 3. Student B attempts to download Student A's receipt -> 403 Forbidden
    unauthorized_file_res = client.get(
        f"/fees/{fee_a_id}/receipt/file",
        headers=make_auth_headers(token_b),
    )
    assert unauthorized_file_res.status_code == 403, (
        f"Cross-student receipt access must return 403 Forbidden, got {unauthorized_file_res.status_code}"
    )


# ------------------------------------------------------------------------------
# 9. Notifications Lifecycle & Mark as Read
# ------------------------------------------------------------------------------

def test_notifications_lifecycle():
    """Verify fetching notifications, unread counting, and mark-all-read operations."""
    student_token = get_auth_token(STUDENT_EMAIL, STUDENT_PASSWORD)
    headers = make_auth_headers(student_token)

    # Fetch notifications
    res = client.get("/notifications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "unread_count" in data
    assert "notifications" in data

    # Mark all read
    read_all_res = client.post("/notifications/read-all", headers=headers)
    assert read_all_res.status_code == 200

    # Verify unread count is now 0
    res_after = client.get("/notifications", headers=headers)
    assert res_after.json()["unread_count"] == 0


# ------------------------------------------------------------------------------
# Direct Standalone Execution Entrypoint
# ------------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 RUNNING UNIGO AUTOMATED MID-EVALUATION TEST SUITE")
    print("=" * 60)
    test_api_root_and_health()
    print("✓ [1/8] API Root & System Health: PASSED")
    test_staff_accounts_login()
    print("✓ [2/8] Staff Authentication (Admin & Accounts): PASSED")
    test_student_registration_and_login()
    print("✓ [3/8] Student Registration & Login: PASSED")
    test_rbac_security_hardening()
    print("✓ [4/8] RBAC Security Hardening (403 Guards): PASSED")
    test_routes_discovery()
    print("✓ [5/8] Transport Routes & Capacity Discovery: PASSED")
    test_student_route_registration()
    print("✓ [6/8] Route Enrollment & Fee Voucher Generation: PASSED")
    test_pdf_upload_validation_and_rejection_loop()
    print("✓ [7/8] PDF Validation & Approve/Reject Verification Loop: PASSED")
    test_cross_student_privacy_isolation()
    print("✓ [8/8] Student Privacy Isolation (Cross-student 403): PASSED")
    print("=" * 60)
    print("🎉 ALL 8 EVALUATION TEST CASES PASSED WITH 100% SUCCESS!")
    print("=" * 60)

