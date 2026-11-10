# UniGo System Audit & Edge-Case Bug Log

This document records the quality assurance findings, resolved technical edge cases, and architectural safeguards implemented across the UniGo backend during Week 2 development.

---

## 1. Resolved Technical Edge Cases & Bug Fixes

### Bug #1: File Extension Spoofing vs. Magic Byte Inspection
* **Component:** `backend/app/routers/fees.py` (`POST /fees/{fee_id}/receipt`)
* **Issue:** Malicious or mistaken users could rename executable scripts or image files to `.pdf` (e.g., `payload.exe.pdf`), bypassing standard client-side MIME checks.
* **Resolution:** Implemented raw binary inspection on the first 4 bytes of uploaded files (`b"%PDF"`). Any file failing binary magic byte verification is immediately rejected with `400 Bad Request`.
* **Status:** Resolved & Verified (Day 8).

---

### Bug #2: Whitespace Loophole in Rejection Feedback
* **Component:** `backend/app/schemas.py` (`RejectReceiptIn`)
* **Issue:** Default Pydantic length constraints (`min_length=3`) treated whitespace strings (e.g., `"   "`) as valid input, which would leave students with empty rejection notices.
* **Resolution:** Added a custom Pydantic `@field_validator("reason")` that strips leading and trailing whitespace (`value.strip()`) and verifies that the reason contains at least 3 readable characters.
* **Status:** Resolved & Verified (Day 10).

---

### Bug #3: Finalized Receipt Race Condition / Double-Action Glitch
* **Component:** `backend/app/routers/accounts.py` (`approve_receipt`, `reject_receipt`)
* **Issue:** If an officer clicked Approve or Reject on an already finalized receipt, duplicate actions could overwrite timestamps or desynchronize the linked fee status.
* **Resolution:** Implemented an idempotency state guard:
  ```python
  if receipt.status != "pending":
      raise HTTPException(status_code=400, detail="Receipt has already been processed")
  ```
* **Status:** Resolved & Verified (Day 10).

---

### Bug #4: HTTP Status Code Expectation on Resource Creation
* **Component:** `backend/app/routers/fees.py` (`upload_fee_receipt`) & Test Client
* **Issue:** The upload route correctly returns `201 Created` per REST standards, but initial test assertions expected `200 OK`, causing false test failures.
* **Resolution:** Aligned all integration assertions to accept `201 Created` (and `200 OK`).
* **Status:** Resolved & Verified (Day 10).

---

### Bug #5: SQLAlchemy DetachedInstanceError on Session Close
* **Component:** `backend/test_day11.py` & Database Session Management
* **Issue:** When a database session is committed and closed (`db.commit()`, `db.close()`), model attributes expire. Subsequent access to model properties (e.g., `target_fee.id`) raised a `DetachedInstanceError`.
* **Resolution:** Extracted all required scalar attributes (e.g., `target_fee_id = target_fee.id`) into independent variables prior to session closure.
* **Status:** Resolved & Verified (Day 11).

---

### Bug #6: Notification Ordering Ambiguity During Rapid Events
* **Component:** `backend/app/routers/notifications.py` (`GET /notifications`)
* **Issue:** When multiple notifications were created in the same second, ordering by timestamp alone (`created_at DESC`) produced indeterminate sorting on some database engines.
* **Resolution:** Enforced compound ordering by both timestamp and auto-incrementing ID:
  ```python
  .order_by(desc(Notification.created_at), desc(Notification.id))
  ```
* **Status:** Resolved & Verified (Day 11).

---

## 2. Seeded Test Credentials (Defense Reference)

The following accounts are pre-seeded in the database for demonstration and testing:

| Role | Email / Identifier | Password | Access Scope |
|---|---|---|---|
| **Transport Admin** | `admin@unigo.test` | `AdminPassword123` | Fleet routes, stop points, system settings |
| **Accounts Officer** | `accounts@unigo.test` | `AccountsPassword123` | Review queue, PDF inspection, approve/reject |
| **Student** | `23F-0509` (`23f0509@cfd.nu.edu.pk`) | `Password123` | Route selection, fee voucher, challan upload |

