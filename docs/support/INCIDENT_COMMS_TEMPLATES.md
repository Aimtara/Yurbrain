# Incident Communications Templates

Status: draft templates; customize per incident before sending.

## Internal incident start

```text
Incident declared: [SEV]
Started: [time]
Detected by: [alert/user/internal]
Affected surface: [api/web/auth/storage/ai/data]
Current user impact: [known/unknown]
DRI: [name]
Comms owner: [name]
Next update: [time]
```

## User-facing initial notice

```text
We are investigating an issue affecting [surface]. Yurbrain may be slower or unavailable for some users.
Your saved memories are our priority; we will share another update by [time].
```

## User-facing update

```text
Update: we have identified the issue as [brief non-sensitive cause]. We are [mitigating/rolling back/restoring].
Current impact: [impact].
Next update: [time].
```

## Resolution notice

```text
Resolved: the issue affecting [surface] has been mitigated as of [time].
We are monitoring and will follow up if we identify any user-impacting data concerns.
```

## Data-impact notice placeholder

Use only after engineering/security review.

```text
We identified a data-impacting incident affecting [scope]. We are contacting affected users directly with details and support options.
We do not make unsupported claims; we will share verified facts and remediation steps as they are confirmed.
```
