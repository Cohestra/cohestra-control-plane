# FCP Helm chart

Installs the Flink Control Plane (control-api + Kubernetes-backed worker) so a third
party can operate **their own** Flink jobs with FCP.

**You bring:**
- your own **Flink Kubernetes Operator** (>= 1.15) running in the namespaces you want managed;
- your own **Flink jobs** (container images);
- a **Temporal** endpoint — your own cluster / Temporal Cloud (recommended), or let the chart
  bundle one for a trial.

This chart installs **only** FCP plus the RBAC it needs to manage `FlinkDeployment` /
`FlinkStateSnapshot` resources in your watched namespaces.

## Install on EKS (production shape: external Temporal + IRSA)

```bash
helm install fcp ./deploy/helm/fcp \
  --namespace fcp-system --create-namespace \
  --set temporal.mode=external \
  --set temporal.address=my-temporal-frontend.temporal.svc:7233 \
  --set temporal.namespace=production \
  --set 'flink.watchNamespaces={team-a,team-b}' \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::111122223333:role/fcp-control-plane
```

For **Temporal Cloud**, create a Secret with your API key and reference it:

```bash
kubectl -n fcp-system create secret generic temporal-cloud --from-literal=apiKey=<KEY>
helm upgrade --install fcp ./deploy/helm/fcp -n fcp-system \
  --set temporal.mode=external \
  --set temporal.address=<namespace>.<account>.tmprl.cloud:7233 \
  --set temporal.namespace=<namespace>.<account> \
  --set temporal.tls=true \
  --set temporal.apiKey.secretName=temporal-cloud
```

IRSA: the annotated ServiceAccount lets the worker assume an IAM role (e.g. for S3
savepoints). FCP itself talks to the Kubernetes API via its in-cluster ServiceAccount and
the RBAC this chart creates.

## Install for a trial (bundled Temporal)

```bash
helm install fcp ./deploy/helm/fcp -n fcp-system --create-namespace \
  --set temporal.mode=bundled
```

Bundled Temporal is single-replica with ephemeral storage — trials only.

## Key values

| Key | Default | Notes |
|---|---|---|
| `temporal.mode` | `external` | `external` (BYO/Cloud) or `bundled` (trial) |
| `temporal.address` | `""` | Required when `external` |
| `temporal.tls` / `temporal.apiKey.secretName` | `false` / `""` | Temporal Cloud auth |
| `flink.watchNamespaces` | `[streaming]` | Namespaces FCP manages |
| `flink.slotBudget` | `4096` | Capacity-lease slot budget per node pool |
| `rbac.clusterScope` | `false` | Per-namespace Roles vs a ClusterRole |
| `serviceAccount.annotations` | `{}` | IRSA role ARN |
| `worker.replicaCount` / `worker.autoscaling` | `3` / off | Scale the worker tier |
| `taskQueue.shards` | `1` | Task-queue sharding (see `docs/SCALING.md`) |
| `worker.tuning.*` | — | Concurrency, activity rate, kube client QPS/burst |

Images default to `ghcr.io/as791/fcp-control-api` and `ghcr.io/as791/fcp-k8s-worker`;
override `image.*.repository`/`tag` to use your registry.
