---
sidebar_position: 7
---

# Editions

DataFlow is **open core**: the platform is Apache-2.0 and free to self-host;
a set of advanced features is commercial, unlocked per tenant.

Commercial feature code lives in the repository's `apps/workflow-go/ee/`
directory, source-available under the
[Elastic License 2.0](https://github.com/Cohestra/cohestra-dataflow/blob/main/apps/workflow-go/ee/LICENSE).
Community builds (`go build ./...`) exclude it entirely and are pure
Apache-2.0; enterprise builds (`go build -tags ee ./...`, the default for
released images) link it in.

## Free

- Visual builder, Mermaid round-trip editing, and the local-LLM AI builder
  (generation is never metered).
- Manifest and coded connectors, catalog, credential vault.
- Immutable versions, Integration → Production lifecycle, promotion gates.
- Runs, retries, backfills, pause/resume/cancel, run history.
- Lineage, data quality, alerts, analytics dashboards, OpenLineage
  import/export.
- Multi-tenant row-level security, audit events, workspace roles.
- A free execution-quota tier.

## Commercial

Per-tenant entitlements, purchasable in-product:

| Feature | What it unlocks |
| --- | --- |
| Advanced connectors | Premium connector paths |
| Realtime | Streaming/realtime execution |
| Spark SQL | Spark SQL steps on the compute control plane |
| Flink SQL | Flink SQL steps on the compute control plane |
| Stateful processing | Stateful stream operations |
| Deep observability | Extended traces, metrics, and diagnostics |
| Governance | Enterprise governance controls |
| Extra execution quota | Metered runs beyond the free tier |

Entitlements are enforced server-side per tenant; in a paid deployment they
cannot be self-granted by a workspace owner.

Questions about commercial licensing:
[open an issue](https://github.com/Cohestra/cohestra-dataflow/issues) or reach
the maintainer via the repository.
