---
sidebar_position: 2
---

# Architecture

DataFlow is a modular monolith with separately deployable processes —
deliberately. Boundaries are explicit so hot domains can be extracted later,
but premature network splits are a non-goal.

## Runtime

```
Browser ──▶ React/Vite SPA (nginx) ──▶ Go API
                                        ├─▶ PostgreSQL   metadata, tenants, RLS, outbox
                                        ├─▶ Redis        rate limits, event stream
                                        ├─▶ Temporal     workflow history, queues
                                        └─▶ ClickHouse   analytics serving
            Temporal ──▶ Go workflow workers (test/prod)
                          └─▶ Go activity workers ──▶ sources / sinks /
                                encrypted DataRef payloads /
                                Cohestra compute control plane (Flink/Spark)
```

One Go module, `apps/workflow-go`, builds three binaries:

- **`api`** — identity, tenants, catalog, pipeline/version lifecycle, run
  control, monitoring, lineage, analytics, billing, outbox dispatch.
- **`workflow-worker`** — deterministic Temporal DAG orchestration; no network
  or database I/O.
- **`activity-worker`** — connector I/O, payload handling, checkpoints, sink
  writes, execution bookkeeping.

Processes share code and contracts, not in-memory state. Temporal task queues
separate Integration (`test`) and Production (`prod`) execution.

## Data ownership

| Store | Owns |
| --- | --- |
| PostgreSQL | System of record: tenants, users, versions, executions, checkpoints, entitlements, audit, outboxes. RLS is a second tenant boundary. |
| Temporal | Workflow history, retries, timers, signals. Payload codec is AES-256-GCM; production fails to start without the encryption key. |
| Redis | Not a system of record — rate-limit counters and a bounded event stream; PostgreSQL outbox rows are the durable source. |
| ClickHouse | Derived analytics store; rebuildable, never authoritative. |

Large `DataRef` payloads use client-side encrypted object storage; inline and
PostgreSQL payloads only under explicit size and retention limits.

## Compute offload

Pipelines can run steps on the
[Cohestra Control Plane](/docs/) when Flink or Spark execution is selected —
the activity workers hand jobs to it and track results.

Full detail, extraction seams, and the scale model:
[ARCHITECTURE.md](https://github.com/Cohestra/cohestra-dataflow/blob/main/docs/ARCHITECTURE.md).
