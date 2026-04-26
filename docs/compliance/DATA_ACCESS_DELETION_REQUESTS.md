# Data Access and Deletion Requests

_Status: alpha workflow placeholder; legal/privacy review required before public launch._

## Request intake

Supported intake channels for alpha:

- authenticated in-product support request once support tooling exists,
- support email or private founder/customer channel,
- security/privacy contact listed in launch materials.

Do not accept account deletion/export requests from unauthenticated parties without identity verification.

## Identity verification

Before disclosing or deleting user data:

1. Confirm requester controls the account email or authenticated session.
2. Record request timestamp, verifier, and scope.
3. Confirm whether request is access/export, correction, deactivation, deletion, or incident-related preservation.
4. Never ask users to send passwords, tokens, or secret links.

## Access/export scope

Minimum export inventory when implemented:

- profile metadata,
- BrainItems and notes/source metadata,
- artifacts/summaries/classifications/connections,
- threads/messages/comments,
- feed card state,
- tasks/sessions,
- preferences,
- attachment metadata and storage objects if production-supported,
- event-derived summaries where safe.

Raw internal events should not be exported as a broad stream until privacy/legal review defines a scoped format.

## Deletion/deactivation scope

Current repository status:

- BrainItems support `active`/`archived`; hard-delete product/API policy is pending.
- Attachment object lifecycle is production-deferred.
- Account deletion workflow is not yet automated.

Until automation exists, production launch must document limitations and require manual operator review for deletion requests.

## SLA targets for alpha

| Request type | Target response | Target completion |
| --- | --- | --- |
| Access/export | 5 business days | 30 days |
| Deactivation | 5 business days | 14 days |
| Deletion | 5 business days | 30 days after verification, unless retention hold applies |
| Security/privacy incident | same day | incident-runbook dependent |

These targets are operational goals, not regulatory claims.

## Evidence record

Each request record should include:

- request ID,
- requester account,
- verified identity method,
- request type,
- data scope,
- operator,
- completion timestamp,
- exceptions/retention holds,
- user communication sent.
