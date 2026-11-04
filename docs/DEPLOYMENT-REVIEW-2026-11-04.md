# Deployment review — 2026-11-04

Reviewed the workflow changes through `f7f6f2d` against the deployed `a839865` baseline.

## Additional defects reproduced and fixed

1. **Administrative group-trade cancellation left membership behind.** Cancelling a completed group trade through a report did not recalculate participation or remove the cancelled participant from the group chat. The cancellation now updates both and records the cancellation in chat. The accepted-before-cancellation flag also preserves completed and already-cancelled history so the shared room remains discoverable during cleanup. A regression test verifies that the cancelled participant loses access while the host and other participant retain access.
2. **Concurrent duplicate requests on MySQL.** Two simultaneous requests by the same buyer both returned HTTP 201 and produced two rows under MySQL's default repeatable-read isolation. The transaction read the post before waiting for its write lock, leaving subsequent existence queries on the earlier snapshot. Hikari now explicitly uses `TRANSACTION_READ_COMMITTED`, so checks after aggregate locks see committed state. Existing write locks remain in place.

## Verification

- Backend: 181 tests, zero failures/errors/skips; production JAR built successfully.
- Frontend: 19 tests passed; production build passed with the existing approximately 516 kB chunk warning.
- Actual MySQL 8.4: used an isolated copy of the server database, a separate signing key and disabled mail, Firebase and AI credentials. No test requests were sent to the production application.
- New schema and migration applied successfully. Repeating the migration did not increment session versions again. User, post, trade, chat-room, message and review row counts were preserved. Legacy refresh sessions were revoked and the review uniqueness constraint was present.
- Seven concurrent API scenarios, five repetitions each: duplicate trade requests, competing market acceptance, the final group-buy seat, mutual completion, completion versus cancellation, duplicate review submission and duplicate chat-message IDs. All 35 passed after the isolation fix.
- Seven post-list sorting modes returned successfully against the migrated copy.
- The temporary validation container and database were removed after each run. Database dumps and credentials remain outside the repository.

## Release considerations

- Apply `MIGRATION-2026-11-04.sql` after the additive entity schema update and before reopening public traffic. Existing users must log in again once.
- Snapshot the database while public writes and backend jobs are stopped; retain prior application images and source for rollback. Do not restore an old DB snapshot automatically after reopening traffic.
- H2 tests alone did not reveal the MySQL defect above. Retain MySQL concurrency verification for future transaction or locking changes.
- This pass did not repeat real-device push receipt or every browser interaction. Earlier device results remain user-reported; they are not substituted for this release's automated and MySQL checks.
