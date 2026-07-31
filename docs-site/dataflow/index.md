---
slug: /
sidebar_position: 1
---

# DataFlow

Visual, durable data pipelines powered by Go and Temporal.

DataFlow is an AGPL-3.0 open-core data-pipeline platform (commercial
enterprise features under the Elastic License 2.0 — see
[github.com/Cohestra/cohestra-dataflow](https://github.com/Cohestra/cohestra-dataflow)).
A React canvas creates versioned DAGs; a Go API and workers execute them
durably through Temporal. PostgreSQL stores tenant and pipeline state, Redis
carries bounded events and rate limits, ClickHouse serves analytics, and
encrypted `DataRef` objects move larger payloads outside workflow history.

**Try it:** [dataflow.cohestra.dev](https://dataflow.cohestra.dev) ·
**Source:** [github.com/Cohestra/cohestra-dataflow](https://github.com/Cohestra/cohestra-dataflow)

## Where next

- [Architecture](architecture.md) — processes, stores, and boundaries.
- [Self-hosting](self-hosting.md) — run it locally or in production.
- [Connectors](connectors.md) — the extension surface: add a REST source
  with zero code, or register a coded plugin.
