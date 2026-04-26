# Known Issues Register

_Status: launch-blocking issues must be updated before each release wave._

| ID | Severity | Issue | Scope | Current decision | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| KI-001 | P0 | Production staging proof absent | Release | Production no-go until staging packet is complete | Engineering | Open |
| KI-002 | P0 | Attachment object lifecycle unproven | Storage | Attachments deferred from production launch | Platform/Data | Open |
| KI-003 | P1 | Backup/restore and rollback drills not exercised | Ops | Required before production | Ops/SRE | Open |
| KI-004 | P1 | Mobile production smoke absent | Mobile | Mobile preview/deferred | Product/QA | Open |
| KI-005 | P1 | Rate limiting uses in-process buckets | API abuse control | Acceptable for local/alpha proof; distributed production needs shared store | Security/Platform | Open |

## Update rule

Known issues must include user impact, workaround, owner, target decision date,
and whether rollout should pause.
