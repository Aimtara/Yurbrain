# Privacy Workflows

_Status: alpha governance baseline; not legal advice or certification._

## Principles

- Minimize collection to product-continuity needs.
- Prefer user-scoped derived summaries over raw event exposure.
- Do not expose raw support/admin diagnostics without a scoped access model.
- Do not make GDPR/HIPAA/SOC 2 claims unless formally reviewed and certified.

## Access request workflow

1. Receive request through support/security contact.
2. Verify requester identity through the auth provider account email/session.
3. Export user-scoped records:
   - profile,
   - BrainItems,
   - artifacts,
   - threads/messages,
   - feed cards,
   - tasks/sessions,
   - preferences,
   - events,
   - attachment metadata and storage objects if storage is production-supported.
4. Review export for third-party or cross-user data.
5. Deliver through an approved secure channel.
6. Record request date, verifier, completion date, and exceptions.

## Deletion request workflow

1. Verify requester identity.
2. Confirm scope: account deactivation, content archive, or full deletion.
3. Capture backup/restore implications before deletion.
4. Delete or anonymize user-scoped records according to the final retention policy.
5. Delete storage objects if attachment storage is in scope.
6. Confirm completion to the requester.

## Current gaps

- No production account deletion/export automation is implemented.
- BrainItem archive exists; hard-delete/cascade policy is pending.
- Attachment object deletion is production-deferred.
- Retention windows are pending product/legal review.
