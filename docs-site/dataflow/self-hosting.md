---
sidebar_position: 3
---

# Self-hosting

## Requirements

- Docker Desktop with at least 8 GB RAM and 4 CPUs
- Node.js 20+ and npm
- Kind, `kubectl`, and Helm

## Local (Kind + Helm)

```bash
git clone https://github.com/Cohestra/cohestra-dataflow.git
cd cohestra-dataflow
./scripts/bootstrap.sh
./scripts/smoke-test.sh
```

`bootstrap.sh` creates `.env`, generates JWT/OAuth/Temporal keys and the
worker keypair, builds local images, creates a Kind cluster, and installs the
Helm chart in `deploy/helm/dataflow` — web, API, workers, PostgreSQL, Redis,
ClickHouse, Temporal, and Ollama for the AI builder.

| Service | URL |
| --- | --- |
| Web | `http://localhost:3002` |
| API health | `http://localhost:3002/api/health` |
| Temporal UI | `http://localhost:8082` |

Tear down deliberately:

```bash
kind delete cluster --name dataflow
```

## Production topology (GCP reference)

`infra/` provisions a reference production topology with Terraform:

- One GCE VM running a Kind cluster and the DataFlow Helm release.
- Caddy on the VM for HTTPS (automatic Let's Encrypt certificates).
- A static public IP; the app URL derives from it.
- A separate persistent disk mounted at `/var/lib/docker` holding PostgreSQL,
  Redis, ClickHouse, and Ollama PVC contents — `prevent_destroy` protected,
  with daily snapshots (14-day retention). Replacing the VM does not delete
  the database disk.
- Secrets in GCP Secret Manager, readable only by a dedicated runtime service
  account.

This is a single-VM reference topology, not HA — one VM, one zone, one
Kubernetes node, one database replica are shared failure domains. Adapt the
Helm chart to your own multi-node cluster for HA.

Full runbook:
[DEPLOYMENT_GCP.md](https://github.com/Cohestra/cohestra-dataflow/blob/main/docs/DEPLOYMENT_GCP.md).

## Security posture

- Tenant-aware PostgreSQL row-level security on every tenant-facing query.
- Encrypted credentials and payloads; AES-256-GCM Temporal payload codec.
- Audit events for security-relevant actions.
