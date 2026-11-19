# ZoZo Live Recruitment – Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. Unauthenticated public applicants can **ONLY** `create` new documents in `/applications/{applicationId}` and atomic `/applications/{applicationId}/cvChunks/{chunkId}` with `status == 'Pending'` and `createdAt == request.time`.
2. Public / unauthenticated / non-admin users can **NEVER** `get`, `list`, `update`, or `delete` any `/applications/{applicationId}` or `/applications/{applicationId}/cvChunks/{chunkId}` document (strict PII isolation for WhatsApp numbers & CVs).
3. Every `/applications/{applicationId}/cvChunks/{chunkId}` must belong to an existing or batch-created parent `/applications/{applicationId}` (`existsAfter`) and match `applicationId`.
4. Only verified administrators (`liongroupdv@gmail.com` or an entry in `/adminAccess/{emailKey}`) with `email_verified == true` can read applications or CV chunks.
5. `Viewer` admins are strictly read-only (`update`/`delete` denied). `Editor` admins can update allowed fields (`status`, `name`, `country`, etc.) while keeping `id` and `createdAt` immutable (`updatedAt == request.time`), and can delete ONLY when `canDelete == true`.
6. Only the primary `Owner` (`liongroupdv@gmail.com` with `email_verified == true`) can write or delete `/adminAccess/{emailKey}` documents.

## 2. "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated List Scrape**: Unauthenticated `list` on `/applications` -> DENIED.
2. **Unauthenticated PII Read**: Unauthenticated `get` on `/applications/ZOZO-2026-ABC123` -> DENIED.
3. **Unauthenticated CV Chunk Scrape**: Unauthenticated `get`/`list` on `/applications/ZOZO-2026-ABC123/cvChunks` -> DENIED.
4. **Non-Admin User Read**: Signed-in non-admin (`stranger@gmail.com`, `email_verified: true`) `get` on `/applications/ZOZO-2026-ABC123` -> DENIED.
5. **Unverified Admin Email Spoof**: Signed-in user with `email: 'liongroupdv@gmail.com'`, `email_verified: false` -> DENIED.
6. **Public Self-Approval Create**: Unauthenticated `create` on `/applications/ZOZO-2026-HACK01` with `status: 'Approved'` -> DENIED.
7. **Shadow Field Injection on Create**: Public `create` with extra unknown field `{ ..., isAdminVerified: true }` -> DENIED via `keys().hasOnly(...)`.
8. **ID Poisoning Create**: Public `create` on `/applications/bad$id.with/chars` or > 64 chars -> DENIED via `isValidId(applicationId)`.
9. **Oversized CV / Denial of Wallet**: Public `create` with `cvFileSize: 99999999` or `workExperience` > 5000 chars -> DENIED.
10. **Client Timestamp Forgery**: Public `create` with backdated `createdAt` (`createdAt != request.time`) -> DENIED.
11. **Viewer Privilege Escalation**: Signed-in `Viewer` admin attempts `update` or `delete` on `/applications/ZOZO-2026-ABC123` -> DENIED.
12. **Editor Access Escalation**: Signed-in `Editor` attempts to create/update `/adminAccess/hacker_gmail_com` to promote themselves to `Owner` -> DENIED.
