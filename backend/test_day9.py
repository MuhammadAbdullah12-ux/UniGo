"""
Verification script for Day 9: Accounts Officer Review Queue, Search, and PDF Streaming.
Tests:
1. Dashboard KPI stats calculation (GET /accounts/stats).
2. Filtered review queue retrieval (GET /accounts/receipts?status=pending).
3. Case-insensitive search by student name and registration number.
4. Detailed receipt dossier inspection and PDF document streaming.
5. Student financial ledger and historical audit timeline retrieval.
6. Role authorization guard: student is blocked with 403 Forbidden.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("==================================================")
print("🧪 Running Day 9 Accounts Officer Verification Tests...")
print("==================================================")

# ------------------------------------------------------------------------------
# 1. Accounts Officer Login & Dashboard Stats (GET /accounts/stats)
# ------------------------------------------------------------------------------
print("\n[1/6] Testing Accounts Officer Login & KPI Stats:")
officer_login = client.post("/auth/login", json={"identifier": "accounts@unigo.test", "password": "AccountsPassword123"})
assert officer_login.status_code == 200, "Accounts Officer login failed"
officer_token = officer_login.json()["access_token"]
officer_headers = {"Authorization": f"Bearer {officer_token}"}

res_stats = client.get("/accounts/stats", headers=officer_headers)
print(f"  • Status Code: {res_stats.status_code} (Expected 200)")
stats = res_stats.json()
print(f"  • Pending Receipts:   {stats['pending_count']}")
print(f"  • Approved Today:     {stats['approved_today_count']}")
print(f"  • Rejected Count:     {stats['rejected_count']}")
print(f"  • Total Revenue:      Rs. {stats['total_collected_amount']}")
assert res_stats.status_code == 200
print("  ✓ Test 1 Passed: KPI dashboard metrics calculated successfully!")

# ------------------------------------------------------------------------------
# 2. Filtered Review Queue (GET /accounts/receipts?status=pending)
# ------------------------------------------------------------------------------
print("\n[2/6] Testing Pending Review Queue:")
res_queue = client.get("/accounts/receipts?status=pending", headers=officer_headers)
print(f"  • Status Code: {res_queue.status_code} (Expected 200)")
queue = res_queue.json()
print(f"  • Pending Items Found: {len(queue)}")
if len(queue) > 0:
    first_item = queue[0]
    print(f"    - Student:  {first_item['student_name']} ({first_item['student_reg_no']})")
    print(f"    - Route:    {first_item['route_name']}")
    print(f"    - Amount:   Rs. {first_item['amount']}")
    print(f"    - Is Late:  {first_item['is_late']}")
assert res_queue.status_code == 200
print("  ✓ Test 2 Passed: Review queue retrieved with timing compliance flags!")

# ------------------------------------------------------------------------------
# 3. Case-Insensitive Search by Roll Number and Name
# ------------------------------------------------------------------------------
print("\n[3/6] Testing Case-Insensitive Search:")
# Search by lowercase roll number (23f-0509)
res_search_roll = client.get("/accounts/receipts?q=23f-0509", headers=officer_headers)
print(f"  • Search '23f-0509' Status: {res_search_roll.status_code} | Matches: {len(res_search_roll.json())}")
assert res_search_roll.status_code == 200
assert len(res_search_roll.json()) >= 1

# Search by partial name (Abdullah)
res_search_name = client.get("/accounts/receipts?q=Abdullah", headers=officer_headers)
print(f"  • Search 'Abdullah' Status: {res_search_name.status_code} | Matches: {len(res_search_name.json())}")
assert res_search_name.status_code == 200
assert len(res_search_name.json()) >= 1
print("  ✓ Test 3 Passed: Case-insensitive search operational!")

# ------------------------------------------------------------------------------
# 4. Detailed Dossier & PDF Streaming for Verify Screen
# ------------------------------------------------------------------------------
print("\n[4/6] Testing Verify Screen Right Panel & PDF Streaming:")
if len(queue) > 0:
    target_receipt_id = queue[0]["id"]

    # 4a. Get full detailed dossier
    res_detail = client.get(f"/accounts/receipts/{target_receipt_id}", headers=officer_headers)
    print(f"  • Dossier Retrieval Status: {res_detail.status_code} (Expected 200)")
    detail = res_detail.json()
    print(f"    - Phone:        {detail['student_phone']}")
    print(f"    - Student Type: {detail['student_type']}")
    print(f"    - Trip Type:    {detail['trip_type']}")
    print(f"    - Due Date:     {detail['due_date']}")
    assert res_detail.status_code == 200

    # 4b. Stream the PDF document for the officer's viewer
    res_pdf = client.get(f"/accounts/receipts/{target_receipt_id}/file", headers=officer_headers)
    print(f"  • PDF Stream Status:        {res_pdf.status_code} (Expected 200)")
    assert res_pdf.status_code == 200
    assert res_pdf.content.startswith(b"%PDF")
    print("  ✓ Test 4 Passed: Right panel dossier and left panel PDF stream verified!")

# ------------------------------------------------------------------------------
# 5. Individual Student Financial History Ledger
# ------------------------------------------------------------------------------
print("\n[5/6] Testing Student Financial Ledger (GET /accounts/students/{user_id}):")
# Student 23F-0509 has ID 1
res_ledger = client.get("/accounts/students/1", headers=officer_headers)
print(f"  • Ledger Status Code: {res_ledger.status_code} (Expected 200)")
ledger = res_ledger.json()
print(f"  • Student:         {ledger['student']['full_name']} ({ledger['student']['reg_no']})")
if ledger.get('fee'):
    print(f"  • Active Fee:      Rs. {ledger['fee']['amount']} ({ledger['fee']['status']})")
print(f"  • Total Receipts:  {len(ledger.get('receipts', []))}")
assert res_ledger.status_code == 200
print("  ✓ Test 5 Passed: Student financial timeline retrieved successfully!")

# ------------------------------------------------------------------------------
# 6. Role Authorization Guard (Student Blocked from Accounts Routes)
# ------------------------------------------------------------------------------
print("\n[6/6] Testing RBAC Security: Student blocked from Accounts Portal:")
student_login = client.post("/auth/login", json={"identifier": "23F-0509", "password": "Password123"})
student_token = student_login.json()["access_token"]
student_headers = {"Authorization": f"Bearer {student_token}"}

res_illegal_stats = client.get("/accounts/stats", headers=student_headers)
print(f"  • Student Access to /accounts/stats:    {res_illegal_stats.status_code} (Expected 403)")
assert res_illegal_stats.status_code == 403

res_illegal_queue = client.get("/accounts/receipts", headers=student_headers)
print(f"  • Student Access to /accounts/receipts: {res_illegal_queue.status_code} (Expected 403)")
assert res_illegal_queue.status_code == 403
print("  ✓ Test 6 Passed: Student unauthorized access was strictly blocked with 403 Forbidden!")

print("\n==================================================")
print("🎉 ALL DAY 9 ACCOUNTS VERIFICATION TESTS PASSED!")
print("==================================================")

